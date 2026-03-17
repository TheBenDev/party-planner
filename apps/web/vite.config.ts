import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		tailwindcss(),
		tanstackStart(),
		viteReact(),
		cloudflare({ viteEnvironment: { name: "ssr" } }),
	],
	resolve: {
		tsconfigPaths: true,
	},
	server: {
		allowedHosts: ["a62f-24-142-227-25.ngrok-free.app"],
	},
});
