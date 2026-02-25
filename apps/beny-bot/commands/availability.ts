import { GetAvailabilitiesResponseSchema } from "@planner/schemas/discord";
import axios from "axios";
import {
	type ChatInputCommandInteraction,
	LabelBuilder,
	ModalBuilder,
	type ModalSubmitInteraction,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { config } from "../lib/config";
import { headers } from "../lib/constants";
import { extractErrorDetails } from "../lib/errorHandler";
import logger from "../lib/logger";
import {
	formatTime,
	getDayName,
	getDayNumber,
	mapStringInputToTime,
} from "../lib/utils";
import { CommandsEnum } from "./types";

async function actionRemove(interaction: ChatInputCommandInteraction) {
	logger.info(
		{ operation: "beny-bot.availability-remove" },
		`Removing an availability timeslot for ${interaction.user.globalName}`,
	);
	const userId = interaction.user.id;
	const dayOfWeek = interaction.options.get("day")?.value;
	const startTime = interaction.options.get("time")?.value;

	if (!(dayOfWeek && startTime)) {
		await interaction.reply({
			content: "I could not parse the day and time given.",
			flags: ["Ephemeral"],
		});
		return;
	}
	const normalizedDay = getDayNumber(dayOfWeek.toString().toLowerCase().trim());
	const normalizedtime = mapStringInputToTime(startTime.toString());
	if (normalizedDay === -1) {
		await interaction.reply({
			content: "I could not read the day you gave me.",
			flags: ["Ephemeral"],
		});
		return;
	}
	if (normalizedtime === null) {
		await interaction.reply({
			content: "I could not read the time you gave me.",
			flags: ["Ephemeral"],
		});
		return;
	}

	try {
		await axios.post(
			`${config.APP_URL}/api/discord/removeAvailability`,
			{
				dayOfWeek: normalizedDay,
				startTime: normalizedtime,
				userExternalId: userId,
			},
			{ headers },
		);

		await interaction.reply({
			content: "Successfully removed availability timeslot.",
			flags: ["Ephemeral"],
		});
	} catch (error) {
		extractErrorDetails({ error, operation: "beny-bot.availability-remove" });
		await interaction.reply({
			content:
				"Something went wrong when trying to remove your availability timeslot. Please try again later or reach out for help.",
			flags: ["Ephemeral"],
		});
	}
}

async function actionClear(interaction: ChatInputCommandInteraction) {
	logger.info(
		{ operation: "beny-bot.availability-clear" },
		`Clearing availability timeslots for ${interaction.user.globalName}`,
	);

	const userId = interaction.user.id;
	try {
		await axios.post(
			`${config.APP_URL}/api/discord/clearAvailability`,
			{
				userExternalId: userId,
			},
			{ headers },
		);

		await interaction.reply({
			content: "Successfully removed all of your availability timeslots.",
			flags: ["Ephemeral"],
		});
	} catch (error) {
		extractErrorDetails({ error, operation: "beny-bot.availability-clear" });
		await interaction.reply({
			content:
				"Something went wrong when trying to remove all of your availability timeslots. Please try again later or reach out for help.",
			flags: ["Ephemeral"],
		});
	}
}

async function actionView(interaction: ChatInputCommandInteraction) {
	logger.info(
		{ operation: "beny-bot.availability-view" },
		`Viewing availabilities for discord user: ${interaction.user.globalName}`,
	);
	const userId = interaction.user.id;
	try {
		const res = await axios.get(
			`${config.APP_URL}/api/discord/getAvailabilities`,
			{
				headers,
				params: { userExternalId: userId },
			},
		);

		const { userAvailabilities } = GetAvailabilitiesResponseSchema.parse(
			res.data,
		);

		if (!userAvailabilities || userAvailabilities.length === 0) {
			await interaction.reply({
				content: "❌ You haven't set any availability yet.",
				ephemeral: true,
			});
			return;
		}

		// sort by day, then time
		const sortedAvailabilities = userAvailabilities.sort((a, b) => {
			if (a.dayOfWeek !== b.dayOfWeek) {
				return a.dayOfWeek - b.dayOfWeek;
			}
			return a.startTime.localeCompare(b.startTime);
		});

		// Format availabilities
		const formattedAvailabilities = sortedAvailabilities
			.map((slot) => {
				const day = getDayName(slot.dayOfWeek);
				const startTime = formatTime(slot.startTime);
				const endTime = formatTime(slot.endTime);
				return `• **${day}**: ${startTime} - ${endTime}`;
			})
			.join("\n");

		await interaction.reply({
			content: `📅 **Your Availability**\n\n${formattedAvailabilities}`,
			flags: ["Ephemeral"],
		});
	} catch (error) {
		extractErrorDetails({ error, operation: "beny-bot.availability-view" });
		await interaction.reply({
			content:
				"Failed to check for your availabilities. Please try again later.",
			flags: ["Ephemeral"],
		});
	}
}

async function actionSet(interaction: ChatInputCommandInteraction) {
	logger.info(
		{ operation: "beny-bot.available-set" },
		"Setting an availability.",
	);
	const setAvailableModal = new ModalBuilder()
		.setCustomId("available:set")
		.setTitle("Set a time you are available");

	const dayOfWeekSelect = new StringSelectMenuBuilder()
		.setCustomId("availabilityDay")
		.setRequired(true)
		.addOptions(
			// matching values to day of week enum
			new StringSelectMenuOptionBuilder()
				.setLabel("Sunday")
				.setValue("0"),
			new StringSelectMenuOptionBuilder().setLabel("Monday").setValue("1"),
			new StringSelectMenuOptionBuilder().setLabel("Tuesday").setValue("2"),
			new StringSelectMenuOptionBuilder().setLabel("Wednesday").setValue("3"),
			new StringSelectMenuOptionBuilder().setLabel("Thursday").setValue("4"),
			new StringSelectMenuOptionBuilder().setLabel("Friday").setValue("5"),
			new StringSelectMenuOptionBuilder().setLabel("Saturday").setValue("6"),
		);

	const startTimeInput = new TextInputBuilder()
		.setCustomId("availabilityStartTime")
		.setStyle(TextInputStyle.Short)
		.setPlaceholder("Examples: 7:00 PM, 19:00, 7pm")
		.setRequired(true)
		.setMaxLength(10);
	const endTimeInput = new TextInputBuilder()
		.setCustomId("availabilityEndTime")
		.setStyle(TextInputStyle.Short)
		.setPlaceholder("Examples: 7:00 PM, 19:00, 7pm")
		.setMaxLength(10);

	const frequencySelect = new StringSelectMenuBuilder()
		.setCustomId("availabilityFrequency")
		.addOptions(
			new StringSelectMenuOptionBuilder().setLabel("Every Week").setValue("1"),
			new StringSelectMenuOptionBuilder()
				.setLabel("Every Other Week")
				.setValue("2"),
		);

	const dayOfWeekLabel = new LabelBuilder()
		.setLabel("Day of Week")
		.setStringSelectMenuComponent(dayOfWeekSelect);
	const hourLabel = new LabelBuilder()
		.setLabel("Start Time")
		.setTextInputComponent(startTimeInput);
	const minuteLabel = new LabelBuilder()
		.setLabel("End Time")
		.setTextInputComponent(endTimeInput);
	const frequencyLabel = new LabelBuilder()
		.setLabel("Frequency")
		.setStringSelectMenuComponent(frequencySelect);

	setAvailableModal.addLabelComponents(
		dayOfWeekLabel,
		hourLabel,
		minuteLabel,
		frequencyLabel,
	);

	await interaction.showModal(setAvailableModal);
}

async function modalSetOnSubmit(interaction: ModalSubmitInteraction) {
	logger.info(
		{ operation: "beny-bot.availability-set" },
		"Setting timeslot for user's availability",
	);
	const serverId = interaction.guildId;
	const userId = interaction.user.id;
	if (!serverId) {
		await interaction.reply({
			content:
				"This command needs to be used inside of a discord server to work.",
			flags: ["Ephemeral"],
		});
		return;
	}
	const day = Number(
		interaction.fields.getStringSelectValues("availabilityDay")[0],
	);
	const frequency = Number(
		interaction.fields.getStringSelectValues("availabilityFrequency")?.[0],
	);
	const startTime = interaction.fields.getTextInputValue(
		"availabilityStartTime",
	);
	const parsedStart = mapStringInputToTime(startTime);
	const endTime = interaction.fields.getTextInputValue("availabilityEndTime");
	const parsedEnd = endTime === "" ? "23:59:59" : mapStringInputToTime(endTime);

	if (parsedStart === null) {
		await interaction.reply({
			content: "I could not convert the start time into a valid time",
			flags: ["Ephemeral"],
		});
		return;
	}
	if (parsedEnd === null) {
		await interaction.reply({
			content: "I could not convert the end time into a valid time",
			flags: ["Ephemeral"],
		});
		return;
	}
	try {
		await axios.post(
			`${config.APP_URL}/api/discord/setAvailability`,
			{
				externalId: userId,
				serverId,
				time: {
					dayOfWeek: day,
					endTime: parsedEnd,
					frequency,
					startTime: parsedStart,
				},
			},
			{ headers },
		);
		await interaction.reply({
			content:
				"Availability set successfully. Use /availability view to see your currently set availability timeslots.",
			flags: ["Ephemeral"],
		});
	} catch (error) {
		const details = extractErrorDetails({
			error,
			operation: "beny-bot.availability-set",
		});

		switch (details.status) {
			case 409: {
				await interaction.reply({
					content:
						"Timeslot overlapping with an already existing one. Use /availability view to see your already set availabilities.",
					flags: ["Ephemeral"],
				});
				break;
			}
			default: {
				await interaction.reply({
					content: "Failed to set availability. Please try again later",
					flags: ["Ephemeral"],
				});
			}
		}
	}
}

export const availabilitySubcommands = [
	{
		action: actionSet,
		description: "Set your recurring availability",
		modal: { id: "available:set", onSubmit: modalSetOnSubmit },
		name: "set",
	},
	{
		action: actionView,
		description: "View your current availability",
		name: "view",
	},
	{
		action: actionRemove,
		description: "Remove a specific availability rule",
		name: "remove",
		options: [
			{
				description: "The Day of the timeslot you'd like removed.",
				isRequired: true,
				name: "day",
			},
			{
				description: "The Time of the timeslot you'd like removed.",
				isRequired: true,
				name: "time",
			},
		],
	},
	{
		action: actionClear,
		description: "Clear all your availability rules",
		name: "clear",
	},
] as const;

export const availabilityCommand = {
	command: CommandsEnum.AVAILABLE,
	description: "Manage your D&D availability",
	subcommands: availabilitySubcommands,
};
