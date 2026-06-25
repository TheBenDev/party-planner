package member

import (
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"time"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
)

// Domain errors.
var (
	ErrCampaignUserInvalidCampaign       = errors.New("campaign does not exist")
	ErrCampaignUserInvalidUser           = errors.New("user does not exist")
	ErrCampaignUserNotFound              = errors.New("campaign user not found")
	ErrCampaignUserAlreadyExists         = errors.New("campaign user already exists")
	ErrInvitationExpired                 = errors.New("campaign invitation is expired")
	ErrCampaignInvitationNotFound        = errors.New("campaign invitation not found")
	ErrCampaignInvitationAlreadyExists   = errors.New("campaign invitation already exists")
	ErrCampaignInvitationInvalidCampaign = errors.New("campaign does not exist")
	ErrUserNotFound                      = errors.New("user not found")
)

type Store interface {
	CreateCampaignUser(req *model.CreateMemberRequest) (*model.Member, error)
	GetCampaignUser(campaignID, userID string) (*model.Member, error)
	ListCampaignUsersByCampaign(campaignID string) ([]*model.MemberWithUser, error)
	ListCampaignUsersByUser(userID string) ([]*model.MemberWithUser, error)
	RemoveCampaignUser(campaignID, userID string) error
	UpdateCampaignUserRole(campaignID, userID string, role model.MemberRole) (*model.Member, error)
	CreateCampaignInvitation(req *model.CreateCampaignInvitationRequest) (*model.CampaignInvitation, error)
	GetCampaignInvitationByEmail(campaignID, inviteeEmail string, status model.InvitationStatus) (*model.CampaignInvitation, error)
	GetCampaignInvitationByToken(token string) (*model.GetCampaignInvitationResponse, error)
	ListCampaignInvitations(campaignID string) ([]*model.CampaignInvitation, error)
	AcceptCampaignInvitation(token string, role model.MemberRole) (*model.CampaignInvitation, error)
	DeclineCampaignInvitation(token string) (*model.CampaignInvitation, error)
	RevokeCampaignInvitation(invitationID, campaignID string) (*model.CampaignInvitation, error)
	GetUserByEmail(email string) (*model.User, error)
	RunInTx(fn func(Store) error) error
}

type Service struct {
	DB  Store
	Log *slog.Logger
}

func (s *Service) Create(req *model.CreateMemberRequest) (*model.Member, error) {
	member, err := s.DB.CreateCampaignUser(req)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create campaign user: %w", err)
	}
	return member, nil
}

func (s *Service) Get(campaignID, userID string) (*model.Member, error) {
	member, err := s.DB.GetCampaignUser(campaignID, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCampaignUserNotFound
		}
		return nil, fmt.Errorf("get campaign user: %w", err)
	}
	return member, nil
}

func (s *Service) ListByCampaign(campaignID string) ([]*model.MemberWithUser, error) {
	members, err := s.DB.ListCampaignUsersByCampaign(campaignID)
	if err != nil {
		return nil, fmt.Errorf("list campaign users by campaign: %w", err)
	}
	return members, nil
}

func (s *Service) ListByUser(userID string) ([]*model.MemberWithUser, error) {
	members, err := s.DB.ListCampaignUsersByUser(userID)
	if err != nil {
		return nil, fmt.Errorf("list campaign users by user: %w", err)
	}
	return members, nil
}

func (s *Service) Remove(campaignID, userID string) error {
	err := s.DB.RemoveCampaignUser(campaignID, userID)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return mapped
		}
		return fmt.Errorf("remove campaign user: %w", err)
	}
	return nil
}

func (s *Service) UpdateRole(campaignID, userID string, role model.MemberRole) (*model.Member, error) {
	member, err := s.DB.UpdateCampaignUserRole(campaignID, userID, role)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCampaignUserNotFound
		}
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("update campaign user role: %w", err)
	}
	return member, nil
}

func (s *Service) AcceptInvitation(token string) (*model.InvitationResponse, error) {
	var inv *model.CampaignInvitation
	var member *model.Member

	err := s.DB.RunInTx(func(tx Store) error {
		var err error

		i, err := tx.GetCampaignInvitationByToken(token)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return ErrCampaignInvitationNotFound
			}
			if mapped := mapPgError(err); mapped != err {
				return mapped
			}
			return fmt.Errorf("get invitation: %w", err)
		}

		user, err := tx.GetUserByEmail(i.Invitation.InviteeEmail)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return ErrUserNotFound
			}
			if mapped := mapPgError(err); mapped != err {
				return mapped
			}
			return fmt.Errorf("get user: %w", err)
		}

		inv, err = tx.AcceptCampaignInvitation(token, i.Invitation.Role)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return ErrCampaignInvitationNotFound
			}
			if mapped := mapPgError(err); mapped != err {
				return mapped
			}
			return fmt.Errorf("accept invitation: %w", err)
		}

		member, err = tx.CreateCampaignUser(&model.CreateMemberRequest{
			CampaignID: inv.CampaignID,
			UserID:     user.ID,
			Role:       inv.Role,
		})
		if err != nil {
			if mapped := mapPgError(err); mapped != err {
				return mapped
			}
			return fmt.Errorf("create campaign user: %w", err)
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

func (s *Service) DeclineInvitation(token string) (*model.InvitationResponse, error) {
	inv, err := s.DB.DeclineCampaignInvitation(token)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return &model.InvitationResponse{}, nil
		}
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("decline invitation: %w", err)
	}

	return &model.InvitationResponse{
		Invitation: inv,
	}, nil
}

func (s *Service) CreateInvitation(req *model.CreateCampaignInvitationRequest) (*model.CampaignInvitation, error) {
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
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create campaign invitation: %w", err)
	}
	return inv, nil
}

func (s *Service) GetInvitation(token string) (*model.GetCampaignInvitationResponse, error) {
	res, err := s.DB.GetCampaignInvitationByToken(token)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCampaignInvitationNotFound
		}
		return nil, fmt.Errorf("get campaign invitation: %w", err)
	}
	return res, nil
}

func (s *Service) ListInvitations(campaignID string) ([]*model.CampaignInvitation, error) {
	invitations, err := s.DB.ListCampaignInvitations(campaignID)
	if err != nil {
		return nil, fmt.Errorf("list campaign invitations: %w", err)
	}
	return invitations, nil
}

func (s *Service) RevokeInvitation(invitationID, campaignID string) (*model.CampaignInvitation, error) {
	inv, err := s.DB.RevokeCampaignInvitation(invitationID, campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCampaignInvitationNotFound
		}
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("revoke campaign invitation: %w", err)
	}
	return inv, nil
}

func mapPgError(err error) error {
	if pg.IsError(err, pg.UniqueViolation) {
		constraint := pg.Constraint(err)
		switch constraint {
		case "campaign_users_pkey", "campaign_users_campaign_id_user_id_key":
			return ErrCampaignUserAlreadyExists
		case "campaign_invitations_pkey", "campaign_invitations_campaign_id_invitee_email_key":
			return ErrCampaignInvitationAlreadyExists
		default:
			return ErrCampaignUserAlreadyExists
		}
	}
	if pg.IsError(err, pg.ForeignKeyViolation) {
		constraint := pg.Constraint(err)
		switch constraint {
		case "fk_campaign_user_campaign_id":
			return ErrCampaignUserInvalidCampaign
		case "fk_campaign_user_user_id":
			return ErrCampaignUserInvalidUser
		case "fk_invitation_campaign_id":
			return ErrCampaignInvitationInvalidCampaign
		}
	}
	return err
}
