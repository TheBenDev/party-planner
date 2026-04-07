import { createClerkClient, verifyToken } from "@clerk/backend";
import { REST } from "@discordjs/rest";
import type { LoggerContext } from "@orpc/experimental-pino";
import { getLogger } from "@orpc/experimental-pino";
import { ORPCError, os } from "@orpc/server";
import { getCookie, setCookie } from "@orpc/server/helpers";
import type { RequestHeadersPluginContext } from "@orpc/server/plugins";
import { type Client, createDb, schema } from "@planner/database";
import type { GetAuthResponse } from "@planner/schemas/user";
import {
	type AuthCookiePayload,
	decryptAuthCookie,
	encryptAuthCookie,
} from "@planner/security/auth";
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { env } from "@/env";
import { createApiClients } from "@/lib/api/index";

const { usersTable, campaignsTable, campaignUsersTable } = schema;
interface ORPCContext extends RequestHeadersPluginContext, LoggerContext {}
interface Context extends ORPCContext {
	api: ReturnType<typeof createApiClients>;
	db: Client;
	accessToken?: string;
}
const base = os.$context<ORPCContext>();

const loggingMiddleware = base.middleware(({ next, context, path }) => {
	getLogger(context)?.info({ procedure: path.join(".") }, "Procedure invoked");
	return next();
});

const dbMiddleware = base.middleware(({ next }) => {
	const api = createApiClients();
	const db: Client = createDb();
	return next({ context: { api, db } });
});

const discordMiddleware = base.middleware(({ next, context: c }) => {
	const authHeader = c.reqHeaders?.get("Authorization");

	if (!authHeader?.startsWith("Bot ")) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "Missing bot authorization",
		});
	}

	const apiKey = authHeader.replace("Bot ", "");
	if (apiKey !== env.DISCORD_API_KEY) {
		throw new ORPCError("UNAUTHORIZED", { message: "Invalid discord API key" });
	}

	const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

	return next({ context: { discord: rest } });
});

const resend = new Resend(env.RESEND_API_KEY);
export const AUTH_COOKIE_NAME = "planner_auth";
const ACTIVE_CAMPAIGN_ID_COOKIE_NAME = "active_campaign_id";
const CLERK_SESSION_COOKIE_NAMES = [
	"__session",
	`__session_${env.VITE_CLERK_PUBLISHABLE_KEY?.slice(3, 11)}`,
	"__clerk_session",
] as const;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
export const clerkClient = createClerkClient({
	secretKey: env.CLERK_SECRET_KEY,
});

function getSessionToken(headers: Headers): string | undefined {
	for (const cookieName of CLERK_SESSION_COOKIE_NAMES) {
		const token = getCookie(headers, cookieName);
		if (token) {
			return token;
		}
	}
	return undefined;
}

