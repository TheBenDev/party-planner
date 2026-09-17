import { useEffect, useState } from "react";
import { GridGenerator, HexGrid, Hexagon, Layout } from "react-hexgrid";
import { useAuth } from "@/shared/hooks/auth";
import { useTheme } from "@/shared/hooks/theme";
import { useClearMapHex, useMapQuery, useUpsertMapHex } from "../hooks/useMap";

const TERRAINS = [
	{ id: "forest", label: "Forest", fillClass: "fill-green-700", color: "#15803d" },
	{ id: "plains", label: "Plains", fillClass: "fill-lime-400", color: "#a3e635" },
	{ id: "water", label: "Water", fillClass: "fill-blue-500", color: "#3b82f6" },
	{ id: "mountain", label: "Mountain", fillClass: "fill-stone-500", color: "#78716c" },
	{ id: "desert", label: "Desert", fillClass: "fill-yellow-500", color: "#eab308" },
	{ id: "swamp", label: "Swamp", fillClass: "fill-emerald-900", color: "#064e3b" },
	{ id: "tundra", label: "Tundra", fillClass: "fill-slate-200", color: "#e2e8f0" },
	{ id: "volcanic", label: "Volcanic", fillClass: "fill-orange-700", color: "#c2410c" },
	{ id: "unexplored", label: "Unexplored", fillClass: "", color: "" },
] as const;

type TerrainId = (typeof TERRAINS)[number]["id"];

const hexagons = GridGenerator.hexagon(5);

function wrapLabel(label: string, maxChars = 9): string[] {
	const words = label.split(" ");
	const lines: string[] = [];
	let current = "";
	for (const word of words) {
		if (!current) {
			current = word;
		} else if (current.length + 1 + word.length <= maxChars) {
			current += " " + word;
		} else {
			lines.push(current);
			current = word;
		}
	}
	if (current) lines.push(current);
	return lines;
}

