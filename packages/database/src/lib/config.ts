/** biome-ignore-all lint/style/noProcessEnv: This is the env entrypoint for the web app */
import { z } from "zod";

export const envSchema = z.object({
	DATABASE_URL: z
		.url()
})

export const envConfig = envSchema.parse(process.env);
export type EnvConfig = z.infer<typeof envSchema>;
