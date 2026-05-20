CREATE TYPE "public"."session_status" AS ENUM (
  'DRAFT',
  'POLLING',
  'CONFIRMED'
);

--> statement-breakpoint

ALTER TABLE "session"
ADD COLUMN "status" "session_status";

--> statement-breakpoint

UPDATE "session"
SET "status" = CASE
  WHEN "starts_at" IS NULL THEN 'DRAFT'::session_status
  ELSE 'CONFIRMED'::session_status
END;

--> statement-breakpoint

ALTER TABLE "session"
ALTER COLUMN "status" SET NOT NULL;
