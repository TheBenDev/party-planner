import { ORPCError } from "@orpc/client";
import { IntegrationSource } from "@planner/enums/integration";
import {
	CreateCampaignIntegrationRequestSchema,
	CreateCampaignIntegrationResponseSchema,
	GetCampaignIntegrationRequestSchema,
	GetCampaignIntegrationResponseSchema,
	ListCampaignIntegrationsByCampaignRequestSchema,
	ListCampaignIntegrationsByCampaignResponseSchema,
	RemoveCampaignIntegrationRequestSchema,
	RemoveCampaignIntegrationResponseSchema,
} from "@planner/schemas/discord";
import { handleError } from "../errors";
import { privateProcedure, requireDungeonMaster } from "../orpc";
import {
	integrationSourceToProto,
	protoToCampaignIntegration,
} from "./util/proto/campaignIntegration";

const createCampaignIntegration = privateProcedure
	.route({
		method: "POST",
		path: "/campaignIntegration/createCampaignIntegration",
		summary: "Register a campaign with an external service",
	})
	.input(CreateCampaignIntegrationRequestSchema)
	.output(CreateCampaignIntegrationResponseSchema)
	.handler(async ({ input, context }) => {
		requireDungeonMaster(context.role);
		switch (input.source) {
			case IntegrationSource.DISCORD: {
				const { code, campaignId } = input;
				if (!code) {
					throw new ORPCError("BAD_REQUEST", {
						message: "missing code for Discord integration",
					});
				}
				const result = await context.api.campaignIntegration
					.createCampaignIntegration({
						campaignId,
						integration: {
							case: "discord",
							value: {
								code,
							},
						},
						source: integrationSourceToProto(IntegrationSource.DISCORD),
					})
					.catch((err) => {
						handleError(
							err,
							"failed to create campaign integration",
							{ campaignId },
							context.logger,
						);
					});
				if (!result?.integration) {
					throw new ORPCError("INTERNAL_SERVER_ERROR", {
						message: "failed to create campaign integration",
					});
				}
				return { integration: protoToCampaignIntegration(result.integration) };
			}
			default:
				throw new ORPCError("BAD_REQUEST", {
					message: `unsupported integration source: ${input.source}`,
				});
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
				return { integration: null };
			}
			return { integration: protoToCampaignIntegration(result.integration) };
		} catch (err) {
			handleError(
				err,
				"failed to get campaign integration",
				input,
				context.logger,
			);
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
		requireDungeonMaster(context.role);
		const { campaignId, source } = input;
		const api = context.api;

		try {
			await api.campaignIntegration.removeCampaignIntegration({
				campaignId,
				source: integrationSourceToProto(source),
			});
			return {};
		} catch (err) {
			handleError(
				err,
				"failed to remove campaign integration",
				input,
				context.logger,
			);
		}
	});

const listCampaignIntegrationsByCampaign = privateProcedure
	.route({
		method: "POST",
		path: "/campaignIntegration/listCampaignIntegrationsByCampaign",
		summary: "List all integrations for a campaign",
	})
	.input(ListCampaignIntegrationsByCampaignRequestSchema)
	.output(ListCampaignIntegrationsByCampaignResponseSchema)
	.handler(async ({ input, context }) => {
		const { campaignId } = input;
		const api = context.api;
		try {
			const result =
				await api.campaignIntegration.listCampaignIntegrationsByCampaign({
					campaignId,
				});
			return {
				integrations: result.integrations.map(protoToCampaignIntegration),
			};
		} catch (err) {
			handleError(
				err,
				"failed to list campaign integrations",
				input,
				context.logger,
			);
		}
	});

export const campaignIntegrationRouter = {
	createCampaignIntegration,
	getCampaignIntegration,
	listCampaignIntegrationsByCampaign,
	removeCampaignIntegration,
};
