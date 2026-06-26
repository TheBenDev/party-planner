import { useMutation } from "@tanstack/react-query";
import { client } from "@/shared/lib/client";
import type { CreateCampaignIntegrationRequest } from "../types";

export function useCampaignIntegrationData() {
	const createCampaignIntegration = useMutation({
		mutationFn: (input: CreateCampaignIntegrationRequest) =>
			client.campaignIntegration.createCampaignIntegration(input),
	});

	return { createCampaignIntegration };
}
