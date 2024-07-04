package service

import (
	"github.com/proof-pass/proof-pass/backend/openapi"
	"github.com/proof-pass/proof-pass/backend/repos/email_credentials"
	"github.com/proof-pass/proof-pass/backend/repos/events"
	"github.com/proof-pass/proof-pass/backend/repos/ticket_credentials"
	"github.com/proof-pass/proof-pass/backend/repos/users"
)

func MarshalEvent(event events.Event) openapi.Event {
	return openapi.Event{
		Id:          event.ID,
		Name:        event.Name,
		Description: event.Description,
		Url:         event.Url,
		ChainId:     event.ChainID,
		ContextId:   event.ContextID,
		IssuerKeyId: event.IssuerKeyID,
	}
}

func MarshalEvents(events []events.Event) []openapi.Event {
	marshaledEvents := make([]openapi.Event, len(events))
	for i, event := range events {
		marshaledEvents[i] = MarshalEvent(event)
	}
	return marshaledEvents
}

func MarshalUser(user users.User) openapi.User {
	return openapi.User{
		Id:                         user.ID,
		Email:                      user.Email,
		IdentityCommitment:         user.IdentityCommitment,
		EncryptedInternalNullifier: user.EncryptedInternalNullifier,
		EncryptedIdentitySecret:    user.EncryptedIdentitySecret,
		CreatedAt:                  user.CreatedAt.Time,
	}
}

func MarshalEmailCredential(credential email_credentials.EmailCredential) openapi.EmailCredential {
	return openapi.EmailCredential{
		Id:                 credential.ID,
		IdentityCommitment: credential.IdentityCommitment,
		Data:               credential.Data,
		IssuedAt:           credential.IssuedAt.Time,
		ExpireAt:           credential.ExpireAt.Time,
	}
}

func MarshalTicketCredential(credentials ticket_credentials.TicketCredential) openapi.TicketCredential {
	return openapi.TicketCredential{
		Id:       credentials.ID,
		Email:    credentials.Email,
		EventId:  credentials.EventID,
		Data:     credentials.Data,
		IssuedAt: credentials.IssuedAt.Time,
		ExpireAt: credentials.ExpireAt.Time,
	}
}

func MarshalTicketCredentials(credentials []ticket_credentials.TicketCredential) []openapi.TicketCredential {
	marshaledCredentials := make([]openapi.TicketCredential, len(credentials))
	for i, credential := range credentials {
		marshaledCredentials[i] = MarshalTicketCredential(credential)
	}
	return marshaledCredentials
}
