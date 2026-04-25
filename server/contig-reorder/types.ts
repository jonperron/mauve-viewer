/** Lifecycle state of a contig reordering job */
export type ReorderJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/** Supported input formats for reordering sequences */
export type ReorderSequenceFormat = 'fasta' | 'genbank';

/** Input sequence descriptor for contig reordering */
export interface ReorderSequenceInput {
  readonly name: string;
  readonly content: string;
  readonly format: ReorderSequenceFormat;
}

/** Request body for POST /api/reorder */
export interface ReorderRequest {
  readonly reference: ReorderSequenceInput;
  readonly draft: ReorderSequenceInput;
  /** Maximum number of iterations (1–100, default 15) */
  readonly maxIterations?: number;
}

/** Response from POST /api/reorder */
export interface ReorderJobCreated {
  readonly jobId: string;
  readonly status: ReorderJobStatus;
}

/** Response from GET /api/reorder/:jobId/status */
export interface ReorderJobStatusResponse {
  readonly jobId: string;
  readonly status: ReorderJobStatus;
  /** Number of iterations completed so far */
  readonly iteration: number;
  /** Maximum configured iterations */
  readonly maxIterations: number;
  readonly error?: string;
}

/** Result of a completed contig reordering job */
export interface ReorderResult {
  /** Reordered draft genome sequence (FASTA or GenBank text) */
  readonly sequence: string;
  /** Contents of the final *_contigs.tab file */
  readonly contigsTab: string;
}
