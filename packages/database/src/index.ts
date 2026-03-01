import { neonConfig, Pool } from "@neondatabase/serverless";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { drizzle, type NeonQueryResultHKT } from "drizzle-orm/neon-serverless";
import type { PgTransaction } from "drizzle-orm/pg-core";
import ws from "ws";
import { envConfig } from "./lib/config";
// biome-ignore lint/performance/noNamespaceImport: needed for config
import * as schema from "./schema";
export { schema };
export type Client = ReturnType<typeof drizzle<typeof schema>>;
export type TransactionClient = PgTransaction<
	NeonQueryResultHKT,
	typeof schema,
	ExtractTablesWithRelations<typeof schema>
>;

export function createDb(config?: { databaseUrl?: string }) {
	neonConfig.webSocketConstructor = ws;
	const pool = new Pool({
		connectionString: config?.databaseUrl || envConfig.DATABASE_URL,
	});
	return drizzle({ client: pool, schema });
}
