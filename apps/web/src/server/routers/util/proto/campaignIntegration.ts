import { timestampDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/client";
import { IntegrationSource } from "@planner/enums/integration";
import {
	type CampaignIntegration,
	CampaignIntegrationSchema,
} from "@planner/schemas/discord";

import {
	type CampaignIntegration as ProtoCampaignIntegration,
	IntegrationSource as ProtoIntegrationSource,
} from "@/gen/proto/planner/v1/campaign_integration_pb";

// Proto -> App
export function protoToIntegrationSource(
	source: ProtoIntegrationSource,
): IntegrationSource {
	switch (source) {
		case ProtoIntegrationSource.DISCORD:
			return IntegrationSource.DISCORD;

		case ProtoIntegrationSource.UNSPECIFIED:
			throw new Error("Integration source is unspecified");
		default:
			throw new Error(`unknown integration source: ${source}`);
	}
}

// App -> Proto
export function integrationSourceToProto(
	source: IntegrationSource,
): ProtoIntegrationSource {
	switch (source) {
		case IntegrationSource.DISCORD:
			return ProtoIntegrationSource.DISCORD;

		default:
			throw new Error(`unknown integration source: ${source}`);
	}
}

export function protoToCampaignIntegration(
	proto: ProtoCampaignIntegration,
): CampaignIntegration {
	if (!proto.createdAt)
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "CampaignIntegration is missing createdAt",
		});
	if (!proto.updatedAt)
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "CampaignIntegration is missing updatedAt",
		});
	if (!proto.metadata)
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "CampaignIntegration is missing metadata",
		});
	if (!proto.settings)
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "CampaignIntegration is missing settings",
		});

	return CampaignIntegrationSchema.parse({
		campaignId: proto.campaignId,
		createdAt: timestampDate(proto.createdAt),
		externalId: proto.externalId,
		id: proto.id,
		metaData: proto.metadata,
		settings: proto.settings,
		source: protoToIntegrationSource(proto.source),
		updatedAt: timestampDate(proto.updatedAt),
	});
}
