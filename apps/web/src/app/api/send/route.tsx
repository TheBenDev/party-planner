import { Resend } from "resend";
import { DndInviteEmail } from "@/components/email-invite-template";
import { serverConfig } from "@/lib/serverConfig";

const resend = new Resend(serverConfig.RESEND_API_KEY);

export async function POST() {
	try {
		const { data, error } = await resend.emails.send({
			from: "Acme <onboarding@resend.dev>",
			to: ["psychological_chemist@hotmail.com"],
			subject: "Hello world",
			react: (
				<DndInviteEmail
					campaignName="example game"
					dmName="benyboy"
					acceptLink="https://example.com"
				/>
			),
		});
		if (error) {
			return Response.json({ error }, { status: 500 });
		}
		return Response.json({ data });
	} catch (error) {
		return Response.json({ error }, { status: 500 });
	}
}
