import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { env } from "@/env";
import { CampaignService } from "@/gen/proto/planner/v1/campaign_pb";
import { UserService } from "@/gen/proto/planner/v1/user_pb";

const API_BASE_URL = env.VITE_API_URL || "http://localhost:8000";

export function createApiTransport(accessToken?: string) {
	return createConnectTransport({
		baseUrl: API_BASE_URL,
		interceptors: accessToken
			? [
					(next) => async (req) => {
						req.header.set("Authorization", `Bearer ${accessToken}`);
						return await next(req);
					},
				]
			: [],
		useBinaryFormat: false,
	});
}

export function createApiClients(accessToken?: string) {
	const transport = createApiTransport(accessToken);
	return {
		campaign: createClient(CampaignService, transport),
		user: createClient(UserService, transport),
	};
}
