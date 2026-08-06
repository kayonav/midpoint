export type Minimize = "max" | "average";

export interface RankOptions {
	minimize?: Minimize;
}

export interface RankedCandidate<T> {
	candidate: T;

	costs: readonly number[];

	maxCost: number;

	averageCost: number;

	score: number;

	fairnessGap: number;
}

/**

 * Rank candidates by travel cost across all origins.

 *

 * costMatrix[i][j] is the cost from origin j to candidate i.

 *

 * Defaults to minimizing the MAXIMUM individual cost rather than the average.

 * A venue that is 5 minutes from four people and 50 from the fifth has a good

 * average and is not fair — minimizing the max is what makes the result

 * defensible to the person who would otherwise absorb the whole burden.

 */

export function rankCandidates<T>(
	candidates: readonly T[],

	costMatrix: readonly (readonly number[])[],

	{ minimize = "max" }: RankOptions = {},
): RankedCandidate<T>[] {
	if (candidates.length === 0) {
		throw new Error("rankCandidates: no candidates given");
	}

	if (costMatrix.length !== candidates.length) {
		throw new Error("rankCandidates: cost matrix does not match candidates");
	}

	const originCount = costMatrix[0].length;

	if (originCount === 0) {
		throw new Error("rankCandidates: no origins given");
	}

	const ranked = candidates.map((candidate, i) => {
		const costs = costMatrix[i];

		if (costs.length !== originCount) {
			throw new Error("rankCandidates: ragged cost matrix");
		}

		for (const c of costs) {
			if (!Number.isFinite(c) || c < 0) {
				throw new Error("rankCandidates: invalid cost");
			}
		}

		const maxCost = Math.max(...costs);

		const minCost = Math.min(...costs);

		const averageCost = costs.reduce((s, c) => s + c, 0) / originCount;

		return {
			candidate,

			costs,

			maxCost,

			averageCost,

			score: minimize === "max" ? maxCost : averageCost,

			fairnessGap: maxCost - minCost,
		};
	});

	return ranked.sort(
		(a, b) =>
			a.score - b.score ||
			a.fairnessGap - b.fairnessGap ||
			a.averageCost - b.averageCost,
	);
}
