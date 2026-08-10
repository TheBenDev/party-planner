ALTER TABLE "colony" ADD COLUMN "lifespan_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "colony" ADD COLUMN "shipment_at" integer;--> statement-breakpoint
ALTER TABLE "colony" ADD COLUMN "last_shipment" integer;