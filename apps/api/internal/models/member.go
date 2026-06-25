package model

import (
	"database/sql"
	"time"
)

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

type MemberWithUser struct {
	CampaignID string
	Role       MemberRole
	UserID     string
	CreatedAt  time.Time
	UpdatedAt  time.Time
	Email      string
	FirstName  sql.NullString
	LastName   sql.NullString
}

type CreateMemberRequest struct {
	CampaignID string
	Role       MemberRole
	UserID     string
}
