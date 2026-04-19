/** Algorithm choice for genome alignment */
export type AlignmentAlgorithm = 'mauveAligner' | 'progressiveMauve';

/** Parameters shared by both alignment algorithms */
interface BaseAlignmentParams {
  readonly algorithm: AlignmentAlgorithm;
  readonly seedWeight: number | 'auto';
  readonly minLcbWeight?: number;
  readonly collinear: boolean;
  readonly fullAlignment: boolean;
}

/** Parameters specific to the original mauveAligner algorithm */
export interface MauveAlignerParams extends BaseAlignmentParams {
  readonly algorithm: 'mauveAligner';
  readonly extendLcbs: boolean;
  readonly islandSize?: number;
  readonly backboneSize?: number;
  readonly maxBackboneGap?: number;
}

/** Parameters specific to progressiveMauve algorithm */
export interface ProgressiveMauveParams extends BaseAlignmentParams {
  readonly algorithm: 'progressiveMauve';
  readonly seedFamilies: boolean;
  readonly iterativeRefinement: boolean;
  readonly sumOfPairsScoring: boolean;
}

/** Union of all alignment parameter types */
export type AlignmentParams = MauveAlignerParams | ProgressiveMauveParams;

/** Input sequence descriptor for alignment submission */
export interface AlignmentSequenceInput {
  readonly name: string;
  readonly content: string;
  readonly format: 'fasta' | 'genbank' | 'embl' | 'raw';
}

/** Request body for POST /api/align */
export interface AlignmentRequest {
  readonly sequences: readonly AlignmentSequenceInput[];
  readonly params: AlignmentParams;
}

/** Job lifecycle states */
export type AlignmentJobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Response from POST /api/align */
export interface AlignmentJobCreated {
  readonly jobId: string;
  readonly status: AlignmentJobStatus;
}

/** Response from GET /api/align/:jobId/status */
export interface AlignmentJobStatusResponse {
  readonly jobId: string;
  readonly status: AlignmentJobStatus;
  readonly progress?: string;
  readonly error?: string;
}

/** A progress event received via WebSocket */
export interface AlignmentProgressEvent {
  readonly jobId: string;
  readonly type: 'progress' | 'completed' | 'failed' | 'cancelled';
  readonly message?: string;
}

/** Configuration for the alignment API client */
export interface AlignmentClientConfig {
  readonly baseUrl: string;
  readonly wsUrl?: string;
}
