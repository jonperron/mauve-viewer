import type { AdjacencyGraphStats, Permutation } from './types.ts';
import { HEAD_TAG, TAIL_TAG, TELOMERE } from './types.ts';

/**
 * Link an endpoint from genome A to the corresponding adjacency in genome B.
 * Finds which B-adjacency contains this block endpoint and adds edges
 * in both directions in the neighbor list.
 */
function linkEndpoint(
  endpoint: string,
  aIndex: number,
  bLocations: ReadonlyMap<string, readonly [number, number]>,
  bOffset: number,
  neighbors: number[][],
): void {
  if (endpoint === TELOMERE) return;
  const isHead = endpoint.endsWith(HEAD_TAG);
  const blockName = isHead
    ? endpoint.slice(0, -HEAD_TAG.length)
    : endpoint.slice(0, -TAIL_TAG.length);
  const loc = bLocations.get(blockName);
  if (!loc) return;
  const bIdx = bOffset + (isHead ? loc[1] : loc[0]);
  neighbors[aIndex]!.push(bIdx);
  neighbors[bIdx]!.push(aIndex);
}

/**
 * Traverse a connected component via iterative DFS.
 * Returns edge count and whether the component is a cycle.
 *
 * In the adjacency graph, every node has degree <= 2, so components
 * are either simple paths or simple cycles.
 * - Cycle: edges === nodes
 * - Path: edges === nodes - 1
 */
function traverseComponent(
  start: number,
  neighbors: readonly (readonly number[])[],
  visited: Set<number>,
): { readonly edges: number; readonly isCycle: boolean } {
  let nodeCount = 0;
  let totalDegree = 0;
  const stack: number[] = [start];

  while (stack.length > 0) {
    const node = stack.pop()!;
    if (visited.has(node)) continue;
    visited.add(node);
    nodeCount++;
    const nodeNeighbors = neighbors[node] ?? [];
    totalDegree += nodeNeighbors.length;
    for (const neighbor of nodeNeighbors) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor);
      }
    }
  }

  const edges = totalDegree / 2;
  return { edges, isCycle: edges === nodeCount };
}

/**
 * Build an adjacency graph between two permutations and compute graph statistics.
 *
 * The graph pairs adjacencies from genome A with adjacencies from genome B
 * that share block endpoints. The resulting statistics (cycles, paths)
 * are used to compute DCJ, breakpoint, and SCJ distances.
 */
export function buildAdjacencyGraph(a: Permutation, b: Permutation): AdjacencyGraphStats {
  const totalA = a.adjacencies.length;
  const totalB = b.adjacencies.length;
  const neighbors: number[][] = Array.from({ length: totalA + totalB }, () => []);

  for (let i = 0; i < totalA; i++) {
    const adj = a.adjacencies[i]!;
    linkEndpoint(adj.first, i, b.locations, totalA, neighbors);
    if (!adj.telomere) {
      linkEndpoint(adj.second, i, b.locations, totalA, neighbors);
    }
  }

  const visited = new Set<number>();
  let cycles = 0;
  let oddPaths = 0;
  let len2Cycles = 0;
  let len1Paths = 0;
  let pathsGte2 = 0;

  for (let i = 0; i < totalA + totalB; i++) {
    if (visited.has(i)) continue;
    const result = traverseComponent(i, neighbors, visited);
    if (result.isCycle) {
      cycles++;
      if (result.edges === 2) len2Cycles++;
    } else {
      if (result.edges % 2 === 1) oddPaths++;
      if (result.edges === 1) len1Paths++;
      if (result.edges >= 2) pathsGte2++;
    }
  }

  return { cycles, oddPaths, len2Cycles, len1Paths, pathsGte2 };
}
