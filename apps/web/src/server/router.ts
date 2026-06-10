import { campaignRouter } from "@/features/campaigns/procedures/campaign";
import { campaignIntegrationRouter } from "@/features/integrations/procedures/campaign-integration";
import { userIntegrationRouter } from "@/features/integrations/procedures/user-integration";
import { locationRouter } from "@/features/locations/procedures/location";
import { nonPlayerCharacterRouter } from "@/features/npcs/procedures/non-player-character";
import { memberRouter } from "@/features/players/procedures/member";
import { questRouter } from "@/features/quests/procedures/quest";
import { sessionRouter } from "@/features/sessions/procedures/session";
import { sessionSeriesRouter } from "@/features/sessions/procedures/session-series";
import { userRouter } from "./user";

/**
 * This is the main router for your server.
 * All routers in /server/routers should be added here manually.
 */
const appRouter = {
	campaign: campaignRouter,
	campaignIntegration: campaignIntegrationRouter,
	location: locationRouter,
	member: memberRouter,
	npc: nonPlayerCharacterRouter,
	quest: questRouter,
	session: sessionRouter,
	sessionSeries: sessionSeriesRouter,
	user: userRouter,
	userIntegration: userIntegrationRouter,
};

export type AppRouter = typeof appRouter;

export default appRouter;
