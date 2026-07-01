package region

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"

	"github.com/BBruington/party-planner/api/internal/domain/location"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
)

type DB struct {
	conn pg.Querier
	raw  *sql.DB
}

func NewDB(conn *sql.DB) *DB {
	return &DB{conn: conn, raw: conn}
}

const regionSelectColumns = `id, campaign_id, name, map_image_url, deleted_at, created_at, updated_at`
const regionSelectColumnsAliased = `r.id, r.campaign_id, r.name, r.map_image_url, r.deleted_at, r.created_at, r.updated_at`

func scanRegion(row interface{ Scan(...any) error }) (*model.Region, error) {
	var r model.Region
	err := row.Scan(&r.ID, &r.CampaignID, &r.Name, &r.MapImageURL, &r.DeletedAt, &r.CreatedAt, &r.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func scanRegionWithLocationRow(rows *sql.Rows) (*model.Region, *model.Location, error) {
	var r model.Region
	var locID, locRegionID, locName sql.NullString
	var locDescription, locNotes, locDmNotes sql.NullString
	var locMapX, locMapY sql.NullFloat64
	var locDeletedAt, locCreatedAt, locUpdatedAt sql.NullTime

	if err := rows.Scan(
		&r.ID, &r.CampaignID, &r.Name, &r.MapImageURL, &r.DeletedAt, &r.CreatedAt, &r.UpdatedAt,
		&locID, &locRegionID, &locName, &locDescription, &locNotes, &locDmNotes,
		&locMapX, &locMapY, &locDeletedAt, &locCreatedAt, &locUpdatedAt,
	); err != nil {
		return nil, nil, err
	}
	if !locID.Valid {
		return &r, nil, nil
	}
	return &r, &model.Location{
		ID:          locID.String,
		RegionID:    locRegionID.String,
		Name:        locName.String,
		Description: locDescription,
		Notes:       locNotes,
		DmNotes:     locDmNotes,
		MapX:        locMapX,
		MapY:        locMapY,
		DeletedAt:   locDeletedAt,
		CreatedAt:   locCreatedAt.Time,
		UpdatedAt:   locUpdatedAt.Time,
	}, nil
}

func (db *DB) CreateRegion(ctx context.Context, req *model.CreateRegionRequest) (*model.Region, error) {
	row := db.conn.QueryRowContext(ctx, `
		INSERT INTO regions (campaign_id, name, map_image_url)
		VALUES ($1, $2, $3)
		RETURNING `+regionSelectColumns,
		req.CampaignID, req.Name, req.MapImageURL,
	)
	return scanRegion(row)
}

func (db *DB) GetRegion(ctx context.Context, id, campaignID string) (*model.RegionWithLocations, error) {
	rows, err := db.conn.QueryContext(ctx, `
		SELECT `+regionSelectColumnsAliased+`, `+location.LocationSelectColumnsAliased+`
		FROM regions r
		LEFT JOIN location l ON l.region_id = r.id AND l.deleted_at IS NULL
		WHERE r.id = $1 AND r.campaign_id = $2 AND r.deleted_at IS NULL
		ORDER BY l.created_at`,
		id, campaignID,
	)
	if err != nil {
		return nil, fmt.Errorf("get region: %w", err)
	}
	defer func() {
		if err := rows.Close(); err != nil {
			slog.Error("failed to close rows", "error", err)
		}
	}()

	var result *model.RegionWithLocations
	for rows.Next() {
		r, loc, err := scanRegionWithLocationRow(rows)
		if err != nil {
			return nil, fmt.Errorf("scan region with location: %w", err)
		}
		if result == nil {
			result = &model.RegionWithLocations{Region: r, Locations: []*model.Location{}}
		}
		if loc != nil {
			result.Locations = append(result.Locations, loc)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate rows: %w", err)
	}
	if result == nil {
		return nil, sql.ErrNoRows
	}
	return result, nil
}

func (db *DB) ListRegionsByCampaign(ctx context.Context, campaignID string) ([]*model.RegionWithLocations, error) {
	regionRows, err := db.conn.QueryContext(ctx, `
		SELECT `+regionSelectColumns+`
		FROM regions
		WHERE campaign_id = $1 AND deleted_at IS NULL
		ORDER BY created_at`,
		campaignID,
	)
	if err != nil {
		return nil, fmt.Errorf("list regions: %w", err)
	}
	defer func() {
		if err := regionRows.Close(); err != nil {
			slog.Error("failed to close region rows", "error", err)
		}
	}()

	var results []*model.RegionWithLocations
	regionIndex := map[string]int{}
	for regionRows.Next() {
		region, err := scanRegion(regionRows)
		if err != nil {
			return nil, fmt.Errorf("scan region: %w", err)
		}
		regionIndex[region.ID] = len(results)
		results = append(results, &model.RegionWithLocations{Region: region, Locations: []*model.Location{}})
	}
	if err := regionRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate regions: %w", err)
	}

	if len(results) == 0 {
		return results, nil
	}

	locationRows, err := db.conn.QueryContext(ctx, `
		SELECT l.id, l.region_id, l.name, l.description, l.notes, l.dm_notes, l.map_x, l.map_y, l.deleted_at, l.created_at, l.updated_at
		FROM location l
		JOIN regions r ON l.region_id = r.id
		WHERE r.campaign_id = $1 AND l.deleted_at IS NULL`,
		campaignID,
	)
	if err != nil {
		return nil, fmt.Errorf("list locations for regions: %w", err)
	}
	defer func() {
		if err := locationRows.Close(); err != nil {
			slog.Error("failed to close location rows", "error", err)
		}
	}()

	for locationRows.Next() {
		l, err := location.ScanLocation(locationRows)
		if err != nil {
			return nil, fmt.Errorf("scan location: %w", err)
		}
		if idx, ok := regionIndex[l.RegionID]; ok {
			results[idx].Locations = append(results[idx].Locations, l)
		}
	}
	return results, locationRows.Err()
}

func (db *DB) UpdateRegion(ctx context.Context, req *model.UpdateRegionRequest) (*model.Region, error) {
	row := db.conn.QueryRowContext(ctx, `
		UPDATE regions SET
			name          = COALESCE($1, name),
			map_image_url = CASE WHEN $2 IS NULL THEN map_image_url ELSE NULLIF($2, '') END,
			updated_at    = NOW()
		WHERE id = $3 AND campaign_id = $4 AND deleted_at IS NULL
		RETURNING `+regionSelectColumns,
		req.Name, req.MapImageURL, req.ID, req.CampaignID,
	)
	return scanRegion(row)
}

func (db *DB) DeleteRegion(ctx context.Context, id, campaignID string) (*model.Region, error) {
	row := db.conn.QueryRowContext(ctx, `
		DELETE FROM regions
		WHERE id = $1 AND campaign_id = $2 AND deleted_at IS NULL
		RETURNING `+regionSelectColumns,
		id, campaignID,
	)
	return scanRegion(row)
}
