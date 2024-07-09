package service

import (
	"context"
	"fmt"
	"net/http"
	"net/mail"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/ses"
	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/proof-pass/proof-pass/backend/jwt"
	"github.com/proof-pass/proof-pass/backend/openapi"
	"github.com/proof-pass/proof-pass/backend/repos"
	"github.com/proof-pass/proof-pass/backend/repos/attendances"
	"github.com/proof-pass/proof-pass/backend/repos/email_credentials"
	"github.com/proof-pass/proof-pass/backend/repos/registrations"
	"github.com/proof-pass/proof-pass/backend/repos/ticket_credentials"
	"github.com/proof-pass/proof-pass/backend/repos/users"
	"github.com/proof-pass/proof-pass/backend/util"
	"github.com/proof-pass/proof-pass/issuer/api/go/issuer/v1"
	"github.com/rs/zerolog/log"
)

const (
	emailSigninCodeCacheDurationSec = 60
	unitCredentialTypeID            = 1
)

type APIService struct {
	emailCredentialContextID int64
	issuerChainID            int64
	dbClient                 *repos.Client
	redisClient              redis.UniversalClient
	sesClient                *ses.Client // null if email login is disabled
	jwtService               *jwt.Service
	issuerClient             issuer.IssuerServiceClient
}

// NewAPIService creates a default api service
func NewAPIService(
	emailCredentialContextID int64,
	issuerChainID int64,
	dbClient *repos.Client,
	redisClient redis.UniversalClient,
	sesClient *ses.Client,
	jwtService *jwt.Service,
	issuerClient issuer.IssuerServiceClient,
) *APIService {
	return &APIService{
		emailCredentialContextID: emailCredentialContextID,
		issuerChainID:            issuerChainID,
		dbClient:                 dbClient,
		redisClient:              redisClient,
		sesClient:                sesClient,
		jwtService:               jwtService,
		issuerClient:             issuerClient,
	}
}

// EventsEventIdAttendancePost - Record attendance for an event
func (s *APIService) EventsEventIdAttendancePost(ctx context.Context, eventId string, recordAttendanceRequest openapi.RecordAttendanceRequest) (openapi.ImplResponse, error) {
	logger := log.Ctx(ctx).With().Str("op", "EventsEventIdAttendancePost").Str("eventID", eventId).Logger()
	ctx = logger.WithContext(ctx)

	credType := recordAttendanceRequest.Type
	// credContext := recordAttendanceRequest.Context
	nullifier := recordAttendanceRequest.Nullifier
	// issuerKeyID := recordAttendanceRequest.KeyId
	eventID := recordAttendanceRequest.EventId
	adminCode := recordAttendanceRequest.AdminCode

	// validate event admin code
	event, err := s.dbClient.Events.GetEventByID(ctx, eventID)
	if err != nil {
		if err == pgx.ErrNoRows {
			logger.Err(err).Msg("Event not found")
			return openapi.Response(http.StatusNotFound, nil), nil
		}
		return openapi.Response(http.StatusInternalServerError, nil), err
	}
	if event.AdminCode != adminCode {
		errMsg := "Invalid admin code"
		logger.Info().Msg(errMsg)
		return openapi.Response(http.StatusUnauthorized, errMsg), nil
	}

	// validate credential type
	if credType != fmt.Sprint(unitCredentialTypeID) {
		errMsg := "Invalid credential type"
		logger.Info().Msg(errMsg)
		return openapi.Response(http.StatusBadRequest, errMsg), nil
	}

	// TODO: validate event context
	// TODO: validate issuer

	attendance, err := s.dbClient.Attendances.CreateOne(ctx, attendances.CreateOneParams{
		EventID:   eventID,
		Nullifier: nullifier,
	})
	if err != nil {
		logger.Err(err).Msg("Failed to record attendance")
		return openapi.Response(http.StatusInternalServerError, nil), err
	}

	logger.Info().Str("nullifier", nullifier).Int32("attendance", attendance.ID).Msg("Recorded attendance")

	return openapi.Response(http.StatusCreated, nil), nil
}

