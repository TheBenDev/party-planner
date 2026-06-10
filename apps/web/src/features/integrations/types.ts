import { IntegrationSource } from "@planner/enums/integration";
import { z } from "zod";
import { BaseEntitySchema } from "@/shared/types";

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
	channelId: z.string(),
	source: z.literal(IntegrationSource.DISCORD),
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

export const ConnectGoogleCalendarRequestSchema = z.object({
	code: z.string(),
});
export const ConnectGoogleCalendarResponseSchema = z.object({
	connected: z.boolean(),
});
export const DisconnectGoogleCalendarRequestSchema = z.object({});
export const DisconnectGoogleCalendarResponseSchema = z.object({});
export const GetGoogleCalendarStatusRequestSchema = z.object({});
export const GetGoogleCalendarStatusResponseSchema = z.object({
	connected: z.boolean(),
});
export const CalendarEventWindowSchema = z.object({
	end: z.iso.datetime(),
	start: z.iso.datetime(),
});
export const CalendarConflictSchema = z.object({
	calendarEventWindows: z.array(CalendarEventWindowSchema),
	userId: z.string(),
});
export const CheckCalendarConflictsRequestSchema = z.object({
	campaignId: z.uuid(),
	durationMinutes: z.number().int().positive(),
	startsAt: z.iso.datetime(),
});
export const CheckCalendarConflictsResponseSchema = z.object({
	conflicts: z.array(CalendarConflictSchema),
});

export type ConnectGoogleCalendarRequest = z.infer<
	typeof ConnectGoogleCalendarRequestSchema
>;
export type ConnectGoogleCalendarResponse = z.infer<
	typeof ConnectGoogleCalendarResponseSchema
>;
export type DisconnectGoogleCalendarRequest = z.infer<
	typeof DisconnectGoogleCalendarRequestSchema
>;
export type DisconnectGoogleCalendarResponse = z.infer<
	typeof DisconnectGoogleCalendarResponseSchema
>;
export type GetGoogleCalendarStatusRequest = z.infer<
	typeof GetGoogleCalendarStatusRequestSchema
>;
export type GetGoogleCalendarStatusResponse = z.infer<
	typeof GetGoogleCalendarStatusResponseSchema
>;
export type CalendarEventWindow = z.infer<typeof CalendarEventWindowSchema>;
export type CalendarConflict = z.infer<typeof CalendarConflictSchema>;
export type CheckCalendarConflictsRequest = z.infer<
	typeof CheckCalendarConflictsRequestSchema
>;
export type CheckCalendarConflictsResponse = z.infer<
	typeof CheckCalendarConflictsResponseSchema
>;

export const SyncSessionToCalendarRequestSchema = z.object({
	description: z.string().optional(),
	durationMinutes: z.number().int().positive(),
	startsAt: z.iso.datetime(),
	title: z.string(),
});
export const SyncSessionToCalendarResponseSchema = z.object({
	synced: z.boolean(),
});

export type SyncSessionToCalendarRequest = z.infer<
	typeof SyncSessionToCalendarRequestSchema
>;
export type SyncSessionToCalendarResponse = z.infer<
	typeof SyncSessionToCalendarResponseSchema
>;
