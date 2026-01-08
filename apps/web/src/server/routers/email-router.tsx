import { InviteToCampaignRequest } from "@planner/schemas/email";
import { HTTPException } from "hono/http-exception";
import { DndInviteEmail } from "@/components/email-invite-template";
import { serverConfig } from "@/lib/serverConfig";
import { j, privateProcedure } from "../jsandy";
export const emailRouter = j.router({
	inviteToCampaign: privateProcedure
		.input(InviteToCampaignRequest)
		.post(async ({ c, input }) => {
			const { campaignId, campaignName, dmName, from, to } = input;
			const resend = c.get("resend");
			try {
				const { data, error } = await resend.emails.send({
					from,
					react: (
						<DndInviteEmail
							acceptLink={`${serverConfig.NEXT_PUBLIC_APP_URL}/accept?id=${campaignId}`}
							campaignName={campaignName}
							dmName={dmName}
						/>
					),
					subject: "Invitation to Dungeons and Dragons Campaign",
					to: [to],
				});
				if (error) {
					throw new HTTPException(500, { message: "Failed to invite" });
				}
				return c.json(data.id);
			} catch {
				throw new HTTPException(500, { message: "Failed to invite" });
			}
		}),
});