// EventsEventIdGet - Get event details
func (s *APIService) EventsEventIdGet(ctx context.Context, eventId string) (openapi.ImplResponse, error) {
	event, err := s.dbClient.Events.GetEventByID(ctx, eventId)
	if err != nil {
		return openapi.Response(http.StatusInternalServerError, nil), err
	}
	return openapi.Response(http.StatusOK, MarshalEvent(event)), nil
}

// EventsEventIdRequestTicketCredentialPost - Request a new ticket credential for an event
func (s *APIService) EventsEventIdRequestTicketCredentialPost(ctx context.Context, eventId string) (openapi.ImplResponse, error) {
	logger := log.Ctx(ctx).With().Str("op", "UserMeEmailCredentialPut").Logger()
	userEmail := util.GetUserEmailFromContext(ctx)
	userID := util.GetUserIDFromContext(ctx)
	if userID == "" || userEmail == "" {
		return openapi.Response(http.StatusUnauthorized, nil), nil
	}
	logger = logger.With().Str("email", userEmail).Str("uid", userID).Logger()

	// ensure user does not already have a ticket credential for this event
	_, err := s.dbClient.TicketCredentials.GetByEventIdAndEmail(ctx, ticket_credentials.GetByEventIdAndEmailParams{
		EventID: eventId,
		Email:   userEmail,
	})
	if err != nil {
		if err != pgx.ErrNoRows {
			logger.Err(err).Msg("Failed to get existing ticket credential")
			return openapi.Response(http.StatusInternalServerError, nil), err
		}
	} else {
		errMsg := "User already has a ticket credential for this event, cannot request again"
		logger.Info().Msg(errMsg)
		return openapi.Response(http.StatusBadRequest, errMsg), nil
	}

	// check registration
	_, err = s.dbClient.Registrations.GetOneByEventIdAndEmail(ctx, registrations.GetOneByEventIdAndEmailParams{
		EventID: eventId,
		Email:   userEmail,
	})
	if err != nil {
		if err != pgx.ErrNoRows {
			logger.Err(err).Msg("Failed to get registration")
			return openapi.Response(http.StatusInternalServerError, nil), err
		}
		errMsg := "No user registration found for this event"
		logger.Info().Msg(errMsg)
		return openapi.Response(http.StatusBadRequest, errMsg), nil
	}

	// get user from database
	user, err := s.dbClient.Users.GetUserByID(ctx, userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			logger.Err(err).Msg("User not found")
			return openapi.Response(http.StatusNotFound, nil), nil
		}
		return openapi.Response(http.StatusInternalServerError, nil), err
	}

	if user.IdentityCommitment == "" {
		errMsg := "User identity commitment not set, cannot generate ticket credential"
		logger.Info().Msg(errMsg)
		return openapi.Response(http.StatusBadRequest, errMsg), nil
	}

	// get event
	event, err := s.dbClient.Events.GetEventByID(ctx, eventId)
	if err != nil {
		if err == pgx.ErrNoRows {
			logger.Err(err).Msg("Event not found")
			return openapi.Response(http.StatusNotFound, nil), nil
		}
		return openapi.Response(http.StatusInternalServerError, nil), err
	}
	if event.ContextID == "" {
		errMsg := "Event context ID not set, cannot generate ticket credential"
		logger.Info().Msg(errMsg)
		return openapi.Response(http.StatusBadRequest, errMsg), nil
	}

	// found registration, create ticket credential
	revocable := int64(0)
	resp, err := s.issuerClient.GenerateSignedCredential(ctx, &issuer.GenerateSignedCredentialRequest{
		Header: &issuer.Header{
			Version: 1,
			Type:    fmt.Sprintf("%d", unitCredentialTypeID),
			Context: event.ContextID,
			Id:      util.StringToUint248Hash(userEmail).String(),
		},
		Body: &issuer.Body{
			Tp: &issuer.CredType{
				TypeId:    fmt.Sprintf("%d", unitCredentialTypeID),
				Revocable: &revocable,
			},
		},
		Attachments: &issuer.AttachmentSet{
			Attachments: map[string]string{"event_id": eventId},
		},
		ChainId:            uint64(s.issuerChainID),
		IdentityCommitment: user.IdentityCommitment,                                 // ticket credential is issued to the email
		ExpiredAt:          fmt.Sprint(time.Now().Add(time.Hour * 24 * 265).Unix()), // one year
	})
	if err != nil {
		logger.Err(err).Msg("Failed to generate ticket credential")
		return openapi.Response(http.StatusInternalServerError, nil), err
	}

	logger.Info().Msg("Generated ticket credential")
	return openapi.Response(http.StatusCreated, openapi.UnencryptedTicketCredential{
		EventId:    eventId,
		Credential: resp.GetSignedCred(),
		IssuedAt:   time.Now(),
		ExpireAt:   time.Now().Add(time.Hour * 24),
	}), nil
}

