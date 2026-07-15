package model

import (
	"database/sql"
	"time"
)

type Campaign struct {
	ID          string
	UserID      string
	Title       string
	Description sql.NullString
	Tags        []string
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   sql.NullTime
}

type CreateCampaignRequest struct {
	UserID      string
	Title       string
	Description sql.NullString
	Tags        []string
}

type UpdateCampaignRequest struct {
	ID          string
	Title       *string
	Description sql.NullString
	Tags        []string
}

type CampaignAuth struct {
	*Campaign
	ColonyID *string
}
