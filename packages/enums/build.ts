import { build, spawn } from "bun";

await build({
	entrypoints: [
		"src/common.ts",
		"src/event.ts",
		"src/character.ts",
		"src/integration.ts",
		"src/quest.ts",
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
