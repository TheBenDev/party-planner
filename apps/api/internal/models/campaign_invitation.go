package model

import (
	"database/sql"
	"time"
)

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
