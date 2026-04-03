// string id = 1;
// string email = 2;
// string external_id = 3;
// optional string avatar = 4;
// optional string first_name = 5;
// optional string last_name = 6;
// google.protobuf.Timestamp created_at = 7;
// google.protobuf.Timestamp updated_at = 8;
// optional google.protobuf.Timestamp deleted_at = 9;

import { timestampDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/client";
import { type User, UserSchema } from "@planner/schemas/user";
import type { User as UserProto } from "@/gen/proto/planner/v1/user_pb";

export function protoToUser(proto: UserProto): User {
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

	return UserSchema.parse({
		avatar: proto.avatar ?? null,
		createdAt: timestampDate(proto.createdAt),
		deletedAt: proto.deletedAt ? timestampDate(proto.deletedAt) : null,
		email: proto.email,
		externalId: proto.externalId,
		firstName: proto.firstName,
		id: proto.id,
		lastName: proto.lastName,
		updatedAt: timestampDate(proto.updatedAt),
	});
}
