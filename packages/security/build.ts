import { build, spawn } from "bun";

await build({
	entrypoints: ["src/auth.ts"],
	external: ["@planner/schemas", "jose"],
	format: "esm",
	minify: true,
	outdir: "dist",
	root: "src",
});

// Generate declarations with TypeScript
spawn(["bunx", "tsc", "--declaration", "--emitDeclarationOnly"], {
	stdio: ["inherit", "inherit", "inherit"],
});
