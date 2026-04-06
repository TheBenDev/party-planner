import { StatusEnum } from "@planner/enums/common";
import { relations, sql } from "drizzle-orm";
import {
	foreignKey,
	pgEnum,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { enumToPgEnum } from "../lib/enums";
import { campaignsTable } from "./campaigns";
import { userRoleEnum } from "./campaignUsers";
import { usersTable } from "./users";

export const statusEnum = pgEnum("status", enumToPgEnum(StatusEnum));

export const campaignInvitationsTable = pgTable(
	"campaign_invitations",
	{
		acceptedAt: timestamp("accepted_at", { mode: "date" }),
		campaignId: uuid("campaign_id").notNull(),
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
		id: uuid("campaign_invitation_id").primaryKey().defaultRandom(),
		inviteeEmail: varchar("invitee_email").notNull(),
		inviterId: uuid("inviter_id").notNull(),
		role: userRoleEnum("role").notNull(),
		status: statusEnum("status").notNull().default(StatusEnum.PENDING),
		updatedAt: timestamp("updated_at", { mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		foreignKey({
			columns: [t.campaignId],
			foreignColumns: [campaignsTable.id],
			name: "fk_invitation_campaign_id",
		}).onDelete("cascade"),
		foreignKey({
			columns: [t.inviteeEmail],
			foreignColumns: [usersTable.email],
			name: "fk_invitation_invitee_email",
		}).onDelete("cascade"),
		foreignKey({
			columns: [t.inviterId],
			foreignColumns: [usersTable.id],
			name: "fk_invitation_inviter_id",
		}).onDelete("cascade"),
		uniqueIndex("one_pending_invite_per_email")
			.on(t.campaignId, t.inviteeEmail)
			.where(sql`${t.status} = 'PENDING'`),
	],
);

export const campaignInvitationsRelations = relations(
	campaignInvitationsTable,
	({ one }) => ({
		campaign: one(campaignsTable, {
			fields: [campaignInvitationsTable.campaignId],
			references: [campaignsTable.id],
		}),
		invitee: one(usersTable, {
			fields: [campaignInvitationsTable.inviteeEmail],
			references: [usersTable.email],
		}),
		inviter: one(usersTable, {
			fields: [campaignInvitationsTable.inviterId],
			references: [usersTable.id],
		}),
	}),
);
