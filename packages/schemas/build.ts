import { build, spawn } from "bun";

await build({
	entrypoints: [
		"src/campaign.ts",
		"src/character.ts",
		"src/discord.ts",
		"src/email.ts",
		"src/integration.ts",
		"src/location.ts",
		"src/member.ts",
		"src/nonPlayerCharacter.ts",
		"src/quest.ts",
		"src/session.ts",
		"src/user.ts",
	],
	external: ["@planner/enums", "zod"],
	format: "esm",
	minify: true,
	outdir: "dist",
	root: "src",
});

// Generate declarations with TypeScript
spawn(["bunx", "tsc", "--declaration", "--emitDeclarationOnly"], {
	stdio: ["inherit", "inherit", "inherit"],
});