export function MapPage() {
	const { campaign } = useAuth();
	const { theme } = useTheme();
	const defaultFill = theme === "dark" ? "fill-slate-700" : "fill-gray-200";
	const unexploredSwatchColor = theme === "dark" ? "#334155" : "#e5e7eb";

	const campaignId = campaign?.campaign.id ?? "";
	const mapQuery = useMapQuery(campaignId);
	const upsertMapHex = useUpsertMapHex(campaignId);
	const clearMapHex = useClearMapHex(campaignId);

	const [selectedTerrain, setSelectedTerrain] = useState<TerrainId>("forest");
	const [hexTerrains, setHexTerrains] = useState<Record<string, TerrainId>>({});
	const [hexLabels, setHexLabels] = useState<Record<string, string>>({});
	const [labelInput, setLabelInput] = useState("");

	useEffect(() => {
		if (!mapQuery.data) return;
		const terrains: Record<string, TerrainId> = {};
		const labels: Record<string, string> = {};
		for (const hex of mapQuery.data.hexes) {
			const s = -(hex.q + hex.r);
			const key = `${hex.q},${hex.r},${s}`;
			terrains[key] = hex.terrain as TerrainId;
			if (hex.label) labels[key] = hex.label;
		}
		setHexTerrains(terrains);
		setHexLabels(labels);
	}, [mapQuery.data]);

	function handleHexClick(q: number, r: number, s: number) {
		const key = `${q},${r},${s}`;
		if (selectedTerrain === "unexplored") {
			setHexTerrains((prev) => {
				const next = { ...prev };
				delete next[key];
				return next;
			});
			setHexLabels((prev) => {
				const next = { ...prev };
				delete next[key];
				return next;
			});
			clearMapHex.mutate({ q, r });
		} else {
			setHexTerrains((prev) => ({ ...prev, [key]: selectedTerrain }));
			if (labelInput.trim()) {
				setHexLabels((prev) => ({ ...prev, [key]: labelInput.trim() }));
			} else {
				setHexLabels((prev) => {
					const next = { ...prev };
					delete next[key];
					return next;
				});
			}
			upsertMapHex.mutate({
				q,
				r,
				terrain: selectedTerrain,
				label: labelInput.trim() || undefined,
			});
		}
	}

	function getHexClass(q: number, r: number, s: number) {
		const terrain = hexTerrains[`${q},${r},${s}`];
		if (!terrain) return defaultFill;
		return TERRAINS.find((t) => t.id === terrain)?.fillClass ?? defaultFill;
	}

	const activeTerrain = TERRAINS.find((t) => t.id === selectedTerrain);

	if (!campaign) {
		return (
			<div className="flex items-center justify-center h-full">
				<p className="text-muted-foreground">No active campaign.</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center w-full h-full">
			<div className="flex items-center gap-2 bg-background/90 backdrop-blur border rounded-xl px-4 py-3 shadow-lg mt-4">
				{TERRAINS.map((terrain) => (
					<button
						key={terrain.id}
						type="button"
						title={terrain.label}
						onClick={() => setSelectedTerrain(terrain.id)}
						className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all ${
							selectedTerrain === terrain.id
								? "ring-2 ring-primary scale-110"
								: "opacity-70 hover:opacity-100"
						}`}
					>
						<span
							className="w-6 h-6 rounded-sm border border-border"
							style={{ backgroundColor: terrain.id === "unexplored" ? unexploredSwatchColor : terrain.color }}
						/>
						<span className="text-xs text-muted-foreground">{terrain.label}</span>
					</button>
				))}
				<div className="ml-3 pl-3 border-l border-border flex flex-col gap-1">
					<label htmlFor="label" className="text-xs text-muted-foreground">Label</label>
					<div className="flex items-center gap-1">
            <input
              id="label"
							className="w-28 rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
							placeholder="e.g. Colony"
							value={labelInput}
							onChange={(e) => setLabelInput(e.target.value)}
						/>
						{labelInput && (
							<button
								type="button"
								onClick={() => setLabelInput("")}
								className="text-muted-foreground hover:text-foreground transition-colors"
								aria-label="Clear label"
							>
								✕
							</button>
						)}
					</div>
				</div>
				<div className="ml-3 pl-3 border-l border-border flex flex-col items-center gap-1">
					<span
						className="w-6 h-6 rounded-sm border border-border"
						style={{ backgroundColor: activeTerrain?.color }}
					/>
					<span className="text-xs font-medium">{activeTerrain?.label}</span>
				</div>
			</div>

			<HexGrid width={800} height={800} viewBox="-50 -50 100 100">
				<Layout
					size={{ x: 5, y: 5 }}
					flat={false}
					spacing={1.05}
					origin={{ x: 0, y: 0 }}
				>
					{hexagons.map((hex) => (
						<Hexagon
							key={`${hex.q},${hex.r},${hex.s}`}
							q={hex.q}
							r={hex.r}
							s={hex.s}
							className={`${getHexClass(hex.q, hex.r, hex.s)} cursor-pointer`}
							onClick={() => handleHexClick(hex.q, hex.r, hex.s)}
						>
							{hexLabels[`${hex.q},${hex.r},${hex.s}`] && (() => {
								const lines = wrapLabel(hexLabels[`${hex.q},${hex.r},${hex.s}`]);
								const lineHeight = 2;
								const startY = -((lines.length - 1) * lineHeight) / 2;
								return (
									<text
										textAnchor="middle"
										fontSize={1.5}
										fill="white"
										style={{ pointerEvents: "none", userSelect: "none" }}
									>
										{lines.map((line, i) => (
											<tspan key={i} x={0} y={startY + i * lineHeight}>
												{line}
											</tspan>
										))}
									</text>
								);
							})()}
						</Hexagon>
					))}
				</Layout>
			</HexGrid>
		</div>
	);
}
