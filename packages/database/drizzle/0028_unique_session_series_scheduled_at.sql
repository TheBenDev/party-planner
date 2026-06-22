DROP INDEX "idx_session_series_discord_event_id";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_session_series_scheduled_at" ON "session" USING btree ("series_id","scheduled_at") WHERE series_id IS NOT NULL AND scheduled_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_session_series_discord_event_id" ON "session_series" USING btree ("discord_event_id");