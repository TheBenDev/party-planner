package service

import (
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	"github.com/BBruington/party-planner/api/internal/db"
	model "github.com/BBruington/party-planner/api/internal/models"
)

var (
	ErrCampaignInvitationNotFound        = errors.New("campaign invitation not found")
	ErrCampaignInvitationAlreadyExists   = errors.New("campaign invitation already exists")
	ErrCampaignInvitationInvalidCampaign = errors.New("campaign does not exist")
)

type CampaignInvitationService struct {
	DB  *db.DB
	Log *slog.Logger
}

func (s *CampaignInvitationService) Create(invitation *model.CreateCampaignInvitationRequest) (*model.CampaignInvitation, error) {
	created, err := s.DB.CreateCampaignInvitation(invitation)
	if err != nil {
		if mapped := mapCampaignInvitationPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create campaign invitation error: %w", err)
	}
	return created, nil
}

func (s *CampaignInvitationService) Get(id string) (*model.CampaignInvitation, error) {
	invitation, err := s.DB.GetCampaignInvitation(id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCampaignInvitationNotFound
		}
		return nil, fmt.Errorf("get campaign invitation error: %w", err)
	}
	return invitation, nil
}

func (s *CampaignInvitationService) UpdateStatus(id string, status model.InvitationStatus) (*model.CampaignInvitation, error) {
	invitation, err := s.DB.UpdateCampaignInvitationStatus(id, status)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCampaignInvitationNotFound
		}
		if mapped := mapCampaignInvitationPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("update campaign invitation status error: %w", err)
	}
	return invitation, nil
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
