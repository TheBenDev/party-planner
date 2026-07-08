import { build, spawn } from "bun";

await build({
	entrypoints: [
		"src/common.ts",
		"src/colony.ts",
		"src/character.ts",
		"src/i18n.ts",
		"src/integration.ts",
		"src/quest.ts",
		"src/session.ts",
		"src/user.ts",
	],
	external: [],
	format: "esm",
	minify: true,
	outdir: "dist",
	root: "src",
});

// Generate declarations with TypeScript
const proc = spawn(["bunx", "tsc", "--declaration", "--emitDeclarationOnly"], {
	stdio: ["inherit", "inherit", "inherit"],
});

await proc.exited;
