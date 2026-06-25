package npc

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"

	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/gen/planner/v1/plannerv1connect"
	model "github.com/BBruington/party-planner/api/internal/models"
)

// Server implements the NonPlayerCharacterService ConnectRPC handler.
type Server struct {
	plannerv1connect.UnimplementedNonPlayerCharacterServiceHandler
	Npc *Service
	Log *slog.Logger
}

func (s *Server) CreateNpc(ctx context.Context, req *connect.Request[v1.CreateNpcRequest]) (*connect.Response[v1.CreateNpcResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.Name == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("name required"))
	}
	if req.Msg.Status == v1.CharacterStatus_CHARACTER_STATUS_UNSPECIFIED {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("status required"))
	}
	if req.Msg.RelationToPartyStatus == v1.RelationToParty_RELATION_TO_PARTY_UNSPECIFIED {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("relation to party status required"))
	}

	status, err := protoToCharacterStatus(req.Msg.Status)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}
	relation, err := protoToRelationToParty(req.Msg.RelationToPartyStatus)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	npc, err := s.Npc.Create(&model.CreateNpcRequest{
		CampaignID:            req.Msg.CampaignId,
		Name:                  req.Msg.Name,
		Status:                status,
		RelationToPartyStatus: relation,
		IsKnownToParty:        req.Msg.IsKnownToParty,
		Age:                   sqlNullString(req.Msg.Age),
		Appearance:            sqlNullString(req.Msg.Appearance),
		Avatar:                sqlNullString(req.Msg.Avatar),
		Backstory:             sqlNullString(req.Msg.Backstory),
		DmNotes:               sqlNullString(req.Msg.DmNotes),
		FoundryActorID:        sqlNullString(req.Msg.FoundryActorId),
		KnownName:             sqlNullString(req.Msg.KnownName),
		Personality:           sqlNullString(req.Msg.Personality),
		PlayerNotes:           sqlNullString(req.Msg.PlayerNotes),
		Race:                  sqlNullString(req.Msg.Race),
		CurrentLocationID:     sqlNullString(req.Msg.CurrentLocationId),
		OriginLocationID:      sqlNullString(req.Msg.OriginLocationId),
		SessionEncounteredID:  sqlNullString(req.Msg.SessionEncounteredId),
		Aliases:               req.Msg.Aliases,
	})
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to create npc")
	}

	return connect.NewResponse(&v1.CreateNpcResponse{
		Npc: npcToProto(npc),
	}), nil
}

func (s *Server) GetNpc(ctx context.Context, req *connect.Request[v1.GetNpcRequest]) (*connect.Response[v1.GetNpcResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	npc, err := s.Npc.GetByID(req.Msg.Id, req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to get npc")
	}

	return connect.NewResponse(&v1.GetNpcResponse{
		Npc: npcToProto(npc),
	}), nil
}

func (s *Server) ListNpcsByCampaign(ctx context.Context, req *connect.Request[v1.ListNpcsByCampaignRequest]) (*connect.Response[v1.ListNpcsByCampaignResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	npcs, err := s.Npc.ListByCampaign(req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to list npcs")
	}

	protoNpcs := make([]*v1.Npc, len(npcs))
	for i, npc := range npcs {
		protoNpcs[i] = npcToProto(npc)
	}

	return connect.NewResponse(&v1.ListNpcsByCampaignResponse{
		Npcs: protoNpcs,
	}), nil
}

func (s *Server) UpdateNpc(ctx context.Context, req *connect.Request[v1.UpdateNpcRequest]) (*connect.Response[v1.UpdateNpcResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	var status *model.CharacterStatus
	if req.Msg.Status != nil {
		if *req.Msg.Status == v1.CharacterStatus_CHARACTER_STATUS_UNSPECIFIED {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("status cannot be unspecified"))
		}
		s, err := protoToCharacterStatus(*req.Msg.Status)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		status = &s
	}

	var relation *model.RelationToParty
	if req.Msg.RelationToPartyStatus != nil {
		if *req.Msg.RelationToPartyStatus == v1.RelationToParty_RELATION_TO_PARTY_UNSPECIFIED {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("relation to party status cannot be unspecified"))
		}
		r, err := protoToRelationToParty(*req.Msg.RelationToPartyStatus)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		relation = &r
	}

	npc, err := s.Npc.Update(&model.UpdateNpcRequest{
		ID:                    req.Msg.Id,
		CampaignID:            req.Msg.CampaignId,
		Name:                  req.Msg.Name,
		Status:                status,
		RelationToPartyStatus: relation,
		IsKnownToParty:        req.Msg.IsKnownToParty,
		Age:                   sqlNullString(req.Msg.Age),
		Appearance:            sqlNullString(req.Msg.Appearance),
		Avatar:                sqlNullString(req.Msg.Avatar),
		Backstory:             sqlNullString(req.Msg.Backstory),
		DmNotes:               sqlNullString(req.Msg.DmNotes),
		FoundryActorID:        sqlNullString(req.Msg.FoundryActorId),
		KnownName:             sqlNullString(req.Msg.KnownName),
		Personality:           sqlNullString(req.Msg.Personality),
		PlayerNotes:           sqlNullString(req.Msg.PlayerNotes),
		Race:                  sqlNullString(req.Msg.Race),
		CurrentLocationID:     sqlNullString(req.Msg.CurrentLocationId),
		OriginLocationID:      sqlNullString(req.Msg.OriginLocationId),
		SessionEncounteredID:  sqlNullString(req.Msg.SessionEncounteredId),
		Aliases:               req.Msg.Aliases,
	})
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to update npc")
	}

	return connect.NewResponse(&v1.UpdateNpcResponse{
		Npc: npcToProto(npc),
	}), nil
}

