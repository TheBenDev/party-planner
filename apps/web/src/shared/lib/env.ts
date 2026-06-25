/** biome-ignore-all lint/style/noProcessEnv: Env entrypoint reads process.env */
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const clientRuntime = {
	VITE_API_URL: import.meta.env.VITE_API_URL,
	VITE_APP_URL: import.meta.env.VITE_APP_URL,
	VITE_CLERK_AFTER_SIGN_IN_URL: import.meta.env.VITE_CLERK_AFTER_SIGN_IN_URL,
	VITE_CLERK_AFTER_SIGN_UP_URL: import.meta.env.VITE_CLERK_AFTER_SIGN_UP_URL,
	VITE_CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
	VITE_CLERK_SIGN_IN_URL: import.meta.env.VITE_CLERK_SIGN_IN_URL,
	VITE_CLERK_SIGN_UP_URL: import.meta.env.VITE_CLERK_SIGN_UP_URL,
	VITE_DISCORD_CLIENT_ID: import.meta.env.VITE_DISCORD_CLIENT_ID,
	VITE_GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
};

export const env = createEnv({
	client: {
		VITE_API_URL: z.url().default("http://localhost:8000"),
		VITE_APP_FROM_EMAIL: z.email().default("onboarding@resend.dev"),
		VITE_APP_URL: z.url().default("http://localhost:3000"),
		VITE_CLERK_AFTER_SIGN_IN_URL: z.string().default("/"),
		VITE_CLERK_AFTER_SIGN_UP_URL: z.string().default("/onboarding"),
		VITE_CLERK_PUBLISHABLE_KEY: z.string(),
		VITE_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
		VITE_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
		VITE_DISCORD_CLIENT_ID: z.string(),
		VITE_GOOGLE_CLIENT_ID: z.string(),
	},
	clientPrefix: "VITE_",
	emptyStringAsUndefined: true,
	runtimeEnv: {
		...process.env,
		...clientRuntime,
	},
	server: {
		AUTH_PRIVATE_KEY_PEM: z.string(),
		AUTH_PUBLIC_KEY_PEM: z.string(),
		CLERK_SECRET_KEY: z.string(),
		DATABASE_URL: z.string(),
		DISCORD_API_KEY: z.string(),
		DISCORD_TOKEN: z.string(),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
	},
});
