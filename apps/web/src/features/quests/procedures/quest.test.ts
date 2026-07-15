import { beforeEach, describe, expect, mock, test } from "bun:test";
import { QuestStatusEnum } from "@planner/enums/quest";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockQuest = {
	campaignId: "campaign-1",
	createdAt: new Date("2024-01-01T00:00:00.000Z"),
	id: "quest-1",
	reward: null,
	status: QuestStatusEnum.ACTIVE,
	title: "Retrieve the Orb",
	updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

const mockQuestProto = { id: "quest-1" };

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockProtoToQuest = mock(() => mockQuest);
const mockQuestStatusToProto = mock(() => 1);
const mockQuestTypeToProto = mock(() => 1);

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
	tryRefreshAuthCookie: mock(async () => {}),
	updateAuthCookie: mock(() => {}),
}));
mock.module("./proto/quest", () => ({
	protoToQuest: mockProtoToQuest,
	questStatusToProto: mockQuestStatusToProto,
	questTypeToProto: mockQuestTypeToProto,
}));

const {
	createQuestHandler,
	getQuestHandler,
	listQuestsByCampaignHandler,
	updateQuestHandler,
	removeQuestHandler,
} = await import("./quest");

// ── Context factory ───────────────────────────────────────────────────────────

function makeApi() {
	return {
		quest: {
			createQuest: mock(async () => ({ quest: mockQuestProto })),
			getQuest: mock(async () => ({ quest: mockQuestProto })),
			listQuestsByCampaign: mock(async () => ({ quests: [mockQuestProto] })),
			removeQuest: mock(async () => ({})),
			updateQuest: mock(async () => ({ quest: mockQuestProto })),
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

// ── createQuestHandler ────────────────────────────────────────────────────────

describe("createQuestHandler", () => {
	const input = {
		campaignId: "campaign-1",
		status: "ACTIVE",
		title: "Retrieve the Orb",
	};

	beforeEach(() => {
		mockProtoToQuest.mockClear();
		mockProtoToQuest.mockImplementation(() => mockQuest);
	});

	test("throws FORBIDDEN when campaignId does not match context", async () => {
		const context = makeContext({ campaignId: "other-campaign" });
		expect(
			createQuestHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("returns the quest on success", async () => {
		const context = makeContext();
		const result = await createQuestHandler({ context, input } as never);
		expect(result).toEqual({ quest: mockQuest });
	});

	test("throws INTERNAL_SERVER_ERROR when api returns no quest", async () => {
		const context = makeContext();
		context.api.quest.createQuest = mock(async () => ({})) as never;
		expect(
			createQuestHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});

// ── getQuestHandler ───────────────────────────────────────────────────────────

describe("getQuestHandler", () => {
	const input = { id: "quest-1" };

	beforeEach(() => {
		mockProtoToQuest.mockClear();
		mockProtoToQuest.mockImplementation(() => mockQuest);
	});

	test("returns the quest on success", async () => {
		const context = makeContext();
		const result = await getQuestHandler({ context, input } as never);
		expect(result).toEqual({ quest: mockQuest });
	});

	test("calls getQuest with the input id and context campaignId", async () => {
		const context = makeContext();
		await getQuestHandler({ context, input } as never);
		expect(context.api.quest.getQuest).toHaveBeenCalledWith({
			campaignId: "campaign-1",
			id: input.id,
		});
	});

	test("throws NOT_FOUND when api returns no quest", async () => {
		const context = makeContext();
		context.api.quest.getQuest = mock(async () => ({})) as never;
		expect(getQuestHandler({ context, input } as never)).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
	});
});

// ── listQuestsByCampaignHandler ───────────────────────────────────────────────

describe("listQuestsByCampaignHandler", () => {
	const input = { campaignId: "campaign-1" };

	beforeEach(() => {
		mockProtoToQuest.mockClear();
		mockProtoToQuest.mockImplementation(() => mockQuest);
	});

	test("throws FORBIDDEN when campaignId does not match context", async () => {
		const context = makeContext({ campaignId: "other-campaign" });
		expect(
			listQuestsByCampaignHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("returns mapped quests on success", async () => {
		const context = makeContext();
		const result = await listQuestsByCampaignHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({ quests: [mockQuest] });
	});
});

// ── updateQuestHandler ────────────────────────────────────────────────────────

describe("updateQuestHandler", () => {
	const input = {
		id: "quest-1",
		title: "Updated Quest",
	};

	beforeEach(() => {
		mockProtoToQuest.mockClear();
		mockProtoToQuest.mockImplementation(() => mockQuest);
	});

	test("returns the updated quest on success", async () => {
		const context = makeContext();
		const result = await updateQuestHandler({ context, input } as never);
		expect(result).toEqual({ quest: mockQuest });
	});

	test("throws INTERNAL_SERVER_ERROR when api returns no quest", async () => {
		const context = makeContext();
		context.api.quest.updateQuest = mock(async () => ({})) as never;
		expect(
			updateQuestHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});

// ── removeQuestHandler ────────────────────────────────────────────────────────

describe("removeQuestHandler", () => {
	const input = { id: "quest-1" };

	test("returns empty object on success", async () => {
		const context = makeContext();
		const result = await removeQuestHandler({ context, input } as never);
		expect(result).toEqual({});
	});

	test("calls removeQuest with the input id and context campaignId", async () => {
		const context = makeContext();
		await removeQuestHandler({ context, input } as never);
		expect(context.api.quest.removeQuest).toHaveBeenCalledWith({
			campaignId: "campaign-1",
			id: input.id,
		});
	});
});
