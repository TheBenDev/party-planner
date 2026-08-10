CREATE TABLE "patron" (
	"campaign_id" uuid NOT NULL,
	"colony_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"favor" integer DEFAULT 0 NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quest" RENAME COLUMN "quest_giver_id" TO "npc_id";--> statement-breakpoint
ALTER TABLE "quest" DROP CONSTRAINT "fk_quest_quest_giver_id";
--> statement-breakpoint
DROP INDEX "idx_quest_giver_id";--> statement-breakpoint
ALTER TABLE "quest" ADD COLUMN "patron_id" uuid;--> statement-breakpoint
ALTER TABLE "patron" ADD CONSTRAINT "fk_colony_id" FOREIGN KEY ("colony_id") REFERENCES "public"."colony"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patron" ADD CONSTRAINT "fk_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_patron_campaign_id" ON "patron" USING btree ("campaign_id");--> statement-breakpoint
ALTER TABLE "quest" ADD CONSTRAINT "fk_quest_npc_id" FOREIGN KEY ("npc_id") REFERENCES "public"."non_player_character"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest" ADD CONSTRAINT "fk_quest_patron_id" FOREIGN KEY ("patron_id") REFERENCES "public"."patron"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_quest_npc_id" ON "quest" USING btree ("npc_id");--> statement-breakpoint
CREATE INDEX "idx_quest_patron_id" ON "quest" USING btree ("patron_id");