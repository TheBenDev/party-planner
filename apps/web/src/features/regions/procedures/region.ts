import { ORPCError } from "@orpc/server";
import {
	CreateRegionRequestSchema,
	CreateRegionResponseSchema,
	GetRegionRequestSchema,
	GetRegionResponseSchema,
	ListRegionsByCampaignRequestSchema,
	ListRegionsByCampaignResponseSchema,
	RemoveRegionRequestSchema,
	RemoveRegionResponseSchema,
	UpdateRegionRequestSchema,
	UpdateRegionResponseSchema,
} from "@/features/regions/types";
import { handleError } from "@/server/errors";
import { campaignProcedure, dmProcedure } from "@/server/middleware";
import { protoToRegion, protoToRegionWithDetails } from "./proto/region";

const createRegionDef = dmProcedure
	.route({
		method: "POST",
		path: "/region/create",
		summary: "Create a region",
	})
	.input(CreateRegionRequestSchema)
	.output(CreateRegionResponseSchema);

export const createRegionHandler: Parameters<
	typeof createRegionDef.handler
>[0] = async ({ input, context }) => {
	const api = context.api;
	try {
		const res = await api.region.createRegion({
			campaignId: context.campaignId,
			mapImageUrl: input.mapImageUrl,
			name: input.name,
		});

		if (!res.region) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "failed to create region",
			});
		}

		return { region: protoToRegion(res.region) };
	} catch (err) {
		handleError(
			err,
			"failed to create region",
			{ name: input.name },
			context.logger,
		);
	}
};

const getRegionDef = campaignProcedure
	.route({
		method: "POST",
		path: "/region/get",
		summary: "Get a region by id",
	})
	.input(GetRegionRequestSchema)
	.output(GetRegionResponseSchema);

export const getRegionHandler: Parameters<typeof getRegionDef.handler>[0] =
	async ({ input, context }) => {
		const api = context.api;
		try {
			const res = await api.region.getRegion({
				campaignId: context.campaignId,
				id: input.id,
			});

			if (!res.data) {
				throw new ORPCError("NOT_FOUND", { message: "region not found" });
			}

			return { data: protoToRegionWithDetails(res.data) };
		} catch (err) {
			handleError(
				err,
				"failed to get region",
				{ regionId: input.id },
				context.logger,
			);
		}
	};

const listRegionsByCampaignDef = campaignProcedure
	.route({
		method: "POST",
		path: "/region/list",
		summary: "List regions with their locations for a campaign",
	})
	.input(ListRegionsByCampaignRequestSchema)
	.output(ListRegionsByCampaignResponseSchema);

export const listRegionsByCampaignHandler: Parameters<
	typeof listRegionsByCampaignDef.handler
>[0] = async ({ input, context }) => {
	const { campaignId } = input;
	if (campaignId !== context.campaignId) {
		throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
	}
	const api = context.api;
	try {
		const res = await api.region.listRegionsByCampaign({ campaignId });
		return { regions: res.regions.map(protoToRegionWithDetails) };
	} catch (err) {
		handleError(err, "failed to list regions", { campaignId }, context.logger);
	}
};

const updateRegionDef = dmProcedure
	.route({
		method: "POST",
		path: "/region/update",
		summary: "Update a region",
	})
	.input(UpdateRegionRequestSchema)
	.output(UpdateRegionResponseSchema);

export const updateRegionHandler: Parameters<
	typeof updateRegionDef.handler
>[0] = async ({ input, context }) => {
	const api = context.api;
	try {
		const res = await api.region.updateRegion({
			campaignId: context.campaignId,
			id: input.id,
			mapImageUrl: input.mapImageUrl,
			name: input.name,
		});

		if (!res.region) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "failed to update region",
			});
		}

		return { region: protoToRegion(res.region) };
	} catch (err) {
		handleError(
			err,
			"failed to update region",
			{ regionId: input.id },
			context.logger,
		);
	}
};

const removeRegionDef = dmProcedure
	.route({
		method: "POST",
		path: "/region/remove",
		summary: "Remove a region",
	})
	.input(RemoveRegionRequestSchema)
	.output(RemoveRegionResponseSchema);

export const removeRegionHandler: Parameters<
	typeof removeRegionDef.handler
>[0] = async ({ input, context }) => {
	const api = context.api;
	try {
		await api.region.removeRegion({
			campaignId: context.campaignId,
			id: input.id,
		});
		return {};
	} catch (err) {
		handleError(
			err,
			"failed to remove region",
			{ regionId: input.id },
			context.logger,
		);
	}
};

export const regionRouter = {
	createRegion: createRegionDef.handler(createRegionHandler),
	getRegion: getRegionDef.handler(getRegionHandler),
	listRegionsByCampaign: listRegionsByCampaignDef.handler(
		listRegionsByCampaignHandler,
	),
	removeRegion: removeRegionDef.handler(removeRegionHandler),
	updateRegion: updateRegionDef.handler(updateRegionHandler),
};
