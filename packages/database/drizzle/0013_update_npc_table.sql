CREATE TYPE "public"."character_status_enum" AS ENUM('ALIVE', 'DEAD', 'MISSING', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."relation_to_party_enum" AS ENUM('ALLY', 'NEUTRAL', 'SUSPICIOUS', 'HOSTILE', 'UNKNOWN');--> statement-breakpoint
ALTER TABLE "non_player_character" DROP CONSTRAINT "fk_npc_location_id";
--> statement-breakpoint
ALTER TABLE "non_player_character" DROP CONSTRAINT "fk_npc_campaign_id";
--> statement-breakpoint
DROP INDEX "idx_npc_location_id";--> statement-breakpoint
ALTER TABLE "non_player_character" ALTER COLUMN "campaign_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "age" varchar;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "aliases" varchar[];--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "appearance" varchar;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "backstory" varchar;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "name" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "race" varchar;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "player_notes" varchar;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "personality" varchar;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "relation_to_party_status" "relation_to_party_enum" DEFAULT 'UNKNOWN' NOT NULL;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "status" character_status_enum DEFAULT 'UNKNOWN' NOT NULL;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "is_known_to_party" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "known_name" varchar;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "foundry_actor_id" varchar;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "last_foundry_sync_at" timestamp;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "current_location_id" uuid;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "origin_location_id" uuid;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "session_encountered_id" uuid;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD CONSTRAINT "fk_npc_origin_location_id" FOREIGN KEY ("origin_location_id") REFERENCES "public"."location"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD CONSTRAINT "fk_npc_current_location_id" FOREIGN KEY ("current_location_id") REFERENCES "public"."location"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD CONSTRAINT "fk_npc_session_encountered_id" FOREIGN KEY ("session_encountered_id") REFERENCES "public"."session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD CONSTRAINT "fk_npc_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_npc_origin_location_id" ON "non_player_character" USING btree ("origin_location_id");--> statement-breakpoint
CREATE INDEX "idx_npc_current_location_id" ON "non_player_character" USING btree ("current_location_id");--> statement-breakpoint
CREATE INDEX "idx_npc_session_encountered_id" ON "non_player_character" USING btree ("session_encountered_id");--> statement-breakpoint
ALTER TABLE "non_player_character" DROP COLUMN "bio";--> statement-breakpoint
ALTER TABLE "non_player_character" DROP COLUMN "character_sheet";--> statement-breakpoint
ALTER TABLE "non_player_character" DROP COLUMN "deleted_at";--> statement-breakpoint
ALTER TABLE "non_player_character" DROP COLUMN "first_name";--> statement-breakpoint
ALTER TABLE "non_player_character" DROP COLUMN "last_name";--> statement-breakpoint
ALTER TABLE "non_player_character" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "non_player_character" DROP COLUMN "origin_id";