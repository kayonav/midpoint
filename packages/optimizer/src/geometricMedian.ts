import { centroid } from "./centroid.js";
import { dist, toLatLng, toXY, type XY } from "./geo.js";
import type { LatLng } from "./types.js";

export interface MedianOptions {
	/** Stop when the step size falls below this, in meters. */
	tolerance?: number;
	maxIterations?: number;
}

export interface MedianResult {
	point: LatLng;
	iterations: number;
	converged: boolean;
}

/**
 * Geometric median via Weiszfeld's algorithm. Minimizes the SUM of distances
 * to all inputs, where the centroid minimizes the sum of SQUARED distances.
 * That squaring is what lets one distant participant drag the centroid toward
 * them, so the median is far more resistant to an outlier.
 */
export function geometricMedian(
	points: readonly LatLng[],
	{ tolerance = 1, maxIterations = 200 }: MedianOptions = {},
): MedianResult {
	if (points.length === 0) throw new Error("geometricMedian: no points given");
	if (points.length === 1) {
		return { point: points[0], iterations: 0, converged: true };
	}

	const ref = points[0];
	const xs = points.map((p) => toXY(p, ref));

	let current: XY = toXY(centroid(points), ref);

	for (let i = 1; i <= maxIterations; i++) {
		let numX = 0;
		let numY = 0;
		let denom = 0;
		let coincident = false;

		for (const x of xs) {
			const d = dist(x, current);
			if (d < 1e-6) {
				coincident = true;
				break;
			}
			numX += x[0] / d;
			numY += x[1] / d;
			denom += 1 / d;
		}

		if (coincident) {
			return { point: toLatLng(current, ref), iterations: i, converged: true };
		}

		const next: XY = [numX / denom, numY / denom];
		const step = dist(next, current);
		current = next;

		if (step < tolerance) {
			return { point: toLatLng(current, ref), iterations: i, converged: true };
		}
	}

	return {
		point: toLatLng(current, ref),
		iterations: maxIterations,
		converged: false,
	};
}
