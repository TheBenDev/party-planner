"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { client } from "@/lib/client";

export default function CampaignPage() {
	const { mutate: sendMessage } = useMutation({
		mutationFn: async () => {
			await client.discord.sendMessage.$post({
				channelId: "1458533761422462999",
				message: "testing to see if i can send message to channel as beny bot",
			});
		},
		onError: () => {
			toast.error("message not sent");
		},
		onSuccess: () => {
			toast.success("message sent");
		},
	});

	function handleSendMessage() {
		sendMessage();
	}

	return (
		<div>
			<Button onClick={handleSendMessage}>click</Button>
		</div>
	);
}
