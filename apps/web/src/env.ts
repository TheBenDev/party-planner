/** biome-ignore-all lint/style/noProcessEnv: Env entrypoint reads process.env */
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	client: {
		VITE_APP_URL: z.url().default("http://localhost:3000"),
		VITE_AUTH_PUBLIC_KEY_PEM: z.string().default(""),
		VITE_CLERK_AFTER_SIGN_IN_URL: z.string().default("/"),
		VITE_CLERK_AFTER_SIGN_UP_URL: z.string().default("/onboarding"),
		VITE_CLERK_PUBLISHABLE_KEY: z
			.string()
			.default("pk_test_bGlrZWQtZmVsaW5lLTU5LmNsZXJrLmFjY291bnRzLmRldiQ"),
		VITE_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
		VITE_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
	},
	clientPrefix: "VITE_",
	emptyStringAsUndefined: true,
	runtimeEnv: process.env,
	server: {
		AUTH_PRIVATE_KEY_PEM: z.string(),
		CLERK_SECRET_KEY: z.string(),
		CLERK_WEBHOOK_SECRET: z.string(),
		DATABASE_URL: z
			.string()
			.default(
				"postgresql://party_planner_owner:npg_5BI9sObhNYFe@ep-quiet-silence-a5iv4gbn-pooler.us-east-2.aws.neon.tech/party_planner?sslmode=require&channel_binding=require",
			),
		DISCORD_API_KEY: z.string(),
		DISCORD_TOKEN: z.string(),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
	},
});
