import type {
	ChatInputCommandInteraction,
	ModalSubmitInteraction,
} from "discord.js";

export enum CommandsEnum {
	AVAILABLE = "available",
	BENY = "beny",
	NEXTSESSION = "nextsession",
	NPC = "npc",
	REGISTERCAMPAIGN = "registercampaign",
	SCHEDULE = "schedule",
}

type Option = {
	name: string;
	description: string;
	isRequired: boolean;
};

type Subcommand = {
	name: string;
	description: string;
	action: (interaction: ChatInputCommandInteraction) => Promise<void>;
	options?: Option[];
	modal?: {
		onSubmit: (interaction: ModalSubmitInteraction) => Promise<void>;
		id: string;
	};
};

export type Command = {
	action?: (interaction: ChatInputCommandInteraction) => Promise<void>;
	modal?: {
		onSubmit: (interaction: ModalSubmitInteraction) => Promise<void>;
		id: string;
	};
	command: CommandsEnum;
	description: string;
	options?: Option[];
	subcommands?: Subcommand[];
};
