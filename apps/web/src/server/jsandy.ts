import {
	type ClerkClient,
	createClerkClient,
	verifyToken,
} from "@clerk/backend";
import { type REST as DiscordRest, REST } from "@discordjs/rest";
import { jsandy } from "@jsandy/rpc";
import { type Client, createDb, schema } from "@planner/database";
import type { UserRole } from "@planner/enums/user";
import type { GetAuthResponse } from "@planner/schemas/user";
import {
	type AuthCookiePayload,
	decryptAuthCookie,
	encryptAuthCookie,
} from "@planner/security/auth";
import { eq } from "drizzle-orm";
import { getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { Resend, type Resend as ResendType } from "resend";
import { serverConfig } from "@/lib/serverConfig";

export interface Env {
	Bindings: { DATABASE_URL: string };
	Variables: {
		campaignId: string | null;
		clerkClient: ClerkClient;
		clerkUserId?: string;
		discord?: DiscordRest;
		db: Client;
		resend: ResendType;
		role: UserRole | null;
		userId: string;
	};
}

const { usersTable, campaignsTable, campaignUsersTable } = schema;
export const j = jsandy.init<Env>();

const drizzleMiddleware = j.middleware(({ c, next }) => {
	const db = createDb();
	c.set("db", db);
	return next();
});

const discordMiddleware = j.middleware(({ next, c }) => {
	const authHeader = c.req.header("Authorization");

	if (!authHeader?.startsWith("Bot ")) {
		throw new HTTPException(401, { message: "Missing bot authorization" });
	}

	const apiKey = authHeader.replace("Bot ", "");
	if (apiKey !== serverConfig.DISCORD_API_KEY) {
		throw new HTTPException(401, { message: "Invalid discord API key" });
	}

	const rest = new REST({ version: "10" }).setToken(serverConfig.DISCORD_TOKEN);
	c.set("discord", rest);

	return next();
});

const resend = new Resend(serverConfig.RESEND_API_KEY);
export const AUTH_COOKIE_NAME = "planner_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
export const clerkClient = createClerkClient({
	secretKey: serverConfig.CLERK_SECRET_KEY,
});

const authMiddleware = j.middleware(async ({ next, c }) => {
	const db = c.get("db");

	// Use clerk cookie to verify user and access clerk external id
	const sessionToken =
		getCookie(c, "__session") ||
		getCookie(
			c,
			`__session_${serverConfig.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.slice(3, 11)}`,
		) ||
		getCookie(c, "__clerk_session");
	if (!sessionToken) {
		throw new HTTPException(401, { message: "Session token not found" });
	}
	let clerkUserId: string;

	try {
		const payload = await verifyToken(sessionToken, {
			secretKey: serverConfig.CLERK_SECRET_KEY,
		});
		clerkUserId = payload.sub;
		if (!clerkUserId) {
			throw new HTTPException(401, { message: "Invalid session - no user ID" });
		}
	} catch (error) {
		throw new HTTPException(401, {
			cause: error,
			message: "Invalid Clerk session token",
		});
	}

	const CAMPAIGN_ID_COOKIE_NAME = "active_campaign_id";
	const activeCampaignIdCookie = getCookie(c, CAMPAIGN_ID_COOKIE_NAME);

	// Use clerk external id to fetch user information for cookie
	async function GetAuth(): Promise<GetAuthResponse> {
		const [row] = await db
			.select()
			.from(usersTable)
			.where(eq(usersTable.externalId, clerkUserId))
			.limit(1);

		if (!row) {
			throw new HTTPException(404, { message: "User not found" });
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
			setCookie(c, CAMPAIGN_ID_COOKIE_NAME, activeCampaignId, {
				httpOnly: true,
				maxAge: COOKIE_MAX_AGE,
				path: "/",
				sameSite: "lax",
			});
		}

		const activeCampaign = userCampaigns.find(
			(campaigns) => campaigns.campaign.id === activeCampaignId,
		);

		return {
			campaign: activeCampaign
				? { ...activeCampaign?.campaign, role: activeCampaign.role }
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

	const encryptedAuthCookie = getCookie(c, AUTH_COOKIE_NAME);
	let authPayload: Omit<AuthCookiePayload, "exp" | "iat">;
	let shouldSetCookie = false;

	// check auth cookie. if expired, invalid, or it doesn't exist,
	// set flag to create / update auth cookie
	if (encryptedAuthCookie) {
		try {
			const rawCookie = await decryptAuthCookie(
				encryptedAuthCookie,
				serverConfig.AUTH_PRIVATE_KEY_PEM,
			);
			const now = Math.floor(Date.now() / 1000);

			if (rawCookie.exp < now) {
				authPayload = await GetAuth();
				shouldSetCookie = true;
			} else {
				authPayload = rawCookie;
			}
		} catch {
			authPayload = await GetAuth();
			shouldSetCookie = true;
		}
	} else {
		authPayload = await GetAuth();
		shouldSetCookie = true;
	}

	// if flag is set, create/update and encrypt cookie for auth information
	if (shouldSetCookie) {
		const publicKey = serverConfig.NEXT_PUBLIC_AUTH_PUBLIC_KEY_PEM;

		if (!publicKey) {
			throw new HTTPException(500, {
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

			setCookie(c, AUTH_COOKIE_NAME, encryptedCookie, {
				httpOnly: true,
				maxAge: COOKIE_MAX_AGE,
				path: "/",
				sameSite: "lax",
				secure: serverConfig.NODE_ENV === "production",
			});
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Need this log in case something goes wrong
			console.error("Failed to set auth cookie: ", error);
		}
	}

	c.set("userId", authPayload.user.id);
	c.set("campaignId", authPayload.campaign?.id ?? null);
	c.set("role", authPayload.campaign?.role ?? null);
	c.set("clerkClient", clerkClient);
	c.set("clerkUserId", clerkUserId);
	c.set("resend", resend);
	return next();
});

/**
 * Public (unauthenticated) procedures
 *
 * This is the base piece you use to build new queries and mutations on your API.
 */
export const publicProcedure = j.procedure.use(drizzleMiddleware);

/**
 * Authenticated procedures - has token, userId, RPC clients
 */
export const privateProcedure = publicProcedure.use(authMiddleware);

export const discordProcedure = publicProcedure.use(discordMiddleware);
