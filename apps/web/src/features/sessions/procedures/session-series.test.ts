import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockSeries = {
	campaignId: "campaign-1",
	createdAt: new Date("2024-01-01T00:00:00.000Z"),
	durationMinutes: 180,
	id: "series-1",
	rrule: "FREQ=WEEKLY;BYDAY=MO",
	seriesStartDate: new Date("2024-01-01T00:00:00.000Z"),
	startTime: "18:00",
	timezone: "America/New_York",
	title: "Weekly",
	updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};
const mockSeriesWithDetails = {
	exceptions: [],
	series: mockSeries,
	sessions: [],
};
const mockDiscordEvent = {
	eventId: "discord-event-1",
	guildId: "guild-1",
	name: "Weekly Session",
	startTime: new Date("2024-01-01T18:00:00.000Z"),
	status: 1,
};
const mockPoll = {
	answers: [],
	isFinalized: false,
	question: "When should we schedule the next session?",
};

const mockSeriesProto = { id: "series-1" };
const mockDiscordEventProto = { eventId: "discord-event-1" };
const mockPollProto = { seriesId: "series-1" };

const futureDate = new Date(Date.now() + 86400000 * 7);
const farFutureDate = new Date(Date.now() + 86400000 * 14);
const pastDate = new Date(0);

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockProtoToSessionSeries = mock(() => mockSeries);
const mockProtoToSessionSeriesWithDetails = mock(() => mockSeriesWithDetails);
const mockProtoToDiscordEventInfo = mock(() => mockDiscordEvent);
const mockProtoToPoll = mock(() => mockPoll);
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
mock.module("./proto/session-series", () => ({
	protoToDiscordEventInfo: mockProtoToDiscordEventInfo,
	protoToPoll: mockProtoToPoll,
	protoToSessionSeries: mockProtoToSessionSeries,
	protoToSessionSeriesWithDetails: mockProtoToSessionSeriesWithDetails,
}));

const {
	createSessionSeriesHandler,
	getSessionSeriesHandler,
	listSessionSeriesByCampaignHandler,
	updateSessionSeriesHandler,
	removeSessionSeriesHandler,
	excludeSessionFromSeriesHandler,
	removeSeriesExceptionHandler,
	addToGoogleCalendarHandler,
	removeFromGoogleCalendarHandler,
	createDiscordEventHandler,
	getDiscordEventHandler,
	getSeriesPollHandler,
	pollSeriesHandler,
} = await import("./session-series");

// ── Context factory ───────────────────────────────────────────────────────────

