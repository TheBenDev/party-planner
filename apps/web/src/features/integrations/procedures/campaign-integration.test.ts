import { beforeEach, describe, expect, mock, test } from "bun:test";
import { IntegrationSource } from "@planner/enums/integration";

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mockIntegration = {
	campaignId: "campaign-1",
	createdAt: new Date("2024-01-01T00:00:00.000Z"),
	externalId: "discord-server-123",
	id: "integration-1",
	metaData: {
		defaultChannel: { id: "channel-1", name: "general" },
		serverName: "My Discord Server",
		source: IntegrationSource.DISCORD,
	},
	settings: {
		enableSessionReminders: false,
		recapChannel: null,
		sessionCreateAnnouncements: false,
		sessionReminderChannel: null,
		source: IntegrationSource.DISCORD,
		timezone: "UTC",
	},
	source: IntegrationSource.DISCORD,
	updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

const mockIntegrationProto = { id: "integration-1" };

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockProtoToCampaignIntegration = mock(() => mockIntegration);
const mockIntegrationSourceToProto = mock(() => 1);

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
mock.module("./proto/campaign-integration", () => ({
	integrationSourceToProto: mockIntegrationSourceToProto,
	protoToCampaignIntegration: mockProtoToCampaignIntegration,
}));

const {
	createCampaignIntegrationHandler,
	getCampaignIntegrationHandler,
	removeCampaignIntegrationHandler,
	listCampaignIntegrationsByCampaignHandler,
	updateCampaignIntegrationHandler,
} = await import("./campaign-integration");

// ── Context factory ───────────────────────────────────────────────────────────

function makeApi() {
	return {
		campaignIntegration: {
			createCampaignIntegration: mock(async () => ({
				integration: mockIntegrationProto,
			})),
			getCampaignIntegration: mock(async () => ({
				integration: mockIntegrationProto,
			})),
			listCampaignIntegrationsByCampaign: mock(async () => ({
				integrations: [mockIntegrationProto],
			})),
			removeCampaignIntegration: mock(async () => ({})),
			updateCampaignIntegration: mock(async () => ({
				integration: mockIntegrationProto,
			})),
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

// ── createCampaignIntegrationHandler ─────────────────────────────────────────

describe("createCampaignIntegrationHandler", () => {
	const input = {
		campaignId: "campaign-1",
		code: "discord-oauth-code",
		source: IntegrationSource.DISCORD,
	};

	beforeEach(() => {
		mockProtoToCampaignIntegration.mockClear();
		mockProtoToCampaignIntegration.mockImplementation(() => mockIntegration);
	});

	test("throws FORBIDDEN when campaignId does not match context", async () => {
		const context = makeContext({ campaignId: "other-campaign" });
		expect(
			createCampaignIntegrationHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("throws BAD_REQUEST when code is missing for Discord source", async () => {
		const context = makeContext();
		expect(
			createCampaignIntegrationHandler({
				context,
				input: { ...input, code: undefined },
			} as never),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	test("throws BAD_REQUEST for unsupported integration source", async () => {
		const context = makeContext();
		expect(
			createCampaignIntegrationHandler({
				context,
				input: { ...input, source: "UNKNOWN" as never },
			} as never),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	test("returns the integration on success", async () => {
		const context = makeContext();
		const result = await createCampaignIntegrationHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({ integration: mockIntegration });
	});

	test("throws INTERNAL_SERVER_ERROR when api returns no integration", async () => {
		const context = makeContext();
		context.api.campaignIntegration.createCampaignIntegration = mock(
			async () => ({ integration: undefined }),
		) as never;
		expect(
			createCampaignIntegrationHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});

// ── getCampaignIntegrationHandler ─────────────────────────────────────────────

describe("getCampaignIntegrationHandler", () => {
	const input = {
		campaignId: "campaign-1",
		source: IntegrationSource.DISCORD,
	};

	beforeEach(() => {
		mockProtoToCampaignIntegration.mockClear();
		mockProtoToCampaignIntegration.mockImplementation(() => mockIntegration);
	});

	test("throws FORBIDDEN when campaignId does not match context", async () => {
		const context = makeContext({ campaignId: "other-campaign" });
		expect(
			getCampaignIntegrationHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("returns the integration on success", async () => {
		const context = makeContext();
		const result = await getCampaignIntegrationHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({ integration: mockIntegration });
	});

	test("returns null integration when api returns no integration", async () => {
		const context = makeContext();
		context.api.campaignIntegration.getCampaignIntegration = mock(async () => ({
			integration: undefined,
		})) as never;
		const result = await getCampaignIntegrationHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({ integration: null });
	});
});

// ── removeCampaignIntegrationHandler ─────────────────────────────────────────

describe("removeCampaignIntegrationHandler", () => {
	const input = {
		campaignId: "campaign-1",
		source: IntegrationSource.DISCORD,
	};

	test("throws FORBIDDEN when campaignId does not match context", async () => {
		const context = makeContext({ campaignId: "other-campaign" });
		expect(
			removeCampaignIntegrationHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("returns empty object on success", async () => {
		const context = makeContext();
		const result = await removeCampaignIntegrationHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({});
	});
});

// ── listCampaignIntegrationsByCampaignHandler ─────────────────────────────────

describe("listCampaignIntegrationsByCampaignHandler", () => {
	const input = { campaignId: "campaign-1" };

	beforeEach(() => {
		mockProtoToCampaignIntegration.mockClear();
		mockProtoToCampaignIntegration.mockImplementation(() => mockIntegration);
	});

	test("throws FORBIDDEN when campaignId does not match context", async () => {
		const context = makeContext({ campaignId: "other-campaign" });
		expect(
			listCampaignIntegrationsByCampaignHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("returns mapped integrations on success", async () => {
		const context = makeContext();
		const result = await listCampaignIntegrationsByCampaignHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({ integrations: [mockIntegration] });
	});
});

// ── updateCampaignIntegrationHandler ─────────────────────────────────────────

describe("updateCampaignIntegrationHandler", () => {
	const input = {
		campaignId: "campaign-1",
		source: IntegrationSource.DISCORD,
	};

	beforeEach(() => {
		mockProtoToCampaignIntegration.mockClear();
		mockProtoToCampaignIntegration.mockImplementation(() => mockIntegration);
	});

	test("throws FORBIDDEN when campaignId does not match context", async () => {
		const context = makeContext({ campaignId: "other-campaign" });
		expect(
			updateCampaignIntegrationHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("throws BAD_REQUEST for unsupported integration source", async () => {
		const context = makeContext();
		expect(
			updateCampaignIntegrationHandler({
				context,
				input: { ...input, source: "UNKNOWN" as never },
			} as never),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	test("returns the updated integration on success", async () => {
		const context = makeContext();
		const result = await updateCampaignIntegrationHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({ integration: mockIntegration });
	});

	test("throws INTERNAL_SERVER_ERROR when api returns no integration", async () => {
		const context = makeContext();
		context.api.campaignIntegration.updateCampaignIntegration = mock(
			async () => ({ integration: undefined }),
		) as never;
		expect(
			updateCampaignIntegrationHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});
