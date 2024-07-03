package repos

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/proof-pass/proof-pass/backend/repos/attendances"
	"github.com/proof-pass/proof-pass/backend/repos/email_credentials"
	"github.com/proof-pass/proof-pass/backend/repos/events"
	"github.com/proof-pass/proof-pass/backend/repos/registrations"
	"github.com/proof-pass/proof-pass/backend/repos/ticket_credentials"
	"github.com/proof-pass/proof-pass/backend/repos/users"
)

type Client struct {
	DBConnPool        *pgxpool.Pool
	Attendances       *attendances.Queries
	EmailCredentials  *email_credentials.Queries
	Events            *events.Queries
	Registrations     *registrations.Queries
	TicketCredentials *ticket_credentials.Queries
	Users             *users.Queries
}

func NewClient(pool *pgxpool.Pool) *Client {
	return &Client{
		DBConnPool:        pool,
		Attendances:       attendances.New(pool),
		EmailCredentials:  email_credentials.New(pool),
		Events:            events.New(pool),
		Registrations:     registrations.New(pool),
		TicketCredentials: ticket_credentials.New(pool),
		Users:             users.New(pool),
	}
}
