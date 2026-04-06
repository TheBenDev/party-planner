import { z } from "zod";

export const InviteToCampaignRequest = z.object({
	campaignId: z.uuid(),
	campaignName: z.string(),
	dmName: z.string(),
	from: z.string(),
	to: z.string(),
});
