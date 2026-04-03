import { timestampDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/client";
import { type Campaign, CampaignSchema } from "@planner/schemas/campaigns";
import type { Campaign as CampaignProto } from "@/gen/proto/planner/v1/campaign_pb";

export function protoToCampaign(proto: CampaignProto): Campaign {
	if (!proto.createdAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "CampaignInvitation is missing createdAt",
		});
	}
	if (!proto.updatedAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "CampaignInvitation is missing updatedAt",
		});
	}

	return CampaignSchema.parse({
		createdAt: timestampDate(proto.createdAt),
		deletedAt: proto.deletedAt ? timestampDate(proto.deletedAt) : null,
		description: proto.description,
		id: proto.id,
		tags: proto.tags,
		title: proto.title,
		updatedAt: timestampDate(proto.updatedAt),
		userId: proto.userId,
	});
}
