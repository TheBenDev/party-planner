import { build, spawn } from "bun";

await build({
	entrypoints: [
		"src/quest.ts",
		"src/user.ts",
		"src/common.ts",
		"src/character.ts",
	],
	external: [],
	format: "esm",
	minify: true,
	outdir: "dist",
	root: "src",
});

// Generate declarations with TypeScript
spawn(["bunx", "tsc", "--declaration", "--emitDeclarationOnly"], {
	stdio: ["inherit", "inherit", "inherit"],
});
