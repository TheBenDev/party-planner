import { beforeEach, describe, expect, mock, test } from "bun:test";
import {
	CharacterStatusEnum,
	HealthConditionEnum,
	RelationToPartyEnum,
} from "@planner/enums/character";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockNpc = {
	campaignId: "campaign-1",
	createdAt: new Date("2024-01-01T00:00:00.000Z"),
	healthCondition: HealthConditionEnum.HEALTHY,
	id: "npc-1",
	name: "Gandalf",
	relationToPartyStatus: RelationToPartyEnum.ALLY,
	status: CharacterStatusEnum.ALIVE,
	updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

const mockNpcProto = { id: "npc-1" };

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockProtoToNpc = mock(() => mockNpc);
const mockCharacterStatusToProto = mock(() => 1);
const mockHealthConditionToProto = mock(() => 1);
const mockRelationToPartyToProto = mock(() => 1);

const makeChain = () => {
	const chain: Record<string, () => unknown> = {};
	for (const method of ["route", "input", "output", "use", "handler"]) {
		chain[method] = () => chain;
	}
	return chain;
};

mock.module("@/server/middleware", () => ({
	ACTIVE_CAMPAIGN_ID_COOKIE_NAME: "active_campaign_id",
	AUTH_COOKIE_NAME: "planner_auth",
	campaignProcedure: makeChain(),
	dmProcedure: makeChain(),
	privateProcedure: makeChain(),
	updateAuthCookie: mock(() => {}),
}));
mock.module("./proto/non-player-character", () => ({
	characterStatusToProto: mockCharacterStatusToProto,
	healthConditionToProto: mockHealthConditionToProto,
	protoToNpc: mockProtoToNpc,
	relationToPartyToProto: mockRelationToPartyToProto,
}));

const {
	createNpcHandler,
	getNonPlayerCharacterHandler,
	listNonPlayerCharactersByCampaignHandler,
	listNpcsByColonyHandler,
	removeNpcHandler,
	updateNpcHandler,
} = await import("./non-player-character");

// ── Context factory ───────────────────────────────────────────────────────────

function makeApi() {
	return {
		npc: {
			createNpc: mock(async () => ({ npc: mockNpcProto })),
			getNpc: mock(async () => ({ npc: mockNpcProto })),
			listNpcsByCampaign: mock(async () => ({ npcs: [mockNpcProto] })),
			listNpcsByColony: mock(async () => ({ npcs: [mockNpcProto] })),
			removeNpc: mock(async () => ({})),
			updateNpc: mock(async () => ({ npc: mockNpcProto })),
		},
	};
}

function makeContext(overrides: Record<string, unknown> = {}) {
	return {
		api: makeApi(),
		campaignId: "campaign-1",
		logger: {
			error: mock(() => {}),
			info: mock(() => {}),
			warn: mock(() => {}),
		},
		...overrides,
	};
}

// ── createNpcHandler ──────────────────────────────────────────────────────────

describe("createNpcHandler", () => {
	const input = {
		campaignId: "campaign-1",
		name: "Gandalf",
		relationToPartyStatus: "ALLY",
		status: "ACTIVE",
	};

	beforeEach(() => {
		mockProtoToNpc.mockClear();
		mockProtoToNpc.mockImplementation(() => mockNpc);
	});

	test("throws FORBIDDEN when campaignId does not match context", async () => {
		const context = makeContext({ campaignId: "other-campaign" });
		expect(
			createNpcHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("returns the npc on success", async () => {
		const context = makeContext();
		const result = await createNpcHandler({ context, input } as never);
		expect(result).toEqual({ npc: mockNpc });
	});

	test("throws INTERNAL_SERVER_ERROR when api returns no npc", async () => {
		const context = makeContext();
		context.api.npc.createNpc = mock(async () => ({})) as never;
		expect(
			createNpcHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});

// ── getNonPlayerCharacterHandler ──────────────────────────────────────────────

describe("getNonPlayerCharacterHandler", () => {
	const input = { id: "npc-1" };

	beforeEach(() => {
		mockProtoToNpc.mockClear();
		mockProtoToNpc.mockImplementation(() => mockNpc);
	});

	test("returns the npc on success", async () => {
		const context = makeContext();
		const result = await getNonPlayerCharacterHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({ npc: mockNpc });
	});

	test("calls getNpc with the input id and context campaignId", async () => {
		const context = makeContext();
		await getNonPlayerCharacterHandler({ context, input } as never);
		expect(context.api.npc.getNpc).toHaveBeenCalledWith({
			campaignId: "campaign-1",
			id: input.id,
		});
	});

	test("throws NOT_FOUND when api returns no npc", async () => {
		const context = makeContext();
		context.api.npc.getNpc = mock(async () => ({})) as never;
		expect(
			getNonPlayerCharacterHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
});

// ── listNonPlayerCharactersByCampaignHandler ──────────────────────────────────

describe("listNonPlayerCharactersByCampaignHandler", () => {
	const input = { campaignId: "campaign-1" };

	beforeEach(() => {
		mockProtoToNpc.mockClear();
		mockProtoToNpc.mockImplementation(() => mockNpc);
	});

	test("throws FORBIDDEN when campaignId does not match context", async () => {
		const context = makeContext({ campaignId: "other-campaign" });
		expect(
			listNonPlayerCharactersByCampaignHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("returns mapped npcs on success", async () => {
		const context = makeContext();
		const result = await listNonPlayerCharactersByCampaignHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({ npcs: [mockNpc] });
	});
});

// ── listNpcsByColonyHandler ───────────────────────────────────────────────────

describe("listNpcsByColonyHandler", () => {
	const input = { campaignId: "campaign-1", colonyId: "colony-1" };

	beforeEach(() => {
		mockProtoToNpc.mockClear();
		mockProtoToNpc.mockImplementation(() => mockNpc);
	});

	test("throws FORBIDDEN when campaignId does not match context", async () => {
		const context = makeContext({ campaignId: "other-campaign" });
		expect(
			listNpcsByColonyHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("returns mapped npcs on success", async () => {
		const context = makeContext();
		const result = await listNpcsByColonyHandler({ context, input } as never);
		expect(result).toEqual({ npcs: [mockNpc] });
	});

	test("calls listNpcsByColony with colonyId and campaignId", async () => {
		const context = makeContext();
		await listNpcsByColonyHandler({ context, input } as never);
		expect(context.api.npc.listNpcsByColony).toHaveBeenCalledWith({
			campaignId: "campaign-1",
			colonyId: "colony-1",
		});
	});
});

// ── removeNpcHandler ──────────────────────────────────────────────────────────

describe("removeNpcHandler", () => {
	const input = { id: "npc-1" };

	test("returns empty object on success", async () => {
		const context = makeContext();
		const result = await removeNpcHandler({ context, input } as never);
		expect(result).toEqual({});
	});

	test("calls removeNpc with the input id and context campaignId", async () => {
		const context = makeContext();
		await removeNpcHandler({ context, input } as never);
		expect(context.api.npc.removeNpc).toHaveBeenCalledWith({
			campaignId: "campaign-1",
			id: input.id,
		});
	});
});

// ── updateNpcHandler ──────────────────────────────────────────────────────────

describe("updateNpcHandler", () => {
	const input = {
		id: "npc-1",
		name: "Gandalf the White",
	};

	beforeEach(() => {
		mockProtoToNpc.mockClear();
		mockProtoToNpc.mockImplementation(() => mockNpc);
	});

	test("returns the updated npc on success", async () => {
		const context = makeContext();
		const result = await updateNpcHandler({ context, input } as never);
		expect(result).toEqual({ npc: mockNpc });
	});

	test("throws INTERNAL_SERVER_ERROR when api returns no npc", async () => {
		const context = makeContext();
		context.api.npc.updateNpc = mock(async () => ({})) as never;
		expect(
			updateNpcHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});
