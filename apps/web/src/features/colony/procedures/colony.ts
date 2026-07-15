import { ORPCError } from "@orpc/server";
import {
	CreateColonyRequestSchema,
	CreateColonyResponseSchema,
	GetColonyByCampaignResponseSchema,
	ListColonyWorkforceRequestSchema,
	ListColonyWorkforceResponseSchema,
	RemoveColonyRequestSchema,
	RemoveColonyResponseSchema,
	UpdateColonyRequestSchema,
	UpdateColonyResponseSchema,
	UpsertColonyWorkforcesRequestSchema,
	UpsertColonyWorkforcesResponseSchema,
} from "@/features/colony/types";
import { handleError } from "@/server/errors";
import {
	campaignProcedure,
	dmProcedure,
	tryRefreshAuthCookie,
} from "@/server/middleware";
import {
	protoToColony,
	protoToColonyWorkforce,
	workerTypeToProto,
} from "./proto/colony";

const createColonyDef = dmProcedure
	.route({
		method: "POST",
		path: "/colony/create",
		summary: "Create a colony for the active campaign",
	})
	.input(CreateColonyRequestSchema)
	.output(CreateColonyResponseSchema);

export const createColonyHandler: Parameters<
	typeof createColonyDef.handler
>[0] = async ({ input, context }) => {
	try {
		const res = await context.api.colony.createColony({
			campaignId: context.campaignId,
			...input,
		});
		if (!res.colony) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "failed to create colony",
			});
		}
		await tryRefreshAuthCookie(context, { colonyId: res.colony.id });
		return { colony: protoToColony(res.colony) };
	} catch (err) {
		handleError(
			err,
			"failed to create colony",
			{ campaignId: context.campaignId },
			context.logger,
		);
	}
};

const getColonyByCampaignDef = campaignProcedure
	.route({
		method: "POST",
		path: "/colony/get",
		summary: "Get the colony for the active campaign",
	})
	.output(GetColonyByCampaignResponseSchema);

export const getColonyByCampaignHandler: Parameters<
	typeof getColonyByCampaignDef.handler
>[0] = async ({ context }) => {
	try {
		const res = await context.api.colony.getColonyByCampaign({
			campaignId: context.campaignId,
		});
		if (res.colony === undefined) {
			throw new ORPCError("NOT_FOUND", { message: "colony not found" });
		}
		return { colony: protoToColony(res.colony) };
	} catch (err) {
		handleError(
			err,
			"failed to get colony",
			{ campaignId: context.campaignId },
			context.logger,
		);
	}
};

const updateColonyDef = dmProcedure
	.route({
		method: "POST",
		path: "/colony/update",
		summary: "Update the colony",
	})
	.input(UpdateColonyRequestSchema)
	.output(UpdateColonyResponseSchema);

export const updateColonyHandler: Parameters<
	typeof updateColonyDef.handler
>[0] = async ({ input, context }) => {
	try {
		const res = await context.api.colony.updateColony({
			...input,
			campaignId: context.campaignId,
		});
		if (res.colony === undefined) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "failed to update colony",
			});
		}
		return { colony: protoToColony(res.colony) };
	} catch (err) {
		handleError(
			err,
			"failed to update colony",
			{ colonyId: input.id },
			context.logger,
		);
	}
};

const removeColonyDef = dmProcedure
	.route({
		method: "POST",
		path: "/colony/remove",
		summary: "Remove the colony",
	})
	.input(RemoveColonyRequestSchema)
	.output(RemoveColonyResponseSchema);

export const removeColonyHandler: Parameters<
	typeof removeColonyDef.handler
>[0] = async ({ input, context }) => {
	try {
		await context.api.colony.removeColony({
			campaignId: context.campaignId,
			id: input.id,
		});
		return {};
	} catch (err) {
		handleError(
			err,
			"failed to remove colony",
			{ colonyId: input.id },
			context.logger,
		);
	}
};

const listColonyWorkforceDef = campaignProcedure
	.route({
		method: "POST",
		path: "/colony/workforce/list",
		summary: "List workforce for a colony",
	})
	.input(ListColonyWorkforceRequestSchema)
	.output(ListColonyWorkforceResponseSchema);

export const listColonyWorkforceHandler: Parameters<
	typeof listColonyWorkforceDef.handler
>[0] = async ({ input, context }) => {
	try {
		const res = await context.api.colonyWorkforce.listColonyWorkforce({
			campaignId: context.campaignId,
			colonyId: input.colonyId,
		});
		return { workforces: res.workforce.map(protoToColonyWorkforce) };
	} catch (err) {
		handleError(
			err,
			"failed to list colony workforce",
			{ colonyId: input.colonyId },
			context.logger,
		);
	}
};

const upsertColonyWorkforcesDef = dmProcedure
	.route({
		method: "POST",
		path: "/colony/workforce/upsert",
		summary: "Upsert a worker type count for a colony",
	})
	.input(UpsertColonyWorkforcesRequestSchema)
	.output(UpsertColonyWorkforcesResponseSchema);

export const upsertColonyWorkforcesHandler: Parameters<
	typeof upsertColonyWorkforcesDef.handler
>[0] = async ({ input, context }) => {
	try {
		const res = await context.api.colonyWorkforce.upsertColonyWorkforces({
			campaignId: context.campaignId,
			colonyId: input.colonyId,
			workforces: input.workforces.map((type) => ({
				count: type.count,
				type: workerTypeToProto(type.type),
			})),
		});
		if (res.workforces === undefined) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "failed to upsert colony workforce",
			});
		}
		return {
			workforces: res.workforces.map((workforce) =>
				protoToColonyWorkforce(workforce),
			),
		};
	} catch (err) {
		handleError(
			err,
			"failed to upsert colony workforce",
			{ colonyId: input.colonyId },
			context.logger,
		);
	}
};

export const colonyRouter = {
	createColony: createColonyDef.handler(createColonyHandler),
	getColonyByCampaign: getColonyByCampaignDef.handler(
		getColonyByCampaignHandler,
	),
	listColonyWorkforce: listColonyWorkforceDef.handler(
		listColonyWorkforceHandler,
	),
	removeColony: removeColonyDef.handler(removeColonyHandler),
	updateColony: updateColonyDef.handler(updateColonyHandler),
	upsertColonyWorkforces: upsertColonyWorkforcesDef.handler(
		upsertColonyWorkforcesHandler,
	),
};
