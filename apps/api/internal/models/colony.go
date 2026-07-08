package model

import (
	"database/sql"
	"time"
)

type WorkerType string

const (
	WorkerTypeFarmer     WorkerType = "FARMER"
	WorkerTypeHealer     WorkerType = "HEALER"
	WorkerTypeBlacksmith WorkerType = "BLACKSMITH"
	WorkerTypeSoldier    WorkerType = "SOLDIER"
	WorkerTypeMiner      WorkerType = "MINER"
	WorkerTypeBuilder    WorkerType = "BUILDER"
	WorkerTypeScholar    WorkerType = "SCHOLAR"
	WorkerTypeMage       WorkerType = "MAGE"
)

type Colony struct {
	ID                string
	CampaignID        string
	ColonistCount     int32
	Food              int32
	BuildingMaterials int32
	Gold              int32
	Morale            int32
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type ColonyWorkforce struct {
	ID         string
	ColonyID   string
	WorkerType WorkerType
	Count      int32
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type CreateColonyRequest struct {
	CampaignID        string
	ColonistCount     sql.NullInt32
	Food              sql.NullInt32
	BuildingMaterials sql.NullInt32
	Gold              sql.NullInt32
	Morale            sql.NullInt32
}

type UpdateColonyRequest struct {
	ID                string
	CampaignID        string
	ColonistCount     sql.NullInt32
	Food              sql.NullInt32
	BuildingMaterials sql.NullInt32
	Gold              sql.NullInt32
	Morale            sql.NullInt32
}

type UpsertColonyWorkforceRequest struct {
	ColonyID   string
	CampaignID string
	WorkerType WorkerType
	Count      int32
}
