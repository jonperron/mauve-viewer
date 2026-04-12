import type { DistanceMatrix, DistanceResult } from './types.ts';
import { buildAdjacencyGraph } from './adjacency-graph.ts';
import { buildBlockIdMap, lcbsToPermutationStrings, parsePermutationString } from './permutation.ts';

/**
 * Compute DCJ, breakpoint, and SCJ distances between two permutation strings.
 *
 * Formulas (from Yancopoulos et al. 2005, Feijao & Meidanis 2011):
 * - DCJ:        d = N - (C + I/2)
 * - Breakpoint: d = N - C₂ - floor(P₁/2)
 * - SCJ:        d = 2 * BP - P≥₂
 *
 * where N = blocks, C = cycles, I = odd paths,
 * C₂ = 2-cycles, P₁ = 1-paths (matched telomere pairs),
 * P≥₂ = paths of length >= 2.
 */
export function computeDistances(genomeX: string, genomeY: string): DistanceResult {
  const blockIdMap = buildBlockIdMap(genomeX, genomeY);
  const x = parsePermutationString(genomeX, blockIdMap, 'X');
  const y = parsePermutationString(genomeY, blockIdMap, 'Y');
  const stats = buildAdjacencyGraph(x, y);

  const N = blockIdMap.size;
  const dcj = N - (stats.cycles + Math.floor(stats.oddPaths / 2));
  const breakpoint = N - stats.len2Cycles - Math.floor(stats.len1Paths / 2);
  const scj = 2 * breakpoint - stats.pathsGte2;

  return { dcj, breakpoint, scj, blocks: N };
}

/** Compute pairwise distance matrix for multiple permutation strings */
export function computeDistanceMatrix(
  permutations: readonly string[],
  labels: readonly string[],
): DistanceMatrix {
  const n = permutations.length;
  const zero: DistanceResult = { dcj: 0, breakpoint: 0, scj: 0, blocks: 0 };
  const distances: DistanceResult[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => zero),
  );

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) {
      const d = computeDistances(permutations[i]!, permutations[j]!);
      distances[i]![j] = d;
      distances[j]![i] = d;
    }
  }

  return { labels: [...labels], distances };
}

/** Compute distance matrix directly from LCB data */
export function computeDistanceMatrixFromLcbs(
  lcbs: readonly {
    readonly id: number;
    readonly left: readonly number[];
    readonly right: readonly number[];
    readonly reverse: readonly boolean[];
  }[],
  genomeCount: number,
  genomeLabels: readonly string[],
): DistanceMatrix {
  const perms = lcbsToPermutationStrings(lcbs, genomeCount);
  return computeDistanceMatrix(perms, genomeLabels);
}
