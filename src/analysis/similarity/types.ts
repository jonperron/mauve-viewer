/** A similarity profile for one genome at a given resolution */
export interface SimilarityProfile {
  readonly genomeIndex: number;
  /** Base pairs per output entry */
  readonly resolution: number;
  /** Similarity values in [0, 1] — 1 = perfectly conserved, 0 = no data */
  readonly values: readonly number[];
}

export interface SimilarityOptions {
  /** Base pairs per output entry (default: 1) */
  readonly resolution?: number;
}

/** Multi-level similarity profiles for a genome */
export interface MultiLevelProfile {
  readonly genomeIndex: number;
  readonly levels: readonly SimilarityProfile[];
}
