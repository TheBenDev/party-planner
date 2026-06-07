import { timestampDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/client";
import { LocationsSchema } from "@/features/locations/types";
import type { Location } from "@/gen/proto/planner/v1/locations_pb";

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
		campaignId: proto.campaignId,
		createdAt: timestampDate(proto.createdAt),
		deletedAt: proto.deletedAt ? timestampDate(proto.deletedAt) : null,
		description: proto.description ?? null,
		dmNotes: proto.dmNotes ?? null,
		id: proto.id,
		name: proto.name,
		notes: proto.notes ?? null,
		updatedAt: timestampDate(proto.updatedAt),
	});
}
