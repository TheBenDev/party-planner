import { ORPCError } from "@orpc/server";
import { schema } from "@planner/database";
import { IntegrationSource } from "@planner/enums/integration";
import {
	CheckNextSessionRequestSchema,
	CheckNextSessionResponseSchema,
	ClearAvailabilityRequestSchema,
	GetAvailabilitiesRequestSchema,
	GetAvailabilitiesResponseSchema,
	GetNpcRequestSchema,
	GetNpcResponseSchema,
	RemoveAvailabilityRequestSchema,
	ScheduleSessionRequestSchema,
	SendMessageRequestSchema,
	SetAvailabilityRequestSchema,
} from "@planner/schemas/discord";
import { Routes } from "discord-api-types/v10";
import { and, asc, eq, gt, gte, ilike, lt, lte } from "drizzle-orm";
import { discordProcedure } from "../orpc";

const {
	sessionsTable,
	campaignIntegrationsTable,
	nonPlayerCharactersTable,
	usersTable,
	userAvailabilitiesTable,
	userIntegrationsTable,
} = schema;

const checkNextSession = discordProcedure
	.route({
		method: "GET",
		path: "/discord/next-session",
		summary: "Check the next upcoming session for a Discord server",
	})
	.input(CheckNextSessionRequestSchema)
	.output(CheckNextSessionResponseSchema)
	.handler(async ({ context, input }) => {
		const db = context.db;
		const { serverId } = input;

		if (!serverId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Discord server id required",
			});
		}

		const discordIntegrationRow = await db
			.select()
			.from(campaignIntegrationsTable)
			.leftJoin(
				sessionsTable,
				and(
					eq(sessionsTable.campaignId, campaignIntegrationsTable.campaignId),
					gt(sessionsTable.startsAt, new Date()),
				),
			)
			.where(
				and(
					eq(campaignIntegrationsTable.externalId, serverId),
					eq(campaignIntegrationsTable.source, IntegrationSource.DISCORD),
				),
			)
			.orderBy(asc(sessionsTable.startsAt));

		if (discordIntegrationRow.length === 0) {
			throw new ORPCError("NOT_FOUND", {
				message: "Campaign integration not found",
			});
		}

		if (discordIntegrationRow[0].campaign_integrations.metadata == null) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Campaign integration metadata is missing",
			});
		}

		if (discordIntegrationRow[0].session === null) {
			return { message: "I don't see any sessions coming up." };
		}

		const time = discordIntegrationRow[0].session.startsAt?.toLocaleString(
			"en-US",
			{
				day: "numeric",
				hour: "numeric",
				minute: "2-digit",
				month: "long",
				timeZoneName: "short",
				weekday: "long",
				year: "numeric",
			},
		);

		return { message: `The next D&D session starts on ${time}!` };
	});

const checkReminders = discordProcedure
	.route({
		method: "POST",
		path: "/discord/reminders",
		summary: "Check and send session reminders",
	})
	.handler(async ({ context }) => {
		const db = context.db;
		const discord = context.discord;
		const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24);
		const twoDaysLater = new Date(Date.now() + 1000 * 60 * 60 * 48);

		const sessionsRow = await db
			.select()
			.from(campaignIntegrationsTable)
			.innerJoin(
				sessionsTable,
				and(
					lte(sessionsTable.startsAt, twoDaysLater),
					gte(sessionsTable.startsAt, tomorrow),
				),
			)
			.where(eq(campaignIntegrationsTable.source, IntegrationSource.DISCORD));

		sessionsRow.map((session) => {
			const reminderEnabled =
				session.campaign_integrations.settings?.enableSessionReminders;
			const channelId = session.campaign_integrations.metadata?.channelId;

			if (reminderEnabled === true && channelId) {
				const time = session.session.startsAt?.toLocaleString("en-US", {
					day: "numeric",
					hour: "numeric",
					minute: "2-digit",
					month: "long",
					timeZoneName: "short",
					weekday: "long",
				});
				return discord?.post(Routes.channelMessages(channelId), {
					body: {
						content: `Reminder: There is a D&D session starting on ${time}!`,
					},
				});
			}
			return null;
		});
	});

