import type { ContigBoundary, GenomicFeature } from '../annotations/types.ts';

export interface InsdseqRecord {
  readonly accession: string;
  readonly sequence: string;
  readonly features: readonly GenomicFeature[];
  readonly contigs: readonly ContigBoundary[];
}