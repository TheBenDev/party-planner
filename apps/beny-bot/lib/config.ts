/** biome-ignore-all lint/style/noProcessEnv: This is the env entrypoint for the bot app */
import { z } from "zod";

export const envSchema = z.object({
	API_KEY: z.string().min(1, "API_KEY is required"),
	APP_URL: z.string().min(1, "APP_URL is required."),
	DISCORD_PUBLIC_KEY: z.string().min(1, "DISCORD_PUBLIC_KEY is required."),
	DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN is required"),
});

export const config = envSchema.parse({
	API_KEY: process.env.API_KEY,
	APP_URL: process.env.APP_URL,
	DISCORD_PUBLIC_KEY: process.env.DISCORD_PUBLIC_KEY,
	DISCORD_TOKEN: process.env.DISCORD_TOKEN,
});

export type Config = z.infer<typeof envSchema>;
