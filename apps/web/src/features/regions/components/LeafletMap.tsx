import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import {
	ImageOverlay,
	MapContainer,
	Marker,
	Tooltip,
	useMapEvents,
} from "react-leaflet";

const fantasyIcon = L.divIcon({
	className: "",
	html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <ellipse cx="14" cy="34" rx="5" ry="2" fill="rgba(0,0,0,0.35)"/>
    <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="#1a0e00" stroke="#a07830" stroke-width="1.5"/>
    <circle cx="14" cy="13" r="8" fill="#3d2000" stroke="#c4922a" stroke-width="1.5"/>
    <path d="M14 7 L15.2 11.2 L19.5 11.2 L16 13.8 L17.2 18 L14 15.4 L10.8 18 L12 13.8 L8.5 11.2 L12.8 11.2 Z" fill="#f0c040"/>
  </svg>`,
	iconAnchor: [14, 36],
	iconSize: [28, 36],
	popupAnchor: [0, -36],
});

type MarkerData = {
	id: string;
	name: string;
	x: number;
	y: number;
};

type Props = {
	draggableMarkers?: boolean;
	imageUrl: string;
	isPlacingMarker?: boolean;
	markers?: MarkerData[];
	onMapClick?: (x: number, y: number) => void;
	onMarkerClick?: (id: string) => void;
	onMarkerMove?: (id: string, x: number, y: number) => void;
};

function MapClickHandler({
	onMapClick,
}: {
	onMapClick: (x: number, y: number) => void;
}) {
	useMapEvents({
		click: (e) => {
			onMapClick(e.latlng.lng, e.latlng.lat);
		},
	});
	return null;
}

export default function LeafletMap({
	draggableMarkers = true,
	imageUrl,
	isPlacingMarker = false,
	markers = [],
	onMapClick,
	onMarkerClick,
	onMarkerMove,
}: Props) {
	const [isMounted, setIsMounted] = useState(false);
	const [dimensions, setDimensions] = useState<{
		width: number;
		height: number;
	} | null>(null);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		let canceled = false;
		setDimensions(null);
		const image = new Image();
		image.onload = () => {
			if (!canceled)
				setDimensions({
					height: image.naturalHeight,
					width: image.naturalWidth,
				});
		};
		image.src = imageUrl;
		return () => {
			canceled = true;
		};
	}, [imageUrl]);

	const isDragging = useRef(false);

	if (!(isMounted && dimensions)) return null;

	const bounds: L.LatLngBoundsExpression = [
		[0, 0],
		[dimensions.height, dimensions.width],
	];

	return (
		<div
			className={
				isPlacingMarker
					? "rounded-lg ring-2 ring-primary shadow-lg shadow-primary/30 transition-all"
					: "rounded-lg overflow-hidden transition-all"
			}
		>
			<MapContainer
				attributionControl={false}
				center={[dimensions.height / 2, dimensions.width / 2]}
				crs={L.CRS.Simple}
				maxBounds={bounds}
				maxBoundsViscosity={1}
				minZoom={-5}
				scrollWheelZoom={false}
				style={{
					cursor: isPlacingMarker ? "crosshair" : undefined,
					height: "400px",
					width: "100%",
				}}
				zoom={-1.3}
				zoomControl={false}
				zoomSnap={0}
			>
				<ImageOverlay bounds={bounds} url={imageUrl} />
				{onMapClick && <MapClickHandler onMapClick={onMapClick} />}
				{markers.map((marker) => (
					<Marker
						draggable={draggableMarkers}
						eventHandlers={{
							click: () => {
								if (!isDragging.current) onMarkerClick?.(marker.id);
							},
							dragend: (event) => {
								const latlng = event.target.getLatLng();
								onMarkerMove?.(marker.id, latlng.lng, latlng.lat);
								isDragging.current = false;
							},
							dragstart: () => {
								isDragging.current = true;
							},
						}}
						icon={fantasyIcon}
						key={marker.id}
						position={[marker.y, marker.x]}
					>
						<Tooltip
							className="fantasy-tooltip"
							direction="top"
							offset={[0, -36]}
						>
							{marker.name}
						</Tooltip>
					</Marker>
				))}
			</MapContainer>
		</div>
	);
}
