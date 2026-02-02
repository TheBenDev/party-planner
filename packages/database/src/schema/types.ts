import { sql } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";

type TSTZRangeBounds = "[]" | "()" | "[)" | "(]";
export interface TSTZRangeOptions {
	upperInclusive: boolean;
	lowerInclusive: boolean;
}
export interface TSTZRange {
	lower: Date;
	upper: Date;
	options: TSTZRangeOptions;
}
/**
 * Custom type for `tstzrange`
 *
 * This is a custom type for the `tstzrange` type in PostgreSQL.
 * It is used to store time ranges in the database.
 *
 * Improvement is possible here, e.g. by typing the JS-land data and parsing driver data, but it's not worth the effort for now.
 *
 * @see https://www.postgresql.org/docs/current/rangetypes.html
 */
export const tstzrange = customType<{
	data: string | null;
	driverData: string;
}>({
	dataType() {
		return "tstzrange";
	},
});

/**
 * Helper to define a tstzrange column that is always generated from two columns (default: 'start' and 'end').
 *
 * @param colName - The name of the `tstzrange` column
 * @param lowerCol - The lower bound column (default: 'start')
 * @param upperCol - The upper bound column (default: 'end')
 * @param bounds - The range bounds (default: '[)')
 * @returns A Drizzle column definition for a generated `tstzrange` column
 */
export function generatedTSTZRangeColumn(
	colName: string,
	lowerCol = "start",
	upperCol = "end",
	options: TSTZRangeOptions = { lowerInclusive: true, upperInclusive: false },
) {
	const bounds: TSTZRangeBounds =
		`${options.lowerInclusive ? "[" : "("}${options.upperInclusive ? "]" : ")"}` as TSTZRangeBounds;
	return tstzrange(colName)
		.generatedAlwaysAs(
			sql`tstzrange(${sql.identifier(lowerCol)}, ${sql.identifier(upperCol)}, ${sql.raw(`'${bounds}'`)})`,
		)
		.notNull();
}
