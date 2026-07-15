import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Code, ConnectError } from "@connectrpc/connect";
import { UserRole } from "@planner/enums/user";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockCampaign = {
	createdAt: new Date(),
	deletedAt: null,
	description: "A test campaign",
	id: "00000000-0000-0000-0000-000000000001",
	tags: ["fantasy"],
	title: "Test Campaign",
	updatedAt: new Date(),
	userId: "00000000-0000-0000-0000-000000000002",
};

const mockCampaignProto = { id: mockCampaign.id };

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockTryRefreshAuthCookie = mock(async () => {});
const mockHandleError = mock((err: unknown): never => {
	throw err;
});
const mockProtoToCampaign = mock(() => mockCampaign);
const mockDeleteCookie = mock(() => {});

const makeChain = () => {
	const chain: Record<string, () => unknown> = {};
	for (const method of ["route", "input", "output", "use", "handler"]) {
		chain[method] = () => chain;
	}
	return chain;
};

mock.module("@/shared/lib/env", () => ({
	env: {
		AUTH_PRIVATE_KEY_PEM: "test-private-pem",
		AUTH_PUBLIC_KEY_PEM: "test-public-pem",
		NODE_ENV: "test",
	},
}));

mock.module("@/server/middleware", () => ({
	ACTIVE_CAMPAIGN_ID_COOKIE_NAME: "active_campaign_id",
	AUTH_COOKIE_NAME: "planner_auth",
	campaignProcedure: makeChain(),
	dmProcedure: makeChain(),
	privateProcedure: makeChain(),
	tryRefreshAuthCookie: mockTryRefreshAuthCookie,
}));

mock.module("@/server/errors", () => ({
	handleError: mockHandleError,
}));

mock.module("@/shared/lib/proto/campaign", () => ({
	protoToCampaign: mockProtoToCampaign,
}));

mock.module("@orpc/server/helpers", () => ({
	deleteCookie: mockDeleteCookie,
}));

const {
	createCampaignHandler,
	getActiveCampaignHandler,
	updateCampaignHandler,
	deleteCampaignHandler,
} = await import("./campaign");

// ── Context factory ───────────────────────────────────────────────────────────

