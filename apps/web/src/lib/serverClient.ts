import { createRouterClient } from "@orpc/server";
import appRouter from "@/server";

export const serverClient = createRouterClient(appRouter, {});