const clearAvailability = discordProcedure
	.route({
		method: "DELETE",
		path: "/discord/availability",
		summary: "Clear all availability for a user",
	})
	.input(ClearAvailabilityRequestSchema)
	.handler(async ({ input, context }) => {
		const db = context.db;
		const { userExternalId } = input;

		const userIntegrationRow = await db
			.select({
				campaignId: userIntegrationsTable.campaignId,
				userId: userIntegrationsTable.userId,
			})
			.from(userIntegrationsTable)
			.where(eq(userIntegrationsTable.externalId, userExternalId));

		if (userIntegrationRow.length === 0) {
			throw new ORPCError("NOT_FOUND", {
				message: "User integration not found.",
			});
		}

		const { userId, campaignId } = userIntegrationRow[0];

		await db
			.delete(userAvailabilitiesTable)
			.where(
				and(
					eq(userAvailabilitiesTable.userId, userId),
					eq(userAvailabilitiesTable.campaignId, campaignId),
				),
			);
	});

const getAvailabilities = discordProcedure
	.route({
		method: "GET",
		path: "/discord/availability",
		summary: "Get availabilities for a Discord user",
	})
	.input(GetAvailabilitiesRequestSchema)
	.output(GetAvailabilitiesResponseSchema)
	.handler(async ({ context, input }) => {
		const db = context.db;
		const { userExternalId } = input;

		if (!userExternalId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "User Discord id missing from params",
			});
		}

		const userIntegrationRow = await db
			.select({
				availability: {
					dayOfWeek: userAvailabilitiesTable.dayOfWeek,
					endTime: userAvailabilitiesTable.endTime,
					startTime: userAvailabilitiesTable.startTime,
				},
				userId: userIntegrationsTable.userId,
			})
			.from(userIntegrationsTable)
			.leftJoin(
				userAvailabilitiesTable,
				and(
					eq(
						userAvailabilitiesTable.campaignId,
						userIntegrationsTable.campaignId,
					),
					eq(userAvailabilitiesTable.userId, userIntegrationsTable.userId),
				),
			)
			.where(eq(userIntegrationsTable.externalId, userExternalId));

		if (userIntegrationRow.length === 0) {
			throw new ORPCError("NOT_FOUND", {
				message: "user integration not found",
			});
		}

		const availabilities = userIntegrationRow.reduce<
			{ dayOfWeek: number; endTime: string; startTime: string }[]
		>((acc, row) => {
			if (
				row.availability?.dayOfWeek != null &&
				row.availability?.endTime != null &&
				row.availability?.startTime != null
			) {
				acc.push({
					dayOfWeek: row.availability.dayOfWeek,
					endTime: row.availability.endTime,
					startTime: row.availability.startTime,
				});
			}
			return acc;
		}, []);

		return {
			userAvailabilities: availabilities,
		};
	});

