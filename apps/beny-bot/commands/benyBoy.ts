import type { ChatInputCommandInteraction } from "discord.js";
import { CommandsEnum } from "./types";

async function action(interaction: ChatInputCommandInteraction) {
  await interaction.reply("Boy!");
}

export const benyBoyCommand = {
  action,
  command: CommandsEnum.BENY,
  description: "Beny Boy!",
};
