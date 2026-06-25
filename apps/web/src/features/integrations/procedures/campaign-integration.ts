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
	UpdateCampaignIntegrationRequestSchema,
	UpdateCampaignIntegrationResponseSchema,
} from "@/features/integrations/types";
import { handleError } from "@/server/errors";
import { campaignProcedure, dmProcedure } from "@/server/middleware";
import {
	integrationSourceToProto,
	protoToCampaignIntegration,
} from "./proto/campaign-integration";

const createCampaignIntegrationDef = dmProcedure
	.route({
		method: "POST",
		path: "/campaignIntegration/createCampaignIntegration",
		summary: "Register a campaign with an external service",
	})
	.input(CreateCampaignIntegrationRequestSchema)
	.output(CreateCampaignIntegrationResponseSchema);

export const createCampaignIntegrationHandler: Parameters<
	typeof createCampaignIntegrationDef.handler
>[0] = async ({ input, context }) => {
	switch (input.source) {
		case IntegrationSource.DISCORD: {
			const { code, campaignId } = input;
			if (campaignId !== context.campaignId) {
				throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
			}
			if (!code) {
				throw new ORPCError("BAD_REQUEST", {
					message: "missing code for Discord integration",
				});
			}
			let result: Awaited<
				ReturnType<
					typeof context.api.campaignIntegration.createCampaignIntegration
				>
			>;
			try {
				result =
					await context.api.campaignIntegration.createCampaignIntegration({
						campaignId,
						integration: {
							case: "discord",
							value: { code },
						},
						source: integrationSourceToProto(IntegrationSource.DISCORD),
					});
			} catch (err) {
				handleError(
					err,
					"failed to create campaign integration",
					{ campaignId },
					context.logger,
				);
			}
			if (!result.integration) {
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
};

const getCampaignIntegrationDef = campaignProcedure
	.route({
		method: "POST",
		path: "/campaignIntegration/getCampaignIntegration",
		summary: "Gets a campaign integration",
	})
	.input(GetCampaignIntegrationRequestSchema)
	.output(GetCampaignIntegrationResponseSchema);

export const getCampaignIntegrationHandler: Parameters<
	typeof getCampaignIntegrationDef.handler
>[0] = async ({ input, context }) => {
	const { campaignId, source } = input;
	if (campaignId !== context.campaignId) {
		throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
	}
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
};

const removeCampaignIntegrationDef = dmProcedure
	.route({
		method: "POST",
		path: "/campaignIntegration/removeCampaignIntegration",
		summary: "remove a campaign integration",
	})
	.input(RemoveCampaignIntegrationRequestSchema)
	.output(RemoveCampaignIntegrationResponseSchema);

export const removeCampaignIntegrationHandler: Parameters<
	typeof removeCampaignIntegrationDef.handler
>[0] = async ({ input, context }) => {
	const { campaignId, source } = input;
	if (campaignId !== context.campaignId) {
		throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
	}
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
};

const listCampaignIntegrationsByCampaignDef = campaignProcedure
	.route({
		method: "POST",
		path: "/campaignIntegration/listCampaignIntegrationsByCampaign",
		summary: "List all integrations for a campaign",
	})
	.input(ListCampaignIntegrationsByCampaignRequestSchema)
	.output(ListCampaignIntegrationsByCampaignResponseSchema);

export const listCampaignIntegrationsByCampaignHandler: Parameters<
	typeof listCampaignIntegrationsByCampaignDef.handler
>[0] = async ({ input, context }) => {
	const { campaignId } = input;
	if (campaignId !== context.campaignId) {
		throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
	}
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
};

const updateCampaignIntegrationDef = dmProcedure
	.route({
		method: "POST",
		path: "/campaignIntegration/updateCampaignIntegration",
		summary: "Update a campaign integration",
	})
	.input(UpdateCampaignIntegrationRequestSchema)
	.output(UpdateCampaignIntegrationResponseSchema);

export const updateCampaignIntegrationHandler: Parameters<
	typeof updateCampaignIntegrationDef.handler
>[0] = async ({ input, context }) => {
	switch (input.source) {
		case IntegrationSource.DISCORD: {
			const {
				campaignId,
				defaultChannel,
				enableSessionReminders,
				sessionCreateAnnouncements,
				sessionReminderChannel,
				recapChannel,
				timezone,
			} = input;
			if (campaignId !== context.campaignId) {
				throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
			}
			let result: Awaited<
				ReturnType<
					typeof context.api.campaignIntegration.updateCampaignIntegration
				>
			>;
			try {
				result =
					await context.api.campaignIntegration.updateCampaignIntegration({
						campaignId,
						integration: {
							case: "discord",
							value: {
								defaultChannel: defaultChannel
									? {
											id: defaultChannel.id,
											name: defaultChannel.name,
										}
									: undefined,
								enableSessionReminders,
								recapChannel: recapChannel
									? {
											id: recapChannel.id,
											name: recapChannel.name,
										}
									: undefined,
								sessionCreateAnnouncements,
								sessionReminderChannel: sessionReminderChannel
									? {
											id: sessionReminderChannel.id,
											name: sessionReminderChannel.name,
										}
									: undefined,
								timezone,
							},
						},
					});
			} catch (err) {
				handleError(
					err,
					"failed to update campaign integration",
					{ campaignId },
					context.logger,
				);
			}
			if (!result.integration) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "failed to update campaign integration",
				});
			}
			return { integration: protoToCampaignIntegration(result.integration) };
		}
		default:
			throw new ORPCError("BAD_REQUEST", {
				message: `unsupported integration source: ${input.source}`,
			});
	}
};

export const campaignIntegrationRouter = {
	createCampaignIntegration: createCampaignIntegrationDef.handler(
		createCampaignIntegrationHandler,
	),
	getCampaignIntegration: getCampaignIntegrationDef.handler(
		getCampaignIntegrationHandler,
	),
	listCampaignIntegrationsByCampaign:
		listCampaignIntegrationsByCampaignDef.handler(
			listCampaignIntegrationsByCampaignHandler,
		),
	removeCampaignIntegration: removeCampaignIntegrationDef.handler(
		removeCampaignIntegrationHandler,
	),
	updateCampaignIntegration: updateCampaignIntegrationDef.handler(
		updateCampaignIntegrationHandler,
	),
};
