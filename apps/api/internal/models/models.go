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

type MemberRole string

const (
	MemberRolePlayer        MemberRole = "PLAYER"
	MemberRoleDungeonMaster MemberRole = "DUNGEON_MASTER"
)

type Member struct {
	CampaignID string
	Role       MemberRole
	UserID     string
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type InvitationResponse struct {
	Member     *Member
	Invitation *CampaignInvitation
}

type CreateMemberRequest struct {
	CampaignID string
	Role       MemberRole
	UserID     string
}

type CharacterStatus string

const (
	CharacterStatusUnspecified CharacterStatus = "UNSPECIFIED"
	CharacterStatusUnknown     CharacterStatus = "UNKNOWN"
	CharacterStatusAlive       CharacterStatus = "ALIVE"
	CharacterStatusDead        CharacterStatus = "DEAD"
	CharacterStatusMissing     CharacterStatus = "MISSING"
	CharacterStatusSuspicious  CharacterStatus = "SUSPICIOUS"
)

type RelationToParty string

const (
	RelationToPartyUnspecified RelationToParty = "UNSPECIFIED"
	RelationToPartyUnknown     RelationToParty = "UNKNOWN"
	RelationToPartyAlly        RelationToParty = "ALLY"
	RelationToPartyEnemy       RelationToParty = "ENEMY"
	RelationToPartyNeutral     RelationToParty = "NEUTRAL"
	RelationToPartySuspicious  RelationToParty = "SUSPICIOUS"
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

type InvitationStatus string

const (
	InvitationStatusPending  InvitationStatus = "PENDING"
	InvitationStatusAccepted InvitationStatus = "ACCEPTED"
	InvitationStatusRevoked  InvitationStatus = "REVOKED"
	InvitationStatusDeclined InvitationStatus = "DECLINED"
	InvitationStatusExpired  InvitationStatus = "EXPIRED"
)

type CampaignInvitation struct {
	ID           string
	CampaignID   string
	InviterID    string
	InviteeEmail string
	Role         MemberRole
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
	Role         MemberRole
	ExpiresAt    time.Time
}
