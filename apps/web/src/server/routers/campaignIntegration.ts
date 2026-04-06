import { ORPCError } from "@orpc/client";
import { IntegrationSource } from "@planner/enums/integration";
import {
	CreateCampaignIntegrationRequestSchema,
	CreateCampaignIntegrationResponseSchema,
	GetCampaignIntegrationRequestSchema,
	GetCampaignIntegrationResponseSchema,
	RemoveCampaignIntegrationRequestSchema,
	RemoveCampaignIntegrationResponseSchema,
} from "@planner/schemas/discord";
import { handleError } from "../errors";
import { privateProcedure } from "../orpc";
import {
	integrationSourceToProto,
	protoToCampaignIntegration,
} from "./util/proto/campaignIntegration";

const createCampaignIntegration = privateProcedure
	.route({
		method: "POST",
		path: "/campaignIntegration/createCampaignIntegration",
		summary: "Register a campaign with a Discord server",
	})
	.input(CreateCampaignIntegrationRequestSchema)
	.output(CreateCampaignIntegrationResponseSchema)
	.handler(async ({ input, context }) => {
		const { serverId, campaignId, channelId } = input;
		const api = context.api;
		if (!(serverId && campaignId && channelId)) {
			throw new ORPCError("BAD_REQUEST", {
				message: "missing params for register",
			});
		}

		const values = {
			campaignId,
			externalId: serverId,
			metadata: { channelId, source: IntegrationSource.DISCORD },
			settings: {
				enableSessionReminders: true,
				source: integrationSourceToProto(IntegrationSource.DISCORD),
			},
			source: integrationSourceToProto(IntegrationSource.DISCORD),
		};
		try {
			const result =
				await api.campaignIntegration.createCampaignIntegration(values);
			if (result.integration === undefined) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "failed to create campaign integration",
				});
			}
			return { integration: protoToCampaignIntegration(result.integration) };
		} catch (err) {
			handleError(err, "failed to create campaign integration");
		}
	});

const getCampaignIntegration = privateProcedure
	.route({
		method: "POST",
		path: "/campaignIntegration/getCampaignIntegration",
		summary: "Gets a campaign integration",
	})
	.input(GetCampaignIntegrationRequestSchema)
	.output(GetCampaignIntegrationResponseSchema)
	.handler(async ({ input, context }) => {
		const { campaignId, source } = input;
		const api = context.api;
		try {
			const result = await api.campaignIntegration.getCampaignIntegration({
				campaignId,
				source: integrationSourceToProto(source),
			});
			if (result.integration === undefined) {
				throw new ORPCError("NOT_FOUND", {
					message: "campaign integration not found",
				});
			}
			return { integration: protoToCampaignIntegration(result.integration) };
		} catch (err) {
			handleError(err, "failed to get campaign integration");
		}
	});

const removeCampaignIntegration = privateProcedure
	.route({
		method: "POST",
		path: "/campaignIntegration/removeCampaignIntegration",
		summary: "remove a campaign integration",
	})
	.input(RemoveCampaignIntegrationRequestSchema)
	.output(RemoveCampaignIntegrationResponseSchema)
	.handler(async ({ input, context }) => {
		const { campaignId, source } = input;
		const api = context.api;

		try {
			await api.campaignIntegration.removeCampaignIntegration({
				campaignId,
				source: integrationSourceToProto(source),
			});
			return {};
		} catch (err) {
			handleError(err, "failed to remove campaign integration");
		}
	});

export const campaignIntegrationRouter = {
	createCampaignIntegration,
	getCampaignIntegration,
	removeCampaignIntegration,
};
