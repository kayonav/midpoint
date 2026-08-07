import { MemoryCache } from "@midpoint/cache";

import { describe, expect, it, vi } from "vitest";

import {
	buildQuery,
	cacheKey,
	findPlaces,
	type PlacesQuery,
	parseElements,
} from "../src/overpass.js";

const query: PlacesQuery = {
	lat: 40.7128,

	lng: -74.006,

	radiusMeters: 1500,

	category: "cafe",
};

function fakeResponse(payload: unknown, ok = true, status = 200): Response {
	return { ok, status, json: async () => payload } as Response;
}

describe("buildQuery", () => {
	it("includes the category, radius and coordinates", () => {
		const q = buildQuery(query);

		expect(q).toContain('"amenity"="cafe"');

		expect(q).toContain("around:1500,40.7128,-74.006");
	});
});

describe("cacheKey", () => {
	it("is stable for coordinates differing below ~11m", () => {
		expect(cacheKey(query)).toBe(
			cacheKey({ ...query, lat: 40.71280004, lng: -74.00599998 }),
		);
	});

	it("differs for meaningfully different coordinates", () => {
		expect(cacheKey(query)).not.toBe(cacheKey({ ...query, lat: 40.75 }));
	});

	it("differs by category and radius", () => {
		expect(cacheKey(query)).not.toBe(cacheKey({ ...query, category: "bar" }));

		expect(cacheKey(query)).not.toBe(
			cacheKey({ ...query, radiusMeters: 3000 }),
		);
	});
});

describe("parseElements", () => {
	it("maps nodes to places", () => {
		expect(
			parseElements(
				[{ id: 1, lat: 40.7, lon: -74.0, tags: { name: "Cafe One" } }],

				"cafe",
			),
		).toEqual([
			{ id: 1, name: "Cafe One", lat: 40.7, lng: -74.0, category: "cafe" },
		]);
	});

	it("uses center for ways and relations", () => {
		const places = parseElements(
			[{ id: 2, center: { lat: 41, lon: -73 }, tags: { name: "Big Cafe" } }],

			"cafe",
		);

		expect(places[0].lat).toBe(41);

		expect(places[0].lng).toBe(-73);
	});

	it("drops unnamed elements", () => {
		expect(parseElements([{ id: 3, lat: 40, lon: -74 }], "cafe")).toEqual([]);
	});

	it("drops elements with no usable coordinates", () => {
		expect(parseElements([{ id: 4, tags: { name: "Ghost" } }], "cafe")).toEqual(
			[],
		);
	});
});

describe("findPlaces", () => {
	it("fetches once and serves the second call from cache", async () => {
		const cache = new MemoryCache();

		const fetchFn = vi.fn().mockResolvedValue(
			fakeResponse({
				elements: [{ id: 1, lat: 40.7, lon: -74.0, tags: { name: "Cafe" } }],
			}),
		);

		const first = await findPlaces(query, { cache, fetchFn });

		const second = await findPlaces(query, { cache, fetchFn });

		expect(first).toHaveLength(1);

		expect(second).toEqual(first);

		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	it("posts the query to the Overpass endpoint", async () => {
		const cache = new MemoryCache();

		const fetchFn = vi.fn().mockResolvedValue(fakeResponse({ elements: [] }));

		await findPlaces(query, { cache, fetchFn, endpoint: "http://test/api" });

		const [url, init] = fetchFn.mock.calls[0];

		expect(url).toBe("http://test/api");

		expect(init.method).toBe("POST");

		expect(decodeURIComponent(init.body)).toContain('"amenity"="cafe"');
	});

	it("throws on a non-ok response", async () => {
		const cache = new MemoryCache();

		const fetchFn = vi.fn().mockResolvedValue(fakeResponse(null, false, 429));

		await expect(findPlaces(query, { cache, fetchFn })).rejects.toThrow("429");
	});

	it("does not cache a failed request", async () => {
		const cache = new MemoryCache();

		const fetchFn = vi

			.fn()

			.mockResolvedValueOnce(fakeResponse(null, false, 500))

			.mockResolvedValueOnce(fakeResponse({ elements: [] }));

		await expect(findPlaces(query, { cache, fetchFn })).rejects.toThrow();

		await expect(findPlaces(query, { cache, fetchFn })).resolves.toEqual([]);

		expect(fetchFn).toHaveBeenCalledTimes(2);
	});

	it("handles a response with no elements array", async () => {
		const cache = new MemoryCache();

		const fetchFn = vi.fn().mockResolvedValue(fakeResponse({}));

		await expect(findPlaces(query, { cache, fetchFn })).resolves.toEqual([]);
	});
});
