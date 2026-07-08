ALTER TABLE "regions" ADD COLUMN "colony_id" uuid;--> statement-breakpoint
ALTER TABLE "regions" ADD CONSTRAINT "fk_region_colony_id" FOREIGN KEY ("colony_id") REFERENCES "public"."colony"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_region_colony_id" ON "regions" USING btree ("colony_id");--> statement-breakpoint
ALTER TABLE "regions" ADD CONSTRAINT "uq_region_colony_id" UNIQUE("colony_id");