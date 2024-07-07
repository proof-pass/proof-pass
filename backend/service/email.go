package service

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/ses"
	"github.com/aws/aws-sdk-go-v2/service/ses/types"
	"github.com/rs/zerolog/log"
)

const loginEmailSender = "no-reply@proofpass.io"

func (s *APIService) generateEmailSigninCode() (string, error) {
	const codeLength = 6
	const charset = "0123456789"

	code := make([]byte, codeLength)
	for i := range code {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		code[i] = charset[num.Int64()]
	}

	return string(code), nil
}

func (s *APIService) sendSigninCodeToEmail(ctx context.Context, email, code string) error {
	logger := log.Ctx(ctx)
	logger.Info().Msgf("Sending signin code %s to email %s", code, email)

	if s.sesClient != nil {
		from := loginEmailSender
		subject := "Proof Pass Login Code"
		htmlBody := fmt.Sprintf("<h1>Your login code is: %s</h1>", code)
		textBody := fmt.Sprintf("Your login code is: %s", code)

		input := &ses.SendEmailInput{
			Destination: &types.Destination{
				ToAddresses: []string{email},
			},
			Message: &types.Message{
				Body: &types.Body{
					Html: &types.Content{
						Charset: aws.String("UTF-8"),
						Data:    aws.String(htmlBody),
					},
					Text: &types.Content{
						Charset: aws.String("UTF-8"),
						Data:    aws.String(textBody),
					},
				},
				Subject: &types.Content{
					Charset: aws.String("UTF-8"),
					Data:    aws.String(subject),
				},
			},
			Source: aws.String(from),
		}

		result, err := s.sesClient.SendEmail(ctx, input)
		if err != nil {
			return fmt.Errorf("failed to send email, %v", err)
		}
		log.Printf("Email sent to address: %s, message ID: %s", email, *result.MessageId)
	} else {
		logger.Warn().Msgf("Login email sending is disabled, code is %s", code)
	}

	return nil
}
