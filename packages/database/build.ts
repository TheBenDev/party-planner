import { build, spawn } from "bun";

await build({
	entrypoints: [
		"src/schema/campaigns.ts",
		"src/schema/campaignUsers.ts",
		"src/schema/characters.ts",
		"src/schema/index.ts",
		"src/schema/locations.ts",
		"src/schema/nonPlayerCharacters.ts",
		"src/schema/quests.ts",
		"src/schema/sessions.ts",
		"src/schema/users.ts",
	],
	external: ["@planner/enums"],
	format: "esm",
	minify: true,
	outdir: "dist",
	root: "src",
});

const proc = spawn(["bunx", "tsc", "--declaration", "--emitDeclarationOnly"], {
	stdio: ["inherit", "inherit", "inherit"],
});

await proc.exited;
