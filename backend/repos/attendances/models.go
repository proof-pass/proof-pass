// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.26.0

package attendances

import (
	"github.com/jackc/pgx/v5/pgtype"
)

type Attendance struct {
	ID        int32
	EventID   string
	Nullifier string
	CreatedAt pgtype.Timestamptz
}
