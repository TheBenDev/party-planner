import axios from "axios";
import type { ChatInputCommandInteraction } from "discord.js";
import { config } from "../lib/config";
import { headers } from "../lib/constants";
import { extractErrorDetails } from "../lib/errorHandler";
import logger from "../lib/logger";
import { CommandsEnum } from "./types";

async function action(interaction: ChatInputCommandInteraction) {
	const serverId = interaction.guildId;
	logger.info(
		{ operation: "beny-bot.nextSession" },
		"Checking for next D&D session",
	);
	if (!serverId) {
		await interaction.reply({
			content:
				"This command needs to be used inside of a discord server to work.",
			flags: ["Ephemeral"],
		});
		return;
	}
	try {
		const response = await axios.get(
			`${config.APP_URL}/api/discord/checkNextSession`,
			{
				headers,
				params: {
					serverId,
				},
			},
		);
		await interaction.reply({
			content: response.data.message,
			flags: ["Ephemeral"],
		});
	} catch (error) {
		extractErrorDetails({ error, operation: "beny-bot.nextSession" });
		await interaction.reply({
			content: "Failed to fetch session information. Please try again later.",
			flags: ["Ephemeral"],
		});
	}
}

export const nextSessionCommand = {
	action,
	command: CommandsEnum.NEXTSESSION,
	description: "Shows you when your next session is scheduled",
};