const getNpc = discordProcedure
	.route({
		method: "GET",
		path: "/discord/npc",
		summary: "Get an NPC by name for a Discord server",
	})
	.input(GetNpcRequestSchema)
	.output(GetNpcResponseSchema)
	.handler(async ({ context, input }) => {
		const db = context.db;
		const { npcName, serverId } = input;

		if (!serverId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Discord server id required",
			});
		}
		if (!npcName) {
			throw new ORPCError("BAD_REQUEST", { message: "Npc Name required" });
		}

		const npcRow = await db
			.select({
				age: nonPlayerCharactersTable.age,
				aliases: nonPlayerCharactersTable.aliases,
				appearance: nonPlayerCharactersTable.appearance,
				avatar: nonPlayerCharactersTable.avatar,
				id: nonPlayerCharactersTable.id,
				isKnownToParty: nonPlayerCharactersTable.isKnownToParty,
				knownName: nonPlayerCharactersTable.knownName,
				name: nonPlayerCharactersTable.name,
				personality: nonPlayerCharactersTable.personality,
				playerNotes: nonPlayerCharactersTable.playerNotes,
				race: nonPlayerCharactersTable.race,
				relationToParty: nonPlayerCharactersTable.relationToPartyStatus,
				status: nonPlayerCharactersTable.status,
			})
			.from(nonPlayerCharactersTable)
			.innerJoin(
				campaignIntegrationsTable,
				eq(
					campaignIntegrationsTable.campaignId,
					nonPlayerCharactersTable.campaignId,
				),
			)
			.where(
				and(
					eq(campaignIntegrationsTable.externalId, serverId),
					eq(campaignIntegrationsTable.source, IntegrationSource.DISCORD),
					ilike(nonPlayerCharactersTable.name, `%${npcName}%`),
				),
			);

		if (npcRow.length === 0) {
			throw new ORPCError("NOT_FOUND", { message: "NPC not found" });
		}
		return { npc: npcRow[0] };
	});

const removeAvailability = discordProcedure
	.route({
		method: "DELETE",
		path: "/discord/availability/single",
		summary: "Remove a specific availability slot for a user",
	})
	.input(RemoveAvailabilityRequestSchema)
	.handler(async ({ input, context }) => {
		const db = context.db;
		const { dayOfWeek, startTime, userExternalId } = input;

		const userIntegrationRow = await db
			.select({
				campaignId: userIntegrationsTable.campaignId,
				userAvailability: userAvailabilitiesTable.id,
				userId: userIntegrationsTable.userId,
			})
			.from(userIntegrationsTable)
			.leftJoin(
				userAvailabilitiesTable,
				and(
					eq(userAvailabilitiesTable.startTime, startTime),
					eq(userAvailabilitiesTable.dayOfWeek, dayOfWeek),
					eq(userAvailabilitiesTable.userId, userIntegrationsTable.userId),
					eq(
						userAvailabilitiesTable.campaignId,
						userIntegrationsTable.campaignId,
					),
				),
			)
			.where(eq(userIntegrationsTable.externalId, userExternalId))
			.limit(1);

		if (userIntegrationRow.length === 0) {
			throw new ORPCError("NOT_FOUND", {
				message: "User integration not found.",
			});
		}

		const { userId, campaignId, userAvailability } = userIntegrationRow[0];

		if (userAvailability === null) {
			throw new ORPCError("NOT_FOUND", {
				message: "User Availability not found.",
			});
		}

		await db
			.delete(userAvailabilitiesTable)
			.where(
				and(
					eq(userAvailabilitiesTable.startTime, startTime),
					eq(userAvailabilitiesTable.dayOfWeek, dayOfWeek),
					eq(userAvailabilitiesTable.userId, userId),
					eq(userAvailabilitiesTable.campaignId, campaignId),
				),
			);
	});

