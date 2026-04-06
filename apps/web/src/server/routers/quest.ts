import { ORPCError } from "@orpc/server";
import {
	CreateQuestRequestSchema,
	CreateQuestResponseSchema,
	GetQuestRequestSchema,
	GetQuestResponseSchema,
	ListQuestsByCampaignRequestSchema,
	ListQuestsByCampaignResponseSchema,
} from "@planner/schemas/quests";
import { handleError } from "../errors";
import { privateProcedure } from "../orpc";
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
		const api = context.api;
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
			handleError(err, "failed to create quest");
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
			handleError(err, "failed to get quest");
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
			handleError(err, "failed to list quests");
		}
	});

export const questRouter = {
	createQuest,
	getQuest,
	listQuestsByCampaign,
};
