import type { Cache } from "./cache.js";

interface Entry {
	value: unknown;
	expiresAt: number;
}

/**
 * In-process cache for tests and local development.
 * The clock is injectable so TTL expiry can be tested without real waiting.
 */
export class MemoryCache implements Cache {
	private store = new Map<string, Entry>();

	constructor(private readonly now: () => number = Date.now) {}

	async get<T>(key: string): Promise<T | null> {
		const entry = this.store.get(key);
		if (!entry) return null;

		if (entry.expiresAt <= this.now()) {
			this.store.delete(key);
			return null;
		}
		return entry.value as T;
	}

	async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
		this.store.set(key, { value, expiresAt: this.now() + ttlSeconds * 1000 });
	}

	get size(): number {
		return this.store.size;
	}
}
