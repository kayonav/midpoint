import type { Place } from "@midpoint/places";
import { describe, expect, it, vi } from "vitest";
import { planMeet, ValidationError } from "../src/meet.js";

const origins = [
	{ lat: 40.7, lng: -74.0 },
	{ lat: 40.72, lng: -74.02 },
	{ lat: 40.71, lng: -73.98 },
];

function place(id: number, lat: number, lng: number): Place {
	return { id, name: `Place ${id}`, lat, lng, category: "park" };
}

describe("planMeet", () => {
	it("queries places around the geometric median", async () => {
		const finder = vi.fn().mockResolvedValue([]);
		const result = await planMeet({ origins }, finder);

		const query = finder.mock.calls[0][0];
		expect(query.lat).toBeCloseTo(result.median.lat, 6);
		expect(query.lng).toBeCloseTo(result.median.lng, 6);
	});

	it("defaults to the food and drink vibe", async () => {
		const finder = vi.fn().mockResolvedValue([]);
		await planMeet({ origins }, finder);
		expect(finder.mock.calls[0][0].vibe).toBe("food_drink");
	});

	it("passes through the chosen vibe and radius", async () => {
		const finder = vi.fn().mockResolvedValue([]);
		await planMeet({ origins, vibe: "high_energy", radiusMeters: 500 }, finder);

		expect(finder.mock.calls[0][0].vibe).toBe("high_energy");
		expect(finder.mock.calls[0][0].radiusMeters).toBe(500);
	});

	it("ranks the nearest-to-everyone candidate first", async () => {
		const finder = vi
			.fn()
			.mockResolvedValue([place(1, 41.5, -73.0), place(2, 40.71, -74.0)]);

		const { candidates } = await planMeet({ origins }, finder);
		expect(candidates[0].place.id).toBe(2);
	});

	it("respects the limit", async () => {
		const finder = vi
			.fn()
			.mockResolvedValue([
				place(1, 40.71, -74.0),
				place(2, 40.72, -74.0),
				place(3, 40.73, -74.0),
			]);

		const { candidates } = await planMeet({ origins, limit: 2 }, finder);
		expect(candidates).toHaveLength(2);
	});

	it("returns no candidates when nothing is found", async () => {
		const finder = vi.fn().mockResolvedValue([]);
		const { candidates, median } = await planMeet({ origins }, finder);
		expect(candidates).toEqual([]);
		expect(median).toBeDefined();
	});

	it("rejects empty or invalid origins", async () => {
		const finder = vi.fn();
		await expect(planMeet({ origins: [] }, finder)).rejects.toThrow(
			ValidationError,
		);
		await expect(
			planMeet({ origins: [{ lat: 200, lng: 0 }] }, finder),
		).rejects.toThrow(ValidationError);
		expect(finder).not.toHaveBeenCalled();
	});

	it("rejects an unknown vibe without calling out", async () => {
		const finder = vi.fn();
		await expect(
			planMeet({ origins, vibe: "vibes_unknown" }, finder),
		).rejects.toThrow(ValidationError);
		expect(finder).not.toHaveBeenCalled();
	});
});
