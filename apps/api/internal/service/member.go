package service

import (
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/BBruington/party-planner/api/internal/db"
	model "github.com/BBruington/party-planner/api/internal/models"
)

var (
	ErrCampaignUserInvalidCampaign       = errors.New("campaign does not exist")
	ErrCampaignUserInvalidUser           = errors.New("user does not exist")
	ErrCampaignUserNotFound              = errors.New("campaign user not found")
	ErrCampaignUserAlreadyExists         = errors.New("campaign user already exists")
	ErrInvitationExpired                 = errors.New("campaign invitation is expired")
	ErrCampaignInvitationNotFound        = errors.New("campaign invitation not found")
	ErrCampaignInvitationAlreadyExists   = errors.New("campaign invitation already exists")
	ErrCampaignInvitationInvalidCampaign = errors.New("campaign does not exist")
)

type MemberService struct {
	DB  *db.DB
	Log *slog.Logger
}

func (s *MemberService) Create(member *model.CreateMemberRequest) (*model.Member, error) {
	created, err := s.DB.CreateCampaignUser(member)
	if err != nil {
		if mapped := mapCampaignUserPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create campaign user error: %w", err)
	}
	return created, nil
}
func (s *MemberService) Get(campaignId, userId string) (*model.Member, error) {
	campaignUser, err := s.DB.GetCampaignUser(campaignId, userId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCampaignUserNotFound
		}
		return nil, fmt.Errorf("get campaign user error: %w", err)
	}

	return campaignUser, nil
}

func (s *MemberService) ListByCampaign(campaignId string) ([]*model.Member, error) {
	campaignUser, err := s.DB.ListCampaignUsersByCampaign(campaignId)
	if err != nil {
		return nil, fmt.Errorf("list campaign users by campaign error: %w", err)
	}

	return campaignUser, nil
}

func (s *MemberService) ListByUser(userId string) ([]*model.Member, error) {
	campaignUser, err := s.DB.ListCampaignUsersByUser(userId)
	if err != nil {
		return nil, fmt.Errorf("list campaign users by user error: %w", err)
	}

	return campaignUser, nil
}

func (s *MemberService) Remove(campaignId, userId string) error {
	err := s.DB.RemoveCampaignUser(campaignId, userId)
	if err != nil {
		if mapped := mapCampaignUserPgError(err); mapped != err {
			return mapped
		}
		return fmt.Errorf("remove campaign user error: %w", err)
	}
	return nil
}

func (s *MemberService) AcceptInvitation(campaignId, inviteeEmail string) (*model.InvitationResponse, error) {
	user, err := s.DB.GetUserByEmail(inviteeEmail)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		if mapped := mapUserPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("get user error: %w", err)
	}
	var inv *model.CampaignInvitation
	var member *model.Member

	err = s.DB.RunInTx(func(tx *db.DB) error {
		var err error
		i, err := tx.GetCampaignInvitationByEmail(campaignId, inviteeEmail, model.InvitationStatusPending)
		if err != nil {
			if mapped := mapCampaignInvitationPgError(err); mapped != err {
				return mapped
			}
			return fmt.Errorf("get invitation error: %w", err)
		}
		if i.ExpiresAt.Before(time.Now()) {
			return ErrInvitationExpired
		}

		inv, err = tx.AcceptCampaignInvitation(campaignId, inviteeEmail, i.Role)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return ErrCampaignInvitationNotFound
			}
			if mapped := mapCampaignInvitationPgError(err); mapped != err {
				return mapped
			}
			return fmt.Errorf("accept invitation error: %w", err)
		}

		member, err = tx.CreateCampaignUser(&model.CreateMemberRequest{
			CampaignID: campaignId,
			UserID:     user.ID,
			Role:       model.MemberRole(inv.Role),
		})
		if err != nil {
			if mapped := mapCampaignUserPgError(err); mapped != err {
				return mapped
			}
			return fmt.Errorf("create campaign user error: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &model.InvitationResponse{
		Member:     member,
		Invitation: inv,
	}, nil
}

func (s *MemberService) DeclineInvitation(campaignId, inviteeEmail string) (*model.InvitationResponse, error) {
	inv, err := s.DB.DeclineCampaignInvitation(campaignId, inviteeEmail)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return &model.InvitationResponse{}, nil // no invitation, nothing to do
		}
		if mapped := mapCampaignInvitationPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("decline invitation error: %w", err)
	}

	return &model.InvitationResponse{
		Invitation: inv,
	}, nil
}

func mapCampaignInvitationPgError(err error) error {
	if isPgError(err, pgErrUniqueViolation) {
		return ErrCampaignInvitationAlreadyExists
	}
	if isPgError(err, pgErrForeignKeyViolation) {
		switch pgConstraint(err) {
		case "fk_invitation_campaign_id":
			return ErrCampaignInvitationInvalidCampaign
		}
	}
	return err
}

func mapCampaignUserPgError(err error) error {
	if isPgError(err, pgErrUniqueViolation) {
		return ErrCampaignUserAlreadyExists
	}
	if isPgError(err, pgErrForeignKeyViolation) {
		switch pgConstraint(err) {
		case "fk_campaign_user_campaign_id":
			return ErrCampaignUserInvalidCampaign
		case "fk_campaign_user_user_id":
			return ErrCampaignUserInvalidUser
		}
	}
	return err
}
