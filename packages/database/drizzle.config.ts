import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dbCredentials: {
		url: (() => {
			const url = process.env.DATABASE_URL;
			if (!url) {
				throw new Error("DATABASE_URL environment variable is required");
			}
			return url;
		})(),
	},
	dialect: "postgresql",
	out: "./drizzle",
	schema: "./src/schema",
});
