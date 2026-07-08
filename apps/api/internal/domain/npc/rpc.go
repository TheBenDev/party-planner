package npc

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"math"

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
	characterLevel, err := sqlNullInt16(req.Msg.Level)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	npc, err := s.Npc.Create(ctx, &model.CreateNpcRequest{
		CampaignID:            req.Msg.CampaignId,
		Name:                  req.Msg.Name,
		Status:                status,
		RelationToPartyStatus: relation,
		IsKnownToParty:        req.Msg.IsKnownToParty,
		Age:                   sqlNullString(req.Msg.Age),
		Appearance:            sqlNullString(req.Msg.Appearance),
		Avatar:                sqlNullString(req.Msg.Avatar),
		Backstory:             sqlNullString(req.Msg.Backstory),
		CharacterClass:        sqlNullString(req.Msg.CharacterClass),
		DmNotes:               sqlNullString(req.Msg.DmNotes),
		FoundryActorID:        sqlNullString(req.Msg.FoundryActorId),
		HealthCondition:       protoToHealthCondition(req.Msg.HealthCondition),
		KnownName:             sqlNullString(req.Msg.KnownName),
		Labels:                req.Msg.Labels,
		Level:                 characterLevel,
		Personality:           sqlNullString(req.Msg.Personality),
		PlayerNotes:           sqlNullString(req.Msg.PlayerNotes),
		Race:                  sqlNullString(req.Msg.Race),
		Role:                  sqlNullString(req.Msg.Role),
		CurrentLocationID:     sqlNullString(req.Msg.CurrentLocationId),
		OriginLocationID:      sqlNullString(req.Msg.OriginLocationId),
		SessionEncounteredID:  sqlNullString(req.Msg.SessionEncounteredId),
		ColonyID:              sqlNullString(req.Msg.ColonyId),
		WorkforceID:           sqlNullString(req.Msg.WorkforceId),
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

	npc, err := s.Npc.GetByID(ctx, req.Msg.Id, req.Msg.CampaignId)
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

	npcs, err := s.Npc.ListByCampaign(ctx, req.Msg.CampaignId)
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

func (s *Server) ListNpcsByColony(ctx context.Context, req *connect.Request[v1.ListNpcsByColonyRequest]) (*connect.Response[v1.ListNpcsByColonyResponse], error) {
	if req.Msg.ColonyId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("colony id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	npcs, err := s.Npc.ListByColony(ctx, req.Msg.ColonyId, req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to list npcs by colony")
	}

	protoNpcs := make([]*v1.Npc, len(npcs))
	for i, npc := range npcs {
		protoNpcs[i] = npcToProto(npc)
	}

	return connect.NewResponse(&v1.ListNpcsByColonyResponse{
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

	var healthCondition *model.HealthCondition
	if req.Msg.HealthCondition != nil {
		if *req.Msg.HealthCondition == v1.HealthCondition_HEALTH_CONDITION_UNSPECIFIED {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("health condition cannot be unspecified"))
		}
		h := protoToHealthCondition(*req.Msg.HealthCondition)
		healthCondition = &h
	}
	characterLevel, err := sqlNullInt16(req.Msg.Level)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}
	npc, err := s.Npc.Update(ctx, &model.UpdateNpcRequest{
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
		CharacterClass:        sqlNullString(req.Msg.CharacterClass),
		DmNotes:               sqlNullString(req.Msg.DmNotes),
		FoundryActorID:        sqlNullString(req.Msg.FoundryActorId),
		HealthCondition:       healthCondition,
		KnownName:             sqlNullString(req.Msg.KnownName),
		Labels:                req.Msg.Labels,
		Level:                 characterLevel,
		Personality:           sqlNullString(req.Msg.Personality),
		PlayerNotes:           sqlNullString(req.Msg.PlayerNotes),
		Race:                  sqlNullString(req.Msg.Race),
		Role:                  sqlNullString(req.Msg.Role),
		CurrentLocationID:     sqlNullString(req.Msg.CurrentLocationId),
		OriginLocationID:      sqlNullString(req.Msg.OriginLocationId),
		SessionEncounteredID:  sqlNullString(req.Msg.SessionEncounteredId),
		ColonyID:              sqlNullString(req.Msg.ColonyId),
		WorkforceID:           sqlNullString(req.Msg.WorkforceId),
		Aliases:               req.Msg.Aliases,
		RemovedFields:         req.Msg.RemovedFields,
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

	if err := s.Npc.Remove(ctx, req.Msg.Id, req.Msg.CampaignId); err != nil {
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

func protoToHealthCondition(h v1.HealthCondition) model.HealthCondition {
	switch h {
	case v1.HealthCondition_HEALTH_CONDITION_UNKNOWN:
		return model.HealthConditionUnknown
	case v1.HealthCondition_HEALTH_CONDITION_HEALTHY:
		return model.HealthConditionHealthy
	case v1.HealthCondition_HEALTH_CONDITION_SICK:
		return model.HealthConditionSick
	case v1.HealthCondition_HEALTH_CONDITION_INJURED:
		return model.HealthConditionInjured
	case v1.HealthCondition_HEALTH_CONDITION_DEAD:
		return model.HealthConditionDead
	default:
		return model.HealthConditionHealthy
	}
}

func healthConditionToProto(h model.HealthCondition) v1.HealthCondition {
	switch h {
	case model.HealthConditionUnknown:
		return v1.HealthCondition_HEALTH_CONDITION_UNKNOWN
	case model.HealthConditionHealthy:
		return v1.HealthCondition_HEALTH_CONDITION_HEALTHY
	case model.HealthConditionSick:
		return v1.HealthCondition_HEALTH_CONDITION_SICK
	case model.HealthConditionInjured:
		return v1.HealthCondition_HEALTH_CONDITION_INJURED
	case model.HealthConditionDead:
		return v1.HealthCondition_HEALTH_CONDITION_DEAD
	default:
		return v1.HealthCondition_HEALTH_CONDITION_UNSPECIFIED
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
		HealthCondition:       healthConditionToProto(npc.HealthCondition),
		Labels:                npc.Labels,
		Aliases:               npc.Aliases,
		CreatedAt:             timestamppb.New(npc.CreatedAt),
		UpdatedAt:             timestamppb.New(npc.UpdatedAt),
	}
	proto.Age = nullStringPtr(npc.Age)
	proto.Appearance = nullStringPtr(npc.Appearance)
	proto.Avatar = nullStringPtr(npc.Avatar)
	proto.Backstory = nullStringPtr(npc.Backstory)
	proto.CharacterClass = nullStringPtr(npc.CharacterClass)
	proto.CurrentLocationId = nullStringPtr(npc.CurrentLocationID)
	proto.DmNotes = nullStringPtr(npc.DmNotes)
	proto.FoundryActorId = nullStringPtr(npc.FoundryActorID)
	proto.KnownName = nullStringPtr(npc.KnownName)
	proto.Level = nullInt16Ptr(npc.Level)
	proto.OriginLocationId = nullStringPtr(npc.OriginLocationID)
	proto.Personality = nullStringPtr(npc.Personality)
	proto.PlayerNotes = nullStringPtr(npc.PlayerNotes)
	proto.Race = nullStringPtr(npc.Race)
	proto.Role = nullStringPtr(npc.Role)
	proto.SessionEncounteredId = nullStringPtr(npc.SessionEncounteredID)
	proto.ColonyId = nullStringPtr(npc.ColonyID)
	proto.WorkforceId = nullStringPtr(npc.WorkforceID)
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

func sqlNullInt16(i *int32) (sql.NullInt16, error) {
	if i == nil {
		return sql.NullInt16{Valid: false}, nil
	}
	if *i < math.MinInt16 || *i > math.MaxInt16 {
		return sql.NullInt16{}, fmt.Errorf("level must be between %d and %d", math.MinInt16, math.MaxInt16)
	}
	return sql.NullInt16{Int16: int16(*i), Valid: true}, nil
}

func nullStringPtr(ns sql.NullString) *string {
	if !ns.Valid {
		return nil
	}
	return &ns.String
}

func nullInt16Ptr(ni sql.NullInt16) *int32 {
	if !ni.Valid {
		return nil
	}
	v := int32(ni.Int16)
	return &v
}
