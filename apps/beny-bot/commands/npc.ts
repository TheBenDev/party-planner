import { GetNpcResponseSchema } from "@planner/schemas/discord";
import axios from "axios";
import { type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { config } from "../lib/config";
import { headers } from "../lib/constants";
import { extractErrorDetails } from "../lib/errorHandler";
import logger from "../lib/logger";
import { CommandsEnum } from "./types";

async function action(interaction: ChatInputCommandInteraction) {
	logger.info({ operation: "beny-bot.npc" }, "Fetching npc.");
	const serverId = interaction.guildId;
	if (!serverId) {
		await interaction.reply({
			content:
				"This command needs to be used inside of a discord server to work.",
			flags: ["Ephemeral"],
		});
		return;
	}
	await interaction.deferReply();
	const npcName = interaction.options.get("name")?.value;

	try {
		const response = await axios.get(`${config.APP_URL}/api/discord/getNpc`, {
			headers,
			params: {
				npcName,
				serverId,
			},
		});
		const npc = GetNpcResponseSchema.parse(response.data).npc;
		const npcEmbed = new EmbedBuilder()
			.setColor("#0099ff")
			.setTitle(npc.firstName)
			.setDescription(`Character: ${npc.firstName} ${npc.lastName ?? ""}`)
			.setThumbnail(npc.avatar || null)
			.setTimestamp();
		await interaction.editReply({ embeds: [npcEmbed] });
	} catch (error) {
		const details = extractErrorDetails({ error, operation: "beny-bot.npc" });
		if (details.status === 404) {
			await interaction.editReply({
				content: "I could not find that npc.",
			});
			return;
		}
		await interaction.editReply({
			content: "Something went wrong. Please try again later.",
		});
	}
}

export const npcCommand = {
	action,
	command: CommandsEnum.NPC,
	description: "Shows you information on an npc.",
	options: [
		{ description: "The Name of the NPC", isRequired: true, name: "name" },
	],
};
