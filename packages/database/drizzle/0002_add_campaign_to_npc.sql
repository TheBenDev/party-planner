ALTER TABLE "campaign_invitations" DROP CONSTRAINT "fk_invitation_invitee_id";
--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "campaign_id" uuid;--> statement-breakpoint
ALTER TABLE "campaign_invitations" ADD CONSTRAINT "fk_invitation_invitee_email" FOREIGN KEY ("invitee_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD CONSTRAINT "fk_npc_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."location"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_npc_location_id" ON "non_player_character" USING btree ("origin_id");--> statement-breakpoint
CREATE INDEX "idx_npc_campaign_id" ON "non_player_character" USING btree ("campaign_id");