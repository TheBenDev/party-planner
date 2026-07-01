import { timestampDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/client";
import { LocationsSchema } from "@/features/regions/types";
import type { Location } from "@/gen/proto/planner/v1/location_pb";

export function protoToLocation(proto: Location) {
	if (!proto.createdAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Location is missing createdAt",
		});
	}
	if (!proto.updatedAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Location is missing updatedAt",
		});
	}

	return LocationsSchema.parse({
		createdAt: timestampDate(proto.createdAt),
		deletedAt: proto.deletedAt ? timestampDate(proto.deletedAt) : null,
		description: proto.description ?? null,
		dmNotes: proto.dmNotes ?? null,
		id: proto.id,
		mapX: proto.mapX ?? null,
		mapY: proto.mapY ?? null,
		name: proto.name,
		notes: proto.notes ?? null,
		regionId: proto.regionId,
		updatedAt: timestampDate(proto.updatedAt),
	});
}
