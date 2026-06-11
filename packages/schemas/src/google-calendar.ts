import { z } from "zod";

export const GoogleCalendarTokenMetadataSchema = z.object({
	accessToken: z.string(),
	refreshToken: z.string(),
	tokenExpiry: z.number(), // Unix ms timestamp
});

export type GoogleCalendarTokenMetadata = z.infer<
	typeof GoogleCalendarTokenMetadataSchema
>;
