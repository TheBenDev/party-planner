import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { env } from "@/shared/lib/env";
import { CampaignIntegrationService } from "@/gen/proto/planner/v1/campaign_integration_pb";
import { CampaignService } from "@/gen/proto/planner/v1/campaign_pb";
import { LocationService } from "@/gen/proto/planner/v1/locations_pb";
import { MemberService } from "@/gen/proto/planner/v1/member_pb";
import { NonPlayerCharacterService } from "@/gen/proto/planner/v1/non_player_character_pb";
import { QuestService } from "@/gen/proto/planner/v1/quest_pb";
import { SessionService } from "@/gen/proto/planner/v1/session_pb";
import { SessionSeriesService } from "@/gen/proto/planner/v1/session_series_pb";
import { UserIntegrationService } from "@/gen/proto/planner/v1/user_integration_pb";
import { UserService } from "@/gen/proto/planner/v1/user_pb";

const API_BASE_URL = env.VITE_API_URL || "http://localhost:8000";

export function createApiTransport(accessToken?: string) {
	return createConnectTransport({
		baseUrl: API_BASE_URL,
		interceptors: [
			(next) => async (req) => {
				req.header.set("X-Internal-Api-Key", env.INTERNAL_API_KEY);
				// attach access token if present
				if (accessToken) {
					req.header.set("Authorization", `Bearer ${accessToken}`);
				}
				return await next(req);
			},
		],
		useBinaryFormat: false,
	});
}

export function createApiClients(accessToken?: string) {
	const transport = createApiTransport(accessToken);
	return {
		campaign: createClient(CampaignService, transport),
		campaignIntegration: createClient(CampaignIntegrationService, transport),
		location: createClient(LocationService, transport),
		member: createClient(MemberService, transport),
		npc: createClient(NonPlayerCharacterService, transport),
		quest: createClient(QuestService, transport),
		session: createClient(SessionService, transport),
		sessionSeries: createClient(SessionSeriesService, transport),
		user: createClient(UserService, transport),
		userIntegration: createClient(UserIntegrationService, transport),
	};
}
