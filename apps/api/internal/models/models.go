package model

import (
	"database/sql"
	"encoding/json"
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

type User struct {
	ID         string
	ExternalId string
	Email      string
	Avatar     sql.NullString
	FirstName  sql.NullString
	LastName   sql.NullString
	DeletedAt  sql.NullTime
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type CreateUserRequest struct {
	Email      string
	ExternalId string
	Avatar     sql.NullString
	FirstName  sql.NullString
	LastName   sql.NullString
}

type IntegrationSource string

const (
	IntegrationSourceDiscord IntegrationSource = "DISCORD"
	// TODO: Implement foundry
	// IntegrationSourceFoundry IntegrationSource = "FOUNDRY"
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

type CreateCampaignIntegrationRequest struct {
	CampaignID string
	ExternalID string
	Source     IntegrationSource
	Metadata   json.RawMessage
	Settings   json.RawMessage
}

type CampaignUserRole string

const (
	CampaignUserRolePlayer        CampaignUserRole = "PLAYER"
	CampaignUserRoleDungeonMaster CampaignUserRole = "DUNGEON_MASTER"
)

type CampaignUser struct {
	CampaignID string
	Role       CampaignUserRole
	UserID     string
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type CreateCampaignUserRequest struct {
	CampaignID string
	Role       CampaignUserRole
	UserID     string
}

type CharacterStatus string

const (
	CharacterStatusUnspecified CharacterStatus = "UNSPECIFIED"
	CharacterStatusUnknown     CharacterStatus = "UNKNOWN"
	CharacterStatusAlive       CharacterStatus = "ALIVE"
	CharacterStatusDead        CharacterStatus = "DEAD"
	CharacterStatusMissing     CharacterStatus = "MISSING"
)

type RelationToParty string

const (
	RelationToPartyUnspecified RelationToParty = "UNSPECIFIED"
	RelationToPartyUnknown     RelationToParty = "UNKNOWN"
	RelationToPartyAlly        RelationToParty = "ALLY"
	RelationToPartyEnemy       RelationToParty = "ENEMY"
	RelationToPartyNeutral     RelationToParty = "NEUTRAL"
)

type Npc struct {
	ID                    string
	CampaignID            string
	Name                  string
	Status                CharacterStatus
	RelationToPartyStatus RelationToParty
	IsKnownToParty        bool
	Age                   sql.NullString
	Appearance            sql.NullString
	Avatar                sql.NullString
	Backstory             sql.NullString
	DmNotes               sql.NullString
	FoundryActorID        sql.NullString
	KnownName             sql.NullString
	Personality           sql.NullString
	PlayerNotes           sql.NullString
	Race                  sql.NullString
	CurrentLocationID     sql.NullString
	OriginLocationID      sql.NullString
	SessionEncounteredID  sql.NullString
	Aliases               []string
	LastFoundrySyncAt     sql.NullTime
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

type CreateNpcRequest struct {
	CampaignID            string
	Name                  string
	Status                CharacterStatus
	RelationToPartyStatus RelationToParty
	IsKnownToParty        bool
	Age                   sql.NullString
	Appearance            sql.NullString
	Avatar                sql.NullString
	Backstory             sql.NullString
	DmNotes               sql.NullString
	FoundryActorID        sql.NullString
	KnownName             sql.NullString
	Personality           sql.NullString
	PlayerNotes           sql.NullString
	Race                  sql.NullString
	CurrentLocationID     sql.NullString
	OriginLocationID      sql.NullString
	SessionEncounteredID  sql.NullString
	Aliases               []string
}

type QuestStatus string

const (
	QuestStatusUnspecified QuestStatus = "UNSPECIFIED"
	QuestStatusActive      QuestStatus = "ACTIVE"
	QuestStatusCompleted   QuestStatus = "COMPLETED"
	QuestStatusFailed      QuestStatus = "FAILED"
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

type Session struct {
	ID          string
	CampaignID  string
	Title       string
	Description sql.NullString
	StartsAt    sql.NullTime
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type CreateSessionRequest struct {
	CampaignID  string
	Title       string
	Description sql.NullString
	StartsAt    sql.NullTime
}

type CampaignRole string

const (
	CampaignRolePlayer     CampaignRole = "PLAYER"
	CampaignRoleGameMaster CampaignRole = "GAME_MASTER"
)

type InvitationStatus string

const (
	InvitationStatusPending  InvitationStatus = "PENDING"
	InvitationStatusAccepted InvitationStatus = "ACCEPTED"
	InvitationStatusDeclined InvitationStatus = "DECLINED"
	InvitationStatusExpired  InvitationStatus = "EXPIRED"
)

type CampaignInvitation struct {
	ID           string
	CampaignID   string
	InviterID    string
	InviteeEmail string
	Role         CampaignRole
	Status       InvitationStatus
	AcceptedAt   sql.NullTime
	ExpiresAt    time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type CreateCampaignInvitationRequest struct {
	CampaignID   string
	InviterID    string
	InviteeEmail string
	Role         CampaignRole
	ExpiresAt    time.Time
}