// EventsGet - Get list of events
func (s *APIService) EventsGet(ctx context.Context) (openapi.ImplResponse, error) {
	events, err := s.dbClient.Events.ListEvents(ctx)
	if err != nil {
		return openapi.Response(http.StatusInternalServerError, nil), err
	}

	return openapi.Response(http.StatusOK, MarshalEvents(events)), nil
}

// HealthGet - Check the health of the API
func (s *APIService) HealthGet(ctx context.Context) (openapi.ImplResponse, error) {
	return openapi.Response(http.StatusOK, "OK"), nil
}

// UserLoginPost - User login
func (s *APIService) UserLoginPost(ctx context.Context, userLogin openapi.UserLogin) (openapi.ImplResponse, error) {
	logger := log.Ctx(ctx).With().Str("op", "UsersLoginPost").Logger()

	// validate email
	email, err := mail.ParseAddress(userLogin.Email)
	if err != nil {
		return openapi.Response(http.StatusBadRequest, "Invalid Email"), nil
	}
	logger = logger.With().Str("email", email.Address).Logger()

	// validate code
	code := userLogin.Code
	if code == "" {
		return openapi.Response(http.StatusBadRequest, "Invalid Code"), nil
	}
	key := util.GetUserEmailSigninCodeCacheKey(email.Address)
	cachedCode, err := s.redisClient.GetDel(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			logger.Info().Msg("Code not found in cache. Invalid login attempt")
			return openapi.Response(http.StatusUnauthorized, "Invalid Code"), nil
		}
		logger.Err(err).Msg("Failed to get cached sign in code")
		return openapi.Response(http.StatusInternalServerError, nil), err
	}
	if code != cachedCode {
		logger.Info().Msg("Invalid code")
		return openapi.Response(http.StatusUnauthorized, "Invalid Code"), nil
	}

	// code has been validated, get or create user
	user, err := s.dbClient.Users.GetUserByEmail(ctx, email.Address)
	if err != nil {
		if err == pgx.ErrNoRows {
			logger.Info().Msg("User not found, creating new user")
			user, err = s.dbClient.Users.CreateUser(ctx, users.CreateUserParams{
				ID:                         uuid.NewString(),
				Email:                      email.Address,
				IdentityCommitment:         "",
				EncryptedInternalNullifier: "",
				EncryptedIdentitySecret:    "",
				IsEncrypted:                true,
			})
			if err != nil {
				return openapi.Response(http.StatusInternalServerError, nil), err
			}
		} else {
			return openapi.Response(http.StatusInternalServerError, nil), err
		}
	}

	// generate JWT
	token, err := s.jwtService.GenerateJWT(user.ID, user.Email)
	if err != nil {
		logger.Err(err).Msg("Failed to generate JWT")
		return openapi.Response(http.StatusInternalServerError, nil), err
	}

	logger.Info().Msg("User logged in")
	return openapi.Response(http.StatusOK, openapi.LoginResponse{Token: token}), nil
}

// UserMeGet - Get user details
func (s *APIService) UserMeGet(ctx context.Context) (openapi.ImplResponse, error) {
	logger := log.Ctx(ctx).With().Str("op", "UsersMeGet").Logger()
	userEmail := util.GetUserEmailFromContext(ctx)
	userID := util.GetUserIDFromContext(ctx)
	if userID == "" || userEmail == "" {
		return openapi.Response(http.StatusUnauthorized, nil), nil
	}
	logger = logger.With().Str("email", userEmail).Str("uid", userID).Logger()

	user, err := s.dbClient.Users.GetUserByID(ctx, userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			logger.Err(err).Msg("User not found")
			return openapi.Response(http.StatusNotFound, nil), nil
		}
		return openapi.Response(http.StatusInternalServerError, nil), err
	}

	return openapi.Response(http.StatusOK, MarshalUser(user)), nil
}

