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

func (s *MemberService) AcceptInvitation(token string) (*model.InvitationResponse, error) {
	var inv *model.CampaignInvitation
	var member *model.Member

	err := s.DB.RunInTx(func(tx *db.DB) error {
		var err error

		i, err := tx.GetCampaignInvitationByToken(token)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return ErrCampaignInvitationNotFound
			}
			if mapped := mapCampaignInvitationPgError(err); mapped != err {
				return mapped
			}
			return fmt.Errorf("get invitation error: %w", err)
		}

		user, err := tx.GetUserByEmail(i.Invitation.InviteeEmail)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return ErrUserNotFound
			}
			if mapped := mapUserPgError(err); mapped != err {
				return mapped
			}
			return fmt.Errorf("get user error: %w", err)
		}

		inv, err = tx.AcceptCampaignInvitation(token, i.Invitation.Role)
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
			CampaignID: inv.CampaignID,
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

func (s *MemberService) DeclineInvitation(token string) (*model.InvitationResponse, error) {
	inv, err := s.DB.DeclineCampaignInvitation(token)
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

func (s *MemberService) CreateInvitation(req *model.CreateCampaignInvitationRequest) (*model.CampaignInvitation, error) {
	user, err := s.DB.GetUserByEmail(req.InviteeEmail)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		s.Log.Warn("could not check existing membership", "email", req.InviteeEmail, "error", err)
	}
	if user != nil {
		member, _ := s.DB.GetCampaignUser(req.CampaignID, user.ID)
		if member != nil {
			return nil, ErrCampaignUserAlreadyExists
		}
	}
	if req.ExpiresAt.IsZero() {
		req.ExpiresAt = time.Now().Add(7 * 24 * time.Hour)
	}
	inv, err := s.DB.CreateCampaignInvitation(req)
	if err != nil {
		if mapped := mapCampaignInvitationPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create campaign invitation error: %w", err)
	}
	return inv, nil
}

func (s *MemberService) ListInvitations(campaignId string) ([]*model.CampaignInvitation, error) {
	invitations, err := s.DB.ListCampaignInvitations(campaignId)
	if err != nil {
		return nil, fmt.Errorf("list campaign invitations error: %w", err)
	}
	return invitations, nil
}

func (s *MemberService) RevokeInvitation(id, campaignId string) (*model.CampaignInvitation, error) {
	inv, err := s.DB.RevokeCampaignInvitation(id, campaignId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCampaignInvitationNotFound
		}
		if mapped := mapCampaignInvitationPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("revoke campaign invitation error: %w", err)
	}
	return inv, nil
}

func (s *MemberService) GetInvitation(token string) (*model.GetCampaignInvitationResponse, error) {
	res, err := s.DB.GetCampaignInvitationByToken(token)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCampaignInvitationNotFound
		}
		return nil, fmt.Errorf("get campaign invitation error: %w", err)
	}
	return res, nil
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
