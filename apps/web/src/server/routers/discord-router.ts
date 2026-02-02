import { schema } from "@planner/database";
import { IntegrationSource } from "@planner/enums/integration";
import {
	ClearAvailabilityRequestSchema,
	RemoveAvailabilityRequestSchema,
	ScheduleSessionRequestSchema,
	SendMessageRequestSchema,
	SetAvailabilityRequestSchema,
} from "@planner/schemas/discord";
import { Routes } from "discord-api-types/v10";
import { and, asc, eq, gt, gte, ilike, lt, lte } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { discordProcedure, j } from "../jsandy";

const {
	campaignsTable,
	sessionsTable,
	campaignIntegrationsTable,
	nonPlayerCharactersTable,
	usersTable,
	userAvailabilitiesTable,
	userIntegrationsTable,
} = schema;
// TODO: Create a procedure for handling webhooks
export const discordRouter = j.router({
	checkNextSession: discordProcedure.query(async ({ c }) => {
		const db = c.get("db");
		const serverId = c.req.query("serverId");

		if (!serverId) {
			throw new HTTPException(400, { message: "Discord server id required" });
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
			throw new HTTPException(404, {
				message: "Campaign integration not found",
			});
		}

		if (discordIntegrationRow[0].campaign_integrations.metadata == null) {
			throw new HTTPException(500, {
				message: "Campaign integration metadata is missing",
			});
		}

		if (discordIntegrationRow[0].session === null) {
			return c.json({ message: "I don't see any sessions coming up." });
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
		return c.json({ message: `The next D&D session starts on ${time}!` });
	}),
	checkReminders: discordProcedure.mutation(async ({ c }) => {
		const db = c.get("db");
		const discord = c.get("discord");
		const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24); // one day in milliseconds
		const twoDaysLater = new Date(Date.now() + 1000 * 60 * 60 * 48); // two days in milliseconds

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
				return discord.post(Routes.channelMessages(channelId), {
					body: {
						content: `Reminder: There is a D&D session starting on ${time}!`,
					},
				});
			}
			return null;
		});
	}),
	clearAvailability: discordProcedure.mutation(async ({ c }) => {
		const db = c.get("db");
		const { userExternalId } = ClearAvailabilityRequestSchema.parse(
			await c.req.json(),
		);

		const userIntegrationRow = await db
			.select({
				campaignId: userIntegrationsTable.campaignId,
				userId: userIntegrationsTable.userId,
			})
			.from(userIntegrationsTable)
			.where(eq(userIntegrationsTable.externalId, userExternalId));

		if (userIntegrationRow.length === 0) {
			throw new HTTPException(404, { message: "User integration not found." });
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
	}),
	getAvailabilities: discordProcedure.query(async ({ c }) => {
		const db = c.get("db");
		const userExternalId = c.req.query("userExternalId");

		if (!userExternalId) {
			throw new HTTPException(400, {
				message: "User Discord id missing from params",
			});
		}

		const userIntegrationRow = await db
			.select({ availabilities: userAvailabilitiesTable })
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
			throw new HTTPException(404, { message: "user integration not found" });
		}
		const userAvailabilities = userIntegrationRow
			.filter((row) => row.availabilities !== null)
			.map((row) => ({
				dayOfWeek: row.availabilities?.dayOfWeek,
				endTime: row.availabilities?.endTime,
				startTime: row.availabilities?.startTime,
			}));

		return c.json({
			userAvailabilities,
		});
	}),
	getNpc: discordProcedure.query(async ({ c }) => {
		const db = c.get("db");
		const serverId = c.req.query("serverId");
		const npcName = c.req.query("npcName");
		if (!serverId) {
			throw new HTTPException(400, { message: "Discord server id required" });
		}
		if (!npcName) {
			throw new HTTPException(400, { message: "Npc Name required" });
		}

		const discordIntegrationRow = await db
			.select()
			.from(campaignIntegrationsTable)
			.innerJoin(
				nonPlayerCharactersTable,
				and(
					eq(
						nonPlayerCharactersTable.campaignId,
						campaignIntegrationsTable.campaignId,
					),
					ilike(nonPlayerCharactersTable.firstName, npcName),
				),
			)
			.where(
				and(
					eq(campaignIntegrationsTable.externalId, serverId),
					eq(campaignIntegrationsTable.source, IntegrationSource.DISCORD),
				),
			);

		if (discordIntegrationRow.length === 0) {
			throw new HTTPException(404, {
				message: "Campaign integration not found",
			});
		}

		const npcRow = discordIntegrationRow[0].non_player_character;
		if (npcRow === null) {
			throw new HTTPException(404, {
				message: "NPC not found",
			});
		}
		return c.json({ npc: npcRow });
	}),
	registerCampaign: discordProcedure.mutation(async ({ c }) => {
		const db = c.get("db");
		const body = await c.req.json();
		const { serverId, campaignId, channelId } = body;

		if (!(serverId && campaignId && channelId)) {
			throw new HTTPException(400, {
				message: "missing params for register",
			});
		}

		const campaignRow = await db
			.select()
			.from(campaignsTable)
			.leftJoin(
				campaignIntegrationsTable,
				and(
					eq(campaignIntegrationsTable.campaignId, campaignId),
					eq(campaignIntegrationsTable.externalId, serverId),
				),
			)
			.where(eq(campaignsTable.id, campaignId))
			.limit(1);

		if (campaignRow.length === 0) {
			throw new HTTPException(404, { message: "Campaign not found" });
		}

		if (campaignRow[0].campaign_integrations !== null) {
			throw new HTTPException(409, {
				message: "Campaign is already integrated with discord server",
			});
		}
		const values = {
			campaignId,
			externalId: serverId,
			metadata: { channelId, source: IntegrationSource.DISCORD },
			settings: {
				enableSessionReminders: true,
				source: IntegrationSource.DISCORD,
			},
			source: IntegrationSource.DISCORD,
		};

		await db
			.insert(campaignIntegrationsTable)
			.values(values)
			.onConflictDoNothing();
	}),
	removeAvailability: discordProcedure.mutation(async ({ c }) => {
		const db = c.get("db");
		const { dayOfWeek, startTime, userExternalId } =
			RemoveAvailabilityRequestSchema.parse(await c.req.json());

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
			throw new HTTPException(404, { message: "User integration not found." });
		}

		const { userId, campaignId, userAvailability } = userIntegrationRow[0];

		if (userAvailability === null) {
			throw new HTTPException(404, { message: "User Availability not found." });
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
	}),
	scheduleSession: discordProcedure.mutation(async ({ c }) => {
		const db = c.get("db");
		const body = ScheduleSessionRequestSchema.parse(await c.req.json());
		const { serverId, time } = body;
		const { hour, minute, date } = time;
		const sessionTime = `${hour}:${minute}:00`;
		const dayOfWeek = new Date(date).getUTCDay();

		const discordIntegrationRow = await db
			.select({
				campaignId: campaignIntegrationsTable.campaignId,
			})
			.from(campaignIntegrationsTable)
			.where(
				and(
					eq(campaignIntegrationsTable.externalId, serverId),
					eq(campaignIntegrationsTable.source, IntegrationSource.DISCORD),
				),
			);
		if (discordIntegrationRow.length === 0) {
			throw new HTTPException(404, {
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
		return c.json({ availableUsers });
	}),
	sendMessage: discordProcedure
		.input(SendMessageRequestSchema)
		.mutation(async ({ c, input }) => {
			const { channelId, message } = input;
			const discord = c.get("discord");
			try {
				await discord.post(Routes.channelMessages(channelId), {
					body: {
						content: message,
					},
				});
			} catch (error) {
				console.error(error);
				throw new HTTPException(500, {
					message: "Failed to send message to discord channel",
				});
			}
		}),
	setAvailability: discordProcedure.mutation(async ({ c }) => {
		const body = SetAvailabilityRequestSchema.parse(await c.req.json());
		const db = c.get("db");
		const { serverId, time, externalId } = body;
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
			throw new HTTPException(404, { message: "User Integration Not Found" });
		}
		const integration = integrationRow[0];

		if (!integration.campaign_integrations) {
			throw new HTTPException(404, {
				message:
					"Campaign integration not found. Please register this Discord server with a campaign first.",
			});
		}

		const existingAvailability = integration.user_availabilities;
		const campaignId = integration.campaign_integrations.campaignId;

		if (existingAvailability) {
			throw new HTTPException(409, {
				message: "Availability already exists for this day and time",
			});
		}

		await db.insert(userAvailabilitiesTable).values({
			campaignId, // Or get from integration if campaign-specific
			dayOfWeek,
			endTime,
			interval: frequency,
			startTime,
			userId: integration.user_integrations.userId,
		});
	}),
});
