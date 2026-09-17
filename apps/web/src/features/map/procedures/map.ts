import { ORPCError } from "@orpc/server";
import {
	ClearMapHexRequestSchema,
	ClearMapHexResponseSchema,
	GetCampaignMapResponseSchema,
	UpsertMapHexRequestSchema,
	UpsertMapHexResponseSchema,
} from "@/features/map/types";
import { handleError } from "@/server/errors";
import { campaignProcedure } from "@/server/middleware";
import { protoToMapHex } from "./proto/map";

const getCampaignMapDef = campaignProcedure
	.route({ method: "POST", path: "/map/get", summary: "Get the campaign hex map" })
	.output(GetCampaignMapResponseSchema);

export const getCampaignMapHandler: Parameters<typeof getCampaignMapDef.handler>[0] =
	async ({ context }) => {
		try {
			const res = await context.api.map.getCampaignMap({
				campaignId: context.campaignId,
			});
			return { hexes: res.hexes.map(protoToMapHex) };
		} catch (err) {
			handleError(err, "failed to get campaign map", { campaignId: context.campaignId }, context.logger);
		}
	};

const upsertMapHexDef = campaignProcedure
	.route({ method: "POST", path: "/map/upsert", summary: "Paint a hex on the campaign map" })
	.input(UpsertMapHexRequestSchema)
	.output(UpsertMapHexResponseSchema);

export const upsertMapHexHandler: Parameters<typeof upsertMapHexDef.handler>[0] =
	async ({ input, context }) => {
		try {
			const res = await context.api.map.upsertMapHex({
				campaignId: context.campaignId,
				...input,
			});
			if (!res.hex) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "failed to upsert map hex" });
			}
			return { hex: protoToMapHex(res.hex) };
		} catch (err) {
			handleError(err, "failed to upsert map hex", { campaignId: context.campaignId }, context.logger);
		}
	};

const clearMapHexDef = campaignProcedure
	.route({ method: "POST", path: "/map/clear", summary: "Clear a hex on the campaign map" })
	.input(ClearMapHexRequestSchema)
	.output(ClearMapHexResponseSchema);

export const clearMapHexHandler: Parameters<typeof clearMapHexDef.handler>[0] =
	async ({ input, context }) => {
		try {
			await context.api.map.clearMapHex({
				campaignId: context.campaignId,
				...input,
			});
			return {};
		} catch (err) {
			handleError(err, "failed to clear map hex", { campaignId: context.campaignId }, context.logger);
		}
	};

export const mapRouter = {
	getCampaignMap: getCampaignMapDef.handler(getCampaignMapHandler),
	upsertMapHex: upsertMapHexDef.handler(upsertMapHexHandler),
	clearMapHex: clearMapHexDef.handler(clearMapHexHandler),
};
