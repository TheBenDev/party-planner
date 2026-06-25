package model

import (
	"database/sql"
	"time"
)

type CharacterStatus string

const (
	CharacterStatusAlive       CharacterStatus = "ALIVE"
	CharacterStatusDead        CharacterStatus = "DEAD"
	CharacterStatusMissing     CharacterStatus = "MISSING"
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
	CampaignID            string
}
