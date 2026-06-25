package model

import (
	"database/sql"
	"encoding/json"
	"time"
)

type QuestStatus string

const (
	QuestStatusActive      QuestStatus = "ACTIVE"
	QuestStatusCompleted   QuestStatus = "COMPLETED"
	QuestStatusFailed      QuestStatus = "FAILED"
	QuestStatusUnspecified QuestStatus = "UNSPECIFIED"
)

type Quest struct {
	ID           string
	CampaignID   string
	Title        string
	Status       QuestStatus
	Description  sql.NullString
	QuestGiverID sql.NullString
	Reward       json.RawMessage
	CompletedAt  sql.NullTime
	DeletedAt    sql.NullTime
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type CreateQuestRequest struct {
	CampaignID   string
	Title        string
	Status       QuestStatus
	Description  sql.NullString
	QuestGiverID sql.NullString
	Reward       json.RawMessage
}

type UpdateQuestRequest struct {
	ID          string
	Title       *string
	Status      *QuestStatus
	Description sql.NullString
	CampaignID  string
}
