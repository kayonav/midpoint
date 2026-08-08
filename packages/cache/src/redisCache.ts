import type Redis from "ioredis";
import type { Cache } from "./cache.js";

/**
 * Redis-backed cache. Implements the same interface as MemoryCache, so the
 * places client and API accept it without changing a line — the reason Cache
 * is an interface rather than reaching for Redis directly.
 */
export class RedisCache implements Cache {
	constructor(
		private readonly client: Redis,
		private readonly prefix = "midpoint:",
	) {}

	private key(k: string): string {
		return this.prefix + k;
	}

	async get<T>(key: string): Promise<T | null> {
		const raw = await this.client.get(this.key(key));
		if (raw === null) return null;

		try {
			return JSON.parse(raw) as T;
		} catch {
			// A corrupt entry should behave like a miss, not crash the request.
			await this.client.del(this.key(key));
			return null;
		}
	}

	async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
		// Redis rejects a TTL below 1 second, and callers may pass fractions.
		const ttl = Math.max(1, Math.ceil(ttlSeconds));
		await this.client.set(this.key(key), JSON.stringify(value), "EX", ttl);
	}
}