// UserRequestVerificationCodePost - Request an email verification code
func (s *APIService) UserRequestVerificationCodePost(ctx context.Context, userEmailVerificationRequest openapi.UserEmailVerificationRequest) (openapi.ImplResponse, error) {
	logger := log.Ctx(ctx).With().Str("op", "UsersRequestVerificationCodePost").Logger()

	email, err := mail.ParseAddress(userEmailVerificationRequest.Email)
	if err != nil {
		return openapi.Response(http.StatusBadRequest, "Invalid Email"), nil
	}
	logger = logger.With().Str("email", email.Address).Logger()

	key := util.GetUserEmailSigninCodeCacheKey(email.Address)
	code, err := s.redisClient.Get(ctx, key).Result()
	if err == nil && code != "" {
		// code already sent, cannot request again until it expires
		logger.Info().Msg("Code already sent, cannot request again until it expires")
		return openapi.Response(http.StatusTooManyRequests, fmt.Sprintf("Code has already been sent. Please request a new code after %d seconds.", emailSigninCodeCacheDurationSec)), nil
	} else if err != redis.Nil {
		// redis error
		logger.Err(err).Msg("Failed to get cached sign in code")
		return openapi.Response(http.StatusInternalServerError, nil), err
	}

	// redis does not have code, generate new code
	code, err = s.generateEmailSigninCode()
	if err != nil {
		logger.Err(err).Msg("Failed to generate email sign in code")
		return openapi.Response(http.StatusInternalServerError, nil), err
	}

	err = s.sendSigninCodeToEmail(ctx, email.Address, code)
	if err != nil {
		logger.Err(err).Msg("Failed to send email verification code")
		return openapi.Response(http.StatusInternalServerError, nil), err
	}

	// cache code
	err = s.redisClient.SetNX(ctx, key, code, emailSigninCodeCacheDurationSec*time.Second).Err()
	if err != nil {
		logger.Err(err).Msg("Failed to cache email sign in code")
		return openapi.Response(http.StatusInternalServerError, nil), err
	}

	return openapi.Response(http.StatusOK, nil), nil
}

// UserUpdatePut - Update user details
func (s *APIService) UserUpdatePut(ctx context.Context, userUpdate openapi.UserUpdate) (openapi.ImplResponse, error) {
	logger := log.Ctx(ctx).With().Str("op", "UsersUpdatePut").Logger()
	userEmail := util.GetUserEmailFromContext(ctx)
	userID := util.GetUserIDFromContext(ctx)
	if userID == "" || userEmail == "" {
		return openapi.Response(http.StatusUnauthorized, nil), nil
	}
	logger = logger.With().Str("email", userEmail).Str("uid", userID).Logger()

	encryptedIdentitySecret := userUpdate.EncryptedIdentitySecret
	encryptedInternalNullifier := userUpdate.EncryptedInternalNullifier
	identityCommitment := userUpdate.IdentityCommitment
	// TODO: validate input
	// TODO: encrypted fields is b64 - start with 0x

	// get existing user info, fail update request if user already has these fields set
	user, err := s.dbClient.Users.GetUserByID(ctx, userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			logger.Err(err).Msg("User not found")
			return openapi.Response(http.StatusNotFound, nil), nil
		}
		return openapi.Response(http.StatusInternalServerError, nil), err
	}
	if user.EncryptedIdentitySecret != "" && user.EncryptedInternalNullifier != "" && user.IdentityCommitment != "" {
		errMsg := "Identity fields have already been set, cannot update again"
		logger.Info().Msg(errMsg)
		return openapi.Response(http.StatusBadRequest, errMsg), nil
	}

	// update user info in database
	user, err = s.dbClient.Users.UpdateUser(ctx, users.UpdateUserParams{
		ID:                         userID,
		EncryptedIdentitySecret:    encryptedIdentitySecret,
		EncryptedInternalNullifier: encryptedInternalNullifier,
		IdentityCommitment:         identityCommitment,
	})
	if err != nil {
		return openapi.Response(http.StatusInternalServerError, nil), err
	}

	return openapi.Response(200, user), nil
}

