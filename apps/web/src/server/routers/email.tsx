import { ORPCError } from "@orpc/server";
import { InviteToCampaignRequest } from "@planner/schemas/email";
import { DndInviteEmail } from "@/components/email-invite-template";
import { env } from "@/env";
import { handleError } from "../errors";
import { dmProcedure } from "../orpc";

const inviteToCampaign = dmProcedure
	.route({
		method: "POST",
		path: "/email/invite",
		summary: "Invite a user to a campaign via email",
	})
	.input(InviteToCampaignRequest)
	.handler(async ({ input, context }) => {
		const { campaignId, campaignName, dmName, from, to } = input;

		if (campaignId !== context.campaignId) {
			throw new ORPCError("FORBIDDEN", { message: "campaign id mismatch" });
		}
		const resend = context.resend;

		try {
			const { data, error } = await resend.emails.send({
				from,
				react: (
					<DndInviteEmail
						acceptLink={`${env.VITE_APP_URL}/accept?id=${campaignId}`}
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
		} catch (err) {
			handleError(
				err,
				"Failed to send invitation",
				{ campaignId },
				context.logger,
			);
		}
	});

export const emailRouter = {
	inviteToCampaign,
};
