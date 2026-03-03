import { availabilityCommand } from "./availability";
import { benyBoyCommand } from "./benyBoy";
import { nextSessionCommand } from "./nextSession";
import { npcCommand } from "./npc";
import { registerCampaignCommand } from "./registerCampaign";
import { scheduleEventCommand } from "./schedule";
import type { Command } from "./types";
export const commands: Command[] = [
	availabilityCommand,
	benyBoyCommand,
	nextSessionCommand,
	npcCommand,
	registerCampaignCommand,
	scheduleEventCommand,
];