function makeApi() {
	return {
		sessionSeries: {
			addToGoogleCalendar: mock(async () => ({ series: mockSeriesProto })),
			createDiscordEvent: mock(async () => ({ series: mockSeriesProto })),
			createSessionSeries: mock(async () => ({ series: mockSeriesProto })),
			excludeSessionFromSeries: mock(async () => ({})),
			getDiscordEvent: mock(async () => ({ event: mockDiscordEventProto })),
			getSeriesPoll: mock(async () => ({ poll: mockPollProto })),
			getSessionSeries: mock(async () => ({ series: mockSeriesProto })),
			listSessionSeriesByCampaign: mock(async () => ({
				series: [mockSeriesProto],
			})),
			pollSeries: mock(async () => ({})),
			removeFromGoogleCalendar: mock(async () => ({ series: mockSeriesProto })),
			removeSeriesException: mock(async () => ({})),
			removeSessionSeries: mock(async () => ({})),
			updateSessionSeries: mock(async () => ({ series: mockSeriesProto })),
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

// ── createSessionSeriesHandler ────────────────────────────────────────────────

describe("createSessionSeriesHandler", () => {
	const baseInput = {
		campaignId: "campaign-1",
		durationMinutes: 240,
		seriesStartDate: futureDate,
		startTime: "18:00",
		timezone: "America/New_York",
		title: "Weekly Session",
	};

	beforeEach(() => {
		mockProtoToSessionSeries.mockClear();
		mockProtoToSessionSeries.mockImplementation(() => mockSeries);
	});

	test("throws FORBIDDEN when campaignId does not match context", async () => {
		const context = makeContext({ campaignId: "other-campaign" });
		expect(
			createSessionSeriesHandler({ context, input: baseInput } as never),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("throws BAD_REQUEST when seriesStartDate is in the past", async () => {
		const context = makeContext();
		expect(
			createSessionSeriesHandler({
				context,
				input: { ...baseInput, seriesStartDate: pastDate },
			} as never),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	test("throws BAD_REQUEST when seriesEndDate is in the past", async () => {
		const context = makeContext();
		expect(
			createSessionSeriesHandler({
				context,
				input: { ...baseInput, seriesEndDate: pastDate },
			} as never),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	test("throws BAD_REQUEST when seriesEndDate is before seriesStartDate", async () => {
		const context = makeContext();
		expect(
			createSessionSeriesHandler({
				context,
				input: {
					...baseInput,
					seriesEndDate: futureDate,
					seriesStartDate: farFutureDate,
				},
			} as never),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	test("returns the series on success", async () => {
		const context = makeContext();
		const result = await createSessionSeriesHandler({
			context,
			input: baseInput,
		} as never);
		expect(result).toEqual({ series: mockSeries });
	});

	test("throws INTERNAL_SERVER_ERROR when api returns no series", async () => {
		const context = makeContext();
		context.api.sessionSeries.createSessionSeries = mock(
			async () => ({}),
		) as never;
		expect(
			createSessionSeriesHandler({ context, input: baseInput } as never),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});

// ── getSessionSeriesHandler ───────────────────────────────────────────────────

describe("getSessionSeriesHandler", () => {
	const input = { id: "series-1" };

	beforeEach(() => {
		mockProtoToSessionSeries.mockClear();
		mockProtoToSessionSeries.mockImplementation(() => mockSeries);
	});

	test("returns the series on success", async () => {
		const context = makeContext();
		const result = await getSessionSeriesHandler({ context, input } as never);
		expect(result).toEqual({ series: mockSeries });
	});

	test("calls getSessionSeries with the input id and context campaignId", async () => {
		const context = makeContext();
		await getSessionSeriesHandler({ context, input } as never);
		expect(context.api.sessionSeries.getSessionSeries).toHaveBeenCalledWith({
			campaignId: "campaign-1",
			id: input.id,
		});
	});

	test("throws NOT_FOUND when api returns no series", async () => {
		const context = makeContext();
		context.api.sessionSeries.getSessionSeries = mock(
			async () => ({}),
		) as never;
		expect(
			getSessionSeriesHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
});

// ── listSessionSeriesByCampaignHandler ────────────────────────────────────────

describe("listSessionSeriesByCampaignHandler", () => {
	const input = { campaignId: "campaign-1" };

	beforeEach(() => {
		mockProtoToSessionSeriesWithDetails.mockClear();
		mockProtoToSessionSeriesWithDetails.mockImplementation(
			() => mockSeriesWithDetails,
		);
	});

	test("throws FORBIDDEN when campaignId does not match context", async () => {
		const context = makeContext({ campaignId: "other-campaign" });
		expect(
			listSessionSeriesByCampaignHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("returns mapped series on success", async () => {
		const context = makeContext();
		const result = await listSessionSeriesByCampaignHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({ series: [mockSeriesWithDetails] });
	});
});

// ── updateSessionSeriesHandler ────────────────────────────────────────────────

describe("updateSessionSeriesHandler", () => {
	const input = { id: "series-1", title: "Updated Session" };

	beforeEach(() => {
		mockProtoToSessionSeries.mockClear();
		mockProtoToSessionSeries.mockImplementation(() => mockSeries);
	});

	test("throws BAD_REQUEST when seriesEndDate is in the past", async () => {
		const context = makeContext();
		expect(
			updateSessionSeriesHandler({
				context,
				input: { ...input, seriesEndDate: pastDate },
			} as never),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	test("returns the updated series on success", async () => {
		const context = makeContext();
		const result = await updateSessionSeriesHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({ series: mockSeries });
	});

	test("throws INTERNAL_SERVER_ERROR when api returns no series", async () => {
		const context = makeContext();
		context.api.sessionSeries.updateSessionSeries = mock(
			async () => ({}),
		) as never;
		expect(
			updateSessionSeriesHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});

// ── removeSessionSeriesHandler ────────────────────────────────────────────────

describe("removeSessionSeriesHandler", () => {
	const input = { id: "series-1" };

	test("returns empty object on success", async () => {
		const context = makeContext();
		const result = await removeSessionSeriesHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({});
	});

	test("calls removeSessionSeries with id, campaignId, and userId", async () => {
		const context = makeContext();
		await removeSessionSeriesHandler({ context, input } as never);
		expect(
			context.api.sessionSeries.removeSessionSeries,
		).toHaveBeenCalledWith({
			campaignId: "campaign-1",
			id: input.id,
			userId: "user-1",
		});
	});
});

// ── excludeSessionFromSeriesHandler ──────────────────────────────────────────

describe("excludeSessionFromSeriesHandler", () => {
	const input = { excludedDate: new Date("2025-07-01"), seriesId: "series-1" };

	test("returns empty object on success", async () => {
		const context = makeContext();
		const result = await excludeSessionFromSeriesHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({});
	});

	test("calls excludeSessionFromSeries with seriesId and campaignId", async () => {
		const context = makeContext();
		await excludeSessionFromSeriesHandler({ context, input } as never);
		expect(
			context.api.sessionSeries.excludeSessionFromSeries,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				campaignId: "campaign-1",
				seriesId: input.seriesId,
			}),
		);
	});
});

// ── removeSeriesExceptionHandler ──────────────────────────────────────────────

describe("removeSeriesExceptionHandler", () => {
	const input = { excludedDate: new Date("2025-07-01"), seriesId: "series-1" };

	test("returns empty object on success", async () => {
		const context = makeContext();
		const result = await removeSeriesExceptionHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({});
	});
});

// ── addToGoogleCalendarHandler ────────────────────────────────────────────────

describe("addToGoogleCalendarHandler", () => {
	const input = { seriesId: "series-1" };

	beforeEach(() => {
		mockProtoToSessionSeries.mockClear();
		mockProtoToSessionSeries.mockImplementation(() => mockSeries);
	});

	test("returns the series on success", async () => {
		const context = makeContext();
		const result = await addToGoogleCalendarHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({ series: mockSeries });
	});

	test("throws INTERNAL_SERVER_ERROR when api returns no series", async () => {
		const context = makeContext();
		context.api.sessionSeries.addToGoogleCalendar = mock(
			async () => ({}),
		) as never;
		expect(
			addToGoogleCalendarHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});

// ── removeFromGoogleCalendarHandler ──────────────────────────────────────────

describe("removeFromGoogleCalendarHandler", () => {
	const input = { seriesId: "series-1" };

	beforeEach(() => {
		mockProtoToSessionSeries.mockClear();
		mockProtoToSessionSeries.mockImplementation(() => mockSeries);
	});

	test("returns the series on success", async () => {
		const context = makeContext();
		const result = await removeFromGoogleCalendarHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({ series: mockSeries });
	});

	test("throws INTERNAL_SERVER_ERROR when api returns no series", async () => {
		const context = makeContext();
		context.api.sessionSeries.removeFromGoogleCalendar = mock(
			async () => ({}),
		) as never;
		expect(
			removeFromGoogleCalendarHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});

// ── createDiscordEventHandler ─────────────────────────────────────────────────

describe("createDiscordEventHandler", () => {
	const input = { seriesId: "series-1" };

	beforeEach(() => {
		mockProtoToSessionSeries.mockClear();
		mockProtoToSessionSeries.mockImplementation(() => mockSeries);
	});

	test("returns the series on success", async () => {
		const context = makeContext();
		const result = await createDiscordEventHandler({
			context,
			input,
		} as never);
		expect(result).toEqual({ series: mockSeries });
	});

	test("throws INTERNAL_SERVER_ERROR when api returns no series", async () => {
		const context = makeContext();
		context.api.sessionSeries.createDiscordEvent = mock(
			async () => ({}),
		) as never;
		expect(
			createDiscordEventHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});
});

// ── getDiscordEventHandler ────────────────────────────────────────────────────

describe("getDiscordEventHandler", () => {
	const input = { discordEventId: "discord-event-1", seriesId: "series-1" };

	beforeEach(() => {
		mockProtoToDiscordEventInfo.mockClear();
		mockProtoToDiscordEventInfo.mockImplementation(() => mockDiscordEvent);
	});

	test("returns the event on success", async () => {
		const context = makeContext();
		const result = await getDiscordEventHandler({ context, input } as never);
		expect(result).toEqual({ event: mockDiscordEvent });
	});

	test("throws NOT_FOUND when api returns no event", async () => {
		const context = makeContext();
		context.api.sessionSeries.getDiscordEvent = mock(
			async () => ({}),
		) as never;
		expect(
			getDiscordEventHandler({ context, input } as never),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
});

// ── getSeriesPollHandler ──────────────────────────────────────────────────────

describe("getSeriesPollHandler", () => {
	const input = { seriesId: "series-1" };

	beforeEach(() => {
		mockProtoToPoll.mockClear();
		mockProtoToPoll.mockImplementation(() => mockPoll);
	});

	test("returns the poll on success", async () => {
		const context = makeContext();
		const result = await getSeriesPollHandler({ context, input } as never);
		expect(result).toEqual({ poll: mockPoll });
	});

	test("returns null poll when api returns no poll", async () => {
		const context = makeContext();
		context.api.sessionSeries.getSeriesPoll = mock(
			async () => ({ poll: undefined }),
		) as never;
		const result = await getSeriesPollHandler({ context, input } as never);
		expect(result).toEqual({ poll: null });
	});
});

// ── pollSeriesHandler ─────────────────────────────────────────────────────────

describe("pollSeriesHandler", () => {
	const input = {
		options: [new Date("2025-07-01"), new Date("2025-07-08")],
		seriesId: "series-1",
	};

	test("returns empty object on success", async () => {
		const context = makeContext();
		const result = await pollSeriesHandler({ context, input } as never);
		expect(result).toEqual({});
	});

	test("calls pollSeries with seriesId and campaignId", async () => {
		const context = makeContext();
		await pollSeriesHandler({ context, input } as never);
		expect(context.api.sessionSeries.pollSeries).toHaveBeenCalledWith(
			expect.objectContaining({
				campaignId: "campaign-1",
				seriesId: input.seriesId,
			}),
		);
	});
});
