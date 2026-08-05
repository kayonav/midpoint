import { describe, expect, it, vi } from "vitest";
import { withCache } from "../src/cache.js";
import { MemoryCache } from "../src/memoryCache.js";

describe("MemoryCache", () => {
	it("returns null for an unknown key", async () => {
		const cache = new MemoryCache();
		expect(await cache.get("missing")).toBeNull();
	});

	it("round-trips a stored value", async () => {
		const cache = new MemoryCache();
		await cache.set("k", { name: "cafe" }, 60);
		expect(await cache.get("k")).toEqual({ name: "cafe" });
	});

	it("expires entries once the TTL passes", async () => {
		let clock = 1_000_000;
		const cache = new MemoryCache(() => clock);

		await cache.set("k", "value", 10);
		clock += 9_000;
		expect(await cache.get("k")).toBe("value");

		clock += 2_000;
		expect(await cache.get("k")).toBeNull();
	});

	it("evicts expired entries on read", async () => {
		let clock = 0;
		const cache = new MemoryCache(() => clock);
		await cache.set("k", "value", 1);
		clock += 5_000;
		await cache.get("k");
		expect(cache.size).toBe(0);
	});
});

describe("withCache", () => {
	it("calls the fetcher only once for repeated reads", async () => {
		const cache = new MemoryCache();
		const fetcher = vi.fn().mockResolvedValue(["a", "b"]);

		const first = await withCache(cache, "places:xyz", 300, fetcher);
		const second = await withCache(cache, "places:xyz", 300, fetcher);

		expect(first).toEqual(["a", "b"]);
		expect(second).toEqual(["a", "b"]);
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it("calls the fetcher again after expiry", async () => {
		let clock = 0;
		const cache = new MemoryCache(() => clock);
		const fetcher = vi.fn().mockResolvedValue("data");

		await withCache(cache, "k", 60, fetcher);
		clock += 61_000;
		await withCache(cache, "k", 60, fetcher);

		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it("caches falsy values without refetching", async () => {
		const cache = new MemoryCache();
		const fetcher = vi.fn().mockResolvedValue(0);

		await withCache(cache, "k", 60, fetcher);
		await withCache(cache, "k", 60, fetcher);

		expect(fetcher).toHaveBeenCalledTimes(1);
	});
});
