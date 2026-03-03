/** biome-ignore-all lint/style/noProcessEnv: Env entrypoint reads process.env */
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	emptyStringAsUndefined: true,
	runtimeEnv: process.env,
	server: {
		API_KEY: z.string().min(1, "API_KEY is required"),
		APP_URL: z.string().min(1, "APP_URL is required."),
		DISCORD_PUBLIC_KEY: z.string().min(1, "DISCORD_PUBLIC_KEY is required."),
		DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN is required"),
	},
});
