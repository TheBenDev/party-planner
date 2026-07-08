package model

import (
	"database/sql"
	"time"
)

type QuestStatus string

const (
	QuestStatusActive      QuestStatus = "ACTIVE"
	QuestStatusCompleted   QuestStatus = "COMPLETED"
	QuestStatusFailed      QuestStatus = "FAILED"
	QuestStatusUnspecified QuestStatus = "UNSPECIFIED"
)

type QuestType string

const (
	QuestTypeMainland QuestType = "MAINLAND"
	QuestTypeColony   QuestType = "COLONY"
)

type QuestRewardColony struct {
	Gold              *int32 `json:"gold,omitempty"`
	Food              *int32 `json:"food,omitempty"`
	BuildingMaterials *int32 `json:"buildingMaterials,omitempty"`
	ColonistCount     *int32 `json:"colonistCount,omitempty"`
	Morale            *int32 `json:"morale,omitempty"`
}

type QuestRewardLootItem struct {
	Name        string  `json:"name"`
	Quantity    *int32  `json:"quantity,omitempty"`
	Description *string `json:"description,omitempty"`
}

type QuestReward struct {
	Colony *QuestRewardColony  `json:"colony,omitempty"`
	Loot   []QuestRewardLootItem `json:"loot,omitempty"`
}

type Quest struct {
	ID           string
	CampaignID   string
	Title        string
	Status       QuestStatus
	Description  sql.NullString
	QuestGiverID sql.NullString
	Reward       *QuestReward
	CompletedAt  sql.NullTime
	DeletedAt    sql.NullTime
	CreatedAt    time.Time
	UpdatedAt    time.Time
	Type         *QuestType
}

type CreateQuestRequest struct {
	CampaignID   string
	Title        string
	Status       QuestStatus
	Description  sql.NullString
	QuestGiverID sql.NullString
	Reward       *QuestReward
	Type         *QuestType
}

type UpdateQuestRequest struct {
	ID          string
	Title       *string
	Status      *QuestStatus
	Description sql.NullString
	CampaignID  string
	Type        *QuestType
	Reward      *QuestReward
}
