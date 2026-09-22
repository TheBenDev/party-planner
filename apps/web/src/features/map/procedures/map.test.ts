import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockHex = {
	campaignId: "campaign-1",
	id: "hex-1",
	q: 2,
	r: -1,
	terrain: "forest",
};

const mockHexProto = { id: "hex-1" };

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockProtoToMapHex = mock(() => mockHex);

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
mock.module("./proto/map", () => ({
	protoToMapHex: mockProtoToMapHex,
}));

const { getCampaignMapHandler, upsertMapHexHandler, clearMapHexHandler } =
	await import("./map");

// ── Context factory ───────────────────────────────────────────────────────────

function makeApi() {
	return {
		map: {
			clearMapHex: mock(async () => ({})),
			getCampaignMap: mock(async () => ({ hexes: [mockHexProto] })),
			upsertMapHex: mock(async () => ({ hex: mockHexProto })),
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

// ── getCampaignMapHandler ─────────────────────────────────────────────────────

describe("getCampaignMapHandler", () => {
	beforeEach(() => {
		mockProtoToMapHex.mockClear();
		mockProtoToMapHex.mockImplementation(() => mockHex);
	});

	test("returns hexes on success", async () => {
		const context = makeContext();
		const result = await getCampaignMapHandler({ context, input: undefined } as never);
		expect(result).toEqual({ hexes: [mockHex] });
	});

	test("calls getCampaignMap with campaignId from context", async () => {
		const context = makeContext();
		await getCampaignMapHandler({ context, input: undefined } as never);
		expect(context.api.map.getCampaignMap).toHaveBeenCalledWith({
			campaignId: "campaign-1",
		});
	});
});

// ── upsertMapHexHandler ───────────────────────────────────────────────────────

describe("upsertMapHexHandler", () => {
	const input = { label: "Colony", q: 2, r: -1, terrain: "forest" };

	beforeEach(() => {
		mockProtoToMapHex.mockClear();
		mockProtoToMapHex.mockImplementation(() => mockHex);
	});

	test("returns the upserted hex on success", async () => {
		const context = makeContext();
		const result = await upsertMapHexHandler({ context, input } as never);
		expect(result).toEqual({ hex: mockHex });
	});

	test("calls upsertMapHex with input fields and campaignId from context", async () => {
		const context = makeContext();
		await upsertMapHexHandler({ context, input } as never);
		expect(context.api.map.upsertMapHex).toHaveBeenCalledWith(
			expect.objectContaining({
				campaignId: "campaign-1",
				q: input.q,
				r: input.r,
				terrain: input.terrain,
				label: input.label,
			}),
		);
	});

	test("throws INTERNAL_SERVER_ERROR when api returns no hex", async () => {
		const context = makeContext();
		context.api.map.upsertMapHex = mock(async () => ({})) as never;
		await expect(
			upsertMapHexHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});

// ── clearMapHexHandler ────────────────────────────────────────────────────────

describe("clearMapHexHandler", () => {
	const input = { q: 2, r: -1 };

	test("returns empty object on success", async () => {
		const context = makeContext();
		const result = await clearMapHexHandler({ context, input } as never);
		expect(result).toEqual({});
	});

	test("calls clearMapHex with input coords and campaignId from context", async () => {
		const context = makeContext();
		await clearMapHexHandler({ context, input } as never);
		expect(context.api.map.clearMapHex).toHaveBeenCalledWith({
			campaignId: "campaign-1",
			q: input.q,
			r: input.r,
		});
	});
});
