CREATE TABLE "user_integrations" (
	"campaign_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"external_id" varchar NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "integration_source" NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "user_integrations_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
ALTER TABLE "user_integrations" ADD CONSTRAINT "fk_integrations_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_integrations" ADD CONSTRAINT "fk_integrations_org_user" FOREIGN KEY ("user_id","campaign_id") REFERENCES "public"."campaign_users"("user_id","campaign_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_integrations_user_id" ON "user_integrations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_integrations_campaign_id" ON "user_integrations" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_user_integrations_external_id" ON "user_integrations" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_campaign_source" ON "user_integrations" USING btree ("campaign_id","source","user_id");--> statement-breakpoint
ALTER TABLE "user_availabilities" ADD CONSTRAINT "day_of_week_valid" CHECK ("user_availabilities"."day_of_week" >= 0 AND "user_availabilities"."day_of_week" <= 6);--> statement-breakpoint
ALTER TABLE "user_availabilities" ADD CONSTRAINT "interval_valid" CHECK ("user_availabilities"."interval" > 0 AND "user_availabilities"."interval" <= 2);--> statement-breakpoint
ALTER TABLE "user_availabilities" ADD CONSTRAINT "effective_until_valid" CHECK ("user_availabilities"."effective_until" = null OR "user_availabilities"."effective_until" > "user_availabilities"."effective_from");
