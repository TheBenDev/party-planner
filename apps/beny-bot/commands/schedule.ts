import {
	LabelBuilder,
	ModalBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} from "@discordjs/builders";
import { ScheduleSessionResponseSchema } from "@planner/schemas/discord";
import axios from "axios";
import type {
	ChatInputCommandInteraction,
	ModalSubmitInteraction,
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

	const scheduleEventModal = new ModalBuilder()
		.setCustomId(CommandsEnum.SCHEDULE)
		.setTitle("Schedule an event for your D&D game");

	// Hour select
	const hourOptions = Array.from({ length: 24 }, (_, i) => {
		const hour = i;
		const hourValue = hour.toString().padStart(2, "0");
		let displayHour: number = hour;
		if (hour === 0) displayHour = 12;
		if (hour > 12) displayHour = hour - 12;
		const ampm = hour < 12 ? "AM" : "PM";

		return new StringSelectMenuOptionBuilder()
			.setLabel(`${displayHour.toString()} ${ampm}`)
			.setValue(hourValue);
	});
	const hourSelect = new StringSelectMenuBuilder()
		.setCustomId("sessionHour")
		.setRequired(true)
		.addOptions(...hourOptions);

	// Minute select (15-minute increments = 4 options)
	const minuteSelect = new StringSelectMenuBuilder()
		.setCustomId("sessionMinute")
		.setRequired(true)
		.addOptions(
			new StringSelectMenuOptionBuilder().setLabel(":00").setValue("00"),
			new StringSelectMenuOptionBuilder().setLabel(":15").setValue("15"),
			new StringSelectMenuOptionBuilder().setLabel(":30").setValue("30"),
			new StringSelectMenuOptionBuilder().setLabel(":45").setValue("45"),
		);
	// Date select (next 30 days)
	const dateOptions = Array.from({ length: 25 }, (_, i) => {
		const date = new Date();
		date.setUTCDate(date.getUTCDate() + i);

		const year = date.getUTCFullYear();
		const monthIndex = date.getUTCMonth();
		const day = date.getUTCDate();

		const month = (monthIndex + 1).toString().padStart(2, "0");
		const dayStr = day.toString().padStart(2, "0");

		const dateValue = `${year}-${month}-${dayStr}`;
		const dayNames = [
			"Sunday",
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
		];
		const monthNames = [
			"Jan",
			"Feb",
			"Mar",
			"Apr",
			"May",
			"Jun",
			"Jul",
			"Aug",
			"Sep",
			"Oct",
			"Nov",
			"Dec",
		];

		const displayLabel = (function findLabel() {
			if (i === 0) return `Today - ${monthNames[date.getUTCMonth()]} ${day}`;
			if (i === 1) return `Tomorrow - ${monthNames[date.getUTCMonth()]} ${day}`;
			return `${dayNames[date.getUTCDay()]} - ${monthNames[date.getUTCMonth()]} ${day}`;
		})();
		return new StringSelectMenuOptionBuilder()
			.setLabel(displayLabel)
			.setValue(dateValue);
	});
	const dateSelect = new StringSelectMenuBuilder()
		.setCustomId("sessionDate")
		.setPlaceholder("Select date")
		.setRequired(true)
		.addOptions(...dateOptions);

	const dateLabel = new LabelBuilder()
		.setLabel("The day you'd like to schedule")
		.setStringSelectMenuComponent(dateSelect);
	const hourLabel = new LabelBuilder()
		.setLabel("Hour")
		.setStringSelectMenuComponent(hourSelect);
	const minuteLabel = new LabelBuilder()
		.setLabel("Minute")
		.setStringSelectMenuComponent(minuteSelect);

	// Use in your interaction
	scheduleEventModal.addLabelComponents(dateLabel, hourLabel, minuteLabel);

	await interaction.showModal(scheduleEventModal);
}

async function modalOnSubmit(interaction: ModalSubmitInteraction) {
	logger.info({ operation: "beny-bot.schedule" }, "Scheduling session for dnd");
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

	const hour = interaction.fields.getStringSelectValues("sessionHour")?.[0];
	const minute = interaction.fields.getStringSelectValues("sessionMinute")?.[0];
	const date = interaction.fields.getStringSelectValues("sessionDate")?.[0];

	if (!(hour && minute && date)) {
		await interaction.reply({
			content:
				"Something went wrong trying to read your inputs. Please try again or ask for help.",
			flags: ["Ephemeral"],
		});
	}

	try {
		const scheduledStartTime = new Date(
			`${date}T${hour?.padStart(2, "0")}:${minute?.padStart(2, "0")}:00`,
		);

		const scheduledEndTime = new Date(
			scheduledStartTime.getTime() + 2 * 60 * 60 * 1000,
		); // 2 hours later

		// Create Discord scheduled event
		const guild = interaction.guild;
		if (guild && channelId) {
			const res = await axios.post(
				`${config.APP_URL}/api/discord/scheduleSession`,
				{
					channelId,
					serverId,
					time: { date, hour, minute },
				},
				{ headers },
			);
			const availableUsers = ScheduleSessionResponseSchema.parse(res.data);
			await guild.scheduledEvents.create({
				description: "Scheduled D&D session", // Customize this
				entityMetadata: {
					location: "Check the channel for details", // Required for EXTERNAL type
				},
				entityType: 3, // EXTERNAL
				name: "D&D Session", // Customize this
				privacyLevel: 2, // GUILD_ONLY
				scheduledEndTime,
				scheduledStartTime,
			});

			const unixTimestamp = Math.floor(scheduledStartTime.getTime() / 1000);
			const discordTimestamp = `<t:${unixTimestamp}:F>`;

			if (availableUsers.availableUsers.length > 0) {
				await interaction.reply(
					`Session scheduled **${discordTimestamp}**. We have ${availableUsers.availableUsers.join(", ")} available to join!`,
				);
				return;
			}
			await interaction.reply(`Session scheduled ${discordTimestamp}.`);
		}
	} catch (error) {
		extractErrorDetails({ error, operation: "beny-bot.schedule" });
		await interaction.reply({
			content: "Failed to schedule session. Please try again later.",
			flags: ["Ephemeral"],
		});
		return;
	}
}

export const scheduleEventCommand = {
	action,
	command: CommandsEnum.SCHEDULE,
	description: "Schedule an event such as a D&D session.",
	modal: {
		id: CommandsEnum.SCHEDULE,
		onSubmit: modalOnSubmit,
	},
};
