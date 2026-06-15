-- =============================================================================
-- 0027_session_rework.sql
--
-- Reworks sessions and session_series to match the new model:
--   - session       → historical record of a completed session only
--   - session_series → owns the schedule, Discord event, and poll
--
-- DO NOT APPLY without reading the safety note in Part 2c.
-- =============================================================================

-- =============================================================================
-- PART 1: Additive DDL (non-destructive)
-- =============================================================================

-- session_series: Discord event tracking, Google Calendar, and poll support
ALTER TABLE session_series ADD COLUMN discord_event_id varchar;
ALTER TABLE session_series ADD COLUMN google_calendar_event_id varchar;
ALTER TABLE session_series ADD COLUMN poll_id varchar;

-- session_series: start_time and rrule become nullable to support unscheduled /
-- polled series that don't have a confirmed time yet
ALTER TABLE session_series ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE session_series ALTER COLUMN rrule DROP NOT NULL;

-- session: add scheduled_at before the rename/drop dance in Part 3
ALTER TABLE session ADD COLUMN scheduled_at timestamp;

-- =============================================================================
-- PART 2: Data migration
-- =============================================================================

-- 2a. Populate scheduled_at from original_starts_at (preferred) or starts_at
UPDATE session
SET scheduled_at = COALESCE(original_starts_at, starts_at);

-- 2b. Move discord_event_id from the nearest upcoming series session → its series.
--     Only moves if the series does not already have one set.
UPDATE session_series ss
SET discord_event_id = (
    SELECT s.discord_event_id
    FROM session s
    WHERE s.series_id = ss.id
      AND s.starts_at > NOW()
      AND s.discord_event_id IS NOT NULL
    ORDER BY s.starts_at ASC
    LIMIT 1
)
WHERE ss.discord_event_id IS NULL;

-- 2c. SAFETY CHECK — run this query before continuing to Part 2d.
--     It must return 0 rows. If it returns any rows, step 2b missed event IDs
--     and they would be lost when the upcoming stubs are deleted below.
--
--     SELECT s.id, s.series_id, s.discord_event_id
--     FROM session s
--     WHERE s.series_id IS NOT NULL
--       AND s.starts_at > NOW()
--       AND s.discord_event_id IS NOT NULL
--       AND NOT EXISTS (
--           SELECT 1 FROM session_series ss
--           WHERE ss.id = s.series_id
--             AND ss.discord_event_id IS NOT NULL
--       );

-- 2d. Delete upcoming cron-created session stubs (future placeholders for series).
--     Under the new model, sessions are only historical records created after a
--     Discord event completes. Future occurrences are tracked by the series itself.
DELETE FROM session
WHERE series_id IS NOT NULL
  AND starts_at > NOW();

-- 2e. Create series for existing one-off sessions (series_id IS NULL).
--     Pre-generates UUIDs so we can link each session back immediately.
CREATE TEMP TABLE temp_oneoff_series AS
SELECT
    gen_random_uuid()                                  AS new_series_id,
    s.id                                               AS session_id,
    s.campaign_id,
    s.title,
    s.description,
    s.duration_minutes,
    COALESCE(s.starts_at::time, '19:00:00'::time)     AS start_time,
    COALESCE(s.starts_at::date, NOW()::date)           AS series_date
FROM session s
WHERE s.series_id IS NULL;

INSERT INTO session_series (
    id, campaign_id, title, description,
    rrule, start_time, series_start_date, series_end_date,
    timezone, duration_minutes
)
SELECT
    t.new_series_id,
    t.campaign_id,
    t.title,
    t.description,
    'FREQ=DAILY;COUNT=1',
    t.start_time,
    t.series_date,
    t.series_date,
    'UTC',
    t.duration_minutes
FROM temp_oneoff_series t;

UPDATE session s
SET series_id = t.new_series_id
FROM temp_oneoff_series t
WHERE s.id = t.session_id;

DROP TABLE temp_oneoff_series;

-- =============================================================================
-- PART 3: Destructive DDL — drop scheduling columns from session
-- =============================================================================

ALTER TABLE session DROP COLUMN discord_event_id;
ALTER TABLE session DROP COLUMN poll_id;
ALTER TABLE session DROP COLUMN announced_at;
ALTER TABLE session DROP COLUMN original_starts_at;
ALTER TABLE session DROP COLUMN status;
ALTER TABLE session DROP COLUMN starts_at;

-- Drop the now-unused session_status enum
DROP TYPE session_status;

-- =============================================================================
-- PART 4: Indexes
-- =============================================================================

CREATE INDEX idx_session_scheduled_at ON session USING btree (scheduled_at);

-- Partial index — the webhook handler and cron look up series by discord_event_id
CREATE INDEX idx_session_series_discord_event_id
    ON session_series USING btree (discord_event_id)
    WHERE discord_event_id IS NOT NULL;
