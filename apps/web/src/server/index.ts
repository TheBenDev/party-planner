import { campaignRouter } from "./routers/campaign";
import { characterRouter } from "./routers/character";
import { discordRouter } from "./routers/discord";
import { emailRouter } from "./routers/email";
import { locationRouter } from "./routers/location";
import { memberRouter } from "./routers/member";
import { nonPlayerCharacterRouter } from "./routers/non-player-character";
import { questRouter } from "./routers/quest";
import { sessionRouter } from "./routers/session";
import { userRouter } from "./routers/user";

/**
 * This is the main router for your server.
 * All routers in /server/routers should be added here manually.
 */
const appRouter = {
	campaign: campaignRouter,
	character: characterRouter,
	discord: discordRouter,
	email: emailRouter,
	location: locationRouter,
	member: memberRouter,
	npc: nonPlayerCharacterRouter,
	quest: questRouter,
	session: sessionRouter,
	user: userRouter,
};

export type AppRouter = typeof appRouter;

export default appRouter;
