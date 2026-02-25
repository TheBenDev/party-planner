ALTER TABLE "campaign_integrations" ADD COLUMN "id" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "campaign_integrations" DROP CONSTRAINT "campaign_integrations_pkey";
ALTER TABLE "campaign_integrations" ADD PRIMARY KEY ("id");
ALTER TABLE "campaign_integrations" DROP COLUMN "integration_id";
