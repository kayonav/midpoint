import { type Cache, withCache } from "@midpoint/cache";
import { fetchWithRetry, type RetryOptions } from "./retry.js";

export interface Place {
	id: number;
	name: string;
	lat: number;
	lng: number;
	category: string;
}

export interface PlacesQuery {
	lat: number;
	lng: number;
	radiusMeters: number;
	category: string;
}

export interface OverpassDeps {
	cache: Cache;
	fetchFn?: typeof fetch;
	endpoint?: string;
	ttlSeconds?: number;
	retry?: RetryOptions;
}

export const DEFAULT_ENDPOINT = "https://overpass-api.de/api/interpreter";

/**
 * Overpass rejects requests with a default or missing User-Agent (HTTP 406)
 * and asks clients to identify themselves. Do not remove this.
 */
export const USER_AGENT = "midpoint/0.1 (github.com/kayonav/midpoint)";

const DEFAULT_TTL = 60 * 60 * 24;

interface OverpassElement {
	id: number;
	lat?: number;
	lon?: number;
	center?: { lat: number; lon: number };
	tags?: Record<string, string>;
}

export function buildQuery(q: PlacesQuery): string {
	return `[out:json][timeout:25];
nwr["amenity"="${q.category}"](around:${q.radiusMeters},${q.lat},${q.lng});
out center 50;`;
}

/**
 * Cache keys quantize coordinates to 4 decimals (~11m). Weiszfeld returns a
 * slightly different float each run for effectively the same point, so without
 * rounding every request is a fresh key and the cache never hits.
 */
export function cacheKey(q: PlacesQuery): string {
	const r = (n: number) => n.toFixed(4);
	return `places:${q.category}:${r(q.lat)},${r(q.lng)}:${q.radiusMeters}`;
}

export function parseElements(
	elements: readonly OverpassElement[],
	category: string,
): Place[] {
	const places: Place[] = [];
	for (const el of elements) {
		const name = el.tags?.name;
		if (!name) continue;

		const lat = el.lat ?? el.center?.lat;
		const lon = el.lon ?? el.center?.lon;
		if (lat === undefined || lon === undefined) continue;

		places.push({ id: el.id, name, lat, lng: lon, category });
	}
	return places;
}

export async function findPlaces(
	q: PlacesQuery,
	deps: OverpassDeps,
): Promise<Place[]> {
	const {
		cache,
		fetchFn = fetch,
		endpoint = DEFAULT_ENDPOINT,
		ttlSeconds = DEFAULT_TTL,
		retry,
	} = deps;

	return withCache(cache, cacheKey(q), ttlSeconds, async () => {
		const res = await fetchWithRetry(
			fetchFn,
			endpoint,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"User-Agent": USER_AGENT,
				},
				body: `data=${encodeURIComponent(buildQuery(q))}`,
			},
			retry,
		);

		if (!res.ok) {
			throw new Error(`Overpass request failed: ${res.status}`);
		}

		const body = (await res.json()) as { elements?: OverpassElement[] };
		return parseElements(body.elements ?? [], q.category);
	});
}
