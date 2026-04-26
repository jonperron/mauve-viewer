/**
 * Client-side type definitions for the Assembly Scoring API.
 *
 * These mirror the server-side types from server/scoring/types.ts.
 */

/** Lifecycle state of an assembly scoring job */
export type ScoringJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/** Supported input formats for scoring sequences */
export type ScoringSequenceFormat = 'fasta' | 'genbank';

/** Input sequence descriptor for assembly scoring */
export interface ScoringSequenceInput {
  readonly name: string;
  readonly content: string;
  readonly format: ScoringSequenceFormat;
}

/** Options controlling the scoring job */
export interface ScoringOptions {
  /**
   * Run in batch mode (non-interactive).
   * Default: false.
   */
  readonly batch?: boolean;
  /**
   * Skip CDS error analysis.
   * Default: false.
   */
  readonly noCds?: boolean;
  /**
   * Skip iterative refinement in the aligner.
   * Default: true (fast alignment suitable for scoring).
   */
  readonly skipRefinement?: boolean;
  /**
   * Minimum LCB weight threshold passed to the aligner.
   * Default: 200.
   */
  readonly weight?: number;
}

/** Request body for POST /api/score */
export interface ScoringRequest {
  /** Reference genome (complete, annotated sequence) */
  readonly reference: ScoringSequenceInput;
  /** Draft assembly to evaluate */
  readonly assembly: ScoringSequenceInput;
  readonly options?: ScoringOptions;
}

/** Response from POST /api/score */
export interface ScoringJobCreated {
  readonly jobId: string;
  readonly status: ScoringJobStatus;
}

/** Response from GET /api/score/:jobId/status */
export interface ScoringJobStatusResponse {
  readonly jobId: string;
  readonly status: ScoringJobStatus;
  readonly error?: string;
}

/** Result of a completed scoring job */
export interface ScoringResult {
  /** XMFA alignment of reference vs assembly, for client-side metric computation */
  readonly alignment: string;
}

/** Configuration for the scoring API client */
export interface ScoringClientConfig {
  readonly baseUrl: string;
}
