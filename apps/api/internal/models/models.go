package model

import (
	"database/sql"
	"encoding/json"
	"time"
)

// -----------------------------------------------------------------------------
// Users
// -----------------------------------------------------------------------------

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

type UpdateUserRequest struct {
	ExternalId string
	Avatar     sql.NullString
	FirstName  sql.NullString
	LastName   sql.NullString
}

type GetAuthResponse struct {
	User     *User
	Campaign *Campaign
	Role     *MemberRole
}

// -----------------------------------------------------------------------------
// Campaigns
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Campaign Integrations
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Campaign Invitations
// -----------------------------------------------------------------------------

type InvitationStatus string

const (
	InvitationStatusAccepted InvitationStatus = "ACCEPTED"
	InvitationStatusDeclined InvitationStatus = "DECLINED"
	InvitationStatusExpired  InvitationStatus = "EXPIRED"
	InvitationStatusPending  InvitationStatus = "PENDING"
	InvitationStatusRevoked  InvitationStatus = "REVOKED"
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
	Token        string
	ExpiresAt    time.Time
}

type GetCampaignInvitationResponse struct {
	Invitation    *CampaignInvitation
	From          *string
	CampaignTitle string
}

type InvitationResponse struct {
	Member     *Member
	Invitation *CampaignInvitation
}

// -----------------------------------------------------------------------------
// Members
// -----------------------------------------------------------------------------

type MemberRole string

const (
	MemberRoleDungeonMaster MemberRole = "DUNGEON_MASTER"
	MemberRolePlayer        MemberRole = "PLAYER"
)

type Member struct {
	CampaignID string
	Role       MemberRole
	UserID     string
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type CreateMemberRequest struct {
	CampaignID string
	Role       MemberRole
	UserID     string
}

// -----------------------------------------------------------------------------
// NPCs
// -----------------------------------------------------------------------------

type CharacterStatus string

const (
	CharacterStatusAlive       CharacterStatus = "ALIVE"
	CharacterStatusDead        CharacterStatus = "DEAD"
	CharacterStatusMissing     CharacterStatus = "MISSING"
	CharacterStatusSuspicious  CharacterStatus = "SUSPICIOUS"
	CharacterStatusUnknown     CharacterStatus = "UNKNOWN"
	CharacterStatusUnspecified CharacterStatus = "UNSPECIFIED"
)

type RelationToParty string

const (
	RelationToPartyAlly        RelationToParty = "ALLY"
	RelationToPartyEnemy       RelationToParty = "ENEMY"
	RelationToPartyNeutral     RelationToParty = "NEUTRAL"
	RelationToPartySuspicious  RelationToParty = "SUSPICIOUS"
	RelationToPartyUnknown     RelationToParty = "UNKNOWN"
	RelationToPartyUnspecified RelationToParty = "UNSPECIFIED"
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

type UpdateNpcRequest struct {
	ID                    string
	Name                  *string
	Status                *CharacterStatus
	RelationToPartyStatus *RelationToParty
	IsKnownToParty        *bool
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

// -----------------------------------------------------------------------------
// Quests
// -----------------------------------------------------------------------------

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
}

// -----------------------------------------------------------------------------
// Sessions
// -----------------------------------------------------------------------------

type SessionStatus string

const (
	SessionStatusDraft     SessionStatus = "DRAFT"
	SessionStatusPolling   SessionStatus = "POLLING"
	SessionStatusConfirmed SessionStatus = "CONFIRMED"
)

type Session struct {
	ID          string
	CampaignID  string
	Title       string
	Description sql.NullString
	PollID      sql.NullString
	AnnouncedAt sql.NullTime
	StartsAt    sql.NullTime
	Status      SessionStatus
	CreatedAt   time.Time
	UpdatedAt   time.Time
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

type CreateSessionRequest struct {
	CampaignID  string
	Title       string
	Description sql.NullString
	Status      SessionStatus
	StartsAt    sql.NullTime
}

type UpdateSessionRequest struct {
	ID          string
	Title       sql.NullString
	Description sql.NullString
	PollId      sql.NullString
	Status      SessionStatus
	StartsAt    sql.NullTime
}

// -----------------------------------------------------------------------------
// Locations
// -----------------------------------------------------------------------------

type Location struct {
	ID          string
	CampaignID  string
	Name        string
	Description sql.NullString
	Notes       sql.NullString
	DmNotes     sql.NullString
	DeletedAt   sql.NullTime
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type CreateLocationRequest struct {
	CampaignID  string
	Name        string
	Description sql.NullString
	Notes       sql.NullString
	DmNotes     sql.NullString
}

type UpdateLocationRequest struct {
	ID          string
	Name        *string
	Description sql.NullString
	Notes       sql.NullString
	DmNotes     sql.NullString
}
