/** Supported genomic feature types */
export type FeatureType = 'CDS' | 'gene' | 'tRNA' | 'rRNA' | 'misc_RNA';

/** A single genomic feature annotation */
export interface GenomicFeature {
  readonly type: FeatureType;
  readonly start: number;
  readonly end: number;
  readonly strand: '+' | '-';
  readonly qualifiers: Readonly<Record<string, string>>;
}

/** A contig boundary within a genome */
export interface ContigBoundary {
  readonly position: number;
  readonly name: string;
}

/** Annotation data for a single genome */
export interface GenomeAnnotations {
  readonly genomeIndex: number;
  readonly features: readonly GenomicFeature[];
  readonly contigs: readonly ContigBoundary[];
}

/** Color mapping for feature types per spec:
 * CDS = white, tRNA = green, rRNA = red, misc_RNA = blue */
export const FEATURE_COLORS: Readonly<Record<FeatureType, string>> = {
  CDS: '#ffffff',
  gene: '#ffffff',
  tRNA: '#00cc00',
  rRNA: '#cc0000',
  misc_RNA: '#0000cc',
};

/** Zoom threshold: features are shown when viewing less than 1 Mbp */
export const FEATURE_ZOOM_THRESHOLD = 1_000_000;
