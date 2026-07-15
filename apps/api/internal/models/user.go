package model

import (
	"database/sql"
	"time"
)

type User struct {
	ID         string
	ExternalId string
	Email      string
	Avatar     sql.NullString
	FirstName  sql.NullString
	LastName   sql.NullString
	DeletedAt  sql.NullTime
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type CreateUserRequest struct {
	Email      string
	ExternalId string
	Avatar     sql.NullString
	FirstName  sql.NullString
	LastName   sql.NullString
}

type UpdateUserRequest struct {
	ExternalId string
	Avatar     sql.NullString
	FirstName  sql.NullString
	LastName   sql.NullString
}

type GetAuthResponse struct {
	User     *User
	Campaign *Campaign
	Role     *MemberRole
	ColonyId *string
}
