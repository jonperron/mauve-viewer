import type { GrimmResult, Reversal } from './types.ts';

const MAX_ELEMENTS = 100_000;

/**
 * Build the breakpoint graph for a signed permutation and count alternating cycles.
 *
 * For a signed permutation π = (π₁, ..., πₙ):
 * 1. Create pair representation: each πᵢ → (2|πᵢ|-1, 2|πᵢ|) or reversed if negative
 * 2. Prepend 0, append 2n+1
 * 3. "Reality" edges: consecutive pairs in the actual sequence
 * 4. "Desire" edges: (2i, 2i+1) for i = 0..n
 * 5. Count alternating cycles
 */
function countBreakpointCycles(perm: readonly number[]): number {
  const n = perm.length;
  if (n === 0) return 1;

  // Build the pair representation
  const pairs: number[] = [0]; // sentinel
  for (const elem of perm) {
    const abs = Math.abs(elem);
    if (elem > 0) {
      pairs.push(2 * abs - 1, 2 * abs);
    } else {
      pairs.push(2 * abs, 2 * abs - 1);
    }
  }
  pairs.push(2 * n + 1); // sentinel

  // Reality edges: pair (pairs[2i], pairs[2i+1]) for i = 0..n
  // Desire edges: pair (2i, 2i+1) for i = 0..n
  // Build adjacency: for each vertex, store its two neighbors (one reality, one desire)
  const size = 2 * n + 2;
  const realityNeighbor = new Int32Array(size).fill(-1);
  const desireNeighbor = new Int32Array(size).fill(-1);

  for (let i = 0; i <= n; i++) {
    const a = pairs[2 * i]!;
    const b = pairs[2 * i + 1]!;
    realityNeighbor[a] = b;
    realityNeighbor[b] = a;
    desireNeighbor[2 * i] = 2 * i + 1;
    desireNeighbor[2 * i + 1] = 2 * i;
  }

  // Count alternating cycles by traversing: reality → desire → reality → ...
  const visited = new Uint8Array(size);
  let cycles = 0;

  for (let v = 0; v < size; v++) {
    if (visited[v]) continue;
    // Traverse alternating cycle starting with reality edge from v
    let current = v;
    let useReality = true;
    while (!visited[current]) {
      visited[current] = 1;
      const next = useReality ? realityNeighbor[current]! : desireNeighbor[current]!;
      if (next === -1) break;
      useReality = !useReality;
      current = next;
    }
    cycles++;
  }

  return cycles;
}

/** Count signed breakpoints in a permutation (adjacent pairs that aren't consecutive) */
function countBreakpoints(perm: readonly number[]): number {
  if (perm.length === 0) return 0;
  let count = 0;
  // Left boundary: breakpoint if first element isn't +1
  if (perm[0] !== 1) count++;
  // Internal breakpoints
  for (let i = 1; i < perm.length; i++) {
    if (perm[i] !== perm[i - 1]! + 1) count++;
  }
  // Right boundary: breakpoint if last element isn't +n
  if (perm[perm.length - 1] !== perm.length) count++;
  return count;
}

/**
 * Apply a reversal to a signed permutation (immutable).
 * Reversal of [start, end] reverses the order and negates the signs.
 */
function applyReversal(perm: readonly number[], start: number, end: number): readonly number[] {
  const result = [...perm];
  let i = start;
  let j = end;
  while (i < j) {
    const tmp = result[i]!;
    result[i] = -result[j]!;
    result[j] = -tmp;
    i++;
    j--;
  }
  if (i === j) {
    result[i] = -result[i]!;
  }
  return result;
}

/**
 * Find a greedy sorting reversal.
 * Processes left-to-right: find the position where element should go,
 * reverse to place it, then fix its sign if needed.
 */
function findGreedyReversal(perm: readonly number[]): Reversal | undefined {
  const n = perm.length;
  for (let i = 0; i < n; i++) {
    const expected = i + 1;
    if (perm[i] === expected) continue;

    // Find where expected or -expected is
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(perm[j]!) === expected) {
        return { start: i, end: j };
      }
    }
    // Element at position i has wrong sign
    if (perm[i] === -expected) {
      return { start: i, end: i };
    }
  }
  return undefined;
}

/**
 * Compute GRIMM-style rearrangement analysis for a signed permutation.
 *
 * The reversal distance for a signed permutation on a single linear chromosome
 * is computed using the breakpoint graph: d = n + 1 - c
 * where n = elements and c = alternating cycles.
 *
 * A sorting scenario is found using a greedy approach (not guaranteed minimal).
 */
export function analyzePermutation(perm: readonly number[]): GrimmResult {
  if (perm.length > MAX_ELEMENTS) {
    throw new Error(`Permutation too large (max ${MAX_ELEMENTS} elements)`);
  }

  const n = perm.length;
  const cycleCount = countBreakpointCycles(perm);
  const reversalDistance = n + 1 - cycleCount;
  const breakpointCount = countBreakpoints(perm);

  // Find sorting scenario via greedy approach
  const scenario: Reversal[] = [];
  let current = [...perm];
  const maxIterations = 2 * n + 10; // safety bound
  let iterations = 0;

  while (iterations < maxIterations) {
    const rev = findGreedyReversal(current);
    if (!rev) break;
    scenario.push(rev);
    current = [...applyReversal(current, rev.start, rev.end)];
    iterations++;
  }

  return {
    reversalDistance,
    cycleCount,
    breakpointCount,
    scenario,
    permutation: perm,
  };
}

/**
 * Convert an LCB-based permutation string to a numeric signed permutation.
 * Input format: "1,-3,2$" → [1, -3, 2]
 * Only the first contig is used (GRIMM operates on single chromosomes).
 */
export function permutationStringToArray(input: string): readonly number[] {
  const firstContig = input.split('$')[0] ?? '';
  return firstContig
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => {
      const num = Number(s);
      if (!Number.isFinite(num) || num === 0) {
        throw new Error(`Invalid permutation element: ${s}`);
      }
      return num;
    });
}
