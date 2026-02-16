ALTER TABLE "user_availabilities" DROP CONSTRAINT "interval_valid";--> statement-breakpoint
ALTER TABLE "user_availabilities" DROP CONSTRAINT "effective_until_valid";--> statement-breakpoint
ALTER TABLE "player_character" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "location" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "quest" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_availabilities" ADD CONSTRAINT "interval_valid" CHECK ("user_availabilities"."interval" > 0 AND "user_availabilities"."interval" <= 2);--> statement-breakpoint
ALTER TABLE "user_availabilities" ADD CONSTRAINT "effective_until_valid" CHECK ("user_availabilities"."effective_until" = null OR "user_availabilities"."effective_until" > "user_availabilities"."effective_from");