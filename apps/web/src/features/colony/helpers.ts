import type { Colony } from "./types";

export function nextShipmentDays(colony: Colony): number | undefined {
	if (colony.shipmentAt === undefined) return undefined;
	return colony.shipmentAt - colony.lifespanDays + (colony?.lastShipment || 0);
}
