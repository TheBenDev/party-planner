import { timestampDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/client";
import { StatusEnum } from "@planner/enums/common";
import { UserRole } from "@planner/enums/user";
import { CampaignInvitationSchema } from "@planner/schemas/campaigns";
import {
	type CampaignInvitation,
	type CampaignUser,
	CampaignUserSchema,
} from "@planner/schemas/member";
import {
	type CampaignInvitation as CampaignInvitationProto,
	InvitationStatus as InvitationStatusProto,
	type Member as MemberProto,
	MemberRole as MemberRoleProto,
} from "@/gen/proto/planner/v1/member_pb";

export function protoRoleToUserRole(role: MemberRoleProto): UserRole {
	switch (role) {
		case MemberRoleProto.PLAYER:
			return UserRole.PLAYER;
		case MemberRoleProto.DUNGEON_MASTER:
			return UserRole.DUNGEON_MASTER;
		default:
			throw new Error(`unknown campaign role: ${role}`);
	}
}

export function userRoleToProtoRole(role: UserRole): MemberRoleProto {
	switch (role) {
		case UserRole.PLAYER:
			return MemberRoleProto.PLAYER;
		case UserRole.DUNGEON_MASTER:
			return MemberRoleProto.DUNGEON_MASTER;
		default:
			throw new Error(`unknown user role: ${role}`);
	}
}

export function protoStatusToInvitationStatus(
	status: InvitationStatusProto,
): StatusEnum {
	switch (status) {
		case InvitationStatusProto.PENDING:
			return StatusEnum.PENDING;
		case InvitationStatusProto.ACCEPTED:
			return StatusEnum.ACCEPTED;
		case InvitationStatusProto.DECLINED:
			return StatusEnum.DECLINED;
		case InvitationStatusProto.EXPIRED:
			return StatusEnum.EXPIRED;
		case InvitationStatusProto.REVOKED:
			return StatusEnum.REVOKED;
		default:
			throw new Error(`unknown or unimplemented invitation status: ${status}`);
	}
}

export function invitationStatusToProto(
	status: StatusEnum,
): InvitationStatusProto {
	switch (status) {
		case StatusEnum.PENDING:
			return InvitationStatusProto.PENDING;
		case StatusEnum.ACCEPTED:
			return InvitationStatusProto.ACCEPTED;
		case StatusEnum.DECLINED:
			return InvitationStatusProto.DECLINED;
		case StatusEnum.EXPIRED:
			return InvitationStatusProto.EXPIRED;
		case StatusEnum.REVOKED:
			return InvitationStatusProto.REVOKED;
		default:
			throw new Error(`unknown or unimplemented invitation status: ${status}`);
	}
}

export function protoToMember(proto: MemberProto): CampaignUser {
	if (!proto.createdAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Member is missing createdAt",
		});
	}
	if (!proto.updatedAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Member is missing updatedAt",
		});
	}

	return CampaignUserSchema.parse({
		campaignId: proto.campaignId,
		createdAt: timestampDate(proto.createdAt),
		role: protoRoleToUserRole(proto.role),
		updatedAt: timestampDate(proto.updatedAt),
		userId: proto.userId,
	});
}

export function protoToCampaignInvitation(
	proto: CampaignInvitationProto,
): CampaignInvitation {
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
	if (!proto.expiresAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "CampaignInvitation is missing expiresAt",
		});
	}

	return CampaignInvitationSchema.parse({
		acceptedAt: proto.acceptedAt ? timestampDate(proto.acceptedAt) : null,
		campaignId: proto.campaignId,
		createdAt: timestampDate(proto.createdAt),
		expiresAt: timestampDate(proto.expiresAt),
		inviteeEmail: proto.inviteeEmail,
		inviterId: proto.inviterId,
		role: protoRoleToUserRole(proto.role),
		status: protoStatusToInvitationStatus(proto.status),
		updatedAt: timestampDate(proto.updatedAt),
	});
}
