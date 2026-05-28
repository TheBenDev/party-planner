export const queryKeys = {
	auth: {
		campaign: () => ["auth", "campaign"] as const,
		user: () => ["auth", "user"] as const,
	},
	integrations: {
		bySource: (campaignId: string, source: string) =>
			["integrations", campaignId, source] as const,
		list: (campaignId: string) => ["integrations", campaignId] as const,
	},
	invitations: {
		detail: (token: string) => ["invitation", token] as const,
		list: () => ["invitation"] as const,
	},
	locations: {
		detail: (locationId: string) => ["location", locationId] as const,
		list: (campaignId: string) => ["locations", campaignId] as const,
	},
	members: {
		list: (campaignId: string) => ["members", campaignId] as const,
	},
	npcs: {
		detail: (npcId: string) => ["npc", npcId] as const,
		list: (campaignId: string) => ["npcs", campaignId] as const,
	},
	quests: {
		detail: (questId: string) => ["quest", questId] as const,
		list: (campaignId: string) => ["quests", campaignId] as const,
	},
	sessions: {
		detail: (sessionId: string) => ["session", sessionId] as const,
		list: (campaignId: string) => ["sessions", campaignId] as const,
		poll: (sessionId: string) => ["session-poll", sessionId] as const,
	},
} as const;
