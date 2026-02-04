CREATE TYPE "public"."user_role" AS ENUM('DUNGEON_MASTER', 'PLAYER');--> statement-breakpoint
CREATE TYPE "public"."quest_status" AS ENUM('ACTIVE', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "campaign_users" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "campaign_users_user_id_campaign_id_pk" PRIMARY KEY("user_id","campaign_id")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"description" varchar,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tags" varchar[],
	"title" varchar NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_character" (
	"avatar" varchar,
	"campaign_id" uuid,
	"character_sheet" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"first_name" varchar NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"last_name" varchar NOT NULL,
	"origin_id" uuid,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location" (
	"campaign_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" varchar,
	"notes" varchar,
	"dm_notes" varchar
);
--> statement-breakpoint
CREATE TABLE "non_player_character" (
	"avatar" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"character_sheet" jsonb,
	"notes" varchar,
	"origin_id" uuid,
	"dm_notes" varchar
);
--> statement-breakpoint
CREATE TABLE "quest" (
	"campaign_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"description" varchar,
	"completed_at" timestamp,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quest_giver_id" uuid,
	"status" "quest_status" NOT NULL,
	"title" varchar NOT NULL,
	"reward" jsonb
);
--> statement-breakpoint
CREATE TABLE "session" (
	"campaign_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"description" varchar,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"starts_at" timestamp,
	"title" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"avatar" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"email" varchar NOT NULL,
	"external_id" varchar NOT NULL,
	"first_name" varchar NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"last_name" varchar NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
ALTER TABLE "campaign_users" ADD CONSTRAINT "fk_campaign_user_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_users" ADD CONSTRAINT "fk_campaign_user_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "fk_campaign_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_character" ADD CONSTRAINT "fk_character_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_character" ADD CONSTRAINT "fk_character_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_character" ADD CONSTRAINT "fk_character_location_id" FOREIGN KEY ("origin_id") REFERENCES "public"."location"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "non_player_character" ADD CONSTRAINT "fk_npc_location_id" FOREIGN KEY ("origin_id") REFERENCES "public"."location"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest" ADD CONSTRAINT "fk_quest_quest_giver_id" FOREIGN KEY ("quest_giver_id") REFERENCES "public"."non_player_character"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest" ADD CONSTRAINT "fk_quest_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "fk_session_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_campaign_user_access_check" ON "campaign_users" USING btree ("user_id","campaign_id","role");--> statement-breakpoint
CREATE INDEX "idx_campaign_user_id" ON "campaigns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_character_location_id" ON "player_character" USING btree ("origin_id");--> statement-breakpoint
CREATE INDEX "idx_character_user_id" ON "player_character" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_character_campaign_id" ON "player_character" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_quest_giver_id" ON "quest" USING btree ("quest_giver_id");--> statement-breakpoint
CREATE INDEX "idx_quest_campaign_id" ON "quest" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_session_campaign_id" ON "session" USING btree ("campaign_id");
