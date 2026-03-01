/** biome-ignore-all lint/style/noProcessEnv: This is the env entrypoint for the web app */
import { z } from "zod";

export const envSchema = z.object({
	DATABASE_URL: z
		.url()
		.default(
			"postgresql://party_planner_owner:npg_5BI9sObhNYFe@ep-quiet-silence-a5iv4gbn-pooler.us-east-2.aws.neon.tech/party_planner?sslmode=require&channel_binding=require",
		),
});

export const envConfig = envSchema.parse(process.env);
export type EnvConfig = z.infer<typeof envSchema>;
