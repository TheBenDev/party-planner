import { handle } from "hono/vercel";
import { j } from "./jsandy";
import { campaignRouter } from "./routers/campaign-router";
import { characterRouter } from "./routers/character-route";
import { discordRouter } from "./routers/discord-router";
import { emailRouter } from "./routers/email-router";
import { locationRouter } from "./routers/location-router";
import { memberRouter } from "./routers/member-router";
import { nonPlayerCharacterRouter } from "./routers/nonPlayerCharacter-router";
import { questRouter } from "./routers/quest-router";
import { sessionRouter } from "./routers/session-router";
import { userRouter } from "./routers/user-router";

/**
 * This is your base API.
 * Here, you can handle errors, not-found responses, cors and more.
 */
const api = j
	.router()
	.basePath("/api")
	.use(j.defaults.cors)
	.onError(j.defaults.errorHandler);

/**
 * This is the main router for your server.
 * All routers in /server/routers should be added here manually.
 */
const appRouter = j.mergeRouters(api, {
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
});

export type AppRouter = typeof appRouter;

export default appRouter;

export const GET = handle(appRouter.handler);
export const POST = handle(appRouter.handler);
