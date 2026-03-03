import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	emptyStringAsUndefined: true,
	/** biome-ignore lint/style/noProcessEnv: Env entrypoint reads process.env */
	runtimeEnv: process.env,
	server: {
		DATABASE_URL: z.url(),
	},
});
