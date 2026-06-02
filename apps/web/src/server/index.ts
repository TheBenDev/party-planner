import { campaignRouter } from "./routers/campaign";
import { campaignIntegrationRouter } from "./routers/campaignIntegration";

import { emailRouter } from "./routers/email";
import { locationRouter } from "./routers/location";
import { memberRouter } from "./routers/member";
import { nonPlayerCharacterRouter } from "./routers/non-player-character";
import { questRouter } from "./routers/quest";
import { sessionRouter } from "./routers/session";
import { sessionSeriesRouter } from "./routers/sessionSeries";
import { userRouter } from "./routers/user";

/**
 * This is the main router for your server.
 * All routers in /server/routers should be added here manually.
 */
const appRouter = {
	campaign: campaignRouter,
	campaignIntegration: campaignIntegrationRouter,
	email: emailRouter,
	location: locationRouter,
	member: memberRouter,
	npc: nonPlayerCharacterRouter,
	quest: questRouter,
	session: sessionRouter,
	sessionSeries: sessionSeriesRouter,
	user: userRouter,
};

export type AppRouter = typeof appRouter;

export default appRouter;
