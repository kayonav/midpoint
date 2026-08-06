import { describe, expect, it } from "vitest";
import { haversine, straightLineMatrix } from "../src/haversine.js";

describe("haversine", () => {
	it("is zero for identical points", () => {
		expect(haversine({ lat: 40, lng: -74 }, { lat: 40, lng: -74 })).toBe(0);
	});

	it("gives about 111km for one degree of latitude", () => {
		const d = haversine({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
		expect(d).toBeGreaterThan(110_000);
		expect(d).toBeLessThan(112_000);
	});

	it("matches the known NYC to LA distance", () => {
		const d = haversine(
			{ lat: 40.7128, lng: -74.006 },
			{ lat: 34.0522, lng: -118.2437 },
		);
		expect(d / 1000).toBeCloseTo(3936, -2);
	});

	it("is symmetric", () => {
		const a = { lat: 51.5, lng: -0.12 };
		const b = { lat: 48.85, lng: 2.35 };
		expect(haversine(a, b)).toBeCloseTo(haversine(b, a), 6);
	});
});

describe("straightLineMatrix", () => {
	it("returns one row per candidate and one column per origin", () => {
		const m = straightLineMatrix(
			[
				{ lat: 0, lng: 0 },
				{ lat: 1, lng: 1 },
			],
			[
				{ lat: 0, lng: 0 },
				{ lat: 2, lng: 2 },
				{ lat: 3, lng: 3 },
			],
		);
		expect(m).toHaveLength(2);
		expect(m[0]).toHaveLength(3);
	});

	it("puts zero where a candidate sits on an origin", () => {
		const m = straightLineMatrix([{ lat: 5, lng: 5 }], [{ lat: 5, lng: 5 }]);
		expect(m[0][0]).toBe(0);
	});
});
