package db

import (
	"database/sql"
	"fmt"
	"log/slog"
	"strings"

	model "github.com/BBruington/party-planner/api/internal/models"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/lib/pq"
)

type sqlQuerier interface {
	Exec(query string, args ...any) (sql.Result, error)
	QueryRow(query string, args ...any) *sql.Row
	Query(query string, args ...any) (*sql.Rows, error)
}

type DB struct {
	conn sqlQuerier
	raw  *sql.DB
	log  *slog.Logger
}

func New(connString string, log *slog.Logger) (*DB, error) {
	sep := "?"
	if strings.Contains(connString, "?") {
		sep = "&"
	}
	connString += sep + "default_query_exec_mode=cache_describe"

	raw, err := sql.Open("pgx", connString)
	if err != nil {
		return nil, fmt.Errorf("open pgx: %w", err)
	}
	return &DB{conn: raw, raw: raw, log: log}, nil
}

func (db *DB) Close() error {
	return db.raw.Close()
}

func (db *DB) QueryRow(query string, args ...any) *sql.Row {
	return db.conn.QueryRow(query, args...)
}

func (db *DB) Exec(query string, args ...any) (sql.Result, error) {
	return db.conn.Exec(query, args...)
}

func (db *DB) RunInTx(fn func(*DB) error) error {
	tx, err := db.raw.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	txDB := &DB{conn: tx, raw: db.raw, log: db.log}
	if err := fn(txDB); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}

const userColumns = `id, external_id, email, avatar, first_name, last_name, deleted_at, created_at, updated_at`

