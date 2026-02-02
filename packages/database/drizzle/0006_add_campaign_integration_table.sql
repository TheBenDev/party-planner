CREATE TYPE "public"."integration_source" AS ENUM('DISCORD');--> statement-breakpoint
CREATE TABLE "campaign_integrations" (
	"campaign_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"integration_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metadata" jsonb,
	"settings" jsonb,
	"source" "integration_source" NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_integrations" ADD CONSTRAINT "fk_integration_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_integrations_campaign_id" ON "campaign_integrations" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_integrations_source" ON "campaign_integrations" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_campaign_source" ON "campaign_integrations" USING btree ("campaign_id","source");