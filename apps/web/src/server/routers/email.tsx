import { ORPCError } from "@orpc/server";
import { InviteToCampaignRequest } from "@planner/schemas/email";
import { DndInviteEmail } from "@/components/email-invite-template";
import { env } from "@/env";
import { privateProcedure } from "../orpc";

const inviteToCampaign = privateProcedure
	.route({
		method: "POST",
		path: "/email/invite",
		summary: "Invite a user to a campaign via email",
	})
	.input(InviteToCampaignRequest)
	.handler(async ({ input, context }) => {
		const { campaignId, campaignName, dmName, from, to } = input;
		const resend = context.resend;

		try {
			const { data, error } = await resend.emails.send({
				from,
				react: (
					<DndInviteEmail
						acceptLink={`${env.NEXT_PUBLIC_APP_URL}/accept?id=${campaignId}`}
						campaignName={campaignName}
						dmName={dmName}
					/>
				),
				subject: "Invitation to Dungeons and Dragons Campaign",
				to: [to],
			});

			if (error) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Failed to invite",
				});
			}

			return { id: data.id };
		} catch {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to invite",
			});
		}
	});

export const emailRouter = {
	inviteToCampaign,
};
