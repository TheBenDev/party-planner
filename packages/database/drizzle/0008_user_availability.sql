CREATE TABLE "user_availabilities" (
	"campaign_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"day_of_week" integer NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_until" timestamp,
	"end_time" time DEFAULT '23:59:59' NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interval" integer DEFAULT 1 NOT NULL,
	"start_time" time NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_availabilities" ADD CONSTRAINT "fk_user_availability_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_availabilities" ADD CONSTRAINT "fk_user_availability_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_availability_user_id" ON "user_availabilities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_availability_campaign_id" ON "user_availabilities" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_user_availability_lookup" ON "user_availabilities" USING btree ("user_id","campaign_id","day_of_week");--> statement-breakpoint
