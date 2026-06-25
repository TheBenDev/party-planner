package model

import (
	"encoding/json"
	"time"
)

type IntegrationSource string

const (
	IntegrationSourceDiscord        IntegrationSource = "DISCORD"
	IntegrationSourceGoogleCalendar IntegrationSource = "GOOGLE_CALENDAR"
)

type CampaignIntegration struct {
	ID         string
	CampaignID string
	ExternalID string
	Source     IntegrationSource
	Metadata   json.RawMessage
	Settings   json.RawMessage
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type CreateDiscordCampaignIntegrationRequest struct {
	CampaignID string
	Code       string
}

type CreateCampaignIntegrationRequest struct {
	CampaignID string
	ExternalID string
	Source     IntegrationSource
	Metadata   json.RawMessage
	Settings   json.RawMessage
}

type DiscordChannel struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type DiscordIntegrationMetadata struct {
	ServerName     string            `json:"serverName"`
	DefaultChannel DiscordChannel    `json:"defaultChannel"`
	Source         IntegrationSource `json:"source"`
}

type DiscordIntegrationSettings struct {
	EnableSessionReminders     bool              `json:"enableSessionReminders"`
	SessionCreateAnnouncements bool              `json:"sessionCreateAnnouncements"`
	Timezone                   string            `json:"timezone"`
	Source                     IntegrationSource `json:"source"`
	RecapChannel               *DiscordChannel   `json:"recapChannel"`
	SessionReminderChannel     *DiscordChannel   `json:"sessionReminderChannel"`
}

type UpdateDiscordIntegrationParams struct {
	DefaultChannel             *DiscordChannel
	EnableSessionReminders     bool
	RecapChannel               *DiscordChannel
	SessionCreateAnnouncements bool
	SessionReminderChannel     *DiscordChannel
	Timezone                   string
}

type UpdateCampaignIntegrationRequest struct {
	CampaignID string
	Source     IntegrationSource
	Discord    *UpdateDiscordIntegrationParams
}
