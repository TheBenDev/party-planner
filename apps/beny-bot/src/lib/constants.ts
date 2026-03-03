import { env } from "../env";
export const headers = {
  Authorization: `Bot ${env.API_KEY}`,
  "User-Agent": "beny-bot/1.0.0",
};
