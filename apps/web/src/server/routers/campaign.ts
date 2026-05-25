import { Code, ConnectError } from "@connectrpc/connect";
import { ORPCError } from "@orpc/server";
import { deleteCookie, getCookie } from "@orpc/server/helpers";
import { UserRole } from "@planner/enums/user";
import {
	CreateCampaignRequestSchema,
	CreateCampaignResponseSchema,
	DeleteCampaignRequestSchema,
	DeleteCampaignResponseSchema,
	GetActiveCampaignResponseSchema,
	UpdateCampaignRequestSchema,
	UpdateCampaignResponseSchema,
} from "@planner/schemas/campaigns";
import { decryptAuthCookie } from "@planner/security/auth";
import { env } from "@/env";
import { handleError } from "../errors";
import {
	ACTIVE_CAMPAIGN_ID_COOKIE_NAME,
	AUTH_COOKIE_NAME,
	privateProcedure,
	updateAuthCookie,
} from "../orpc";
import { protoToCampaign } from "./util/proto/campaign";

const createCampaign = privateProcedure
	.route({
		method: "POST",
		path: "/campaign/create",
		summary: "Creates a campaign",
	})
	.input(CreateCampaignRequestSchema)
	.output(CreateCampaignResponseSchema)
	.handler(async ({ input, context }) => {
		const { tags, title, description } = input;
		const api = context.api;
		const userId = context.userId;

		const values = {
			description,
			tags,
			title,
			userId,
		};

		try {
			const result = await api.campaign.createCampaign(values);
			const campaignProto = result.campaign;
			if (campaignProto === undefined)
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "failed to create campaign",
				});
			const campaign = protoToCampaign(campaignProto);
			const encryptedAuthCookie = getCookie(
				context.reqHeaders,
				AUTH_COOKIE_NAME,
			);
			try {
				if (encryptedAuthCookie) {
					const rawCookie = await decryptAuthCookie(
						encryptedAuthCookie,
						env.AUTH_PRIVATE_KEY_PEM,
					);
					await updateAuthCookie(env.VITE_AUTH_PUBLIC_KEY_PEM, context, {
						campaign,
						role: UserRole.DUNGEON_MASTER,
						user: rawCookie.user,
					});
				} else {
					deleteCookie(context.reqHeaders, ACTIVE_CAMPAIGN_ID_COOKIE_NAME);
					context.logger?.warn(
						"Failed to get and update auth cookie creating new campaign",
					);
				}
			} catch (error) {
				context.logger?.error(
					{ err: error },
					"Failed to set auth cookie after creating campaign",
				);
			}
			return {
				campaign,
			};
		} catch (err) {
			handleError(err, "failed to create campaign", { userId }, context.logger);
		}
	});

const getActiveCampaign = privateProcedure
	.route({
		method: "POST",
		path: "/campaign/getActive",
		summary: "Get a web user's active campaign",
	})
	.output(GetActiveCampaignResponseSchema)
	.handler(async ({ context }) => {
		const campaignId = context.campaignId;
		const api = context.api;
		if (!campaignId) return null;

		try {
			const result = await api.campaign.getCampaign({ id: campaignId });
			if (result.campaign === undefined) {
				context.logger?.warn(
					{ campaignId },
					"Failed to find active campaign despite having active campaign cookie in user context.",
				);
				throw new ORPCError("NOT_FOUND", { message: "Campaign not found" });
			}
			const role = context.role;
			if (role === null) {
				throw new ORPCError("FORBIDDEN", {
					message: "Active campaign found but not a member.",
				});
			}
			const campaign = protoToCampaign(result.campaign);
			return {
				campaign,
				role,
			};
		} catch (err) {
			if (err instanceof ConnectError && err.code === Code.NotFound) {
				return null;
			}
			handleError(
				err,
				"failed to get active campaign",
				{ campaignId },
				context.logger,
			);
		}
	});

const updateCampaign = privateProcedure
	.route({
		method: "POST",
		path: "/campaign/update",
		summary: "Updates a campaign's title, description, and tags",
	})
	.input(UpdateCampaignRequestSchema)
	.output(UpdateCampaignResponseSchema)
	.handler(async ({ input, context }) => {
		const { id, title, description, tags } = input;
		const { api, logger, role } = context;

		try {
			if (role !== UserRole.DUNGEON_MASTER) {
				throw new ORPCError("FORBIDDEN", {
					message: "not authorized to update campaign",
				});
			}

			const result = await api.campaign.updateCampaign({
				description,
				id,
				tags,
				title,
				userId: context.userId,
			});
			const campaignProto = result.campaign;
			if (campaignProto === undefined)
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "failed to update campaign",
				});

			return { campaign: protoToCampaign(campaignProto) };
		} catch (err) {
			handleError(err, "failed to update campaign", { id }, logger);
		}
	});

const deleteCampaign = privateProcedure
	.route({
		method: "POST",
		path: "/campaign/delete",
		summary: "Soft-deletes a campaign",
	})
	.input(DeleteCampaignRequestSchema)
	.output(DeleteCampaignResponseSchema)
	.handler(async ({ input, context }) => {
		const { id } = input;
		const { api, role, logger } = context;

		try {
			if (role !== UserRole.DUNGEON_MASTER) {
				throw new ORPCError("FORBIDDEN", {
					message: "not authorized to update campaign",
				});
			}
			const result = await api.campaign.deleteCampaign({
				id,
				userId: context.userId,
			});
			const campaignProto = result.campaign;
			if (campaignProto === undefined)
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "failed to delete campaign",
				});

			deleteCookie(context.reqHeaders, ACTIVE_CAMPAIGN_ID_COOKIE_NAME);
			return { campaign: protoToCampaign(campaignProto) };
		} catch (err) {
			handleError(err, "failed to delete campaign", { id }, logger);
		}
	});

export const campaignRouter = {
	createCampaign,
	deleteCampaign,
	getActiveCampaign,
	updateCampaign,
};
