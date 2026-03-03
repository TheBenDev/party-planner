import type { WebhookEvent } from "@clerk/nextjs/server";
import { CreateUserRequestSchema } from "@planner/schemas/user";
import { HTTPException } from "hono/http-exception";
import { Webhook } from "svix";
import { z } from "zod";
import { client } from "@/lib/client";
import { serverConfig } from "@/lib/serverConfig";
import { publicProcedure } from "../orpc";

const webhookSecret: string = serverConfig.CLERK_WEBHOOK_SECRET;

const handleWebhook = publicProcedure
	.route({
		method: "POST",
		path: "/clerk",
		summary: "Handle Clerk webhooks",
	})
	.input(z.unknown())
	.handler(async ({ input, context }) => {
		const payload = input as object;
		const payloadString = JSON.stringify(payload);

		const svixId = context.headers.get("svix-id");
		const svixTimestamp = context.headers.get("svix-timestamp");
		const svixSignature = context.headers.get("svix-signature");

		if (!(svixId && svixTimestamp && svixSignature)) {
			throw new HTTPException(400, {
				message: "Error occured -- no svix headers",
			});
		}

		const wh = new Webhook(webhookSecret);

		let evt: WebhookEvent;
		try {
			evt = wh.verify(payloadString, {
				"svix-id": svixId,
				"svix-signature": svixSignature,
				"svix-timestamp": svixTimestamp,
			}) as WebhookEvent;
		} catch (_) {
			throw new HTTPException(400, { message: "Error occured" });
		}

		switch (evt.type) {
			case "user.created": {
				const user = CreateUserRequestSchema.parse({
					avatar: evt.data.image_url,
					email: evt.data.email_addresses[0].email_address,
					externalId: evt.data.id,
					firstName: evt.data.first_name,
					lastName: evt.data.last_name,
				});
				try {
					await client.user.createUser(user);
					return;
				} catch (error) {
					throw new HTTPException(500, {
						cause: error,
						message: "Failed to create user",
					});
				}
			}
			default:
				throw new HTTPException(501, {
					message: "Webhook Event Not Implemented",
				});
		}
	});

export const clerkRouter = {
	handleWebhook,
};
