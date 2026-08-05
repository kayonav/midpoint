export interface Cache {
	get<T>(key: string): Promise<T | null>;
	set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}

/**
 * Read-through cache helper. Every external lookup goes through here — calling
 * a places or geocoding API without checking the cache first is the failure
 * mode this layer exists to prevent.
 */
export async function withCache<T>(
	cache: Cache,
	key: string,
	ttlSeconds: number,
	fetcher: () => Promise<T>,
): Promise<T> {
	const hit = await cache.get<T>(key);
	if (hit !== null) return hit;

	const value = await fetcher();
	await cache.set(key, value, ttlSeconds);
	return value;
}
