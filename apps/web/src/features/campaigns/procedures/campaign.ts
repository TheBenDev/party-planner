import { Code, ConnectError } from "@connectrpc/connect";
import { ORPCError } from "@orpc/server";
import { deleteCookie } from "@orpc/server/helpers";
import { UserRole } from "@planner/enums/user";
import {
	CreateCampaignRequestSchema,
	CreateCampaignResponseSchema,
	DeleteCampaignRequestSchema,
	DeleteCampaignResponseSchema,
	GetActiveCampaignResponseSchema,
	UpdateCampaignRequestSchema,
	UpdateCampaignResponseSchema,
} from "@/features/campaigns/types";
import { handleError } from "@/server/errors";
import {
	ACTIVE_CAMPAIGN_ID_COOKIE_NAME,
	dmProcedure,
	privateProcedure,
	tryRefreshAuthCookie,
} from "@/server/middleware";
import { protoToCampaign } from "@/shared/lib/proto/campaign";

const createCampaignDef = privateProcedure
	.route({
		method: "POST",
		path: "/campaign/create",
		summary: "Creates a campaign",
	})
	.input(CreateCampaignRequestSchema)
	.output(CreateCampaignResponseSchema);

export const createCampaignHandler: Parameters<
	typeof createCampaignDef.handler
>[0] = async ({ input, context }) => {
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
		await tryRefreshAuthCookie(context, {
			campaign,
			colonyId: null,
			role: UserRole.DUNGEON_MASTER,
		});
		return {
			campaign,
		};
	} catch (err) {
		handleError(err, "failed to create campaign", { userId }, context.logger);
	}
};

const getActiveCampaignDef = privateProcedure
	.route({
		method: "POST",
		path: "/campaign/getActive",
		summary: "Get a web user's active campaign",
	})
	.output(GetActiveCampaignResponseSchema);

export const getActiveCampaignHandler: Parameters<
	typeof getActiveCampaignDef.handler
>[0] = async ({ context }) => {
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
			colonyId: result.colonyId ?? null,
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
};

const updateCampaignDef = dmProcedure
	.route({
		method: "POST",
		path: "/campaign/update",
		summary: "Updates a campaign's title, description, and tags",
	})
	.input(UpdateCampaignRequestSchema)
	.output(UpdateCampaignResponseSchema);

export const updateCampaignHandler: Parameters<
	typeof updateCampaignDef.handler
>[0] = async ({ input, context }) => {
	const { id, title, description, tags } = input;
	const { api, logger } = context;
	if (id !== context.campaignId) {
		throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
	}
	try {
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
};
const deleteCampaignDef = dmProcedure
	.route({
		method: "POST",
		path: "/campaign/delete",
		summary: "Soft-deletes a campaign",
	})
	.input(DeleteCampaignRequestSchema)
	.output(DeleteCampaignResponseSchema);

export const deleteCampaignHandler: Parameters<
	typeof deleteCampaignDef.handler
>[0] = async ({ input, context }) => {
	const { id } = input;
	const { api, logger, campaignId } = context;
	if (id !== campaignId) {
		throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
	}
	try {
		const result = await api.campaign.deleteCampaign({
			id,
			userId: context.userId,
		});
		deleteCookie(context.reqHeaders, ACTIVE_CAMPAIGN_ID_COOKIE_NAME);

		const campaignProto = result.campaign;
		if (campaignProto === undefined) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "failed to delete campaign",
			});
		}
		const campaign = protoToCampaign(campaignProto);
		return { campaign };
	} catch (err) {
		handleError(err, "failed to delete campaign", { id }, logger);
	}
};

export const campaignRouter = {
	createCampaign: createCampaignDef.handler(createCampaignHandler),
	deleteCampaign: deleteCampaignDef.handler(deleteCampaignHandler),
	getActiveCampaign: getActiveCampaignDef.handler(getActiveCampaignHandler),
	updateCampaign: updateCampaignDef.handler(updateCampaignHandler),
};
