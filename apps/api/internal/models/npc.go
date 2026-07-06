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

type HealthCondition string

const (
	HealthConditionHealthy     HealthCondition = "HEALTHY"
	HealthConditionInjured     HealthCondition = "INJURED"
	HealthConditionSick        HealthCondition = "SICK"
	HealthConditionUnknown     HealthCondition = "UNKNOWN"
	HealthConditionDead        HealthCondition = "DEAD"
	HealthConditionUnspecified HealthCondition = "UNSPECIFIED"
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
	CharacterClass        sql.NullString
	DmNotes               sql.NullString
	FoundryActorID        sql.NullString
	HealthCondition       HealthCondition
	KnownName             sql.NullString
	Personality           sql.NullString
	PlayerNotes           sql.NullString
	Race                  sql.NullString
	Role                  sql.NullString
	CurrentLocationID     sql.NullString
	OriginLocationID      sql.NullString
	SessionEncounteredID  sql.NullString
	ColonyID              sql.NullString
	WorkforceID           sql.NullString
	Aliases               []string
	Labels                []string
	Level                 sql.NullInt16
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
	CharacterClass        sql.NullString
	DmNotes               sql.NullString
	FoundryActorID        sql.NullString
	HealthCondition       HealthCondition
	KnownName             sql.NullString
	Personality           sql.NullString
	PlayerNotes           sql.NullString
	Race                  sql.NullString
	Role                  sql.NullString
	CurrentLocationID     sql.NullString
	OriginLocationID      sql.NullString
	SessionEncounteredID  sql.NullString
	ColonyID              sql.NullString
	WorkforceID           sql.NullString
	Aliases               []string
	Labels                []string
	Level                 sql.NullInt16
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
	CharacterClass        sql.NullString
	DmNotes               sql.NullString
	FoundryActorID        sql.NullString
	HealthCondition       *HealthCondition
	KnownName             sql.NullString
	Personality           sql.NullString
	PlayerNotes           sql.NullString
	Race                  sql.NullString
	RemovedFields         []string
	Role                  sql.NullString
	CurrentLocationID     sql.NullString
	OriginLocationID      sql.NullString
	SessionEncounteredID  sql.NullString
	ColonyID              sql.NullString
	WorkforceID           sql.NullString
	Aliases               []string
	Labels                []string
	Level                 sql.NullInt16
	CampaignID            string
}
