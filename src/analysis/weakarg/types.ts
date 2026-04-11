/** Per-genome histogram of recombination edge tallies */
export interface RecombinationHistogram {
  readonly genomeIndex: number;
  /** Per-position tally values */
  readonly values: readonly number[];
}

/** A recombination edge from the WeakARG model */
export interface RecombinationEdge {
  /** Start position in alignment columns */
  readonly start: number;
  /** End position in alignment columns */
  readonly end: number;
  /** Source node index in the ARG tree */
  readonly edgeFrom: number;
  /** Target node index in the ARG tree */
  readonly edgeTo: number;
  /** Source age (fractional) */
  readonly ageFrom: number;
  /** Target age (fractional) */
  readonly ageTo: number;
}

/** Parsed WeakARG data model */
export interface WeakArgData {
  /** Newick tree string */
  readonly treeString: string;
  /** Per-genome incoming edge histograms */
  readonly incoming: readonly RecombinationHistogram[];
  /** Per-genome outgoing edge histograms */
  readonly outgoing: readonly RecombinationHistogram[];
  /** Raw recombination edges */
  readonly edges: readonly RecombinationEdge[];
}
