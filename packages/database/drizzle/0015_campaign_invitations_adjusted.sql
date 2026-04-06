ALTER TYPE "public"."status" ADD VALUE 'REVOKED';--> statement-breakpoint
ALTER TYPE "public"."status" ADD VALUE 'DECLINED';--> statement-breakpoint
ALTER TYPE "public"."status" ADD VALUE 'EXPIRED';--> statement-breakpoint
CREATE UNIQUE INDEX "one_pending_invite_per_email" ON "campaign_invitations" USING btree ("campaign_id","invitee_email") WHERE "campaign_invitations"."status" = 'PENDING';