func (s *APIService) UserMeEmailCredentialGet(ctx context.Context) (openapi.ImplResponse, error) {
	logger := log.Ctx(ctx).With().Str("op", "UserMeEmailCredentialGet").Logger()
	userEmail := util.GetUserEmailFromContext(ctx)
	userID := util.GetUserIDFromContext(ctx)
	if userID == "" || userEmail == "" {
		return openapi.Response(http.StatusUnauthorized, nil), nil
	}
	logger = logger.With().Str("email", userEmail).Str("uid", userID).Logger()

	// get user from database
	user, err := s.dbClient.Users.GetUserByID(ctx, userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			logger.Err(err).Msg("User not found")
			return openapi.Response(http.StatusNotFound, nil), nil
		}
		return openapi.Response(http.StatusInternalServerError, nil), err
	}

	if user.IdentityCommitment != "" {
		emailCredential, err := s.dbClient.EmailCredentials.GetByIdentityCommitment(ctx, user.IdentityCommitment)
		if err != nil {
			if err == pgx.ErrNoRows {
				// do nothing
				logger.Info().Msg("Email credential not found")
			} else {
				logger.Err(err).Msg("Failed to get email credential")
				return openapi.Response(http.StatusInternalServerError, nil), err
			}
		} else {
			credential := MarshalEmailCredential(emailCredential)
			return openapi.Response(http.StatusOK, credential), nil
		}
	}

	return openapi.Response(http.StatusOK, nil), nil
}

// UserMeEmailCredentialPut - Store user email credential with encrypted data
func (s *APIService) UserMeEmailCredentialPut(ctx context.Context, putEmailCredentialRequest openapi.PutEmailCredentialRequest) (openapi.ImplResponse, error) {
	logger := log.Ctx(ctx).With().Str("op", "UserMeEmailCredentialPut").Logger()
	userEmail := util.GetUserEmailFromContext(ctx)
	userID := util.GetUserIDFromContext(ctx)
	if userID == "" || userEmail == "" {
		return openapi.Response(http.StatusUnauthorized, nil), nil
	}
	logger = logger.With().Str("email", userEmail).Str("uid", userID).Logger()

	// get user from database
	user, err := s.dbClient.Users.GetUserByID(ctx, userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			logger.Err(err).Msg("User not found")
			return openapi.Response(http.StatusNotFound, nil), nil
		}
		return openapi.Response(http.StatusInternalServerError, nil), err
	}

	if user.IdentityCommitment == "" {
		errMsg := "User identity commitment not set, cannot store email credential"
		logger.Info().Msg(errMsg)
		return openapi.Response(http.StatusBadRequest, errMsg), nil
	}

	// create email credential
	emailCredential, err := s.dbClient.EmailCredentials.CreateOrUpdateOne(ctx, email_credentials.CreateOrUpdateOneParams{
		ID:                 uuid.NewString(),
		IdentityCommitment: user.IdentityCommitment,
		Data:               putEmailCredentialRequest.Data,
		IssuedAt:           pgtype.Timestamptz{Time: putEmailCredentialRequest.IssuedAt, Valid: true},
		ExpireAt:           pgtype.Timestamptz{Time: putEmailCredentialRequest.ExpireAt, Valid: true},
	})
	if err != nil {
		logger.Err(err).Msg("Failed to create email credential")
		return openapi.Response(http.StatusInternalServerError, nil), err
	}

	return openapi.Response(http.StatusCreated, MarshalEmailCredential(emailCredential)), nil
}

