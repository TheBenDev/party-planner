import { build, spawn } from "bun";

await build({
	entrypoints: ["src/index.ts"],
	external: [
		"@neondatabase/serverless",
		"@planner/enums",
		"@planner/schemas",
		"@t3-oss/env-core",
		"drizzle-orm",
		"drizzle-zod",
		"ws",
		"zod",
	],
	format: "esm",
	minify: true,
	outdir: "dist",
	root: "src",
});

const proc = spawn(["bunx", "tsc", "--declaration", "--emitDeclarationOnly"], {
	stdio: ["inherit", "inherit", "inherit"],
});

await proc.exited;
