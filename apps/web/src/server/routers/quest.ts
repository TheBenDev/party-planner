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
} from "@planner/schemas/quests";
import { handleError } from "../errors";
import { campaignProcedure, dmProcedure } from "../orpc";
import { protoToQuest, questStatusToProto } from "./util/proto/quest";

const createQuest = dmProcedure
	.route({
		method: "POST",
		path: "/quest/create",
		summary: "Create a quest",
	})
	.input(CreateQuestRequestSchema)
	.output(CreateQuestResponseSchema)
	.handler(async ({ input, context }) => {
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
	});

const getQuest = campaignProcedure
	.route({
		method: "POST",
		path: "/quest/get",
		summary: "Get a quest by id",
	})
	.input(GetQuestRequestSchema)
	.output(GetQuestResponseSchema)
	.handler(async ({ input, context }) => {
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
	});

const listQuestsByCampaign = campaignProcedure
	.route({
		method: "POST",
		path: "/quest/list",
		summary: "List quests by campaign",
	})
	.input(ListQuestsByCampaignRequestSchema)
	.output(ListQuestsByCampaignResponseSchema)
	.handler(async ({ input, context }) => {
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
	});

const updateQuest = dmProcedure
	.route({
		method: "POST",
		path: "/quest/update",
		summary: "Update a quest",
	})
	.input(UpdateQuestRequestSchema)
	.output(UpdateQuestResponseSchema)
	.handler(async ({ input, context }) => {
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
	});

const removeQuest = dmProcedure
	.route({
		method: "POST",
		path: "/quest/remove",
		summary: "Remove a quest",
	})
	.input(RemoveQuestRequestSchema)
	.output(RemoveQuestResponseSchema)
	.handler(async ({ input, context }) => {
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
	});

export const questRouter = {
	createQuest,
	getQuest,
	listQuestsByCampaign,
	removeQuest,
	updateQuest,
};
