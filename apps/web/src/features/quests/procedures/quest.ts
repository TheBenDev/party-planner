import { ORPCError } from "@orpc/server";
import {
	CreateQuestRequestSchema,
	CreateQuestResponseSchema,
	GetQuestRequestSchema,
	GetQuestResponseSchema,
	ListQuestsByCampaignRequestSchema,
	ListQuestsByCampaignResponseSchema,
	RemoveQuestRequestSchema,
	RemoveQuestResponseSchema,
	UpdateQuestRequestSchema,
	UpdateQuestResponseSchema,
} from "@/features/quests/types";
import { handleError } from "@/server/errors";
import { campaignProcedure, dmProcedure } from "@/server/middleware";
import { protoToQuest, questStatusToProto } from "./proto/quest";

const createQuestDef = dmProcedure
	.route({
		method: "POST",
		path: "/quest/create",
		summary: "Create a quest",
	})
	.input(CreateQuestRequestSchema)
	.output(CreateQuestResponseSchema);

export const createQuestHandler: Parameters<
	typeof createQuestDef.handler
>[0] = async ({ input, context }) => {
	const api = context.api;
	if (input.campaignId !== context.campaignId) {
		throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
	}
	try {
		const res = await api.quest.createQuest({
			...input,
			status: questStatusToProto(input.status),
		});
		if (res.quest === undefined) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "failed to create quest",
			});
		}
		return { quest: protoToQuest(res.quest) };
	} catch (err) {
		handleError(
			err,
			"failed to create quest",
			{ campaignId: input.campaignId },
			context.logger,
		);
	}
};

const getQuestDef = campaignProcedure
	.route({
		method: "POST",
		path: "/quest/get",
		summary: "Get a quest by id",
	})
	.input(GetQuestRequestSchema)
	.output(GetQuestResponseSchema);

export const getQuestHandler: Parameters<
	typeof getQuestDef.handler
>[0] = async ({ input, context }) => {
	const { id } = input;
	const api = context.api;
	try {
		const res = await api.quest.getQuest({
			campaignId: context.campaignId,
			id,
		});
		if (res.quest === undefined) {
			throw new ORPCError("NOT_FOUND", { message: "quest not found" });
		}
		const quest = protoToQuest(res.quest);
		return { quest };
	} catch (err) {
		handleError(err, "failed to get quest", { questId: id }, context.logger);
	}
};

const listQuestsByCampaignDef = campaignProcedure
	.route({
		method: "POST",
		path: "/quest/list",
		summary: "List quests by campaign",
	})
	.input(ListQuestsByCampaignRequestSchema)
	.output(ListQuestsByCampaignResponseSchema);

export const listQuestsByCampaignHandler: Parameters<
	typeof listQuestsByCampaignDef.handler
>[0] = async ({ input, context }) => {
	const { campaignId } = input;
	if (campaignId !== context.campaignId) {
		throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
	}
	const api = context.api;
	try {
		const res = await api.quest.listQuestsByCampaign({ campaignId });
		return { quests: res.quests.map(protoToQuest) };
	} catch (err) {
		handleError(err, "failed to list quests", { campaignId }, context.logger);
	}
};

const updateQuestDef = dmProcedure
	.route({
		method: "POST",
		path: "/quest/update",
		summary: "Update a quest",
	})
	.input(UpdateQuestRequestSchema)
	.output(UpdateQuestResponseSchema);

export const updateQuestHandler: Parameters<
	typeof updateQuestDef.handler
>[0] = async ({ input, context }) => {
	const api = context.api;
	try {
		const res = await api.quest.updateQuest({
			...input,
			campaignId: context.campaignId,
			status: input.status ? questStatusToProto(input.status) : undefined,
		});
		if (res.quest === undefined) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "failed to update quest",
			});
		}
		return { quest: protoToQuest(res.quest) };
	} catch (err) {
		handleError(
			err,
			"failed to update quest",
			{ questId: input.id },
			context.logger,
		);
	}
};

const removeQuestDef = dmProcedure
	.route({
		method: "POST",
		path: "/quest/remove",
		summary: "Remove a quest",
	})
	.input(RemoveQuestRequestSchema)
	.output(RemoveQuestResponseSchema);

export const removeQuestHandler: Parameters<
	typeof removeQuestDef.handler
>[0] = async ({ input, context }) => {
	const api = context.api;
	try {
		await api.quest.removeQuest({
			campaignId: context.campaignId,
			id: input.id,
		});
		return {};
	} catch (err) {
		handleError(
			err,
			"failed to remove quest",
			{ questId: input.id },
			context.logger,
		);
	}
};

export const questRouter = {
	createQuest: createQuestDef.handler(createQuestHandler),
	getQuest: getQuestDef.handler(getQuestHandler),
	listQuestsByCampaign: listQuestsByCampaignDef.handler(
		listQuestsByCampaignHandler,
	),
	removeQuest: removeQuestDef.handler(removeQuestHandler),
	updateQuest: updateQuestDef.handler(updateQuestHandler),
};
