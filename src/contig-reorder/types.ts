/**
 * Client-side type definitions for the Mauve Contig Mover (MCM) API.
 *
 * These mirror the server-side types from server/contig-reorder/types.ts
 * and extend them with parsed representations used by the results viewer.
 */

/** Lifecycle states of a contig reordering job */
export type ReorderJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/** Supported input formats for contig reordering */
export type ReorderSequenceFormat = 'fasta' | 'genbank';

/** Input sequence descriptor */
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
  readonly iteration: number;
  readonly maxIterations: number;
  readonly error?: string;
}

/** Result of a completed contig reordering job */
export interface ReorderResult {
  /** Reordered draft genome (FASTA or GenBank text) */
  readonly sequence: string;
  /** Contents of the final *_contigs.tab file */
  readonly contigsTab: string;
}

/** Configuration for the reorder API client */
export interface ReorderClientConfig {
  readonly baseUrl: string;
}

// ---------------------------------------------------------------------------
// Parsed contig tab types (client-side representation of *_contigs.tab)
// ---------------------------------------------------------------------------

/** Strand orientation of a contig entry */
export type ContigStrand = 'forward' | 'complement';

/** A single contig entry parsed from a *_contigs.tab section */
export interface ParsedContigEntry {
  readonly name: string;
  readonly strand: ContigStrand;
  readonly start: number;
  readonly end: number;
}

/** Structured representation of a parsed *_contigs.tab file */
export interface ParsedContigsTab {
  /** Contigs listed in the "Contigs to reverse" section */
  readonly toReverse: readonly ParsedContigEntry[];
  /** Contigs listed in the "Ordered Contigs" section */
  readonly ordered: readonly ParsedContigEntry[];
  /** Contigs listed in the "Contigs with conflicting ordering information" section */
  readonly conflicted: readonly ParsedContigEntry[];
}
