import type { BackboneSegment } from '../../import/backbone/types.ts';
import type { Lcb, Genome } from '../../import/xmfa/types.ts';
import type { GenomeAnnotations } from '../../annotations/types.ts';

// ── Summary interval ─────────────────────────────────────────────────────────

/** Interval within a specific genome, with strand info */
export interface SummaryInterval {
  readonly leftEnd: number;
  readonly rightEnd: number;
  readonly reverse: boolean;
}

// ── Summary segment ──────────────────────────────────────────────────────────

/** A segment in the summary pipeline (backbone or island) with per-genome coordinates */
export interface SummarySegment {
  readonly intervals: readonly SummaryInterval[];
  readonly multiplicityMask: number;
  readonly typedId: string;
  /** Original backbone seqIndex; undefined for island-only segments */
  readonly backboneId?: number;
}

// ── Options ──────────────────────────────────────────────────────────────────

export interface SummaryOptions {
  readonly islandMinLength: number;
  readonly backboneMinLength: number;
  readonly maxLengthRatio: number;
  readonly minimumPercentContained: number;
}

export const DEFAULT_SUMMARY_OPTIONS: Readonly<SummaryOptions> = Object.freeze({
  islandMinLength: 50,
  backboneMinLength: 50,
  maxLengthRatio: 3.0,
  minimumPercentContained: 0.5,
});

// ── Input ────────────────────────────────────────────────────────────────────

export interface SummaryInput {
  readonly backboneSegments: readonly BackboneSegment[];
  readonly lcbs: readonly Lcb[];
  readonly genomes: readonly Genome[];
  readonly annotations?: readonly GenomeAnnotations[];
  readonly options?: Partial<SummaryOptions>;
}

// ── Result ───────────────────────────────────────────────────────────────────

export interface SummaryResult {
  readonly overview: string;
  readonly islandCoordinates: string;
  readonly islandFeatures: readonly string[];
  readonly islandGenes: readonly string[];
  readonly backboneGenes: readonly string[];
  readonly troubleBackbone: string;
}

// ── Processed data ───────────────────────────────────────────────────────────

export interface ProcessedSegmentData {
  /** All unique summary segments (backbone + islands) */
  readonly allSegments: readonly SummarySegment[];
  /** Per-genome ordered chains of segments */
  readonly chains: readonly (readonly SummarySegment[])[];
  /** Index of the reference genome (no reversed backbone segments) */
  readonly referenceGenome: number;
}
