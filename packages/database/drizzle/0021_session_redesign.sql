CREATE TABLE "session_exceptions" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"excluded_date" timestamp NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	CONSTRAINT "uq_session_exception_series_date" UNIQUE("series_id","excluded_date")
);
--> statement-breakpoint
CREATE TABLE "session_series" (
	"campaign_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"description" varchar,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rrule" varchar NOT NULL,
	"series_end_date" timestamp,
	"series_start_date" timestamp NOT NULL,
	"start_time" time NOT NULL,
	"title" varchar NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_availabilities" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "user_availabilities" CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "original_starts_at" timestamp;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "series_id" uuid;--> statement-breakpoint
ALTER TABLE "session_exceptions" ADD CONSTRAINT "fk_session_exception_series_id" FOREIGN KEY ("series_id") REFERENCES "public"."session_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_series" ADD CONSTRAINT "fk_session_series_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_session_exception_series_id" ON "session_exceptions" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "idx_session_series_campaign_id" ON "session_series" USING btree ("campaign_id");--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "fk_session_series_id" FOREIGN KEY ("series_id") REFERENCES "public"."session_series"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_session_series_id" ON "session" USING btree ("series_id");