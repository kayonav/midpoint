import type { LatLng } from "./types.js";

export function centroid(points: readonly LatLng[]): LatLng {
	if (points.length === 0) throw new Error("centroid: no points given");
	const n = points.length;
	return {
		lat: points.reduce((s, p) => s + p.lat, 0) / n,
		lng: points.reduce((s, p) => s + p.lng, 0) / n,
	};
}
