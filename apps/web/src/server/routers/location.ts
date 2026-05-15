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
} from "@planner/schemas/locations";
import { handleError } from "../errors";
import { privateProcedure } from "../orpc";
import { protoToLocation } from "./util/proto/location";

const createLocation = privateProcedure
	.route({
		method: "POST",
		path: "/location/create",
		summary: "Create a location",
	})
	.input(CreateLocationRequestSchema)
	.output(CreateLocationResponseSchema)
	.handler(async ({ input, context }) => {
		const api = context.api;

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
	});

const getLocationById = privateProcedure
	.route({
		method: "POST",
		path: "/location/get",
		summary: "Get a location by id",
	})
	.input(GetLocationRequestSchema)
	.output(GetLocationResponseSchema)
	.handler(async ({ input, context }) => {
		const { id } = input;
		const api = context.api;

		try {
			const res = await api.location.getLocation({ id });

			if (res.location === undefined) {
				throw new ORPCError("NOT_FOUND", {
					message: "location not found",
				});
			}

			return {
				location: protoToLocation(res.location),
			};
		} catch (err) {
			handleError(
				err,
				"failed to get location",
				{ locationId: id },
				context.logger,
			);
		}
	});

const listLocationsByCampaignId = privateProcedure
	.route({
		method: "POST",
		path: "/location/list",
		summary: "List locations by campaign",
	})
	.input(ListLocationsByCampaignRequestSchema)
	.output(ListLocationsByCampaignResponseSchema)
	.handler(async ({ input, context }) => {
		const { campaignId } = input;
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
	});

const removeLocation = privateProcedure
	.route({
		method: "POST",
		path: "/location/remove",
		summary: "Remove a location from a campaign",
	})
	.input(RemoveLocationRequestSchema)
	.output(RemoveLocationResponseSchema)
	.handler(async ({ input, context }) => {
		const { id } = input;
		const api = context.api;

		try {
			await api.location.removeLocation({
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
	});

const updateLocation = privateProcedure
	.route({
		method: "POST",
		path: "/location/update",
		summary: "Update a location",
	})
	.input(UpdateLocationRequestSchema)
	.output(UpdateLocationResponseSchema)
	.handler(async ({ input, context }) => {
		const api = context.api;

		try {
			const res = await api.location.updateLocation({
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
	});

export const locationRouter = {
	createLocation,
	getLocationById,
	listLocationsByCampaignId,
	removeLocation,
	updateLocation,
};
