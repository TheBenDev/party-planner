/** biome-ignore-all lint/style/noProcessEnv: This is the env entrypoint for the web app */
import { z } from "zod";

export const clientEnvSchema = z.object({
	NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
	NEXT_PUBLIC_AUTH_PUBLIC_KEY_PEM: z
		.string()
		.min(1, "NEXT_PUBLIC_AUTH_PUBLIC_KEY_PEM is required"),
	NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default("/"),
	NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default("/onboarding"),
	NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
		.string()
		.default("pk_test_bGlrZWQtZmVsaW5lLTU5LmNsZXJrLmFjY291bnRzLmRldiQ"),
	NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
	NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
	NODE_ENV: z.string().default("development"),
});

export const serverEnvSchema = clientEnvSchema.extend({
	AUTH_PRIVATE_KEY_PEM: z.string().min(1, "AUTH_PRIVATE_KEY_PEM is required"),
	CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
	CLERK_WEBHOOK_SECRET: z.string().min(1, "CLERK_WEBHOOK_SECRET is required"),
	DATABASE_URL: z
		.string()
		.default(
			"postgresql://party_planner_owner:npg_5BI9sObhNYFe@ep-quiet-silence-a5iv4gbn-pooler.us-east-2.aws.neon.tech/party_planner?sslmode=require&channel_binding=require",
		),
	DISCORD_TOKEN: z.string(),
	RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
});

export const clientConfig = clientEnvSchema.parse({
	NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
	NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
	NEXT_PUBLIC_AUTH_PUBLIC_KEY_PEM: process.env.NEXT_PUBLIC_AUTH_PUBLIC_KEY_PEM,
	NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL:
		process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
	NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL:
		process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
	NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
		process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
	NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
	NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
});
export type Config = z.infer<typeof serverEnvSchema>;
