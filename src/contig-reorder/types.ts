/** Input sequence descriptor for contig reordering submission */
export interface ReorderSequenceInput {
  readonly name: string;
  readonly content: string;
  readonly format: 'fasta' | 'genbank';
}

/** Request body for POST /api/reorder */
export interface ReorderRequest {
  /** Reference genome (first) */
  readonly reference: ReorderSequenceInput;
  /** Draft genome whose contigs will be reordered (second) */
  readonly draft: ReorderSequenceInput;
  /** Maximum number of iterations before forced termination (default: 15) */
  readonly maxIterations?: number;
}

/** Job lifecycle states */
export type ReorderJobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Response from POST /api/reorder */
export interface ReorderJobCreated {
  readonly jobId: string;
  readonly status: ReorderJobStatus;
}

/** Response from GET /api/reorder/:jobId/status */
export interface ReorderJobStatusResponse {
  readonly jobId: string;
  readonly status: ReorderJobStatus;
  readonly iteration?: number;
  readonly maxIterations?: number;
  readonly error?: string;
}

/** Reordered contig entry in the results */
export interface ReorderContigEntry {
  readonly name: string;
  readonly start: number;
  readonly end: number;
  readonly reversed: boolean;
  readonly conflicting: boolean;
}

/** Parsed result from GET /api/reorder/:jobId/result */
export interface ReorderResult {
  /** Contigs in final reordered order with pseudocoordinates */
  readonly orderedContigs: readonly ReorderContigEntry[];
  /** Contigs that were reversed relative to the reference */
  readonly reversedContigs: readonly string[];
  /** Contigs with conflicting placement information */
  readonly conflictingContigs: readonly string[];
  /** Number of iterations performed */
  readonly iterationsPerformed: number;
  /** Whether the process converged before hitting maxIterations */
  readonly converged: boolean;
}

/** Configuration for the contig reorder API client */
export interface ReorderClientConfig {
  readonly baseUrl: string;
}
