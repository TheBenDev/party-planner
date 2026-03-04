import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import CampaignShell from "@/components/campaign-shell";
import { Button } from "@/components/ui/button";
import { client } from "@/lib/client";

export const Route = createFileRoute("/campaign")({
	component: CampaignPage,
});

function CampaignPage() {
	const { mutate: sendMessage } = useMutation({
		mutationFn: () =>
			client.discord.sendMessage({
				channelId: "1458533761422462999",
				message: "testing to see if i can send message to channel as beny bot",
			}),
		onError: (error) => {
			toast.error("message not sent", {
				description: error.message,
			});
		},
		onSuccess: () => {
			toast.success("message sent");
		},
	});

	return (
		<CampaignShell>
			<Button onClick={() => sendMessage()}>click</Button>
		</CampaignShell>
	);
}
