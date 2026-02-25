import { GetNpcResponseSchema } from "@planner/schemas/discord";
import axios from "axios";
import {
	type ChatInputCommandInteraction,
	EmbedBuilder,
	LabelBuilder,
	ModalBuilder,
	type ModalSubmitInteraction,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { config } from "../lib/config";
import { headers } from "../lib/constants";
import { extractErrorDetails } from "../lib/errorHandler";
import logger from "../lib/logger";
import { CommandsEnum } from "./types";

async function actionSet(interaction: ChatInputCommandInteraction) {
	if (!interaction.memberPermissions?.has("Administrator")) {
		await interaction.reply({
			content: "❌ You need Administrator permissions to use this command.",
			flags: ["Ephemeral"],
		});
		return;
	}

	const setNpcModal = new ModalBuilder()
		.setCustomId("npc:set")
		.setTitle("Update the bio of the npc");

	const npcNameInput = new TextInputBuilder()
		.setCustomId("npcName")
		.setStyle(TextInputStyle.Short)
		.setPlaceholder("The name of the npc")
		.setRequired(true);
	const npcBioInput = new TextInputBuilder()
		.setCustomId("npcBio")
		.setStyle(TextInputStyle.Paragraph)
		.setPlaceholder("Update the bio of the npc")
		.setRequired(true);

	const npcLabel = new LabelBuilder()
		.setLabel("Name of the npc")
		.setTextInputComponent(npcNameInput);
	const bioLabel = new LabelBuilder()
		.setLabel("Updated bio of the npc")
		.setTextInputComponent(npcBioInput);

	setNpcModal.addLabelComponents(npcLabel, bioLabel);

	await interaction.showModal(setNpcModal);
}

async function modalSetOnSubmit(interaction: ModalSubmitInteraction) {
	logger.info({ operation: "beny-bot.npc-set" }, "Updating an npc's bio");

	const serverId = interaction.guildId;
	if (!serverId) {
		await interaction.reply({
			content:
				"This command needs to be used inside of a discord server to work.",
			flags: ["Ephemeral"],
		});
		return;
	}

	const name = interaction.fields.getTextInputValue("npcName");
	const bio = interaction.fields.getTextInputValue("npcBio");

	if (!(name && bio)) {
		await interaction.reply({
			content: "Input required to update bio.",
			flags: ["Ephemeral"],
		});
		return;
	}
	await interaction.deferReply();
	try {
		await axios.post(
			`${config.APP_URL}/api/discord/setAvailability`,
			{
				npc: {
					bio,
					name,
				},
				serverId,
			},
			{ headers },
		);

		await interaction.editReply({
			content: "Npc bio updated successfully.",
		});
	} catch (error) {
		const details = extractErrorDetails({
			error,
			operation: "beny-bot.npc-set",
		});
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

async function actionView(interaction: ChatInputCommandInteraction) {
	logger.info({ operation: "beny-bot.npc-view" }, "Fetching npc.");
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
		const details = extractErrorDetails({
			error,
			operation: "beny-bot.npc-view",
		});
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

export const npcSubcommands = [
	{
		action: actionSet,
		description: "Update the bio of the npc",
		modal: { id: "npc:set", onSubmit: modalSetOnSubmit },
		name: "set",
	},
	{
		action: actionView,
		description: "View a specific npc in your game",
		name: "view",
		options: [
			{
				description: "The name of the npc you'd like to see",
				isRequired: true,
				name: "name",
			},
		],
	},
];

export const npcCommand = {
	command: CommandsEnum.NPC,
	description: "Manage your D&D npcs",
	subcommands: npcSubcommands,
};
