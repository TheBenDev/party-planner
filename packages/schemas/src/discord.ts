import {
	CharacterStatusEnum,
	RelationToPartyEnum,
} from "@planner/enums/character";
import { DayOfWeekEnum } from "@planner/enums/common";
import { IntegrationSource } from "@planner/enums/integration";
import { z } from "zod";
import { BaseEntitySchema } from "./common";

export const CampaignIntegrationMetadataSchema = z.object({
	channelId: z.string(),
	source: z.enum(IntegrationSource),
});
export const CampaignIntegrationSettingsSchema = z.object({
	enableSessionReminders: z.boolean(),
	source: z.enum(IntegrationSource),
});

export const CampaignIntegrationSchema = BaseEntitySchema.extend({
	campaignId: z.uuid(),
	externalId: z.string(),
	metaData: CampaignIntegrationMetadataSchema,
	settings: CampaignIntegrationSettingsSchema,
	source: z.enum(IntegrationSource),
});

export const GetCampaignIntegrationRequestSchema = z.object({
	campaignId: z.uuid(),
	source: z.enum(IntegrationSource),
});

export const GetCampaignIntegrationResponseSchema = z.object({
	integration: CampaignIntegrationSchema,
});

export const CreateCampaignIntegrationRequestSchema = z.object({
	campaignId: z.uuid(),
	channelId: z.string(),
	serverId: z.string(),
});

export const CreateCampaignIntegrationResponseSchema = z.object({
	integration: CampaignIntegrationSchema,
});

export const RemoveCampaignIntegrationRequestSchema = z.object({
	campaignId: z.uuid(),
	source: z.enum(IntegrationSource),
});

export const RemoveCampaignIntegrationResponseSchema = z.object({});

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
	npc: z.object({
		age: z.string().nullable(),
		aliases: z.array(z.string()).nullable(),
		appearance: z.string().nullable(),
		avatar: z.string().nullable(),
		id: z.uuid(),
		isKnownToParty: z.boolean(),
		knownName: z.string().nullable(),

		name: z.string(),
		personality: z.string().nullable(),
		playerNotes: z.string().nullable(),
		race: z.string().nullable(),
		relationToParty: z.enum(RelationToPartyEnum),

		// Status the party is aware of
		status: z.enum(CharacterStatusEnum),
	}),
});

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

export type CampaignIntegration = z.infer<typeof CampaignIntegrationSchema>;
