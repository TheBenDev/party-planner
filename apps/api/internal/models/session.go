package model

import (
	"database/sql"
	"time"
)

type Session struct {
	ID              string
	CampaignID      string
	Title           string
	Description     sql.NullString
	SeriesID        sql.NullString
	ScheduledAt     time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
	Recap           sql.NullString
	DurationMinutes int32
}

type CreateSessionRequest struct {
	CampaignID      string
	Title           string
	Description     sql.NullString
	SeriesID        sql.NullString
	ScheduledAt     time.Time
	DurationMinutes int32
}

type UpdateSessionRequest struct {
	ID          string
	Title       sql.NullString
	Description sql.NullString
	CampaignID  string
	Recap       sql.NullString
}
