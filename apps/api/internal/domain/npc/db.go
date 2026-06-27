package npc

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
	"github.com/lib/pq"
)

// DB wraps a [sql.DB] connection for NPC queries.
type DB struct {
	conn pg.Querier
	raw  *sql.DB
}

// NewDB creates a new NPC DB wrapping the given connection.
func NewDB(conn *sql.DB) *DB {
	return &DB{conn: conn, raw: conn}
}

// ── NPC ───────────────────────────────────────────────────────────────────────

const npcColumns = `id, campaign_id, name, status, relation_to_party_status, is_known_to_party, ` +
	`age, appearance, avatar, backstory, dm_notes, foundry_actor_id, known_name, personality, ` +
	`player_notes, race, current_location_id, origin_location_id, session_encountered_id, ` +
	`aliases, last_foundry_sync_at, created_at, updated_at`

func scanNpc(row interface{ Scan(...any) error }) (*model.Npc, error) {
	var n model.Npc
	err := row.Scan(
		&n.ID, &n.CampaignID, &n.Name, &n.Status, &n.RelationToPartyStatus, &n.IsKnownToParty,
		&n.Age, &n.Appearance, &n.Avatar, &n.Backstory, &n.DmNotes, &n.FoundryActorID,
		&n.KnownName, &n.Personality, &n.PlayerNotes, &n.Race,
		&n.CurrentLocationID, &n.OriginLocationID, &n.SessionEncounteredID,
		pq.Array(&n.Aliases), &n.LastFoundrySyncAt,
		&n.CreatedAt, &n.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &n, nil
}

func (db *DB) CreateNpc(ctx context.Context, npc *model.CreateNpcRequest) (*model.Npc, error) {
	row := db.conn.QueryRowContext(ctx, `
		INSERT INTO non_player_character (
			campaign_id, name, status, relation_to_party_status, is_known_to_party,
			age, appearance, avatar, backstory, dm_notes, foundry_actor_id, known_name,
			personality, player_notes, race, current_location_id, origin_location_id,
			session_encountered_id, aliases
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
		RETURNING `+npcColumns,
		npc.CampaignID, npc.Name, npc.Status, npc.RelationToPartyStatus, npc.IsKnownToParty,
		npc.Age, npc.Appearance, npc.Avatar, npc.Backstory, npc.DmNotes, npc.FoundryActorID,
		npc.KnownName, npc.Personality, npc.PlayerNotes, npc.Race,
		npc.CurrentLocationID, npc.OriginLocationID, npc.SessionEncounteredID,
		pq.Array(npc.Aliases),
	)
	return scanNpc(row)
}

func (db *DB) GetNpc(ctx context.Context, id, campaignID string) (*model.Npc, error) {
	row := db.conn.QueryRowContext(ctx,
		`SELECT `+npcColumns+` FROM non_player_character WHERE id = $1 AND campaign_id = $2 LIMIT 1`,
		id, campaignID,
	)
	return scanNpc(row)
}

func (db *DB) ListNpcsByCampaign(ctx context.Context, campaignID string) ([]*model.Npc, error) {
	rows, err := db.conn.QueryContext(ctx,
		`SELECT `+npcColumns+` FROM non_player_character WHERE campaign_id = $1`,
		campaignID,
	)
	if err != nil {
		return nil, fmt.Errorf("list npcs: %w", err)
	}
	defer func() {
		if err := rows.Close(); err != nil {
			slog.Error("failed to close rows", "error", err)
		}
	}()

	var npcs []*model.Npc
	for rows.Next() {
		npc, err := scanNpc(rows)
		if err != nil {
			return nil, fmt.Errorf("scan npc: %w", err)
		}
		npcs = append(npcs, npc)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list npcs rows: %w", err)
	}
	return npcs, nil
}

func (db *DB) GetNpcByNameAndCampaign(ctx context.Context, name, campaignID string) (*model.Npc, error) {
	pattern := "%" + escapeLikePattern(name) + "%"
	row := db.conn.QueryRowContext(ctx, `
		SELECT `+npcColumns+` FROM non_player_character
		WHERE campaign_id = $1 AND name ILIKE $2 ESCAPE '\'
		LIMIT 1`, campaignID, pattern)
	return scanNpc(row)
}

func (db *DB) UpdateNpc(ctx context.Context, npc *model.UpdateNpcRequest) (*model.Npc, error) {
	row := db.conn.QueryRowContext(ctx, `
		UPDATE non_player_character SET
			name                  = COALESCE($1, name),
			status                = COALESCE($2, status),
			relation_to_party_status = COALESCE($3, relation_to_party_status),
			is_known_to_party     = COALESCE($4, is_known_to_party),
			age                   = $5,
			appearance            = $6,
			avatar                = $7,
			backstory             = $8,
			dm_notes              = $9,
			foundry_actor_id      = $10,
			known_name            = $11,
			personality           = $12,
			player_notes          = $13,
			race                  = $14,
			current_location_id   = $15,
			origin_location_id    = $16,
			session_encountered_id = $17,
			aliases               = $18,
			updated_at            = NOW()
		WHERE id = $19 AND campaign_id = $20
		RETURNING `+npcColumns,
		npc.Name, npc.Status, npc.RelationToPartyStatus, npc.IsKnownToParty,
		npc.Age, npc.Appearance, npc.Avatar, npc.Backstory, npc.DmNotes, npc.FoundryActorID,
		npc.KnownName, npc.Personality, npc.PlayerNotes, npc.Race,
		npc.CurrentLocationID, npc.OriginLocationID, npc.SessionEncounteredID,
		pq.Array(npc.Aliases),
		npc.ID, npc.CampaignID,
	)
	return scanNpc(row)
}

func (db *DB) RemoveNpc(ctx context.Context, id, campaignID string) error {
	_, err := db.conn.ExecContext(ctx,
		`DELETE FROM non_player_character WHERE id = $1 AND campaign_id = $2`,
		id, campaignID,
	)
	if err != nil {
		return fmt.Errorf("remove npc: %w", err)
	}
	return nil
}

// escapeLikePattern escapes special characters in LIKE patterns.
func escapeLikePattern(s string) string {
	result := ""
	for _, c := range s {
		switch c {
		case '%', '_', '\\':
			result += "\\"
		}
		result += string(c)
	}
	return result
}
