import { DayOfWeekEnum } from "@planner/enums/common";
import { IntegrationSource } from "@planner/enums/integration";
import { z } from "zod";
import { NonPlayerCharactersSchema } from "./nonPlayerCharacter";

export const CheckNextSessionRequestSchema = z.object({
	serverId: z.string(),
});

export const CheckNextSessionResponseSchema = z.object({
	message: z.string(),
});

export const ClearAvailabilityRequestSchema = z.object({
	userExternalId: z.string(),
});
export const RemoveAvailabilityRequestSchema = z.object({
	dayOfWeek: z.enum(DayOfWeekEnum),
	startTime: z.string(),
	userExternalId: z.string(),
});

export const GetAvailabilitiesRequestSchema = z.object({
	userExternalId: z.string(),
});

export const GetAvailabilitiesResponseSchema = z.object({
	userAvailabilities: z
		.object({
			dayOfWeek: z.enum(DayOfWeekEnum),
			endTime: z.string(),
			startTime: z.string(),
		})
		.array(),
});

export const GetNpcRequestSchema = z.object({
	npcName: z.string(),
	serverId: z.string(),
});

export const GetNpcResponseSchema = z.object({
	npc: NonPlayerCharactersSchema,
});

export const RegisterCampaignRequestSchema = z.object({
	campaignId: z.string(),
	channelId: z.string(),
	serverId: z.string(),
});

export const RegisterCampaignResponseSchema = z.void();

export const ScheduleSessionRequestSchema = z.object({
	serverId: z.string(),
	time: z.object({
		date: z.string(),
		hour: z.string(),
		minute: z.string(),
	}),
});

export const ScheduleSessionResponseSchema = z.object({
	availableUsers: z.string().array(),
});

export const SendMessageRequestSchema = z.object({
	channelId: z.string(),
	message: z.string(),
});

export const SetAvailabilityRequestSchema = z.object({
	externalId: z.string(),
	serverId: z.string(),
	time: z.object({
		dayOfWeek: z.enum(DayOfWeekEnum),
		endTime: z.string(),
		frequency: z.number(),
		startTime: z.string(),
	}),
});

export const DiscordIntegrationMetadataSchema = z.object({
	channelId: z.string(),
	source: z.literal(IntegrationSource.DISCORD),
});

export const DiscordIntegrationSettingsSchema = z.object({
	enableSessionReminders: z.boolean(),
	source: z.literal(IntegrationSource.DISCORD),
});

export type DiscordIntegrationMetadata = z.infer<
	typeof DiscordIntegrationMetadataSchema
>;
export type DiscordIntegrationSettings = z.infer<
	typeof DiscordIntegrationSettingsSchema
>;
