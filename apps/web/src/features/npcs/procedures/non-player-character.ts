import { ORPCError } from "@orpc/server";
import {
	CreateNpcRequestSchema,
	CreateNpcResponseSchema,
	GetNonPlayerCharacterRequestSchema,
	GetNonPlayerCharacterResponseSchema,
	ListNonPlayerCharactersByCampaignRequestSchema,
	ListNonPlayerCharactersByCampaignResponseSchema,
	RemoveNpcRequestSchema,
	RemoveNpcResponseSchema,
	UpdateNpcRequestSchema,
	UpdateNpcResponseSchema,
} from "@/features/npcs/types";
import { handleError } from "@/server/errors";
import { campaignProcedure, dmProcedure } from "@/server/middleware";
import {
	characterStatusToProto,
	protoToNpc,
	relationToPartyToProto,
} from "./proto/non-player-character";

const createNpc = dmProcedure
	.route({
		method: "POST",
		path: "/npc/create",
		summary: "Create a non-player character",
	})
	.input(CreateNpcRequestSchema)
	.output(CreateNpcResponseSchema)
	.handler(async ({ input, context }) => {
		const api = context.api;
		if (input.campaignId !== context.campaignId) {
			throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
		}
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
			handleError(
				err,
				"failed to create npc",
				{ campaignId: input.campaignId },
				context.logger,
			);
		}
	});

const getNonPlayerCharacter = campaignProcedure
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
			const res = await api.npc.getNpc({ campaignId: context.campaignId, id });
			if (res.npc === undefined) {
				throw new ORPCError("NOT_FOUND", { message: "npc not found" });
			}
			const npc = protoToNpc(res.npc);
			return { npc };
		} catch (err) {
			handleError(err, "failed to get npc", { npcId: id }, context.logger);
		}
	});

const listNonPlayerCharactersByCampaign = campaignProcedure
	.route({
		method: "POST",
		path: "/npc/list",
		summary: "List non-player characters by campaign",
	})
	.input(ListNonPlayerCharactersByCampaignRequestSchema)
	.output(ListNonPlayerCharactersByCampaignResponseSchema)
	.handler(async ({ input, context }) => {
		const { campaignId } = input;
		if (campaignId !== context.campaignId) {
			throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
		}
		const api = context.api;
		try {
			const res = await api.npc.listNpcsByCampaign({
				campaignId,
			});
			return { npcs: res.npcs.map(protoToNpc) };
		} catch (err) {
			handleError(err, "failed to list npcs", { campaignId }, context.logger);
		}
	});

const removeNpc = dmProcedure
	.route({
		method: "POST",
		path: "/npc/remove",
		summary: "Remove non-player character from a campaign",
	})
	.input(RemoveNpcRequestSchema)
	.output(RemoveNpcResponseSchema)
	.handler(async ({ input, context }) => {
		const { id } = input;
		const api = context.api;
		try {
			await api.npc.removeNpc({
				campaignId: context.campaignId,
				id,
			});
			return {};
		} catch (err) {
			handleError(err, "failed to remove npc", { npcId: id }, context.logger);
		}
	});

const updateNpc = dmProcedure
	.route({
		method: "POST",
		path: "/npc/update",
		summary: "Update a non-player character",
	})
	.input(UpdateNpcRequestSchema)
	.output(UpdateNpcResponseSchema)
	.handler(async ({ input, context }) => {
		const api = context.api;

		try {
			const res = await api.npc.updateNpc({
				age: input.age,
				aliases: input.aliases,
				appearance: input.appearance,
				avatar: input.avatar,
				backstory: input.backstory,
				campaignId: context.campaignId,
				currentLocationId: input.currentLocationId,
				dmNotes: input.dmNotes,
				foundryActorId: input.foundryActorId,
				id: input.id,
				isKnownToParty: input.isKnownToParty,
				knownName: input.knownName,
				name: input.name,
				originLocationId: input.originLocationId,
				personality: input.personality,
				playerNotes: input.playerNotes,
				race: input.race,
				relationToPartyStatus: input.relationToPartyStatus
					? relationToPartyToProto(input.relationToPartyStatus)
					: undefined,
				sessionEncounteredId: input.sessionEncounteredId,
				status: input.status ? characterStatusToProto(input.status) : undefined,
			});

			if (!res.npc) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "failed to update npc",
				});
			}

			return {
				npc: protoToNpc(res.npc),
			};
		} catch (err) {
			handleError(
				err,
				"failed to update npc",
				{ npcId: input.id },
				context.logger,
			);
		}
	});

export const nonPlayerCharacterRouter = {
	createNpc,
	getNonPlayerCharacter,
	listNonPlayerCharactersByCampaign,
	removeNpc,
	updateNpc,
};
