import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockSession = {
	campaignId: "campaign-1",
	createdAt: new Date("2024-01-01T00:00:00.000Z"),
	id: "session-1",
	startsAt: new Date("2024-01-01T18:00:00.000Z"),
	title: "The Dragon's Lair",
	updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

const mockSessionProto = { id: "session-1" };

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockProtoToSession = mock(() => mockSession);
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
mock.module("./proto/session", () => ({ protoToSession: mockProtoToSession }));

const {
	createSessionHandler,
	getSessionHandler,
	removeSessionHandler,
	updateSessionHandler,
} = await import("./session");

// ── Context factory ───────────────────────────────────────────────────────────

function makeApi() {
	return {
		session: {
			createSession: mock(async () => ({ session: mockSessionProto })),
			getSession: mock(async () => ({ session: mockSessionProto })),
			removeSession: mock(async () => ({})),
			updateSession: mock(async () => ({ session: mockSessionProto })),
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

// ── createSessionHandler ──────────────────────────────────────────────────────

describe("createSessionHandler", () => {
	const input = {
		campaignId: "campaign-1",
		description: "The party enters the dragon's lair",
		durationMinutes: 240,
		title: "The Dragon's Lair",
	};

	beforeEach(() => {
		mockProtoToSession.mockClear();
		mockProtoToSession.mockImplementation(() => mockSession);
	});

	test("throws FORBIDDEN when campaignId does not match context", async () => {
		const context = makeContext({ campaignId: "other-campaign" });
		expect(
			createSessionHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("returns the session on success", async () => {
		const context = makeContext();
		const result = await createSessionHandler({ context, input } as never);
		expect(result).toEqual({ session: mockSession });
	});

	test("calls createSession with campaignId, title, description, durationMinutes", async () => {
		const context = makeContext();
		await createSessionHandler({ context, input } as never);
		expect(context.api.session.createSession).toHaveBeenCalledWith(
			expect.objectContaining({
				campaignId: input.campaignId,
				description: input.description,
				durationMinutes: input.durationMinutes,
				title: input.title,
			}),
		);
	});

	test("throws INTERNAL_SERVER_ERROR when api returns no session", async () => {
		const context = makeContext();
		context.api.session.createSession = mock(async () => ({})) as never;
		expect(
			createSessionHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});

// ── getSessionHandler ─────────────────────────────────────────────────────────

describe("getSessionHandler", () => {
	const input = { id: "session-1" };

	beforeEach(() => {
		mockProtoToSession.mockClear();
		mockProtoToSession.mockImplementation(() => mockSession);
	});

	test("returns the session on success", async () => {
		const context = makeContext();
		const result = await getSessionHandler({ context, input } as never);
		expect(result).toEqual({ session: mockSession });
	});

	test("calls getSession with the input id and context campaignId", async () => {
		const context = makeContext();
		await getSessionHandler({ context, input } as never);
		expect(context.api.session.getSession).toHaveBeenCalledWith({
			campaignId: "campaign-1",
			id: input.id,
		});
	});

	test("throws NOT_FOUND when api returns no session", async () => {
		const context = makeContext();
		context.api.session.getSession = mock(async () => ({})) as never;
		expect(
			getSessionHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
});

// ── removeSessionHandler ──────────────────────────────────────────────────────

describe("removeSessionHandler", () => {
	const input = { id: "session-1" };

	test("returns empty object on success", async () => {
		const context = makeContext();
		const result = await removeSessionHandler({ context, input } as never);
		expect(result).toEqual({});
	});

	test("calls removeSession with the input id and context campaignId", async () => {
		const context = makeContext();
		await removeSessionHandler({ context, input } as never);
		expect(context.api.session.removeSession).toHaveBeenCalledWith({
			campaignId: "campaign-1",
			id: input.id,
		});
	});
});

// ── updateSessionHandler ──────────────────────────────────────────────────────

describe("updateSessionHandler", () => {
	const input = {
		description: "Updated description",
		id: "session-1",
		recap: "The party defeated the dragon",
		title: "Updated Session",
	};

	beforeEach(() => {
		mockProtoToSession.mockClear();
		mockProtoToSession.mockImplementation(() => mockSession);
	});

	test("returns the updated session on success", async () => {
		const context = makeContext();
		const result = await updateSessionHandler({ context, input } as never);
		expect(result).toEqual({ session: mockSession });
	});

	test("calls updateSession with the right fields", async () => {
		const context = makeContext();
		await updateSessionHandler({ context, input } as never);
		expect(context.api.session.updateSession).toHaveBeenCalledWith({
			campaignId: "campaign-1",
			description: input.description,
			id: input.id,
			recap: input.recap,
			title: input.title,
		});
	});

	test("throws INTERNAL_SERVER_ERROR when api returns no session", async () => {
		const context = makeContext();
		context.api.session.updateSession = mock(async () => ({})) as never;
		expect(
			updateSessionHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});
