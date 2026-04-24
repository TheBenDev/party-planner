
ALTER TABLE "campaign_invitations" ADD COLUMN "token" varchar;
--> statement-breakpoint
UPDATE "campaign_invitations" SET "token" = gen_random_uuid()::varchar WHERE "token" IS NULL;
--> statement-breakpoint
ALTER TABLE "campaign_invitations" ALTER COLUMN "token" SET NOT NULL;
ALTER TABLE "campaign_invitations" ADD CONSTRAINT "campaign_invitations_token_unique" UNIQUE("token");
