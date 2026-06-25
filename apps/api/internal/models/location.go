package model

import (
	"database/sql"
	"time"
)

type Location struct {
	ID          string
	CampaignID  string
	Name        string
	Description sql.NullString
	Notes       sql.NullString
	DmNotes     sql.NullString
	DeletedAt   sql.NullTime
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type CreateLocationRequest struct {
	CampaignID  string
	Name        string
	Description sql.NullString
	Notes       sql.NullString
	DmNotes     sql.NullString
}

type UpdateLocationRequest struct {
	ID          string
	Name        *string
	Description sql.NullString
	Notes       sql.NullString
	DmNotes     sql.NullString
	CampaignID  string
}