const scheduleSession = discordProcedure
	.route({
		method: "POST",
		path: "/discord/session",
		summary: "Schedule a D&D session",
	})
	.input(ScheduleSessionRequestSchema)
	.handler(async ({ input, context }) => {
		const db = context.db;
		const { serverId, time } = input;
		const { hour, minute, date } = time;
		const sessionTime = `${hour}:${minute}:00`;
		const dayOfWeek = new Date(date).getUTCDay();

		const discordIntegrationRow = await db
			.select({ campaignId: campaignIntegrationsTable.campaignId })
			.from(campaignIntegrationsTable)
			.where(
				and(
					eq(campaignIntegrationsTable.externalId, serverId),
					eq(campaignIntegrationsTable.source, IntegrationSource.DISCORD),
				),
			);

		if (discordIntegrationRow.length === 0) {
			throw new ORPCError("NOT_FOUND", {
				message: "Discord integration not found.",
			});
		}

		const campaignId = discordIntegrationRow[0].campaignId;
		const sessionDate = new Date(
			`${date}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:00`,
		);

		const userAvailabilitiesRow = await db
			.select()
			.from(userAvailabilitiesTable)
			.innerJoin(
				usersTable,
				and(eq(usersTable.id, userAvailabilitiesTable.userId)),
			)
			.where(
				and(
					eq(userAvailabilitiesTable.campaignId, campaignId),
					eq(userAvailabilitiesTable.dayOfWeek, dayOfWeek),
					lte(userAvailabilitiesTable.startTime, sessionTime),
					gte(userAvailabilitiesTable.endTime, sessionTime),
				),
			);

		const availableUsers = userAvailabilitiesRow.map(
			(user) => `${user.users.firstName} ${user.users.lastName}`,
		);

		await db.insert(sessionsTable).values({
			campaignId,
			startsAt: sessionDate,
			title: "D&D Session",
		});

		return { availableUsers };
	});

const sendMessage = discordProcedure
	.route({
		method: "POST",
		path: "/discord/message",
		summary: "Send a message to a Discord channel",
	})
	.input(SendMessageRequestSchema)
	.handler(async ({ input, context }) => {
		const { channelId, message } = input;
		const discord = context.discord;

		try {
			await discord?.post(Routes.channelMessages(channelId), {
				body: { content: message },
			});
		} catch (error) {
			// TODO: better error logging in router
			// biome-ignore lint/suspicious/noConsole: intentional error logging
			console.error(error);
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to send message to discord channel",
			});
		}
	});

const setAvailability = discordProcedure
	.route({
		method: "POST",
		path: "/discord/availability",
		summary: "Set availability for a Discord user",
	})
	.input(SetAvailabilityRequestSchema)
	.handler(async ({ input, context }) => {
		const db = context.db;
		const { serverId, time, externalId } = input;
		const { dayOfWeek, endTime, startTime, frequency } = time;

		const integrationRow = await db
			.select()
			.from(userIntegrationsTable)
			.leftJoin(
				userAvailabilitiesTable,
				and(
					eq(userAvailabilitiesTable.userId, userIntegrationsTable.userId),
					eq(userAvailabilitiesTable.dayOfWeek, dayOfWeek),
					lt(userAvailabilitiesTable.startTime, endTime),
					gt(userAvailabilitiesTable.endTime, startTime),
				),
			)
			.leftJoin(
				campaignIntegrationsTable,
				and(
					eq(campaignIntegrationsTable.externalId, serverId),
					eq(
						campaignIntegrationsTable.campaignId,
						userIntegrationsTable.campaignId,
					),
					eq(campaignIntegrationsTable.source, IntegrationSource.DISCORD),
				),
			)
			.where(eq(userIntegrationsTable.externalId, externalId))
			.limit(1);

		if (integrationRow.length === 0) {
			throw new ORPCError("NOT_FOUND", {
				message: "User Integration Not Found",
			});
		}

		const integration = integrationRow[0];

		if (!integration.campaign_integrations) {
			throw new ORPCError("NOT_FOUND", {
				message:
					"Campaign integration not found. Please register this Discord server with a campaign first.",
			});
		}

		const existingAvailability = integration.user_availabilities;
		const campaignId = integration.campaign_integrations.campaignId;

		if (existingAvailability) {
			throw new ORPCError("CONFLICT", {
				message: "Availability already exists for this day and time",
			});
		}

		await db.insert(userAvailabilitiesTable).values({
			campaignId,
			dayOfWeek,
			endTime,
			interval: frequency,
			startTime,
			userId: integration.user_integrations.userId,
		});
	});

export const discordRouter = {
	checkNextSession,
	checkReminders,
	clearAvailability,
	getAvailabilities,
	getNpc,
	removeAvailability,
	scheduleSession,
	sendMessage,
	setAvailability,
};
