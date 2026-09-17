CREATE TABLE "map_hexes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"q" integer NOT NULL,
	"r" integer NOT NULL,
	"terrain" varchar(50) NOT NULL,
	"label" text,
	CONSTRAINT "uq_map_hexes_campaign_q_r" UNIQUE("campaign_id","q","r")
);
--> statement-breakpoint
ALTER TABLE "map_hexes" ADD CONSTRAINT "fk_map_hexes_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_map_hexes_campaign_id" ON "map_hexes" USING btree ("campaign_id");