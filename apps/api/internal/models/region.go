package model

import (
	"database/sql"
	"time"
)

type Region struct {
	ID          string
	CampaignID  string
	Name        string
	MapImageURL sql.NullString
	DeletedAt   sql.NullTime
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type RegionWithLocations struct {
	Region    *Region
	Locations []*Location
}

type CreateRegionRequest struct {
	CampaignID  string
	Name        string
	MapImageURL sql.NullString
}

type UpdateRegionRequest struct {
	ID          string
	CampaignID  string
	Name        *string
	MapImageURL *string
}
