import { SendMessageRequestSchema } from "@planner/schemas/discord";
import { discordProcedure, j } from "../jsandy";
import { Routes } from "discord-api-types/v10"
import { HTTPException } from "hono/http-exception";
export const discordRouter = j.router({
	sendMessage: discordProcedure
		.input(SendMessageRequestSchema)
		.mutation(async ({ c, input }) => {
			const { channelId, message } = input;
      const discord = c.get("discord");
      try {
        await discord.post(Routes.channelMessages(channelId), {
          body: {
            content: message
          }
        })
      } catch (error) {
        console.error(error)
        throw new HTTPException(500, { message: "Failed to send message to discord channel"})
      }
		}),
});
