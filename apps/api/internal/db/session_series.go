package db

import (
	model "github.com/BBruington/party-planner/api/internal/models"
)

const sessionSeriesColumns = `id, campaign_id, title, description, discord_event_id, google_calendar_event_id, poll_id, rrule, start_time, series_start_date, series_end_date, created_at, updated_at, timezone, duration_minutes`

func scanSessionSeries(row interface{ Scan(...any) error }) (*model.SessionSeries, error) {
	var s model.SessionSeries
	err := row.Scan(
		&s.ID, &s.CampaignID, &s.Title, &s.Description,
		&s.DiscordEventID, &s.GoogleCalendarEventID, &s.PollID,
		&s.RRule, &s.StartTime,
		&s.SeriesStartDate, &s.SeriesEndDate, &s.CreatedAt, &s.UpdatedAt, &s.Timezone, &s.DurationMinutes,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (db *DB) GetSessionSeriesByDiscordEventID(discordEventID string) (*model.SessionSeries, error) {
	row := db.conn.QueryRow(`SELECT `+sessionSeriesColumns+` FROM session_series WHERE discord_event_id = $1 LIMIT 1`, discordEventID)
	return scanSessionSeries(row)
}
