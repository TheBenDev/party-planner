import { z } from "zod";
import {
	DiscordIntegrationMetadataSchema,
	DiscordIntegrationSettingsSchema,
} from "./discord";

export const IntegrationMetadataSchema = z.discriminatedUnion("source", [
	DiscordIntegrationMetadataSchema,
]);
export const IntegrationSettingsSchema = z.discriminatedUnion("source", [
	DiscordIntegrationSettingsSchema,
]);

export type IntegrationMetadata = z.infer<typeof IntegrationMetadataSchema>;
export type IntegrationSettings = z.infer<typeof IntegrationSettingsSchema>;
