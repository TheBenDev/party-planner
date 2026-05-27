ALTER TABLE "non_player_character" ALTER COLUMN "relation_to_party_status" TYPE text;--> statement-breakpoint
ALTER TABLE "non_player_character" ALTER COLUMN "relation_to_party_status" DROP DEFAULT;--> statement-breakpoint
UPDATE "non_player_character" SET "relation_to_party_status" = 'ENEMY' WHERE "relation_to_party_status" = 'HOSTILE';--> statement-breakpoint
DROP TYPE "public"."relation_to_party_enum";--> statement-breakpoint
CREATE TYPE "public"."relation_to_party_enum" AS ENUM('ALLY', 'NEUTRAL', 'SUSPICIOUS', 'ENEMY', 'UNKNOWN');--> statement-breakpoint
ALTER TABLE "non_player_character" ALTER COLUMN "relation_to_party_status" TYPE "public"."relation_to_party_enum" USING "relation_to_party_status"::"public"."relation_to_party_enum";--> statement-breakpoint
ALTER TABLE "non_player_character" ALTER COLUMN "relation_to_party_status" SET DEFAULT 'UNKNOWN';