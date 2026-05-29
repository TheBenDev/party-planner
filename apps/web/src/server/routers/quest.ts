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
import { privateProcedure, requireDungeonMaster } from "../orpc";
import { protoToQuest, questStatusToProto } from "./util/proto/quest";

const createQuest = privateProcedure
	.route({
		method: "POST",
		path: "/quest/create",
		summary: "Create a quest",
	})
	.input(CreateQuestRequestSchema)
	.output(CreateQuestResponseSchema)
	.handler(async ({ input, context }) => {
		requireDungeonMaster(context.role);
		const api = context.api;
		context.logger?.info({ reward: input.reward }, "REWARD SHOWN HERE");
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

const getQuest = privateProcedure
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
			const res = await api.quest.getQuest({ id });
			if (res.quest === undefined) {
				throw new ORPCError("NOT_FOUND", { message: "quest not found" });
			}
			return { quest: protoToQuest(res.quest) };
		} catch (err) {
			handleError(err, "failed to get quest", { questId: id }, context.logger);
		}
	});

const listQuestsByCampaign = privateProcedure
	.route({
		method: "POST",
		path: "/quest/list",
		summary: "List quests by campaign",
	})
	.input(ListQuestsByCampaignRequestSchema)
	.output(ListQuestsByCampaignResponseSchema)
	.handler(async ({ input, context }) => {
		const { campaignId } = input;
		const api = context.api;
		try {
			const res = await api.quest.listQuestsByCampaign({ campaignId });
			return { quests: res.quests.map(protoToQuest) };
		} catch (err) {
			handleError(err, "failed to list quests", { campaignId }, context.logger);
		}
	});

const updateQuest = privateProcedure
	.route({
		method: "POST",
		path: "/quest/update",
		summary: "Update a quest",
	})
	.input(UpdateQuestRequestSchema)
	.output(UpdateQuestResponseSchema)
	.handler(async ({ input, context }) => {
		requireDungeonMaster(context.role);
		const api = context.api;
		try {
			const res = await api.quest.updateQuest({
				...input,
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

const removeQuest = privateProcedure
	.route({
		method: "POST",
		path: "/quest/remove",
		summary: "Remove a quest",
	})
	.input(RemoveQuestRequestSchema)
	.output(RemoveQuestResponseSchema)
	.handler(async ({ input, context }) => {
		requireDungeonMaster(context.role);
		const api = context.api;
		try {
			await api.quest.removeQuest({ id: input.id });
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
