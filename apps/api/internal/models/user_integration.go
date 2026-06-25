package model

import (
	"encoding/json"
	"time"
)

type GoogleCalendarTokenMetadata struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	TokenExpiry  int64  `json:"tokenExpiry"`
}

type UserIntegration struct {
	ID        string
	UserID    string
	Source    IntegrationSource
	Metadata  json.RawMessage
	CreatedAt time.Time
	UpdatedAt time.Time
}

type UpsertUserIntegrationRequest struct {
	UserID   string
	Source   IntegrationSource
	Metadata json.RawMessage
}

type CampaignMemberIntegration struct {
	UserID   string
	Metadata json.RawMessage
}

type CalendarEventWindow struct {
	Start time.Time
	End   time.Time
}

type CalendarConflict struct {
	UserID    string
	BusySlots []CalendarEventWindow
}
