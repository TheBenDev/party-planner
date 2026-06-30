package model

import (
	"database/sql"
	"time"
)

type Location struct {
	ID          string
	RegionID    string
	Name        string
	Description sql.NullString
	Notes       sql.NullString
	DmNotes     sql.NullString
	MapX        sql.NullFloat64
	MapY        sql.NullFloat64
	DeletedAt   sql.NullTime
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type CreateLocationRequest struct {
	RegionID    string
	CampaignID  string
	Name        string
	Description sql.NullString
	Notes       sql.NullString
	DmNotes     sql.NullString
	MapX        sql.NullFloat64
	MapY        sql.NullFloat64
}

type UpdateLocationRequest struct {
	ID          string
	CampaignID  string
	Name        *string
	Description sql.NullString
	Notes       sql.NullString
	DmNotes     sql.NullString
	MapX        sql.NullFloat64
	MapY        sql.NullFloat64
}
