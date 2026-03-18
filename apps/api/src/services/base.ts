import { WorkerEntrypoint } from "cloudflare:workers";

abstract class BaseService extends WorkerEntrypoint<CloudflareBindings> {
	protected async authenticate(token: string) {
		// clerk token here
		const valid = await this.env.KV.get(`token:${token}`);
		if (!valid) throw new Error("Unauthorized");
	}

	protected async withLogging<T>(
		name: string,
		fn: () => Promise<T>,
	): Promise<T> {
		const start = Date.now();
		try {
			const result = await fn();
			console.log(`${name} completed in ${Date.now() - start}ms`);
			return result;
		} catch (e) {
			console.error(`${name} failed:`, e);
			throw e;
		}
	}
}

export class UserService extends BaseService {
	async getUser(id: string) {
		return this.withLogging("getUser", async () => {
			await this.authenticate(this.env.INTERNAL_TOKEN);
			return this.env.DB.prepare("SELECT * FROM users WHERE id = ?")
				.bind(id)
				.first();
		});
	}
}