func (s *APIService) UserMeRequestEmailCredentialPost(ctx context.Context) (openapi.ImplResponse, error) {
	logger := log.Ctx(ctx).With().Str("op", "UserMeRequestEmailCredentialPost").Logger()
	userEmail := util.GetUserEmailFromContext(ctx)
	userID := util.GetUserIDFromContext(ctx)
	if userID == "" || userEmail == "" {
		return openapi.Response(http.StatusUnauthorized, nil), nil
	}
	logger = logger.With().Str("email", userEmail).Str("uid", userID).Logger()

	// get user identity commitment
	user, err := s.dbClient.Users.GetUserByID(ctx, userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			logger.Err(err).Msg("User not found")
			return openapi.Response(http.StatusNotFound, nil), nil
		}
		return openapi.Response(http.StatusInternalServerError, nil), err
	}
	if user.IdentityCommitment == "" {
		errMsg := "User identity commitment not set, cannot request email credential"
		logger.Info().Msg(errMsg)
		return openapi.Response(http.StatusBadRequest, errMsg), nil
	}
	identityCommitment := user.IdentityCommitment

	// issue email credential
	revocable := int64(0)
	resp, err := s.issuerClient.GenerateSignedCredential(ctx, &issuer.GenerateSignedCredentialRequest{
		Header: &issuer.Header{
			Version: 1,
			Type:    fmt.Sprintf("%d", unitCredentialTypeID),
			Context: fmt.Sprintf("%d", s.emailCredentialContextID),
			Id:      util.StringToUint248Hash(userEmail).String(),
		},
		Body: &issuer.Body{
			Tp: &issuer.CredType{
				TypeId:    fmt.Sprintf("%d", unitCredentialTypeID),
				Revocable: &revocable,
			},
		},
		Attachments: &issuer.AttachmentSet{
			Attachments: map[string]string{"email": userEmail},
		},
		ChainId:            uint64(s.issuerChainID),
		IdentityCommitment: identityCommitment,
		ExpiredAt:          fmt.Sprint(time.Now().Add(time.Hour * 24).Unix()), // TODO
	})
	if err != nil {
		logger.Err(err).Msg("Failed to generate email credential")
		return openapi.Response(http.StatusInternalServerError, nil), err
	}

	logger.Info().Msg("Generated email credential")
	return openapi.Response(http.StatusCreated, openapi.UnencryptedEmailCredential{
		Credential: resp.GetSignedCred(),
		IssuedAt:   time.Now(),
		ExpireAt:   time.Now().Add(time.Hour * 24 * 14),
	}), nil
}

// UserMeTicketCredentialPut - Store user ticket credential with encrypted data
func (s *APIService) UserMeTicketCredentialPut(ctx context.Context, putTicketCredentialRequest openapi.PutTicketCredentialRequest) (openapi.ImplResponse, error) {
	logger := log.Ctx(ctx).With().Str("op", "UserMeTicketCredentialPut").Logger()
	userEmail := util.GetUserEmailFromContext(ctx)
	userID := util.GetUserIDFromContext(ctx)
	if userID == "" || userEmail == "" {
		return openapi.Response(http.StatusUnauthorized, nil), nil
	}
	logger = logger.With().Str("email", userEmail).Str("uid", userID).Logger()

	// create ticket credential
	ticketCredential, err := s.dbClient.TicketCredentials.CreateOrUpdateOne(ctx, ticket_credentials.CreateOrUpdateOneParams{
		ID:       uuid.NewString(),
		Email:    userEmail,
		EventID:  putTicketCredentialRequest.EventId,
		Data:     putTicketCredentialRequest.Data,
		IssuedAt: pgtype.Timestamptz{Time: putTicketCredentialRequest.IssuedAt, Valid: true},
		ExpireAt: pgtype.Timestamptz{Time: putTicketCredentialRequest.ExpireAt, Valid: true},
	})
	if err != nil {
		logger.Err(err).Msg("Failed to create ticket credential")
		return openapi.Response(http.StatusInternalServerError, nil), err
	}

	return openapi.Response(http.StatusCreated, MarshalTicketCredential(ticketCredential)), nil
}

// UserMeTicketCredentialsGet - Get user ticket credentials
func (s *APIService) UserMeTicketCredentialsGet(ctx context.Context) (openapi.ImplResponse, error) {
	logger := log.Ctx(ctx).With().Str("op", "UsersUpdatePut").Logger()
	userEmail := util.GetUserEmailFromContext(ctx)
	userID := util.GetUserIDFromContext(ctx)
	if userID == "" || userEmail == "" {
		return openapi.Response(http.StatusUnauthorized, nil), nil
	}
	logger = logger.With().Str("email", userEmail).Str("uid", userID).Logger()

	// get ticket credentials from database
	tcs, err := s.dbClient.TicketCredentials.GetAllByEmail(ctx, userEmail)
	if err != nil {
		logger.Err(err).Msg("Failed to get ticket credentials")
		return openapi.Response(http.StatusInternalServerError, nil), err
	}

	return openapi.Response(http.StatusOK, MarshalTicketCredentials(tcs)), nil
}
