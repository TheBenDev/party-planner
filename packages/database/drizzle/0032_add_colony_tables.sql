CREATE TYPE "public"."worker_type" AS ENUM('FARMER', 'HEALER', 'BLACKSMITH', 'SOLDIER', 'MINER', 'BUILDER', 'SCHOLAR', 'MAGE');--> statement-breakpoint
CREATE TABLE "colony" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"colonist_count" integer DEFAULT 0 NOT NULL,
	"food" integer DEFAULT 0 NOT NULL,
	"building_materials" integer DEFAULT 0 NOT NULL,
	"morale" smallint DEFAULT 100 NOT NULL,
	"campaign_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "colony_workforce" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"worker_type" "worker_type" NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"colony_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "colony_id" uuid;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "workforce_id" uuid;--> statement-breakpoint
ALTER TABLE "colony" ADD CONSTRAINT "fk_colony_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colony_workforce" ADD CONSTRAINT "fk_colony_workforce_colony_id" FOREIGN KEY ("colony_id") REFERENCES "public"."colony"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD CONSTRAINT "fk_npc_colony_id" FOREIGN KEY ("colony_id") REFERENCES "public"."colony"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD CONSTRAINT "fk_npc_workforce_id" FOREIGN KEY ("workforce_id") REFERENCES "public"."colony_workforce"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_colony_campaign_id" ON "colony" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_colony_workforce_colony_id" ON "colony_workforce" USING btree ("colony_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_colony_workforce_colony_worker_type" ON "colony_workforce" USING btree ("colony_id","worker_type");--> statement-breakpoint
CREATE INDEX "idx_npc_colony_id" ON "non_player_character" USING btree ("colony_id");--> statement-breakpoint
CREATE INDEX "idx_npc_workforce_id" ON "non_player_character" USING btree ("workforce_id");--> statement-breakpoint
ALTER TABLE "colony" ADD COLUMN "gold" integer DEFAULT 0 NOT NULL;
