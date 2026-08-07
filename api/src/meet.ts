import {
	geometricMedian,
	type LatLng,
	type Minimize,
	rankCandidates,
	straightLineMatrix,
} from "@midpoint/optimizer";
import type { Place, PlacesQuery } from "@midpoint/places";

export class ValidationError extends Error {}

export interface MeetRequest {
	origins: LatLng[];
	category?: string;
	radiusMeters?: number;
	minimize?: Minimize;
	limit?: number;
}

export interface MeetCandidate {
	place: Place;
	maxCostMeters: number;
	averageCostMeters: number;
	fairnessGap: number;
}

export interface MeetResult {
	median: LatLng;
	candidates: MeetCandidate[];
}

export type PlacesFinder = (q: PlacesQuery) => Promise<Place[]>;

function validate(origins: readonly LatLng[]): void {
	if (!Array.isArray(origins) || origins.length === 0) {
		throw new ValidationError("at least one origin is required");
	}
	for (const o of origins) {
		if (!Number.isFinite(o?.lat) || o.lat < -90 || o.lat > 90) {
			throw new ValidationError("invalid latitude");
		}
		if (!Number.isFinite(o?.lng) || o.lng < -180 || o.lng > 180) {
			throw new ValidationError("invalid longitude");
		}
	}
}

export async function planMeet(
	req: MeetRequest,
	findPlacesFn: PlacesFinder,
): Promise<MeetResult> {
	const {
		origins,
		category = "cafe",
		radiusMeters = 2000,
		minimize = "max",
		limit = 5,
	} = req ?? {};

	validate(origins);

	const median = geometricMedian(origins).point;
	const places = await findPlacesFn({
		lat: median.lat,
		lng: median.lng,
		radiusMeters,
		category,
	});

	if (places.length === 0) return { median, candidates: [] };

	const matrix = straightLineMatrix(
		places.map((p) => ({ lat: p.lat, lng: p.lng })),
		origins,
	);
	const ranked = rankCandidates(places, matrix, { minimize });

	return {
		median,
		candidates: ranked.slice(0, limit).map((r) => ({
			place: r.candidate,
			maxCostMeters: Math.round(r.maxCost),
			averageCostMeters: Math.round(r.averageCost),
			fairnessGap: Math.round(r.fairnessGap),
		})),
	};
}
