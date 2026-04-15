import { ORPCError } from "@orpc/server";
import {
	CreateCamapaignResponseSchema,
	CreateCampaignRequestSchema,
	GetActiveCampaignResponseSchema,
} from "@planner/schemas/campaigns";
import { handleError } from "../errors";
import { privateProcedure } from "../orpc";
import { protoToCampaign } from "./util/proto/campaign";

const createCampaign = privateProcedure
	.route({
		method: "POST",
		path: "/campaign/create",
		summary: "Creates a campaign",
	})
	.input(CreateCampaignRequestSchema)
	.output(CreateCamapaignResponseSchema)
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
			const campaign = result.campaign;
			if (campaign === undefined)
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "failed to create campaign",
				});
			return {
				campaign: protoToCampaign(campaign),
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
			const campaign = result.campaign;
			if (campaign === undefined) return null;
			return {
				campaign: protoToCampaign(campaign),
			};
		} catch (err) {
			handleError(
				err,
				"failed to get active campaign",
				{ campaignId },
				context.logger,
			);
		}
	});

export const campaignRouter = {
	createCampaign,
	getActiveCampaign,
};
