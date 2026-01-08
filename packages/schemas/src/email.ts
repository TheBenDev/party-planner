import { z } from "zod";

export const InviteToCampaignRequest = z.object({
	from: z.string(),
	to: z.string(),
	dmName: z.string(),
	campaignName: z.string(),
	campaignId: z.uuid(),
});
