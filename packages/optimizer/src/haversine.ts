import type { LatLng } from "./types.js";

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in meters. */
export function haversine(a: LatLng, b: LatLng): number {
	const dLat = rad(b.lat - a.lat);
	const dLng = rad(b.lng - a.lng);
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Straight-line cost matrix: result[i][j] is the distance from origin j to
 * candidate i, matching the shape rankCandidates expects.
 *
 * This is a placeholder for a real routing matrix. It ignores roads, transit
 * and one-way streets, so it systematically understates cost — swapping in
 * OSRM later changes only this function, not the ranking.
 */
export function straightLineMatrix(
	candidates: readonly LatLng[],
	origins: readonly LatLng[],
): number[][] {
	return candidates.map((c) => origins.map((o) => haversine(o, c)));
}
