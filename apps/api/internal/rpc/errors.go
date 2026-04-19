package rpc

import (
	"context"
	"log/slog"

	"connectrpc.com/connect"
	"github.com/BBruington/party-planner/api/internal/service"
)

func mapServiceError(ctx context.Context, log *slog.Logger, err error, fallbackMsg string) error {
	switch err {
	// Campaign
	case service.ErrCampaignNotFound:
		return connect.NewError(connect.CodeNotFound, err)
	case service.ErrCampaignAlreadyExists:
		return connect.NewError(connect.CodeAlreadyExists, err)
	case service.ErrCampaignInvalidUser:
		return connect.NewError(connect.CodeInvalidArgument, err)
	// Campaign integration
	case service.ErrCampaignIntegrationNotFound:
		return connect.NewError(connect.CodeNotFound, err)
	case service.ErrCampaignIntegrationAlreadyExists:
		return connect.NewError(connect.CodeAlreadyExists, err)
	case service.ErrCampaignIntegrationInvalidCampaign:
		return connect.NewError(connect.CodeInvalidArgument, err)
	case service.ErrInvitationExpired:
		return connect.NewError(connect.CodeFailedPrecondition, err)
	// Campaign User
	case service.ErrCampaignUserNotFound:
		return connect.NewError(connect.CodeNotFound, err)
	case service.ErrCampaignUserAlreadyExists:
		return connect.NewError(connect.CodeAlreadyExists, err)
	case service.ErrCampaignUserInvalidCampaign:
		return connect.NewError(connect.CodeInvalidArgument, err)
	case service.ErrCampaignUserInvalidUser:
		return connect.NewError(connect.CodeInvalidArgument, err)
	// Campaign Invitation
	case service.ErrCampaignInvitationInvalidCampaign:
		return connect.NewError(connect.CodeInvalidArgument, err)
	case service.ErrCampaignInvitationNotFound:
		return connect.NewError(connect.CodeNotFound, err)
	case service.ErrCampaignInvitationAlreadyExists:
		return connect.NewError(connect.CodeAlreadyExists, err)
	// Npc
	case service.ErrNpcNotFound:
		return connect.NewError(connect.CodeNotFound, err)
	case service.ErrNpcAlreadyExists:
		return connect.NewError(connect.CodeAlreadyExists, err)
	case service.ErrNpcInvalidCampaign:
		return connect.NewError(connect.CodeInvalidArgument, err)
	case service.ErrNpcInvalidOriginLocation:
		return connect.NewError(connect.CodeInvalidArgument, err)
	case service.ErrNpcInvalidCurrentLocation:
		return connect.NewError(connect.CodeInvalidArgument, err)
	case service.ErrNpcInvalidSessionEncountered:
		return connect.NewError(connect.CodeInvalidArgument, err)
	// Quest
	case service.ErrQuestNotFound:
		return connect.NewError(connect.CodeNotFound, err)
	case service.ErrQuestAlreadyExists:
		return connect.NewError(connect.CodeAlreadyExists, err)
	case service.ErrQuestInvalidCampaign:
		return connect.NewError(connect.CodeInvalidArgument, err)
	case service.ErrQuestInvalidQuestGiver:
		return connect.NewError(connect.CodeInvalidArgument, err)
	// Session
	case service.ErrSessionNotFound:
		return connect.NewError(connect.CodeNotFound, err)
	case service.ErrSessionAlreadyExists:
		return connect.NewError(connect.CodeAlreadyExists, err)
	case service.ErrSessionInvalidCampaign:
		return connect.NewError(connect.CodeInvalidArgument, err)
	// User
	case service.ErrUserNotFound:
		return connect.NewError(connect.CodeNotFound, err)
	case service.ErrUserAlreadyExists:
		return connect.NewError(connect.CodeAlreadyExists, err)
	case service.ErrUserEmailTaken:
		return connect.NewError(connect.CodeAlreadyExists, err)
	case service.ErrUserExternalIdTaken:
		return connect.NewError(connect.CodeAlreadyExists, err)
	default:
		return internalErr(ctx, log, fallbackMsg, err)
	}
}
