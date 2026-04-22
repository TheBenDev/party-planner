/** biome-ignore-all lint/style/noProcessEnv: Env entrypoint reads process.env */
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	client: {
		VITE_API_URL: z.url().default("http://localhost:8000"),
		VITE_APP_URL: z.url().default("http://localhost:3000"),
		VITE_AUTH_PUBLIC_KEY_PEM: z.string(),
		VITE_CLERK_AFTER_SIGN_IN_URL: z.string().default("/"),
		VITE_CLERK_AFTER_SIGN_UP_URL: z.string().default("/onboarding"),
		VITE_CLERK_PUBLISHABLE_KEY: z.string(),
		VITE_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
		VITE_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
	},
	clientPrefix: "VITE_",
	emptyStringAsUndefined: true,
	runtimeEnv: process.env,
	server: {
		AUTH_PRIVATE_KEY_PEM: z.string(),
		CLERK_SECRET_KEY: z.string(),
		CLERK_WEBHOOK_SIGNING_SECRET: z.string(),
		DATABASE_URL: z.string(),
		DISCORD_API_KEY: z.string(),
		DISCORD_TOKEN: z.string(),
		INTERNAL_API_KEY: z.string(),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
	},
});
