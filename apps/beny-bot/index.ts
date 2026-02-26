import {
	Client,
	Events,
	GatewayIntentBits,
	SlashCommandBuilder,
} from "discord.js";
import { commands } from "./commands";
import { config } from "./lib/config";
import logger from "./lib/logger";

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
	],
});

client.once(Events.ClientReady, (c) => {
	const now = new Date();
	logger.info(
		{ bot: c.user.username, startedAt: now },
		`${c.user.username} has logged in.`,
	);
	for (const command of commands) {
		const commandBuilt = new SlashCommandBuilder()
			.setName(command.command)
			.setDescription(command.description);

		if (command.subcommands !== undefined) {
			command.subcommands.map((subcommand) => {
				return commandBuilt.addSubcommand((addedCommand) => {
					const slashCommand = addedCommand
						.setName(subcommand.name)
						.setDescription(subcommand.description);

					if (subcommand.options !== undefined) {
						for (const subcommandOption of subcommand.options) {
							const { name, description, isRequired } = subcommandOption;
							addedCommand.addStringOption((stringOption) =>
								stringOption
									.setName(name)
									.setDescription(description)
									.setRequired(isRequired),
							);
						}
					}
					return slashCommand;
				});
			});
		}

		if (command.options !== undefined) {
			for (const option of command.options) {
				const { name, description, isRequired } = option;
				commandBuilt.addStringOption((o) =>
					o.setName(name).setDescription(description).setRequired(isRequired),
				);
			}
		}
		client.application?.commands.create(commandBuilt);
	}
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (interaction.isModalSubmit()) {
		const parts = interaction.customId.split(":");

		if (parts.length === 0) {
			logger.error(
				{ customId: interaction.customId },
				"Failed to read customId for interaction modal submit.",
			);
			return;
		}

		const [commandName, subcommandName] = parts;
		const command = commands.find((cmd) => cmd.command === commandName);

		if (!command) {
			logger.error(
				{ customId: interaction.customId },
				"Failed to find command from interaction modal submit customId.",
			);
			return;
		}

		const handler = subcommandName
			? command.subcommands?.find((sc) => sc.name === subcommandName)
			: command;

		if (handler?.modal) {
			await handler.modal.onSubmit(interaction);
		}
		return;
	}
	if (interaction.isChatInputCommand()) {
		const command = commands.find(
			(cmd) => cmd.command === interaction.commandName,
		);
		if (!command) {
			logger.error("Failed to find chat input command.");
			return;
		}
		if (command.subcommands && command.subcommands.length > 0) {
			const subcommandName = interaction.options.getSubcommand();

			// Find the matching subcommand
			const subcommand = command.subcommands.find(
				(sc) => sc.name === subcommandName,
			);

			if (subcommand?.action) {
				// Execute subcommand action
				await subcommand.action(interaction);
			}
		} else {
			await command.action?.(interaction);
		}
		return;
	}
});

client.login(config.DISCORD_TOKEN);
