CREATE TYPE "public"."health_condition_enum" AS ENUM('HEALTHY', 'INJURED', 'SICK', 'UNKNOWN', 'DEAD');--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "character_class" varchar;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "health_condition" "health_condition_enum" DEFAULT 'HEALTHY' NOT NULL;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "labels" varchar[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "level" smallint;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "role" varchar;