import Redis from "ioredis";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { withCache } from "../src/cache.js";
import { RedisCache } from "../src/redisCache.js";

const url = process.env.REDIS_URL ?? "redis://localhost:6379";
const client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });

let available = false;
try {
	await client.connect();
	available = true;
} catch {
	available = false;
}

afterAll(async () => {
	if (available) await client.quit();
});

describe.skipIf(!available)("RedisCache", () => {
	const cache = new RedisCache(client, "test:");

	beforeEach(async () => {
		const keys = await client.keys("test:*");
		if (keys.length > 0) await client.del(...keys);
	});

	it("returns null for an unknown key", async () => {
		expect(await cache.get("missing")).toBeNull();
	});

	it("round-trips a structured value", async () => {
		await cache.set("k", { name: "cafe", tags: [1, 2] }, 60);
		expect(await cache.get("k")).toEqual({ name: "cafe", tags: [1, 2] });
	});

	it("applies a TTL", async () => {
		await cache.set("k", "value", 60);
		const ttl = await client.ttl("test:k");
		expect(ttl).toBeGreaterThan(0);
		expect(ttl).toBeLessThanOrEqual(60);
	});

	it("rounds a sub-second TTL up to one second", async () => {
		await cache.set("k", "value", 0.2);
		expect(await client.ttl("test:k")).toBe(1);
	});

	it("treats a corrupt entry as a miss and clears it", async () => {
		await client.set("test:bad", "{not json");
		expect(await cache.get("bad")).toBeNull();
		expect(await client.get("test:bad")).toBeNull();
	});

	it("namespaces keys by prefix", async () => {
		await cache.set("k", "value", 60);
		expect(await client.get("test:k")).toBe('"value"');
	});

	it("works with withCache", async () => {
		let calls = 0;
		const fetcher = async () => {
			calls++;
			return ["a"];
		};

		await withCache(cache, "wc", 60, fetcher);
		await withCache(cache, "wc", 60, fetcher);
		expect(calls).toBe(1);
	});
});
