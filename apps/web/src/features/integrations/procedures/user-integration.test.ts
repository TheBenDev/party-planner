import { describe, expect, mock, test } from "bun:test";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockHandleError = mock((err: unknown): never => {
	throw err;
});

const makeChain = () => {
	const chain: Record<string, () => unknown> = {};
	for (const method of ["route", "input", "output", "use", "handler"]) {
		chain[method] = () => chain;
	}
	return chain;
};

mock.module("@/server/errors", () => ({ handleError: mockHandleError }));
mock.module("@/server/middleware", () => ({
	ACTIVE_CAMPAIGN_ID_COOKIE_NAME: "active_campaign_id",
	AUTH_COOKIE_NAME: "planner_auth",
	campaignProcedure: makeChain(),
	dmProcedure: makeChain(),
	privateProcedure: makeChain(),
	updateAuthCookie: mock(() => {}),
}));

const {
	connectGoogleCalendarHandler,
	disconnectGoogleCalendarHandler,
	getGoogleCalendarStatusHandler,
	checkCalendarConflictsHandler,
	syncSessionToCalendarHandler,
} = await import("./user-integration");

// ── Context factory ───────────────────────────────────────────────────────────

function makeApi() {
	return {
		userIntegration: {
			checkCalendarConflicts: mock(async () => ({ conflicts: [] })),
			connectGoogleCalendar: mock(async () => ({})),
			disconnectGoogleCalendar: mock(async () => ({})),
			getGoogleCalendarStatus: mock(async () => ({ connected: true })),
			syncSessionToCalendar: mock(async () => ({ synced: true })),
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
		userId: "user-1",
		...overrides,
	};
}

// ── connectGoogleCalendarHandler ──────────────────────────────────────────────

describe("connectGoogleCalendarHandler", () => {
	const input = { code: "oauth-code" };

	test("returns connected true on success", async () => {
		const context = makeContext();
		const result = await connectGoogleCalendarHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({ connected: true });
	});

	test("calls connectGoogleCalendar with the code and userId", async () => {
		const context = makeContext();
		await connectGoogleCalendarHandler({ context, input } as never);
		expect(
			context.api.userIntegration.connectGoogleCalendar,
		).toHaveBeenCalledWith({
			code: input.code,
			userId: "user-1",
		});
	});
});

// ── disconnectGoogleCalendarHandler ───────────────────────────────────────────

describe("disconnectGoogleCalendarHandler", () => {
	test("returns empty object on success", async () => {
		const context = makeContext();
		const result = await disconnectGoogleCalendarHandler({
			context,
		} as never);
		expect(result).toEqual({});
	});

	test("calls disconnectGoogleCalendar with userId", async () => {
		const context = makeContext();
		await disconnectGoogleCalendarHandler({ context } as never);
		expect(
			context.api.userIntegration.disconnectGoogleCalendar,
		).toHaveBeenCalledWith({ userId: "user-1" });
	});
});

// ── getGoogleCalendarStatusHandler ────────────────────────────────────────────

describe("getGoogleCalendarStatusHandler", () => {
	test("returns the connected status from the api", async () => {
		const context = makeContext();
		const result = await getGoogleCalendarStatusHandler({
			context,
		} as never);
		expect(result).toEqual({ connected: true });
	});

	test("returns connected false when api returns false", async () => {
		const context = makeContext();
		context.api.userIntegration.getGoogleCalendarStatus = mock(async () => ({
			connected: false,
		}));
		const result = await getGoogleCalendarStatusHandler({
			context,
		} as never);
		expect(result).toEqual({ connected: false });
	});
});

// ── checkCalendarConflictsHandler ─────────────────────────────────────────────

describe("checkCalendarConflictsHandler", () => {
	const input = {
		campaignId: "campaign-1",
		durationMinutes: 120,
		startsAt: "2025-06-01T18:00:00Z",
	};

	test("throws FORBIDDEN when campaignId does not match context", async () => {
		const context = makeContext({ campaignId: "other-campaign" });
		expect(
			checkCalendarConflictsHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("returns conflicts on success", async () => {
		const context = makeContext();
		const result = await checkCalendarConflictsHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({ conflicts: [] });
	});

	test("calls checkCalendarConflicts with campaignId and durationMinutes", async () => {
		const context = makeContext();
		await checkCalendarConflictsHandler({ context, input } as never);
		expect(
			context.api.userIntegration.checkCalendarConflicts,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				campaignId: input.campaignId,
				durationMinutes: input.durationMinutes,
			}),
		);
	});
});

// ── syncSessionToCalendarHandler ──────────────────────────────────────────────

describe("syncSessionToCalendarHandler", () => {
	const input = {
		durationMinutes: 240,
		startsAt: "2025-06-01T18:00:00Z",
		title: "The Dragon's Lair",
	};

	test("returns synced true on success", async () => {
		const context = makeContext();
		const result = await syncSessionToCalendarHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({ synced: true });
	});

	test("calls syncSessionToCalendar with title, durationMinutes, and userId", async () => {
		const context = makeContext();
		await syncSessionToCalendarHandler({ context, input } as never);
		expect(
			context.api.userIntegration.syncSessionToCalendar,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				durationMinutes: input.durationMinutes,
				title: input.title,
				userId: "user-1",
			}),
		);
	});
});
