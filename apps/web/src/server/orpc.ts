import { createClerkClient, verifyToken } from "@clerk/backend";
import { REST } from "@discordjs/rest";
import type { LoggerContext } from "@orpc/experimental-pino";
import { getLogger } from "@orpc/experimental-pino";
import { ORPCError, os } from "@orpc/server";
import { deleteCookie, getCookie, setCookie } from "@orpc/server/helpers";
import type {
	RequestHeadersPluginContext,
	ResponseHeadersPluginContext,
} from "@orpc/server/plugins";
import { type Client, createDb } from "@planner/database";
import type { UserRole } from "@planner/enums/user";
import type { Campaign } from "@planner/schemas/campaigns";
import type { GetAuthResponse, User } from "@planner/schemas/user";
import {
	type AuthCookiePayload,
	decryptAuthCookie,
	encryptAuthCookie,
} from "@planner/security/auth";
import type pino from "pino";
import { Resend } from "resend";
import { env } from "@/env";
import { createApiClients } from "@/lib/api/index";
import { handleError } from "./errors";
import { protoToCampaign } from "./routers/util/proto/campaign";
import { protoRoleToUserRole } from "./routers/util/proto/member";
import { protoToUser } from "./routers/util/proto/user";

interface ORPCContext
	extends RequestHeadersPluginContext,
		ResponseHeadersPluginContext,
		LoggerContext {}
interface Context extends ORPCContext {
	api: ReturnType<typeof createApiClients>;
	db: Client;
	accessToken?: string;
	logger?: pino.Logger;
}
const base = os.$context<ORPCContext>();

const loggingMiddleware = base.middleware(({ next, context, path }) => {
	const logger = getLogger(context);
	logger?.info({ procedure: path.join(".") }, "Procedure invoked");
	return next({
		context: {
			logger,
		},
	});
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
export const ACTIVE_CAMPAIGN_ID_COOKIE_NAME = "active_campaign_id";
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

export async function updateAuthCookie(
	publicKey: string,
	context: Context,
	{
		campaign,
		role,
		user,
	}: {
		campaign: Campaign | null;
		role: UserRole | null;
		user: User;
	},
) {
	const encryptedCookie = await encryptAuthCookie(
		{
			campaign,
			role,
			user,
		},
		publicKey,
		COOKIE_MAX_AGE,
	);
	if (campaign) {
		setCookie(context.resHeaders, ACTIVE_CAMPAIGN_ID_COOKIE_NAME, campaign.id, {
			httpOnly: true,
			maxAge: COOKIE_MAX_AGE,
			path: "/",
			sameSite: "lax",
			secure: env.NODE_ENV === "production",
		});
	}

	setCookie(context.resHeaders, AUTH_COOKIE_NAME, encryptedCookie, {
		httpOnly: true,
		maxAge: COOKIE_MAX_AGE,
		path: "/",
		sameSite: "lax",
		secure: env.NODE_ENV === "production",
	});
}

export const authMiddleware = os
	.$context<Context>()
	.middleware(async ({ next, context: c }) => {
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
			let activeCampaignId = activeCampaignIdCookie;
			async function fetchAuth(
				campaignId: string | undefined,
			): Promise<GetAuthResponse> {
				const authProto = await c.api.user.getAuth({
					campaignId,
					clerkId: clerkUserId,
				});
				if (authProto.user === undefined) {
					c.logger?.error(
						{ clerkId: clerkUserId },
						"Data synchronization error. Clerk user found but database user not found.",
					);
					throw new ORPCError("NOT_FOUND", { message: "user not found" });
				}
				const campaign =
					authProto.campaign === undefined
						? null
						: { ...protoToCampaign(authProto.campaign) };
				const role =
					authProto.role === undefined
						? null
						: protoRoleToUserRole(authProto.role);

				return { campaign, role, user: protoToUser(authProto.user) };
			}
			let auth: GetAuthResponse;
			try {
				auth = await fetchAuth(activeCampaignId);
			} catch (err) {
				// check without a campaign id stored in cookies
				// guardrail if a campaign is deleted but has its cookie still stored
				if (activeCampaignId) {
					deleteCookie(c.resHeaders, ACTIVE_CAMPAIGN_ID_COOKIE_NAME);
					deleteCookie(c.resHeaders, AUTH_COOKIE_NAME);
					activeCampaignId = undefined;
					try {
						auth = await fetchAuth(undefined);
					} catch (retryErr) {
						handleError(
							retryErr,
							"failed to get auth",
							{
								clerkId: clerkUserId,
							},
							c.logger,
						);
					}
				} else {
					handleError(
						err,
						"failed to get auth",
						{
							clerkId: clerkUserId,
						},
						c.logger,
					);
				}
			}
			// set an active campaign for user if they don't have one and have a campaign available
			if (!activeCampaignIdCookie && auth.campaign !== null) {
				activeCampaignId = auth.campaign.id;
				setCookie(
					c.resHeaders,
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

			return {
				campaign: auth.campaign,
				role: auth.role,
				user: auth.user,
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
				await updateAuthCookie(publicKey, c, {
					campaign: authPayload.campaign,
					role: authPayload.role,
					user: authPayload.user,
				});
			} catch (error) {
				c.logger?.error({ err: error }, "Failed to set auth cookie");
			}
		}

		return next({
			context: {
				campaignId: authPayload.campaign?.id ?? null,
				clerkClient,
				clerkUserId,
				resend,
				role: authPayload.role,
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
