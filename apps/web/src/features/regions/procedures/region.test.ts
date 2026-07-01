import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockRegion = {
	campaignId: "campaign-1",
	createdAt: new Date("2024-01-01T00:00:00.000Z"),
	id: "region-1",
	name: "The Underdark",
	updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

const mockRegionWithDetails = {
	locations: [],
	region: mockRegion,
};

const mockRegionProto = { id: "region-1" };
const mockRegionWithDetailsProto = { locations: [], region: mockRegionProto };

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockProtoToRegion = mock(() => mockRegion);
const mockProtoToRegionWithDetails = mock(() => mockRegionWithDetails);

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
mock.module("./proto/region", () => ({
	protoToRegion: mockProtoToRegion,
	protoToRegionWithDetails: mockProtoToRegionWithDetails,
}));

const {
	createRegionHandler,
	getRegionHandler,
	listRegionsByCampaignHandler,
	removeRegionHandler,
	updateRegionHandler,
} = await import("./region");

// ── Context factory ───────────────────────────────────────────────────────────

function makeApi() {
	return {
		region: {
			createRegion: mock(async () => ({ region: mockRegionProto })),
			getRegion: mock(async () => ({ data: mockRegionWithDetailsProto })),
			listRegionsByCampaign: mock(async () => ({
				regions: [mockRegionWithDetailsProto],
			})),
			removeRegion: mock(async () => ({})),
			updateRegion: mock(async () => ({ region: mockRegionProto })),
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

// ── createRegionHandler ───────────────────────────────────────────────────────

describe("createRegionHandler", () => {
	const input = { name: "The Underdark" };

	beforeEach(() => {
		mockProtoToRegion.mockClear();
		mockProtoToRegion.mockImplementation(() => mockRegion);
	});

	test("returns the region on success", async () => {
		const context = makeContext();
		const result = await createRegionHandler({ context, input } as never);
		expect(result).toEqual({ region: mockRegion });
	});

	test("calls createRegion with campaignId from context and name from input", async () => {
		const context = makeContext();
		await createRegionHandler({ context, input } as never);
		expect(context.api.region.createRegion).toHaveBeenCalledWith(
			expect.objectContaining({
				campaignId: context.campaignId,
				name: input.name,
			}),
		);
	});

	test("throws INTERNAL_SERVER_ERROR when api returns no region", async () => {
		const context = makeContext();
		context.api.region.createRegion = mock(async () => ({})) as never;
		expect(
			createRegionHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});

// ── getRegionHandler ──────────────────────────────────────────────────────────

describe("getRegionHandler", () => {
	const input = { id: "region-1" };

	beforeEach(() => {
		mockProtoToRegionWithDetails.mockClear();
		mockProtoToRegionWithDetails.mockImplementation(
			() => mockRegionWithDetails,
		);
	});

	test("returns the region on success", async () => {
		const context = makeContext();
		const result = await getRegionHandler({ context, input } as never);
		expect(result).toEqual({ data: mockRegionWithDetails });
	});

	test("calls getRegion with the input id and context campaignId", async () => {
		const context = makeContext();
		await getRegionHandler({ context, input } as never);
		expect(context.api.region.getRegion).toHaveBeenCalledWith({
			campaignId: "campaign-1",
			id: input.id,
		});
	});

	test("throws NOT_FOUND when api returns no region", async () => {
		const context = makeContext();
		context.api.region.getRegion = mock(async () => ({})) as never;
		expect(getRegionHandler({ context, input } as never)).rejects.toMatchObject(
			{ code: "NOT_FOUND" },
		);
	});
});

// ── listRegionsByCampaignHandler ──────────────────────────────────────────────

describe("listRegionsByCampaignHandler", () => {
	const input = { campaignId: "campaign-1" };

	beforeEach(() => {
		mockProtoToRegionWithDetails.mockClear();
		mockProtoToRegionWithDetails.mockImplementation(
			() => mockRegionWithDetails,
		);
	});

	test("throws FORBIDDEN when campaignId does not match context", async () => {
		const context = makeContext({ campaignId: "other-campaign" });
		expect(
			listRegionsByCampaignHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("returns mapped regions on success", async () => {
		const context = makeContext();
		const result = await listRegionsByCampaignHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({ regions: [mockRegionWithDetails] });
	});
});

// ── removeRegionHandler ───────────────────────────────────────────────────────

describe("removeRegionHandler", () => {
	const input = { id: "region-1" };

	test("returns empty object on success", async () => {
		const context = makeContext();
		const result = await removeRegionHandler({ context, input } as never);
		expect(result).toEqual({});
	});

	test("calls removeRegion with the input id and context campaignId", async () => {
		const context = makeContext();
		await removeRegionHandler({ context, input } as never);
		expect(context.api.region.removeRegion).toHaveBeenCalledWith({
			campaignId: "campaign-1",
			id: input.id,
		});
	});
});

// ── updateRegionHandler ───────────────────────────────────────────────────────

describe("updateRegionHandler", () => {
	const input = {
		id: "region-1",
		mapImageUrl: "https://example.com/map.png",
		name: "Updated Underdark",
	};

	beforeEach(() => {
		mockProtoToRegion.mockClear();
		mockProtoToRegion.mockImplementation(() => mockRegion);
	});

	test("returns the updated region on success", async () => {
		const context = makeContext();
		const result = await updateRegionHandler({ context, input } as never);
		expect(result).toEqual({ region: mockRegion });
	});

	test("calls updateRegion with correct fields and campaignId from context", async () => {
		const context = makeContext();
		await updateRegionHandler({ context, input } as never);
		expect(context.api.region.updateRegion).toHaveBeenCalledWith(
			expect.objectContaining({
				campaignId: context.campaignId,
				id: input.id,
				name: input.name,
			}),
		);
	});

	test("throws INTERNAL_SERVER_ERROR when api returns no region", async () => {
		const context = makeContext();
		context.api.region.updateRegion = mock(async () => ({})) as never;
		expect(
			updateRegionHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});
