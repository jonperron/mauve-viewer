/** Block endpoint tag for the tail end */
export const TAIL_TAG = '_t';

/** Block endpoint tag for the head end */
export const HEAD_TAG = '_h';

/** Telomere marker for linear chromosome ends */
export const TELOMERE = '<>';

/** Circular chromosome marker in permutation strings */
export const CIRCULAR_CHAR = '*';

/** A synteny block in a signed permutation */
export interface Block {
  readonly name: string;
  readonly inverted: boolean;
}

/** A contig/chromosome containing ordered synteny blocks */
export interface ContigDef {
  readonly blocks: readonly Block[];
  readonly circular: boolean;
}

/** An adjacency between block endpoints, or a telomere */
export interface Adjacency {
  readonly first: string;
  readonly second: string;
  readonly telomere: boolean;
}

/** Block location in the adjacency array: [tailIndex, headIndex] */
export type BlockLocation = readonly [number, number];

/** A genome represented as a permutation of synteny blocks */
export interface Permutation {
  readonly name: string;
  readonly contigs: readonly ContigDef[];
  readonly adjacencies: readonly Adjacency[];
  readonly locations: ReadonlyMap<string, BlockLocation>;
}

/** Statistics from an adjacency graph between two permutations */
export interface AdjacencyGraphStats {
  readonly cycles: number;
  readonly oddPaths: number;
  readonly len2Cycles: number;
  readonly len1Paths: number;
  readonly pathsGte2: number;
}

/** Pairwise rearrangement distances */
export interface DistanceResult {
  readonly dcj: number;
  readonly breakpoint: number;
  readonly scj: number;
  readonly blocks: number;
}

/** N x N distance matrix for all genome pairs */
export interface DistanceMatrix {
  readonly labels: readonly string[];
  readonly distances: readonly (readonly DistanceResult[])[];
}