export const authMiddleware = os
	.$context<Context>()
	.middleware(async ({ next, context: c }) => {
		const db = c.db;
		if (!c.reqHeaders) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Request headers not available",
			});
		}
		// Use clerk cookie to verify user and access clerk external id
		const sessionToken = getSessionToken(c.reqHeaders);
		if (!sessionToken) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Session token not found",
			});
		}
		let clerkUserId: string;

		try {
			const payload = await verifyToken(sessionToken, {
				secretKey: env.CLERK_SECRET_KEY,
			});
			clerkUserId = payload.sub;
			if (!clerkUserId) {
				throw new ORPCError("UNAUTHORIZED", {
					message: "Invalid session - no user ID",
				});
			}
		} catch (error) {
			throw new ORPCError("UNAUTHORIZED", {
				cause: error,
				message: "Invalid Clerk session token",
			});
		}

		const activeCampaignIdCookie = getCookie(
			c.reqHeaders,
			ACTIVE_CAMPAIGN_ID_COOKIE_NAME,
		);

		// Use clerk external id to fetch user information for cookie
		async function getAuth(): Promise<GetAuthResponse> {
			const [row] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.externalId, clerkUserId))
				.limit(1);

			if (!row) {
				throw new ORPCError("NOT_FOUND", { message: "User not found" });
			}

			const userCampaigns = await db
				.select({
					campaign: campaignsTable,
					role: campaignUsersTable.role,
				})
				.from(campaignUsersTable)
				.innerJoin(
					campaignsTable,
					eq(campaignUsersTable.campaignId, campaignsTable.id),
				)
				.where(eq(campaignUsersTable.userId, row.id));

			let activeCampaignId = activeCampaignIdCookie;
			// set an active campaign for user if they don't have one and have a campaign available
			if (!activeCampaignIdCookie && userCampaigns.length > 0) {
				activeCampaignId = userCampaigns[0].campaign.id;
				setCookie(
					c.reqHeaders,
					ACTIVE_CAMPAIGN_ID_COOKIE_NAME,
					activeCampaignId,
					{
						httpOnly: true,
						maxAge: COOKIE_MAX_AGE,
						path: "/",
						sameSite: "lax",
						secure: env.NODE_ENV === "production",
					},
				);
			}

			const activeCampaign = userCampaigns.find(
				(campaigns) => campaigns.campaign.id === activeCampaignId,
			);

			return {
				campaign: activeCampaign
					? {
							...activeCampaign?.campaign,
							role: activeCampaign.role,
							tags: activeCampaign.campaign.tags ?? [],
						}
					: null,
				user: {
					avatar: row.avatar,
					email: row.email,
					externalId: row.externalId,
					firstName: row.firstName,
					id: row.id,
					lastName: row.lastName,
				},
			};
		}

		const encryptedAuthCookie = getCookie(c.reqHeaders, AUTH_COOKIE_NAME);
		let authPayload: Omit<AuthCookiePayload, "exp" | "iat">;
		let shouldSetCookie = false;

		// check auth cookie. if expired, invalid, or it doesn't exist,
		// set flag to create / update auth cookie
		if (encryptedAuthCookie) {
			try {
				const rawCookie = await decryptAuthCookie(
					encryptedAuthCookie,
					env.AUTH_PRIVATE_KEY_PEM,
				);
				const now = Math.floor(Date.now() / 1000);

				if (rawCookie.exp < now) {
					authPayload = await getAuth();
					shouldSetCookie = true;
				} else {
					authPayload = rawCookie;
				}
			} catch {
				authPayload = await getAuth();
				shouldSetCookie = true;
			}
		} else {
			authPayload = await getAuth();
			shouldSetCookie = true;
		}

		// if flag is set, create/update and encrypt cookie for auth information
		if (shouldSetCookie) {
			const publicKey = env.VITE_AUTH_PUBLIC_KEY_PEM;

			if (!publicKey) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Auth public key not configured",
				});
			}

			try {
				const encryptedCookie = await encryptAuthCookie(
					{
						campaign: authPayload.campaign ? authPayload.campaign : null,
						user: authPayload.user,
					},
					publicKey,
					COOKIE_MAX_AGE,
				);

				setCookie(c.reqHeaders, AUTH_COOKIE_NAME, encryptedCookie, {
					httpOnly: true,
					maxAge: COOKIE_MAX_AGE,
					path: "/",
					sameSite: "lax",
					secure: env.NODE_ENV === "production",
				});
			} catch (error) {
				getLogger(c)?.error({ err: error }, "Failed to set auth cookie");
			}
		}

		return next({
			context: {
				campaignId: authPayload.campaign?.id ?? null,
				clerkClient,
				clerkUserId,
				resend,
				role: authPayload.campaign?.role ?? null,
				userId: authPayload.user.id,
			},
		});
	});

/**
 * Public (unauthenticated) procedures
 *
 * This is the base piece you use to build new queries and mutations on your API.
 */
export const publicProcedure = base.use(loggingMiddleware).use(dbMiddleware);

/**
 * Authenticated procedures - has token, userId, RPC clients
 */
export const privateProcedure = publicProcedure.use(authMiddleware);

export const discordProcedure = publicProcedure.use(discordMiddleware);
