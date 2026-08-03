import { describe, expect, it } from "vitest";
import { centroid } from "../src/centroid.js";
import { geometricMedian } from "../src/geometricMedian.js";

describe("geometricMedian", () => {
	it("returns the center for a symmetric square", () => {
		const { point } = geometricMedian([
			{ lat: 0, lng: 0 },
			{ lat: 0, lng: 2 },
			{ lat: 2, lng: 0 },
			{ lat: 2, lng: 2 },
		]);
		expect(point.lat).toBeCloseTo(1, 3);
		expect(point.lng).toBeCloseTo(1, 3);
	});

	it("returns the middle point for an odd collinear set", () => {
		const { point } = geometricMedian([
			{ lat: 0, lng: 0 },
			{ lat: 0, lng: 1 },
			{ lat: 0, lng: 5 },
		]);
		expect(point.lng).toBeCloseTo(1, 2);
	});

	it("resists a single distant outlier better than the centroid", () => {
		const pts = [
			{ lat: 40.7, lng: -74.0 },
			{ lat: 40.71, lng: -74.01 },
			{ lat: 40.72, lng: -74.0 },
			{ lat: 40.71, lng: -73.99 },
			{ lat: 41.5, lng: -73.0 },
		];
		const med = geometricMedian(pts).point;
		const cen = centroid(pts);
		expect(Math.abs(med.lat - 40.71)).toBeLessThan(Math.abs(cen.lat - 40.71));
		expect(Math.abs(med.lng + 74.0)).toBeLessThan(Math.abs(cen.lng + 74.0));
	});

	it("handles duplicate points without producing NaN", () => {
		const { point } = geometricMedian([
			{ lat: 1, lng: 1 },
			{ lat: 1, lng: 1 },
			{ lat: 1, lng: 1 },
		]);
		expect(Number.isFinite(point.lat)).toBe(true);
		expect(Number.isFinite(point.lng)).toBe(true);
	});

	it("returns the single point unchanged", () => {
		const { point, converged } = geometricMedian([{ lat: 5, lng: 5 }]);
		expect(point).toEqual({ lat: 5, lng: 5 });
		expect(converged).toBe(true);
	});

	it("throws on empty input", () => {
		expect(() => geometricMedian([])).toThrow();
	});

	it("converges well inside the iteration cap", () => {
		const { converged, iterations } = geometricMedian([
			{ lat: 51.5, lng: -0.12 },
			{ lat: 51.52, lng: -0.09 },
			{ lat: 51.48, lng: -0.15 },
			{ lat: 51.55, lng: -0.05 },
		]);
		expect(converged).toBe(true);
		expect(iterations).toBeLessThan(50);
	});
});
