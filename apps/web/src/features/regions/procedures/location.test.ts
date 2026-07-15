import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockLocation = {
	createdAt: new Date("2024-01-01T00:00:00.000Z"),
	id: "loc-1",
	name: "The Tavern",
	regionId: "region-1",
	updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

const mockLocationProto = { id: "loc-1" };

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockProtoToLocation = mock(() => mockLocation);

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
mock.module("./proto/location", () => ({
	protoToLocation: mockProtoToLocation,
}));

const {
	createLocationHandler,
	getLocationByIdHandler,
	removeLocationHandler,
	updateLocationHandler,
} = await import("./location");

// ── Context factory ───────────────────────────────────────────────────────────

function makeApi() {
	return {
		location: {
			createLocation: mock(async () => ({ location: mockLocationProto })),
			getLocation: mock(async () => ({ location: mockLocationProto })),
			removeLocation: mock(async () => ({})),
			updateLocation: mock(async () => ({ location: mockLocationProto })),
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

// ── createLocationHandler ─────────────────────────────────────────────────────

describe("createLocationHandler", () => {
	const input = { name: "The Tavern", regionId: "region-1" };

	beforeEach(() => {
		mockProtoToLocation.mockClear();
		mockProtoToLocation.mockImplementation(() => mockLocation);
	});

	test("returns the location on success", async () => {
		const context = makeContext();
		const result = await createLocationHandler({ context, input } as never);
		expect(result).toEqual({ location: mockLocation });
	});

	test("calls createLocation with regionId from input and campaignId from context", async () => {
		const context = makeContext();
		await createLocationHandler({ context, input } as never);
		expect(context.api.location.createLocation).toHaveBeenCalledWith(
			expect.objectContaining({
				campaignId: context.campaignId,
				regionId: input.regionId,
			}),
		);
	});

	test("throws INTERNAL_SERVER_ERROR when api returns no location", async () => {
		const context = makeContext();
		context.api.location.createLocation = mock(async () => ({})) as never;
		expect(
			createLocationHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});

// ── getLocationByIdHandler ────────────────────────────────────────────────────

describe("getLocationByIdHandler", () => {
	const input = { id: "loc-1" };

	beforeEach(() => {
		mockProtoToLocation.mockClear();
		mockProtoToLocation.mockImplementation(() => mockLocation);
	});

	test("returns the location on success", async () => {
		const context = makeContext();
		const result = await getLocationByIdHandler({ context, input } as never);
		expect(result).toEqual({ location: mockLocation });
	});

	test("calls getLocation with the input id and context campaignId", async () => {
		const context = makeContext();
		await getLocationByIdHandler({ context, input } as never);
		expect(context.api.location.getLocation).toHaveBeenCalledWith({
			campaignId: "campaign-1",
			id: input.id,
		});
	});

	test("throws NOT_FOUND when api returns no location", async () => {
		const context = makeContext();
		context.api.location.getLocation = mock(async () => ({})) as never;
		expect(
			getLocationByIdHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
});

// ── removeLocationHandler ─────────────────────────────────────────────────────

describe("removeLocationHandler", () => {
	const input = { id: "loc-1" };

	test("returns empty object on success", async () => {
		const context = makeContext();
		const result = await removeLocationHandler({ context, input } as never);
		expect(result).toEqual({});
	});

	test("calls removeLocation with the input id and context campaignId", async () => {
		const context = makeContext();
		await removeLocationHandler({ context, input } as never);
		expect(context.api.location.removeLocation).toHaveBeenCalledWith({
			campaignId: "campaign-1",
			id: input.id,
		});
	});
});

// ── updateLocationHandler ─────────────────────────────────────────────────────

describe("updateLocationHandler", () => {
	const input = {
		description: "A cozy tavern",
		dmNotes: "secret passage",
		id: "loc-1",
		mapX: 100,
		mapY: 200,
		name: "Updated Tavern",
		notes: "public notes",
	};

	beforeEach(() => {
		mockProtoToLocation.mockClear();
		mockProtoToLocation.mockImplementation(() => mockLocation);
	});

	test("returns the updated location on success", async () => {
		const context = makeContext();
		const result = await updateLocationHandler({ context, input } as never);
		expect(result).toEqual({ location: mockLocation });
	});

	test("calls updateLocation with correct fields and campaignId from context", async () => {
		const context = makeContext();
		await updateLocationHandler({ context, input } as never);
		expect(context.api.location.updateLocation).toHaveBeenCalledWith(
			expect.objectContaining({
				campaignId: context.campaignId,
				id: input.id,
				mapX: input.mapX,
				mapY: input.mapY,
			}),
		);
	});

	test("throws INTERNAL_SERVER_ERROR when api returns no location", async () => {
		const context = makeContext();
		context.api.location.updateLocation = mock(async () => ({})) as never;
		expect(
			updateLocationHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});