function makeApi() {
	return {
		campaign: {
			createCampaign: mock(async () => ({ campaign: mockCampaignProto })),
			deleteCampaign: mock(async () => ({ campaign: mockCampaignProto })),
			getCampaign: mock(async () => ({ campaign: mockCampaignProto })),
			updateCampaign: mock(async () => ({ campaign: mockCampaignProto })),
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
		reqHeaders: new Headers(),
		resHeaders: new Headers(),
		role: UserRole.DUNGEON_MASTER,
		userId: "user-1",
		...overrides,
	};
}

// ── createCampaignHandler ─────────────────────────────────────────────────────

describe("createCampaignHandler", () => {
	const input = {
		description: "desc",
		tags: ["fantasy"],
		title: "Test Campaign",
	};

	beforeEach(() => {
		mockDeleteCookie.mockClear();
		mockTryRefreshAuthCookie.mockClear();
		mockProtoToCampaign.mockClear();
		mockProtoToCampaign.mockImplementation(() => mockCampaign);
	});

	test("returns the campaign on success", async () => {
		const context = makeContext();
		const result = await createCampaignHandler({ context, input } as never);
		expect(result).toEqual({ campaign: mockCampaign });
	});

	test("forwards title, description, tags, userId to createCampaign", async () => {
		const context = makeContext();
		await createCampaignHandler({ context, input } as never);
		expect(context.api.campaign.createCampaign).toHaveBeenCalledWith({
			description: input.description,
			tags: input.tags,
			title: input.title,
			userId: context.userId,
		});
	});

	test("calls tryRefreshAuthCookie with campaign, null colonyId, and DM role", async () => {
		const context = makeContext();
		await createCampaignHandler({ context, input } as never);
		expect(mockTryRefreshAuthCookie).toHaveBeenCalledWith(
			context,
			expect.objectContaining({
				campaign: mockCampaign,
				colonyId: null,
				role: UserRole.DUNGEON_MASTER,
			}),
		);
	});

	test("throws when api returns no campaign proto", async () => {
		const context = makeContext();
		context.api.campaign.createCampaign = mock(async () => ({})) as never;
		expect(
			createCampaignHandler({ context, input } as never),
		).rejects.toMatchObject({
			code: "INTERNAL_SERVER_ERROR",
		});
	});
});

// ── getActiveCampaignHandler ──────────────────────────────────────────────────

describe("getActiveCampaignHandler", () => {
	beforeEach(() => {
		mockProtoToCampaign.mockClear();
		mockProtoToCampaign.mockImplementation(() => mockCampaign);
	});

	test("returns null when campaignId is absent from context", async () => {
		const context = makeContext({ campaignId: undefined });
		const result = await getActiveCampaignHandler({ context } as never);
		expect(result).toBeNull();
	});

	test("returns campaign and role on success", async () => {
		const context = makeContext();
		const result = await getActiveCampaignHandler({ context } as never);
		expect(result).toEqual({
			campaign: mockCampaign,
			colonyId: null,
			role: UserRole.DUNGEON_MASTER,
		});
	});

	test("calls getCampaign with the context campaignId", async () => {
		const context = makeContext();
		await getActiveCampaignHandler({ context } as never);
		expect(context.api.campaign.getCampaign).toHaveBeenCalledWith({
			id: "campaign-1",
		});
	});

	test("throws when api returns no campaign proto", async () => {
		const context = makeContext();
		context.api.campaign.getCampaign = mock(async () => ({})) as never;
		expect(
			getActiveCampaignHandler({ context } as never),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
	});

	test("throws when role is null (user not a member)", async () => {
		const context = makeContext({ role: null });
		expect(
			getActiveCampaignHandler({ context } as never),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("returns null when api throws ConnectError NotFound", async () => {
		const context = makeContext();
		context.api.campaign.getCampaign = mock(async () => {
			throw new ConnectError("not found", Code.NotFound);
		});
		const result = await getActiveCampaignHandler({ context } as never);
		expect(result).toBeNull();
	});
});

// ── updateCampaignHandler ─────────────────────────────────────────────────────

describe("updateCampaignHandler", () => {
	const input = {
		description: "Updated desc",
		id: "campaign-1",
		tags: ["updated"],
		title: "Updated Title",
	};

	beforeEach(() => {
		mockProtoToCampaign.mockClear();
		mockProtoToCampaign.mockImplementation(() => mockCampaign);
	});

	test("throws FORBIDDEN when input id does not match context campaignId", async () => {
		const context = makeContext({ campaignId: "different-campaign" });
		expect(
			updateCampaignHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("returns the updated campaign on success", async () => {
		const context = makeContext();
		const result = await updateCampaignHandler({ context, input } as never);
		expect(result).toEqual({ campaign: mockCampaign });
	});

	test("forwards id, title, description, tags, userId to updateCampaign", async () => {
		const context = makeContext();
		await updateCampaignHandler({ context, input } as never);
		expect(context.api.campaign.updateCampaign).toHaveBeenCalledWith({
			description: input.description,
			id: input.id,
			tags: input.tags,
			title: input.title,
			userId: context.userId,
		});
	});

	test("throws when api returns no campaign proto", async () => {
		const context = makeContext();
		context.api.campaign.updateCampaign = mock(async () => ({})) as never;
		expect(
			updateCampaignHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});

// ── deleteCampaignHandler ─────────────────────────────────────────────────────

describe("deleteCampaignHandler", () => {
	const input = { id: "campaign-1" };

	beforeEach(() => {
		mockDeleteCookie.mockClear();
		mockProtoToCampaign.mockClear();
		mockProtoToCampaign.mockImplementation(() => mockCampaign);
	});

	test("throws FORBIDDEN when input id does not match context campaignId", async () => {
		const context = makeContext({ campaignId: "different-campaign" });
		expect(
			deleteCampaignHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("returns the deleted campaign on success", async () => {
		const context = makeContext();
		const result = await deleteCampaignHandler({ context, input } as never);
		expect(result).toEqual({ campaign: mockCampaign });
	});

	test("deletes the active campaign cookie on success", async () => {
		const context = makeContext();
		await deleteCampaignHandler({ context, input } as never);
		expect(mockDeleteCookie).toHaveBeenCalled();
	});

	test("forwards id and userId to deleteCampaign", async () => {
		const context = makeContext();
		await deleteCampaignHandler({ context, input } as never);
		expect(context.api.campaign.deleteCampaign).toHaveBeenCalledWith({
			id: input.id,
			userId: context.userId,
		});
	});

	test("throws when api returns no campaign proto", async () => {
		const context = makeContext();
		context.api.campaign.deleteCampaign = mock(async () => ({})) as never;
		expect(
			deleteCampaignHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});
