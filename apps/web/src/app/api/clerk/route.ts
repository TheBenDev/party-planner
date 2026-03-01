import type { WebhookEvent } from "@clerk/nextjs/server";
import { CreateUserRequestSchema } from "@planner/schemas/user";
import { HTTPException } from "hono/http-exception";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { client } from "@/lib/client";
import { serverConfig } from "@/lib/serverConfig";

const webhookSecret: string = serverConfig.CLERK_WEBHOOK_SECRET;

export async function POST(req: Request) {
	const payload = (await req.json()) as object;
	const payloadString = JSON.stringify(payload);

	const headerPayload = headers();
	const svixId = (await headerPayload).get("svix-id");
	const svixIdTimeStamp = (await headerPayload).get("svix-timestamp");
	const svixSignature = (await headerPayload).get("svix-signature");

	if (!(svixId && svixIdTimeStamp && svixSignature)) {
		throw new HTTPException(400, {
			message: "Error occured -- no svix headers",
		});
	}

	// Create an object of the headers
	const svixHeaders = {
		"svix-id": svixId,
		"svix-signature": svixSignature,
		"svix-timestamp": svixIdTimeStamp,
	};

	// Create a new Webhook instance with your webhook secret
	const wh = new Webhook(webhookSecret);

	let evt: WebhookEvent;
	try {
		// Verify the webhook payload and headers
		evt = wh.verify(payloadString, svixHeaders) as WebhookEvent;
	} catch (_) {
		return new Response("Error occured", {
			status: 400,
		});
	}
	const { id } = evt.data;
	const eventType = evt.type;

	// Handle the webhook
	switch (eventType) {
		case "user.created": {
			const user = CreateUserRequestSchema.parse({
				avatar: evt.data.image_url,
				email: evt.data.email_addresses[0].email_address,
				externalId: id,
				firstName: evt.data.first_name,
				lastName: evt.data.last_name,
			});
			try {
				await client.user.createUser.$post(user);
				return new Response("User Created", { status: 200 });
			} catch (e) {
				throw new HTTPException(500, {
					cause: e,
					message: "Failed to create ueser",
				});
			}
		}
		default:
			new HTTPException(501, { message: "Webhook Event Not Implemented" });
	}
	return;
}