func (s *Server) RemoveNpc(ctx context.Context, req *connect.Request[v1.RemoveNpcRequest]) (*connect.Response[v1.RemoveNpcResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	if err := s.Npc.Remove(req.Msg.Id, req.Msg.CampaignId); err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to remove npc")
	}

	return connect.NewResponse(&v1.RemoveNpcResponse{}), nil
}

// ── Proto conversion ──────────────────────────────────────────────────────────

func protoToCharacterStatus(s v1.CharacterStatus) (model.CharacterStatus, error) {
	switch s {
	case v1.CharacterStatus_CHARACTER_STATUS_UNKNOWN:
		return model.CharacterStatusUnknown, nil
	case v1.CharacterStatus_CHARACTER_STATUS_ALIVE:
		return model.CharacterStatusAlive, nil
	case v1.CharacterStatus_CHARACTER_STATUS_DEAD:
		return model.CharacterStatusDead, nil
	case v1.CharacterStatus_CHARACTER_STATUS_MISSING:
		return model.CharacterStatusMissing, nil
	default:
		return "", fmt.Errorf("unknown character status: %v", s)
	}
}

func characterStatusToProto(s model.CharacterStatus) v1.CharacterStatus {
	switch s {
	case model.CharacterStatusUnknown:
		return v1.CharacterStatus_CHARACTER_STATUS_UNKNOWN
	case model.CharacterStatusAlive:
		return v1.CharacterStatus_CHARACTER_STATUS_ALIVE
	case model.CharacterStatusDead:
		return v1.CharacterStatus_CHARACTER_STATUS_DEAD
	case model.CharacterStatusMissing:
		return v1.CharacterStatus_CHARACTER_STATUS_MISSING
	default:
		return v1.CharacterStatus_CHARACTER_STATUS_UNSPECIFIED
	}
}

func protoToRelationToParty(r v1.RelationToParty) (model.RelationToParty, error) {
	switch r {
	case v1.RelationToParty_RELATION_TO_PARTY_UNKNOWN:
		return model.RelationToPartyUnknown, nil
	case v1.RelationToParty_RELATION_TO_PARTY_ALLY:
		return model.RelationToPartyAlly, nil
	case v1.RelationToParty_RELATION_TO_PARTY_ENEMY:
		return model.RelationToPartyEnemy, nil
	case v1.RelationToParty_RELATION_TO_PARTY_NEUTRAL:
		return model.RelationToPartyNeutral, nil
	case v1.RelationToParty_RELATION_TO_PARTY_SUSPICIOUS:
		return model.RelationToPartySuspicious, nil
	default:
		return "", fmt.Errorf("unknown relation to party: %v", r)
	}
}

