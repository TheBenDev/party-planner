import { createRouterClient } from "@orpc/server";
import appRouter from "@/server/router";

export const serverClient = createRouterClient(appRouter, {});
