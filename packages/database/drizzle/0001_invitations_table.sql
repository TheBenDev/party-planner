CREATE TYPE "public"."status" AS ENUM('PENDING', 'ACCEPTED');--> statement-breakpoint
CREATE TABLE "campaign_invitations" (
	"accepted_at" timestamp,
	"campaign_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"campaign_invitation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invitee_email" varchar NOT NULL,
	"inviter_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"status" "status" DEFAULT 'PENDING' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_invitations" ADD CONSTRAINT "fk_invitation_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_invitations" ADD CONSTRAINT "fk_invitation_invitee_id" FOREIGN KEY ("invitee_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_invitations" ADD CONSTRAINT "fk_invitation_inviter_id" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_campaign_user" ON "campaign_users" USING btree ("user_id","campaign_id");