func relationToPartyToProto(r model.RelationToParty) v1.RelationToParty {
	switch r {
	case model.RelationToPartyUnknown:
		return v1.RelationToParty_RELATION_TO_PARTY_UNKNOWN
	case model.RelationToPartyAlly:
		return v1.RelationToParty_RELATION_TO_PARTY_ALLY
	case model.RelationToPartyEnemy:
		return v1.RelationToParty_RELATION_TO_PARTY_ENEMY
	case model.RelationToPartyNeutral:
		return v1.RelationToParty_RELATION_TO_PARTY_NEUTRAL
	case model.RelationToPartySuspicious:
		return v1.RelationToParty_RELATION_TO_PARTY_SUSPICIOUS
	default:
		return v1.RelationToParty_RELATION_TO_PARTY_UNSPECIFIED
	}
}

func npcToProto(npc *model.Npc) *v1.Npc {
	if npc == nil {
		return nil
	}
	proto := &v1.Npc{
		Id:                    npc.ID,
		CampaignId:            npc.CampaignID,
		Name:                  npc.Name,
		Status:                characterStatusToProto(npc.Status),
		RelationToPartyStatus: relationToPartyToProto(npc.RelationToPartyStatus),
		IsKnownToParty:        npc.IsKnownToParty,
		Aliases:               npc.Aliases,
		CreatedAt:             timestamppb.New(npc.CreatedAt),
		UpdatedAt:             timestamppb.New(npc.UpdatedAt),
	}
	if npc.Age.Valid {
		proto.Age = &npc.Age.String
	}
	if npc.Appearance.Valid {
		proto.Appearance = &npc.Appearance.String
	}
	if npc.Avatar.Valid {
		proto.Avatar = &npc.Avatar.String
	}
	if npc.Backstory.Valid {
		proto.Backstory = &npc.Backstory.String
	}
	if npc.DmNotes.Valid {
		proto.DmNotes = &npc.DmNotes.String
	}
	if npc.FoundryActorID.Valid {
		proto.FoundryActorId = &npc.FoundryActorID.String
	}
	if npc.KnownName.Valid {
		proto.KnownName = &npc.KnownName.String
	}
	if npc.Personality.Valid {
		proto.Personality = &npc.Personality.String
	}
	if npc.PlayerNotes.Valid {
		proto.PlayerNotes = &npc.PlayerNotes.String
	}
	if npc.Race.Valid {
		proto.Race = &npc.Race.String
	}
	if npc.CurrentLocationID.Valid {
		proto.CurrentLocationId = &npc.CurrentLocationID.String
	}
	if npc.OriginLocationID.Valid {
		proto.OriginLocationId = &npc.OriginLocationID.String
	}
	if npc.SessionEncounteredID.Valid {
		proto.SessionEncounteredId = &npc.SessionEncounteredID.String
	}
	if npc.LastFoundrySyncAt.Valid {
		proto.LastFoundrySyncAt = timestamppb.New(npc.LastFoundrySyncAt.Time)
	}
	return proto
}

// ── Error mapping ─────────────────────────────────────────────────────────────

func mapError(ctx context.Context, log *slog.Logger, err error, fallback string) error {
	switch err {
	case ErrNotFound:
		return connect.NewError(connect.CodeNotFound, err)
	case ErrAlreadyExists:
		return connect.NewError(connect.CodeAlreadyExists, err)
	case ErrInvalidCampaign:
		return connect.NewError(connect.CodeInvalidArgument, err)
	case ErrInvalidCurrentLocation:
		return connect.NewError(connect.CodeInvalidArgument, err)
	case ErrInvalidOriginLocation:
		return connect.NewError(connect.CodeInvalidArgument, err)
	case ErrInvalidSessionEncountered:
		return connect.NewError(connect.CodeInvalidArgument, err)
	default:
		log.ErrorContext(ctx, fallback, "error", err)
		return connect.NewError(connect.CodeInternal, errors.New(fallback))
	}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func sqlNullString(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: *s, Valid: true}
}
