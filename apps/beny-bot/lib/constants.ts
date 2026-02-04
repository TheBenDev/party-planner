import { config } from "./config";
export const headers = {
  Authorization: `Bot ${config.API_KEY}`,
  "User-Agent": "beny-bot/1.0.0",
};
