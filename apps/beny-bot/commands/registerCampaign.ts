import axios from "axios";
import {
	type ChatInputCommandInteraction,
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

async function action(interaction: ChatInputCommandInteraction) {
	if (!interaction.memberPermissions?.has("Administrator")) {
		await interaction.reply({
			content: "❌ You need Administrator permissions to use this command.",
			flags: ["Ephemeral"],
		});
		return;
	}
	const registerCampaignModal = new ModalBuilder()
		.setCustomId("registerCampaignModal")
		.setTitle("Register D&D Campaign to server");

	const campaignIdInput = new TextInputBuilder()
		.setCustomId("campaignId")
		.setStyle(TextInputStyle.Short)
		.setRequired(true)
		.setMaxLength(36)
		.setMinLength(36)
		.setPlaceholder("The application id of your campaign");
	const idLabel = new LabelBuilder()
		.setLabel("Campaign Id")
		.setTextInputComponent(campaignIdInput);

	registerCampaignModal.addLabelComponents(idLabel);

	// Show the modal to the user
	await interaction.showModal(registerCampaignModal);
}

async function modalOnSubmit(interaction: ModalSubmitInteraction) {
	logger.info(
		{ operation: "beny-bot.register" },
		"Registering dnd campaign to discord server.",
	);
	const serverId = interaction.guildId;
	const channelId = interaction.channelId;
	if (!serverId) {
		await interaction.reply({
			content:
				"This command needs to be used inside of a discord server to work.",
			flags: ["Ephemeral"],
		});
		return;
	}
	const campaignId = interaction.fields.getTextInputValue("campaignId");
	try {
		await axios.post(
			`${config.APP_URL}/api/discord/registerCampaign`,
			{
				campaignId,
				channelId,
				serverId,
			},
			{ headers },
		);

		await interaction.reply(
			"Your campaign has been successfully integrated with your discord server.",
		);
	} catch (error) {
		const details = extractErrorDetails({
			error,
			operation: "beny-bot.registerCampaign",
		});
		switch (details.status) {
			case 404: {
				await interaction.reply({
					content: "I could not find the campaign you were trying to integrate",
					flags: ["Ephemeral"],
				});
				break;
			}
			case 409: {
				await interaction.reply({
					content:
						"This discord channel is already integrated with a campaign.",
					flags: ["Ephemeral"],
				});
				break;
			}
			default: {
				await interaction.reply({
					content:
						"Failed to register campaign to discord server. Please try again later.",
					flags: ["Ephemeral"],
				});
			}
		}
	}
}

export const registerCampaignCommand = {
	action,
	command: CommandsEnum.REGISTERCAMPAIGN,
	description: "Allows you to register a discord server to a D&D campaign.",
	modal: {
		id: "registerCampaignModal",
		onSubmit: modalOnSubmit,
	},
};
