const nextConfig = {
	distDir: "dist",
	experimental: {
		turbo: {
			root: __dirname,
		},
	},
	transpilePackages: [
		"@planner/database",
		"@planner/enums",
		"@planner/schemas",
		"@planner/security",
	],
};

module.exports = nextConfig;
