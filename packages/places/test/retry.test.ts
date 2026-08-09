import { describe, expect, it, vi } from "vitest";
import { fetchWithRetry } from "../src/retry.js";

function res(status: number): Response {
	return { ok: status >= 200 && status < 300, status } as Response;
}

const noSleep = async () => {};

describe("fetchWithRetry", () => {
	it("returns immediately on success", async () => {
		const fetchFn = vi.fn().mockResolvedValue(res(200));
		const out = await fetchWithRetry(fetchFn, "u", {}, { sleep: noSleep });

		expect(out.status).toBe(200);
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	it("retries a 504 and succeeds", async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValueOnce(res(504))
			.mockResolvedValueOnce(res(200));

		const out = await fetchWithRetry(fetchFn, "u", {}, { sleep: noSleep });

		expect(out.status).toBe(200);
		expect(fetchFn).toHaveBeenCalledTimes(2);
	});

	it("retries rate limits", async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValueOnce(res(429))
			.mockResolvedValueOnce(res(200));

		await fetchWithRetry(fetchFn, "u", {}, { sleep: noSleep });
		expect(fetchFn).toHaveBeenCalledTimes(2);
	});

	it("does not retry a client error", async () => {
		const fetchFn = vi.fn().mockResolvedValue(res(400));
		const out = await fetchWithRetry(fetchFn, "u", {}, { sleep: noSleep });

		expect(out.status).toBe(400);
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	it("gives up after the attempt limit", async () => {
		const fetchFn = vi.fn().mockResolvedValue(res(504));
		const out = await fetchWithRetry(
			fetchFn,
			"u",
			{},
			{ attempts: 3, sleep: noSleep },
		);

		expect(out.status).toBe(504);
		expect(fetchFn).toHaveBeenCalledTimes(3);
	});

	it("retries network errors and rethrows the last one", async () => {
		const fetchFn = vi.fn().mockRejectedValue(new Error("ECONNRESET"));

		await expect(
			fetchWithRetry(fetchFn, "u", {}, { attempts: 2, sleep: noSleep }),
		).rejects.toThrow("ECONNRESET");
		expect(fetchFn).toHaveBeenCalledTimes(2);
	});

	it("backs off exponentially", async () => {
		const fetchFn = vi.fn().mockResolvedValue(res(504));
		const sleep = vi.fn().mockResolvedValue(undefined);

		await fetchWithRetry(
			fetchFn,
			"u",
			{},
			{ attempts: 3, baseDelayMs: 500, sleep },
		);

		expect(sleep).toHaveBeenNthCalledWith(1, 500);
		expect(sleep).toHaveBeenNthCalledWith(2, 1000);
	});
});
