import { describe, expect, it } from "vitest";
import { centroid } from "../src/centroid.js";
import { toLatLng, toXY } from "../src/geo.js";

describe("centroid", () => {
	it("returns the point itself for a single input", () => {
		expect(centroid([{ lat: 40, lng: -74 }])).toEqual({ lat: 40, lng: -74 });
	});

	it("returns the center of a symmetric square", () => {
		const c = centroid([
			{ lat: 0, lng: 0 },
			{ lat: 0, lng: 2 },
			{ lat: 2, lng: 0 },
			{ lat: 2, lng: 2 },
		]);
		expect(c.lat).toBeCloseTo(1);
		expect(c.lng).toBeCloseTo(1);
	});

	it("throws on empty input", () => {
		expect(() => centroid([])).toThrow();
	});
});

describe("projection", () => {
	it("round-trips back to the original coordinates", () => {
		const ref = { lat: 40.71, lng: -74.0 };
		const p = { lat: 40.75, lng: -73.98 };
		const back = toLatLng(toXY(p, ref), ref);
		expect(back.lat).toBeCloseTo(p.lat, 6);
		expect(back.lng).toBeCloseTo(p.lng, 6);
	});

	it("shrinks longitude distance at high latitude", () => {
		const oneDegLngAtEquator = toXY({ lat: 0, lng: 1 }, { lat: 0, lng: 0 })[0];
		const oneDegLngAt60N = toXY({ lat: 60, lng: 1 }, { lat: 60, lng: 0 })[0];
		expect(oneDegLngAt60N).toBeCloseTo(oneDegLngAtEquator * 0.5, -3);
	});
});
