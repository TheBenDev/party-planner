CREATE TYPE "public"."quest_type" AS ENUM('MAINLAND', 'COLONY');--> statement-breakpoint
ALTER TABLE "quest" ADD COLUMN "type" "quest_type" DEFAULT 'COLONY';
