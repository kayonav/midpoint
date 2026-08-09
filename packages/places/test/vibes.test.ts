import { describe, expect, it } from "vitest";
import { DEFAULT_VIBE, getVibe, matchFilter, VIBES } from "../src/vibes.js";

describe("VIBES", () => {
	it("has a unique id for every vibe", () => {
		const ids = VIBES.map((v) => v.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("gives every vibe at least one filter", () => {
		for (const vibe of VIBES) {
			expect(vibe.filters.length).toBeGreaterThan(0);
		}
	});

	it("uses a real vibe id as the default", () => {
		expect(VIBES.some((v) => v.id === DEFAULT_VIBE)).toBe(true);
	});

	it("spans more than one OSM tag key", () => {
		const keys = new Set(VIBES.flatMap((v) => v.filters.map((f) => f.key)));
		expect(keys.size).toBeGreaterThan(1);
	});
});

describe("getVibe", () => {
	it("returns the matching vibe", () => {
		expect(getVibe("chill_scenic").label).toBe("Chill & scenic");
	});

	it("throws on an unknown id", () => {
		expect(() => getVibe("nonsense")).toThrow("unknown vibe");
	});
});

describe("matchFilter", () => {
	it("finds the filter an element matched", () => {
		const filters = getVibe("chill_scenic").filters;
		const match = matchFilter(
			{ tourism: "viewpoint", name: "Overlook" },
			filters,
		);
		expect(match).toEqual({ key: "tourism", value: "viewpoint" });
	});

	it("returns undefined when nothing matches", () => {
		const filters = getVibe("chill_scenic").filters;
		expect(matchFilter({ amenity: "cafe" }, filters)).toBeUndefined();
	});

	it("returns undefined for missing tags", () => {
		expect(
			matchFilter(undefined, getVibe("food_drink").filters),
		).toBeUndefined();
	});
});
