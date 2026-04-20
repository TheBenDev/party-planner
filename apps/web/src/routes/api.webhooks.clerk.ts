import {
	verifyWebhook,
	type WebhookEvent,
} from "@clerk/tanstack-react-start/webhooks";
import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/env";
import { createApiClients } from "@/lib/api";

// TODO: migrate webhooks to api
export const Route = createFileRoute("/api/webhooks/clerk")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				let evt: WebhookEvent;
				try {
					evt = await verifyWebhook(request, {
						signingSecret: env.CLERK_WEBHOOK_SIGNING_SECRET,
					});
				} catch (error) {
					// biome-ignore lint/suspicious/noConsole: This is ok for now
					console.error(error);
					return new Response("Invalid signature", { status: 400 });
				}
				switch (evt.type) {
					case "user.created": {
						if (evt.data.email_addresses.length === 0) {
							return new Response("No email address found", { status: 400 });
						}
						const user = {
							avatar: evt.data.image_url,
							email: evt.data.email_addresses[0].email_address,
							externalId: evt.data.id,
							firstName: evt.data.first_name ?? undefined,
							lastName: evt.data.last_name ?? undefined,
						};
						try {
							const api = createApiClients();
							await api.user.createUser(user);
							return Response.json({ received: true });
						} catch (error) {
							// biome-ignore lint/suspicious/noConsole: This is ok for now
							console.error(error);
							return new Response("Failed to create user", { status: 500 });
						}
					}
					case "user.updated": {
						if (!evt.data.id) {
							return new Response("No clerk id found updating user", {
								status: 400,
							});
						}
						try {
							const api = createApiClients();
							await api.user.updateUser({
								avatar: evt.data.image_url,
								externalId: evt.data.id,
								firstName: evt.data.first_name ?? undefined,
								lastName: evt.data.last_name ?? undefined,
							});
							return Response.json({ received: true });
						} catch (error) {
							// biome-ignore lint/suspicious/noConsole: This is ok for now
							console.error(error);
							return new Response("Failed to update user", { status: 500 });
						}
					}
					case "user.deleted": {
						if (!evt.data.id) {
							return new Response("No clerk id found deleting user", {
								status: 400,
							});
						}
						try {
							const api = createApiClients();
							await api.user.deleteUser({ externalId: evt.data.id });
							return Response.json({ received: true });
						} catch (error) {
							// biome-ignore lint/suspicious/noConsole: This is ok for now
							console.error(error);
							return new Response("Failed to delete user", { status: 500 });
						}
					}
					default:
						return new Response("Event not implemented", { status: 501 });
				}
			},
		},
	},
});
