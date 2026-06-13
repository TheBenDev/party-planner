import { IntegrationSource } from "@planner/enums/integration";
import { z } from "zod";
import { BaseEntitySchema } from "./common";

export const DiscordChannelSchema = z.object({
	id: z.string(),
	name: z.string(),
});
export type DiscordChannel = z.infer<typeof DiscordChannelSchema>;

export const CampaignIntegrationMetadataSchema = z.object({
	defaultChannel: DiscordChannelSchema,
	serverName: z.string(),
	source: z.enum(IntegrationSource),
});
export const CampaignIntegrationSettingsSchema = z.object({
	enableSessionReminders: z.boolean(),
	recapChannel: DiscordChannelSchema.nullable(),
	sessionCreateAnnouncements: z.boolean(),
	sessionReminderChannel: DiscordChannelSchema.nullable(),
	source: z.enum(IntegrationSource),
	timezone: z.string(),
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
	integration: CampaignIntegrationSchema.nullable(),
});

export const DiscordCreateIntegrationSchema = z.object({
	campaignId: z.uuid(),
	code: z.string(),
	source: z.literal(IntegrationSource.DISCORD),
});

export const CreateCampaignIntegrationRequestSchema = z.discriminatedUnion(
	"source",
	[DiscordCreateIntegrationSchema],
);

export const CreateCampaignIntegrationResponseSchema = z.object({
	integration: CampaignIntegrationSchema,
});

export const RemoveCampaignIntegrationRequestSchema = z.object({
	campaignId: z.uuid(),
	source: z.enum(IntegrationSource),
});

export const RemoveCampaignIntegrationResponseSchema = z.object({});

export const UpdateDiscordIntegrationRequestSchema = z.object({
	campaignId: z.uuid(),
	defaultChannel: DiscordChannelSchema,
	enableSessionReminders: z.boolean(),
	recapChannel: DiscordChannelSchema.nullable(),
	sessionCreateAnnouncements: z.boolean(),
	sessionReminderChannel: DiscordChannelSchema.nullable(),
	source: z.literal(IntegrationSource.DISCORD),
	timezone: z.string(),
});

export const UpdateCampaignIntegrationRequestSchema = z.discriminatedUnion(
	"source",
	[UpdateDiscordIntegrationRequestSchema],
);

export const UpdateCampaignIntegrationResponseSchema = z.object({
	integration: CampaignIntegrationSchema,
});

export const ListCampaignIntegrationsByCampaignRequestSchema = z.object({
	campaignId: z.uuid(),
});

export const ListCampaignIntegrationsByCampaignResponseSchema = z.object({
	integrations: z.array(CampaignIntegrationSchema),
});

export const DiscordIntegrationMetadataSchema = z.object({
	defaultChannel: DiscordChannelSchema,
	serverName: z.string(),
	source: z.literal(IntegrationSource.DISCORD),
});

export const DiscordIntegrationSettingsSchema = z.object({
	enableSessionReminders: z.boolean(),
	recapChannel: DiscordChannelSchema.nullable(),
	sessionCreateAnnouncements: z.boolean(),
	sessionReminderChannel: DiscordChannelSchema.nullable(),
	source: z.literal(IntegrationSource.DISCORD),
	timezone: z.string(),
});

export type DiscordIntegrationMetadata = z.infer<
	typeof DiscordIntegrationMetadataSchema
>;
export type DiscordIntegrationSettings = z.infer<
	typeof DiscordIntegrationSettingsSchema
>;

export type CampaignIntegration = z.infer<typeof CampaignIntegrationSchema>;
