import { describe, expect, it } from "vitest";
import { rankCandidates } from "../src/rank.js";

describe("rankCandidates", () => {
	it("orders by worst individual cost by default", () => {
		const ranked = rankCandidates(
			["a", "b", "c"],
			[
				[10, 10, 10],
				[5, 5, 40],
				[8, 9, 9],
			],
		);
		expect(ranked.map((r) => r.candidate)).toEqual(["c", "a", "b"]);
	});

	it("picks a different winner when minimizing the average", () => {
		const candidates = ["even", "lopsided"];
		const costs = [
			[10, 10, 10, 10],
			[1, 1, 1, 30],
		];

		const byMax = rankCandidates(candidates, costs, { minimize: "max" });
		const byAverage = rankCandidates(candidates, costs, {
			minimize: "average",
		});

		expect(byMax[0].candidate).toBe("even");
		expect(byAverage[0].candidate).toBe("lopsided");
	});

	it("reports max, average and fairness gap", () => {
		const [only] = rankCandidates(["x"], [[2, 4, 12]]);
		expect(only.maxCost).toBe(12);
		expect(only.averageCost).toBeCloseTo(6);
		expect(only.fairnessGap).toBe(10);
	});

	it("breaks score ties on the tighter spread", () => {
		const ranked = rankCandidates(
			["wide", "tight"],
			[
				[2, 10],
				[9, 10],
			],
		);
		expect(ranked[0].candidate).toBe("tight");
	});

	it("handles a single origin", () => {
		const ranked = rankCandidates(["far", "near"], [[100], [5]]);
		expect(ranked[0].candidate).toBe("near");
		expect(ranked[0].fairnessGap).toBe(0);
	});

	it("throws when the matrix does not match the candidates", () => {
		expect(() => rankCandidates(["a", "b"], [[1, 2]])).toThrow();
	});

	it("throws on a ragged matrix", () => {
		expect(() => rankCandidates(["a", "b"], [[1, 2], [3]])).toThrow();
	});

	it("throws on empty candidates", () => {
		expect(() => rankCandidates([], [])).toThrow();
	});

	it("throws on a negative or non-finite cost", () => {
		expect(() => rankCandidates(["a"], [[1, -5]])).toThrow();
		expect(() => rankCandidates(["a"], [[1, Number.NaN]])).toThrow();
	});
});
