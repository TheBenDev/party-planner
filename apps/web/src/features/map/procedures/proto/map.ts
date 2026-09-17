import { MapHexSchema, type MapHex } from "@/features/map/types";
import type { MapHex as MapHexProto } from "@/gen/proto/planner/v1/map_hex_pb";

export function protoToMapHex(proto: MapHexProto): MapHex {
	return MapHexSchema.parse({
		id: proto.id,
		campaignId: proto.campaignId,
		q: proto.q,
		r: proto.r,
		terrain: proto.terrain,
		label: proto.label ?? undefined,
	});
}
