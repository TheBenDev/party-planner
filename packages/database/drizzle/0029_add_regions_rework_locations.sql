CREATE TABLE "regions" (
	"campaign_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"map_image_url" varchar,
	"name" varchar NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "location" ADD COLUMN "map_x" real;--> statement-breakpoint
ALTER TABLE "location" ADD COLUMN "map_y" real;--> statement-breakpoint
ALTER TABLE "location" ADD COLUMN "region_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "regions" ADD CONSTRAINT "fk_region_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_region_campaign_id" ON "regions" USING btree ("campaign_id");--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "fk_location_region_id" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_location_region_id" ON "location" USING btree ("region_id");--> statement-breakpoint
ALTER TABLE "location" DROP COLUMN "campaign_id";