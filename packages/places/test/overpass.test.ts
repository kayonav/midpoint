import { MemoryCache } from "@midpoint/cache";
import { describe, expect, it, vi } from "vitest";
import {
	buildQuery,
	cacheKey,
	findPlaces,
	type PlacesQuery,
	parseElements,
} from "../src/overpass.js";
import { getVibe } from "../src/vibes.js";

const query: PlacesQuery = {
	lat: 40.7128,
	lng: -74.006,
	radiusMeters: 1500,
	vibe: "chill_scenic",
};

const scenicFilters = getVibe("chill_scenic").filters;

function fakeResponse(payload: unknown, ok = true, status = 200): Response {
	return { ok, status, json: async () => payload } as Response;
}

describe("buildQuery", () => {
	it("emits one clause per filter inside a union", () => {
		const q = buildQuery(query);
		expect(q).toContain('nwr["leisure"="park"]');
		expect(q).toContain('nwr["tourism"="viewpoint"]');
		expect(q).toContain('nwr["natural"="beach"]');
		expect(q).toContain("(\n");
		expect(q).toContain(");");
	});

	it("applies the radius and coordinates to every clause", () => {
		const q = buildQuery(query);
		const clauses = q.split("\n").filter((l) => l.includes("nwr["));
		expect(clauses.length).toBe(scenicFilters.length);
		for (const clause of clauses) {
			expect(clause).toContain("around:1500,40.7128,-74.006");
		}
	});

	it("throws on an unknown vibe", () => {
		expect(() => buildQuery({ ...query, vibe: "nope" })).toThrow(
			"unknown vibe",
		);
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

	it("differs by vibe and radius", () => {
		expect(cacheKey(query)).not.toBe(
			cacheKey({ ...query, vibe: "high_energy" }),
		);
		expect(cacheKey(query)).not.toBe(
			cacheKey({ ...query, radiusMeters: 3000 }),
		);
	});
});

describe("parseElements", () => {
	it("labels a place with the tag value it matched", () => {
		expect(
			parseElements(
				[
					{
						id: 1,
						lat: 40.7,
						lon: -74.0,
						tags: { name: "Overlook", tourism: "viewpoint" },
					},
				],
				scenicFilters,
			),
		).toEqual([
			{ id: 1, name: "Overlook", lat: 40.7, lng: -74.0, category: "viewpoint" },
		]);
	});

	it("uses center for ways and relations", () => {
		const places = parseElements(
			[
				{
					id: 2,
					center: { lat: 41, lon: -73 },
					tags: { name: "Big Park", leisure: "park" },
				},
			],
			scenicFilters,
		);
		expect(places[0].lat).toBe(41);
		expect(places[0].lng).toBe(-73);
		expect(places[0].category).toBe("park");
	});

	it("drops unnamed elements", () => {
		expect(
			parseElements(
				[{ id: 3, lat: 40, lon: -74, tags: { leisure: "park" } }],
				scenicFilters,
			),
		).toEqual([]);
	});

	it("drops elements with no usable coordinates", () => {
		expect(
			parseElements(
				[{ id: 4, tags: { name: "Ghost", leisure: "park" } }],
				scenicFilters,
			),
		).toEqual([]);
	});

	it("drops elements matching no filter", () => {
		expect(
			parseElements(
				[{ id: 5, lat: 40, lon: -74, tags: { name: "Cafe", amenity: "cafe" } }],
				scenicFilters,
			),
		).toEqual([]);
	});
});

describe("findPlaces", () => {
	const payload = {
		elements: [
			{ id: 1, lat: 40.7, lon: -74.0, tags: { name: "Park", leisure: "park" } },
		],
	};

	it("fetches once and serves the second call from cache", async () => {
		const cache = new MemoryCache();
		const fetchFn = vi.fn().mockResolvedValue(fakeResponse(payload));

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
		expect(init.headers["User-Agent"]).toContain("midpoint");
		expect(decodeURIComponent(init.body)).toContain('"leisure"="park"');
	});

	it("throws on a non-ok response", async () => {
		const cache = new MemoryCache();
		const fetchFn = vi.fn().mockResolvedValue(fakeResponse(null, false, 429));

		await expect(
			findPlaces(query, { cache, fetchFn, retry: { attempts: 1 } }),
		).rejects.toThrow("429");
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
