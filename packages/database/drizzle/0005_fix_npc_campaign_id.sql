ALTER TABLE "non_player_character" DROP CONSTRAINT "fk_npc_campaign_id";
--> statement-breakpoint
ALTER TABLE "non_player_character" ADD CONSTRAINT "fk_npc_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;