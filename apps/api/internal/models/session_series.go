package model

import (
	"database/sql"
	"time"
)

type SessionSeries struct {
	ID                    string
	CampaignID            string
	Title                 string
	Description           sql.NullString
	DiscordEventID        sql.NullString
	GoogleCalendarEventID sql.NullString
	PollID                sql.NullString
	RRule                 sql.NullString
	StartTime             sql.NullString
	SeriesStartDate       time.Time
	SeriesEndDate         sql.NullTime
	CreatedAt             time.Time
	UpdatedAt             time.Time
	Timezone              string
	DurationMinutes       int32
}

type DiscordEventInfo struct {
	GuildID   string
	EventID   string
	Name      string
	StartTime time.Time
	EndTime   *time.Time
	Status    int
}

type Poll struct {
	Question    string
	Answers     []PollAnswer
	IsFinalized bool
}

type PollAnswer struct {
	Text      string
	VoteCount uint32
}

type CreateSessionSeriesRequest struct {
	CampaignID            string
	Title                 string
	Description           sql.NullString
	DiscordEventID        sql.NullString
	GoogleCalendarEventID sql.NullString
	PollID                sql.NullString
	RRule                 sql.NullString
	StartTime             sql.NullString
	SeriesStartDate       time.Time
	SeriesEndDate         sql.NullTime
	Timezone              string
	DurationMinutes       int32
}

type UpdateSessionSeriesRequest struct {
	ID            string
	Title         *string
	Description   sql.NullString
	RRule         *string
	StartTime     *string
	SeriesEndDate sql.NullTime
	Timezone      *string
	CampaignID    string
}

type SessionSeriesWithDetails struct {
	Series     *SessionSeries
	Sessions   []*Session
	Exceptions []time.Time
}
