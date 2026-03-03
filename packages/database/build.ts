import { build, spawn } from "bun";

await build({
	entrypoints: ["src/index.ts"],
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
