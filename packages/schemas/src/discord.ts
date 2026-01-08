import { z } from "zod";

export const SendMessageRequestSchema = z.object({
	channelId: z.string(),
	message: z.string(),
});
