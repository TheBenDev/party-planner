import { serverEnvSchema } from "./config";

// biome-ignore lint/style/noProcessEnv: This is the entrypoint for the server
export const serverConfig = serverEnvSchema.parse(process.env);
