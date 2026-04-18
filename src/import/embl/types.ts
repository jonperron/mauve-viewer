import type { ContigBoundary, GenomicFeature } from '../annotations/types.ts';

export interface EmblRecord {
  readonly id: string;
  readonly accession: string;
  readonly description: string;
  readonly sequence: string;
  readonly features: readonly GenomicFeature[];
  readonly contigs: readonly ContigBoundary[];
}