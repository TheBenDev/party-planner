ALTER TYPE "public"."integration_source" ADD VALUE 'GOOGLE_CALENDAR';--> statement-breakpoint
ALTER TABLE "user_integrations" DROP CONSTRAINT "user_integrations_external_id_unique";--> statement-breakpoint
ALTER TABLE "user_integrations" DROP CONSTRAINT "fk_integrations_user_id";
--> statement-breakpoint
ALTER TABLE "user_integrations" DROP CONSTRAINT "fk_integrations_org_user";
--> statement-breakpoint
DROP INDEX "idx_user_integrations_campaign_id";--> statement-breakpoint
DROP INDEX "idx_user_integrations_external_id";--> statement-breakpoint
DROP INDEX "unique_user_campaign_source";--> statement-breakpoint
ALTER TABLE "user_integrations" ADD COLUMN "metadata" text;--> statement-breakpoint
ALTER TABLE "user_integrations" ADD CONSTRAINT "fk_user_integrations_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_source" ON "user_integrations" USING btree ("user_id","source");--> statement-breakpoint
ALTER TABLE "user_integrations" DROP COLUMN "campaign_id";--> statement-breakpoint
ALTER TABLE "user_integrations" DROP COLUMN "external_id";--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "duration_minutes" integer DEFAULT 180 NOT NULL;
ALTER TABLE "session_series" ADD COLUMN "duration_minutes" integer DEFAULT 180 NOT NULL;
