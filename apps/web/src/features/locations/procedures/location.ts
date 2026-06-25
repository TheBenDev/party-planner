import { ORPCError } from "@orpc/server";
import {
	CreateLocationRequestSchema,
	CreateLocationResponseSchema,
	GetLocationRequestSchema,
	GetLocationResponseSchema,
	ListLocationsByCampaignRequestSchema,
	ListLocationsByCampaignResponseSchema,
	RemoveLocationRequestSchema,
	RemoveLocationResponseSchema,
	UpdateLocationRequestSchema,
	UpdateLocationResponseSchema,
} from "@/features/locations/types";
import { handleError } from "@/server/errors";
import { campaignProcedure, dmProcedure } from "@/server/middleware";
import { protoToLocation } from "./proto/location";

const createLocationDef = dmProcedure
	.route({
		method: "POST",
		path: "/location/create",
		summary: "Create a location",
	})
	.input(CreateLocationRequestSchema)
	.output(CreateLocationResponseSchema);

export const createLocationHandler: Parameters<
	typeof createLocationDef.handler
>[0] = async ({ input, context }) => {
	const api = context.api;
	if (input.campaignId !== context.campaignId) {
		throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
	}
	try {
		const res = await api.location.createLocation({
			...input,
		});

		if (res.location === undefined) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "failed to create location",
			});
		}

		return {
			location: protoToLocation(res.location),
		};
	} catch (err) {
		handleError(
			err,
			"failed to create location",
			{ campaignId: input.campaignId },
			context.logger,
		);
	}
};

const getLocationByIdDef = campaignProcedure
	.route({
		method: "POST",
		path: "/location/get",
		summary: "Get a location by id",
	})
	.input(GetLocationRequestSchema)
	.output(GetLocationResponseSchema);

export const getLocationByIdHandler: Parameters<
	typeof getLocationByIdDef.handler
>[0] = async ({ input, context }) => {
	const { id } = input;
	const api = context.api;

	try {
		const res = await api.location.getLocation({
			campaignId: context.campaignId,
			id,
		});

		if (res.location === undefined) {
			throw new ORPCError("NOT_FOUND", {
				message: "location not found",
			});
		}

		const location = protoToLocation(res.location);
		return { location };
	} catch (err) {
		handleError(
			err,
			"failed to get location",
			{ locationId: id },
			context.logger,
		);
	}
};

const listLocationsByCampaignIdDef = campaignProcedure
	.route({
		method: "POST",
		path: "/location/list",
		summary: "List locations by campaign",
	})
	.input(ListLocationsByCampaignRequestSchema)
	.output(ListLocationsByCampaignResponseSchema);

export const listLocationsByCampaignIdHandler: Parameters<
	typeof listLocationsByCampaignIdDef.handler
>[0] = async ({ input, context }) => {
	const { campaignId } = input;
	if (campaignId !== context.campaignId) {
		throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
	}
	const api = context.api;

	try {
		const res = await api.location.listLocationsByCampaign({
			campaignId,
		});

		return {
			locations: res.locations.map(protoToLocation),
		};
	} catch (err) {
		handleError(
			err,
			"failed to list locations",
			{ campaignId },
			context.logger,
		);
	}
};

const removeLocationDef = dmProcedure
	.route({
		method: "POST",
		path: "/location/remove",
		summary: "Remove a location from a campaign",
	})
	.input(RemoveLocationRequestSchema)
	.output(RemoveLocationResponseSchema);

export const removeLocationHandler: Parameters<
	typeof removeLocationDef.handler
>[0] = async ({ input, context }) => {
	const { id } = input;
	const api = context.api;

	try {
		await api.location.removeLocation({
			campaignId: context.campaignId,
			id,
		});

		return {};
	} catch (err) {
		handleError(
			err,
			"failed to remove location",
			{ locationId: id },
			context.logger,
		);
	}
};

const updateLocationDef = dmProcedure
	.route({
		method: "POST",
		path: "/location/update",
		summary: "Update a location",
	})
	.input(UpdateLocationRequestSchema)
	.output(UpdateLocationResponseSchema);

export const updateLocationHandler: Parameters<
	typeof updateLocationDef.handler
>[0] = async ({ input, context }) => {
	const api = context.api;

	try {
		const res = await api.location.updateLocation({
			campaignId: context.campaignId,
			description: input.description,
			dmNotes: input.dmNotes,
			id: input.id,
			name: input.name,
			notes: input.notes,
		});

		if (!res.location) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "failed to update location",
			});
		}

		return {
			location: protoToLocation(res.location),
		};
	} catch (err) {
		handleError(
			err,
			"failed to update location",
			{ locationId: input.id },
			context.logger,
		);
	}
};

export const locationRouter = {
	createLocation: createLocationDef.handler(createLocationHandler),
	getLocationById: getLocationByIdDef.handler(getLocationByIdHandler),
	listLocationsByCampaignId: listLocationsByCampaignIdDef.handler(
		listLocationsByCampaignIdHandler,
	),
	removeLocation: removeLocationDef.handler(removeLocationHandler),
	updateLocation: updateLocationDef.handler(updateLocationHandler),
};
