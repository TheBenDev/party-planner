import { ORPCError } from "@orpc/server";
import {
	CreateNpcRequestSchema,
	CreateNpcResponseSchema,
	GetNonPlayerCharacterRequestSchema,
	GetNonPlayerCharacterResponseSchema,
	ListNonPlayerCharactersRequestSchema,
	ListNonPlayerCharactersResponseSchema,
} from "@planner/schemas/nonPlayerCharacters";
import { throwConnectError } from "../connectErrors";
import { privateProcedure } from "../orpc";
import {
	characterStatusToProto,
	protoToNpc,
	relationToPartyToProto,
} from "./util/proto/non-player-character";

const createNpc = privateProcedure
	.route({
		method: "POST",
		path: "/npc/create",
		summary: "Create a non-player character",
	})
	.input(CreateNpcRequestSchema)
	.output(CreateNpcResponseSchema)
	.handler(async ({ input, context }) => {
		const api = context.api;
		try {
			const res = await api.npc.createNpc({
				...input,
				relationToPartyStatus: relationToPartyToProto(
					input.relationToPartyStatus,
				),
				status: characterStatusToProto(input.status),
			});
			if (res.npc === undefined) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "failed to create npc",
				});
			}
			return { npc: protoToNpc(res.npc) };
		} catch (err) {
			throwConnectError(err, "failed to create npc");
		}
	});

const getNonPlayerCharacter = privateProcedure
	.route({
		method: "POST",
		path: "/npc/get",
		summary: "Get a non-player character by id",
	})
	.input(GetNonPlayerCharacterRequestSchema)
	.output(GetNonPlayerCharacterResponseSchema)
	.handler(async ({ input, context }) => {
		const { id } = input;
		const api = context.api;
		try {
			const res = await api.npc.getNpc({ id });
			if (res.npc === undefined) {
				throw new ORPCError("NOT_FOUND", { message: "npc not found" });
			}
			return { npc: protoToNpc(res.npc) };
		} catch (err) {
			throwConnectError(err, "failed to get npc");
		}
	});

const listNonPlayerCharacters = privateProcedure
	.route({
		method: "POST",
		path: "/npc/list",
		summary: "List non-player characters by campaign",
	})
	.input(ListNonPlayerCharactersRequestSchema)
	.output(ListNonPlayerCharactersResponseSchema)
	.handler(async ({ input, context }) => {
		const { campaignId } = input;
		const api = context.api;
		try {
			const res = await api.npc.listNpcsByCampaign({
				campaignId,
			});
			return { npcs: res.npcs.map(protoToNpc) };
		} catch (err) {
			throwConnectError(err, "failed to list npcs");
		}
	});

export const nonPlayerCharacterRouter = {
	createNpc,
	getNonPlayerCharacter,
	listNonPlayerCharacters,
};
