import { timestampDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/client";
import { protoToLocation } from "@/features/regions/procedures/proto/location";
import { RegionSchema, RegionWithDetailsSchema } from "@/features/regions/types";
import type {
	Region,
	RegionWithDetails,
} from "@/gen/proto/planner/v1/region_pb";

export function protoToRegion(proto: Region) {
	if (!proto.createdAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Region is missing createdAt",
		});
	}
	if (!proto.updatedAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Region is missing updatedAt",
		});
	}

	return RegionSchema.parse({
		campaignId: proto.campaignId,
		createdAt: timestampDate(proto.createdAt),
		deletedAt: proto.deletedAt ? timestampDate(proto.deletedAt) : null,
		id: proto.id,
		mapImageUrl: proto.mapImageUrl ?? null,
		name: proto.name,
		updatedAt: timestampDate(proto.updatedAt),
	});
}

export function protoToRegionWithDetails(proto: RegionWithDetails) {
	if (!proto.region) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "RegionWithDetails is missing region",
		});
	}

	return RegionWithDetailsSchema.parse({
		locations: proto.locations.map(protoToLocation),
		region: protoToRegion(proto.region),
	});
}
