/**
 * CDS annotation quality metrics for assembly scoring.
 *
 * Wraps the Phase-5 CDS error detection module and aggregates per-CDS error
 * information into summary counts suitable for display in a scoring report.
 *
 * Requires a parsed XMFA alignment (at least 2 genomes) and GenBank
 * annotations with CDS features for the reference genome.
 */
import type { XmfaAlignment } from '../import/xmfa/types.ts';
import type { AnnotationMap } from '../viewer/rendering/annotations.ts';
import {
  detectCdsErrors,
  type BrokenCds,
} from '../export/cds-errors/cds-error-detection.ts';

export type { BrokenCds };

/** Summary quality metrics for CDS annotation integrity in a scored assembly */
export interface CdsQualityMetrics {
  /** Total number of CDS features analyzed in the reference genome */
  readonly totalCds: number;
  /** Number of CDS features with no detected errors */
  readonly completeCds: number;
  /** Number of CDS features with at least one error */
  readonly brokenCdsCount: number;
  /** Total number of frameshift regions across all broken CDS */
  readonly frameshiftCount: number;
  /** Total number of premature stop codons across all broken CDS */
  readonly prematureStopCount: number;
  /** Total number of amino acid substitutions across all broken CDS */
  readonly aaSubstitutionCount: number;
  /** Detailed error information for each broken CDS feature */
  readonly brokenCds: readonly BrokenCds[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMPTY_METRICS: CdsQualityMetrics = {
  totalCds: 0,
  completeCds: 0,
  brokenCdsCount: 0,
  frameshiftCount: 0,
  prematureStopCount: 0,
  aaSubstitutionCount: 0,
  brokenCds: [],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute CDS annotation quality metrics for a scored reference-vs-assembly alignment.
 *
 * Reuses {@link detectCdsErrors} from the Phase-5 CDS error detection module
 * to identify frameshifts, premature stops, amino acid substitutions, and
 * gap-induced reading-frame disruptions.
 *
 * When no annotations are provided or the alignment has fewer than 2 genomes,
 * returns zero-valued metrics (no-op).
 *
 * @param alignment   - Parsed XMFA alignment of reference vs assembly.
 * @param annotations - Annotation map keyed by genome index.
 */
export function computeCdsQualityMetrics(
  alignment: XmfaAlignment,
  annotations: AnnotationMap,
): CdsQualityMetrics {
  if (alignment.genomes.length < 2) {
    return EMPTY_METRICS;
  }

  const result = detectCdsErrors(alignment, annotations);

  let frameshiftCount = 0;
  let prematureStopCount = 0;
  let aaSubstitutionCount = 0;

  for (const cds of result.brokenCds) {
    frameshiftCount += cds.frameshifts.length;
    prematureStopCount += cds.prematureStops.length;
    aaSubstitutionCount += cds.aaSubstitutions.length;
  }

  return {
    totalCds: result.totalCds,
    completeCds: result.totalCds - result.brokenCdsCount,
    brokenCdsCount: result.brokenCdsCount,
    frameshiftCount,
    prematureStopCount,
    aaSubstitutionCount,
    brokenCds: result.brokenCds,
  };
}
