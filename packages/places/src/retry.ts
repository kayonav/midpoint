/** Statuses worth retrying: rate limits and transient gateway failures. */
export const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

export interface RetryOptions {
	attempts?: number;
	baseDelayMs?: number;
	/** Injectable so tests don't actually wait. */
	sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Fetch with exponential backoff on transient failures.
 *
 * Overpass is a free, volunteer-run service that returns 504 under load often
 * enough that a single attempt is not a usable strategy. Client errors (400,
 * 404) are returned immediately — retrying a malformed query just wastes
 * someone else's compute.
 */
export async function fetchWithRetry(
	fetchFn: typeof fetch,
	url: string,
	init: RequestInit,
	{ attempts = 3, baseDelayMs = 500, sleep = defaultSleep }: RetryOptions = {},
): Promise<Response> {
	let lastError: unknown;

	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			const res = await fetchFn(url, init);
			if (res.ok || !RETRYABLE_STATUS.has(res.status)) return res;
			if (attempt === attempts) return res;
		} catch (err) {
			lastError = err;
			if (attempt === attempts) throw err;
		}

		await sleep(baseDelayMs * 2 ** (attempt - 1));
	}

	throw lastError;
}