func scanUser(row interface{ Scan(...any) error }) (*model.User, error) {
	var u model.User
	err := row.Scan(
		&u.ID, &u.ExternalId, &u.Email, &u.Avatar, &u.FirstName, &u.LastName,
		&u.DeletedAt, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (db *DB) CreateUser(user *model.CreateUserRequest) (*model.User, error) {
	row := db.conn.QueryRow(`
		INSERT INTO users (external_id, email, avatar, first_name, last_name)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING `+userColumns,
		user.ExternalId, user.Email, user.Avatar, user.FirstName, user.LastName,
	)
	return scanUser(row)
}

func (db *DB) DeleteUser(clerkId string) (*model.User, error) {
	row := db.conn.QueryRow(`UPDATE users SET deleted_at = NOW() WHERE external_id = $1 AND deleted_at IS NULL RETURNING `+userColumns, clerkId)
	return scanUser(row)
}

func (db *DB) GetUserByClerkId(userId string) (*model.User, error) {
	row := db.conn.QueryRow(`SELECT `+userColumns+` FROM users WHERE external_id = $1 LIMIT 1`, userId)
	return scanUser(row)
}

func (db *DB) GetUserByEmail(email string) (*model.User, error) {
	row := db.conn.QueryRow(`SELECT `+userColumns+` FROM users WHERE email = $1 LIMIT 1`, email)
	return scanUser(row)
}

const campaignColumns = `id, user_id, title, description, tags, created_at, updated_at, deleted_at`

func scanCampaign(row interface{ Scan(...any) error }) (*model.Campaign, error) {
	var c model.Campaign
	err := row.Scan(
		&c.ID, &c.UserID, &c.Title, &c.Description, pq.Array(&c.Tags),
		&c.CreatedAt, &c.UpdatedAt, &c.DeletedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (db *DB) CreateCampaign(campaign *model.CreateCampaignRequest) (*model.Campaign, error) {
	row := db.conn.QueryRow(`
		INSERT INTO campaigns (user_id, title, description, tags)
		VALUES ($1, $2, $3, $4)
		RETURNING `+campaignColumns,
		campaign.UserID, campaign.Title, campaign.Description, campaign.Tags,
	)
	return scanCampaign(row)
}

func (db *DB) GetCampaign(id string) (*model.Campaign, error) {
	row := db.conn.QueryRow(`SELECT `+campaignColumns+` FROM campaigns WHERE id = $1 LIMIT 1`, id)
	return scanCampaign(row)
}

const campaignIntegrationColumns = `id, campaign_id, external_id, source, metadata, settings, created_at, updated_at`

func scanCampaignIntegration(row interface{ Scan(...any) error }) (*model.CampaignIntegration, error) {
	var ci model.CampaignIntegration
	err := row.Scan(
		&ci.ID, &ci.CampaignID, &ci.ExternalID, &ci.Source, &ci.Metadata, &ci.Settings,
		&ci.CreatedAt, &ci.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &ci, nil
}

func isValidIntegrationSource(s model.IntegrationSource) bool {
	switch s {
	case "DISCORD":
		return true
	default:
		return false
	}
}

func (db *DB) GetCampaignIntegration(id string, source model.IntegrationSource) (*model.CampaignIntegration, error) {
	if !isValidIntegrationSource(source) {
		return nil, fmt.Errorf("Invalid Campaign integration source: %q", source)
	}
	row := db.conn.QueryRow(`SELECT `+campaignIntegrationColumns+` FROM campaign_integrations WHERE campaign_id = $1 AND source = $2 LIMIT 1`, id, source)
	return scanCampaignIntegration(row)
}

func (db *DB) CreateCampaignIntegration(campaign *model.CreateCampaignIntegrationRequest) (*model.CampaignIntegration, error) {
	row := db.conn.QueryRow(`
		INSERT INTO campaign_integrations (campaign_id, external_id, source, metadata, settings)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING `+campaignIntegrationColumns,
		campaign.CampaignID, campaign.ExternalID, campaign.Source, campaign.Metadata, campaign.Settings,
	)
	return scanCampaignIntegration(row)
}

const campaignUserColumns = `campaign_id, created_at, role, updated_at, user_id`

func scanCampaignUser(row interface{ Scan(...any) error }) (*model.Member, error) {
	var ci model.Member
	err := row.Scan(
		&ci.CampaignID, &ci.CreatedAt, &ci.Role, &ci.UpdatedAt, &ci.UserID,
	)
	if err != nil {
		return nil, err
	}
	return &ci, nil
}

func (db *DB) GetCampaignUser(campaignId, userId string) (*model.Member, error) {
	row := db.conn.QueryRow(`SELECT `+campaignUserColumns+` FROM campaign_users WHERE campaign_id = $1 AND user_id = $2 LIMIT 1`, campaignId, userId)
	return scanCampaignUser(row)
}

func (db *DB) ListCampaignUsersByCampaign(campaignId string) ([]*model.Member, error) {
	rows, err := db.conn.Query(`SELECT `+campaignUserColumns+` FROM campaign_users WHERE campaign_id = $1`, campaignId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var members []*model.Member
	for rows.Next() {
		member, err := scanCampaignUser(rows)
		if err != nil {
			return nil, err
		}
		members = append(members, member)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return members, nil
}

func (db *DB) ListCampaignUsersByUser(userId string) ([]*model.Member, error) {
	rows, err := db.conn.Query(`SELECT `+campaignUserColumns+` FROM campaign_users WHERE user_id = $1`, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var members []*model.Member
	for rows.Next() {
		member, err := scanCampaignUser(rows)
		if err != nil {
			return nil, err
		}
		members = append(members, member)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return members, nil
}

func (db *DB) CreateCampaignUser(campaignUser *model.CreateMemberRequest) (*model.Member, error) {
	row := db.conn.QueryRow(`
		INSERT INTO campaign_users (campaign_id, user_id, role)
		VALUES ($1, $2, $3)
		RETURNING `+campaignUserColumns,
		campaignUser.CampaignID, campaignUser.UserID, campaignUser.Role,
	)
	return scanCampaignUser(row)
}

func (db *DB) UpdateCampaignUserRole(campaignId, userId string, role model.MemberRole) (*model.Member, error) {
	row := db.conn.QueryRow(`
		UPDATE campaign_users SET role = $1
		WHERE campaign_id = $2 AND user_id = $3
		RETURNING `+campaignUserColumns,
		role, campaignId, userId,
	)
	return scanCampaignUser(row)
}

func (db *DB) RemoveCampaignUser(campaignId, userId string) error {
	_, err := db.conn.Exec(`DELETE FROM campaign_users WHERE campaign_id = $1 AND user_id = $2`, campaignId, userId)
	if err != nil {
		return fmt.Errorf("remove campaign user: %w", err)
	}
	return nil
}

const campaignInvitationColumns = `campaign_invitation_id, campaign_id, inviter_id, invitee_email, role, status, accepted_at, expires_at, created_at, updated_at`

func scanCampaignInvitation(row interface{ Scan(...any) error }) (*model.CampaignInvitation, error) {
	var ci model.CampaignInvitation
	err := row.Scan(
		&ci.ID, &ci.CampaignID, &ci.InviterID, &ci.InviteeEmail, &ci.Role, &ci.Status,
		&ci.AcceptedAt, &ci.ExpiresAt, &ci.CreatedAt, &ci.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &ci, nil
}

func (db *DB) CreateCampaignInvitation(invitation *model.CreateCampaignInvitationRequest) (*model.CampaignInvitation, error) {
	row := db.conn.QueryRow(`
		INSERT INTO campaign_invitations (campaign_id, inviter_id, invitee_email, role, status, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING `+campaignInvitationColumns,
		invitation.CampaignID, invitation.InviterID, invitation.InviteeEmail, invitation.Role,
		model.InvitationStatusPending, invitation.ExpiresAt,
	)
	return scanCampaignInvitation(row)
}

func (db *DB) GetCampaignInvitationByEmail(campaignId, invitee_email string, status model.InvitationStatus) (*model.CampaignInvitation, error) {
	row := db.conn.QueryRow(`SELECT `+campaignInvitationColumns+` FROM campaign_invitations
		WHERE campaign_id = $1 AND invitee_email = $2 AND status = $3
		LIMIT 1`, campaignId, invitee_email, status)
	return scanCampaignInvitation(row)
}

func (db *DB) RevokeCampaignInvitation(campaignId, inviteeEmail string) (*model.CampaignInvitation, error) {
	row := db.conn.QueryRow(`
        UPDATE campaign_invitations
        SET status = $1
        WHERE campaign_id = $2 AND invitee_email = $3 AND status = $4
        RETURNING `+campaignInvitationColumns,
		model.InvitationStatusRevoked, campaignId, inviteeEmail, model.InvitationStatusPending,
	)
	return scanCampaignInvitation(row)
}

func (db *DB) DeclineCampaignInvitation(campaignId, inviteeEmail string) (*model.CampaignInvitation, error) {
	row := db.conn.QueryRow(`
        UPDATE campaign_invitations
        SET status = $1
        WHERE campaign_id = $2 AND invitee_email = $3 AND status = $4
        RETURNING `+campaignInvitationColumns,
		model.InvitationStatusDeclined, campaignId, inviteeEmail, model.InvitationStatusPending,
	)
	return scanCampaignInvitation(row)
}

func (db *DB) AcceptCampaignInvitation(campaignId, inviteeEmail string, role model.MemberRole) (*model.CampaignInvitation, error) {
	row := db.conn.QueryRow(`
        UPDATE campaign_invitations
        SET status = $1, accepted_at = NOW(), role = $2
        WHERE campaign_id = $3 AND invitee_email = $4 AND status = $5 AND expires_at > NOW()
        RETURNING `+campaignInvitationColumns,
		model.InvitationStatusAccepted, role, campaignId, inviteeEmail, model.InvitationStatusPending,
	)
	return scanCampaignInvitation(row)
}

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

func (db *DB) CreateNpc(npc *model.CreateNpcRequest) (*model.Npc, error) {
	row := db.conn.QueryRow(`
		INSERT INTO non_player_character (campaign_id, name, status, relation_to_party_status, is_known_to_party,
			age, appearance, avatar, backstory, dm_notes, foundry_actor_id, known_name,
			personality, player_notes, race, current_location_id, origin_location_id,
			session_encountered_id, aliases)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
		RETURNING `+npcColumns,
		npc.CampaignID, npc.Name, npc.Status, npc.RelationToPartyStatus, npc.IsKnownToParty,
		npc.Age, npc.Appearance, npc.Avatar, npc.Backstory, npc.DmNotes, npc.FoundryActorID,
		npc.KnownName, npc.Personality, npc.PlayerNotes, npc.Race,
		npc.CurrentLocationID, npc.OriginLocationID, npc.SessionEncounteredID,
		pq.Array(npc.Aliases),
	)
	return scanNpc(row)
}

func (db *DB) GetNpc(id string) (*model.Npc, error) {
	row := db.conn.QueryRow(`SELECT `+npcColumns+` FROM non_player_character WHERE id = $1 LIMIT 1`, id)
	return scanNpc(row)
}

func (db *DB) ListNpcsByCampaign(campaignId string) ([]*model.Npc, error) {
	rows, err := db.conn.Query(`SELECT `+npcColumns+` FROM non_player_character WHERE campaign_id = $1`, campaignId)
	if err != nil {
		return nil, fmt.Errorf("list npcs: %w", err)
	}
	defer rows.Close()

	var npcs []*model.Npc
	for rows.Next() {
		npc, err := scanNpc(rows)
		if err != nil {
			return nil, fmt.Errorf("scan npc: %w", err)
		}
		npcs = append(npcs, npc)
	}
	return npcs, rows.Err()
}

const questColumns = `id, campaign_id, title, status, description, quest_giver_id, reward, completed_at, deleted_at, created_at, updated_at`

func scanQuest(row interface{ Scan(...any) error }) (*model.Quest, error) {
	var q model.Quest
	err := row.Scan(
		&q.ID, &q.CampaignID, &q.Title, &q.Status, &q.Description, &q.QuestGiverID,
		&q.Reward, &q.CompletedAt, &q.DeletedAt, &q.CreatedAt, &q.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &q, nil
}

func (db *DB) CreateQuest(quest *model.CreateQuestRequest) (*model.Quest, error) {
	row := db.conn.QueryRow(`
		INSERT INTO quest (campaign_id, title, status, description, quest_giver_id, reward)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING `+questColumns,
		quest.CampaignID, quest.Title, quest.Status, quest.Description, quest.QuestGiverID, quest.Reward,
	)
	return scanQuest(row)
}

func (db *DB) GetQuest(id string) (*model.Quest, error) {
	row := db.conn.QueryRow(`SELECT `+questColumns+` FROM quest WHERE id = $1 LIMIT 1`, id)
	return scanQuest(row)
}

func (db *DB) ListQuestsByCampaign(campaignId string) ([]*model.Quest, error) {
	rows, err := db.conn.Query(`SELECT `+questColumns+` FROM quest WHERE campaign_id = $1`, campaignId)
	if err != nil {
		return nil, fmt.Errorf("list quests: %w", err)
	}
	defer rows.Close()

	var quests []*model.Quest
	for rows.Next() {
		quest, err := scanQuest(rows)
		if err != nil {
			return nil, fmt.Errorf("scan quest: %w", err)
		}
		quests = append(quests, quest)
	}
	return quests, rows.Err()
}

const sessionColumns = `id, campaign_id, title, description, starts_at, created_at, updated_at`

func scanSession(row interface{ Scan(...any) error }) (*model.Session, error) {
	var s model.Session
	err := row.Scan(
		&s.ID, &s.CampaignID, &s.Title, &s.Description, &s.StartsAt,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (db *DB) CreateSession(session *model.CreateSessionRequest) (*model.Session, error) {
	row := db.conn.QueryRow(`
		INSERT INTO session (campaign_id, title, description, starts_at)
		VALUES ($1, $2, $3, $4)
		RETURNING `+sessionColumns,
		session.CampaignID, session.Title, session.Description, session.StartsAt,
	)
	return scanSession(row)
}

func (db *DB) GetSession(id string) (*model.Session, error) {
	row := db.conn.QueryRow(`SELECT `+sessionColumns+` FROM session WHERE id = $1 LIMIT 1`, id)
	return scanSession(row)
}

func (db *DB) ListSessionsByCampaign(campaignId string) ([]*model.Session, error) {
	rows, err := db.conn.Query(`SELECT `+sessionColumns+` FROM session WHERE campaign_id = $1`, campaignId)
	if err != nil {
		return nil, fmt.Errorf("list sessions: %w", err)
	}
	defer rows.Close()

	var sessions []*model.Session
	for rows.Next() {
		session, err := scanSession(rows)
		if err != nil {
			return nil, fmt.Errorf("scan session: %w", err)
		}
		sessions = append(sessions, session)
	}
	return sessions, rows.Err()
}
