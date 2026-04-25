/** Supported input formats for reordering sequences */
export type ReorderFormat = 'fasta' | 'genbank';

/** An input genome sequence for contig reordering */
export interface ReorderSequence {
  readonly name: string;
  readonly content: string;
  readonly format: ReorderFormat;
}

/** Response from POST /api/reorder */
export interface ReorderJobCreated {
  readonly jobId: string;
  readonly status: string;
}

/** Response from GET /api/reorder/:jobId/status */
export interface ReorderJobStatus {
  readonly jobId: string;
  readonly status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  readonly iteration: number;
  readonly maxIterations: number;
  readonly error?: string;
}

/** Response from GET /api/reorder/:jobId/result */
export interface ReorderResult {
  readonly sequence: string;
  readonly contigsTab: string;
}

/** Maximum allowed content size per individual sequence (10 MB) */
export const MAX_SEQUENCE_BYTES = 10 * 1024 * 1024;

/** Maximum allowed aggregate content size for both sequences (15 MB) */
export const MAX_AGGREGATE_BYTES = 15 * 1024 * 1024;

/**
 * Validates that sequence content sizes do not exceed the server limits.
 * Throws a RangeError if any limit is exceeded.
 */
export function validateSequenceSizes(
  reference: ReorderSequence,
  draft: ReorderSequence,
): void {
  const encoder = new TextEncoder();
  const refBytes = encoder.encode(reference.content).length;
  const draftBytes = encoder.encode(draft.content).length;

  if (refBytes > MAX_SEQUENCE_BYTES) {
    throw new RangeError('Reference sequence exceeds maximum allowed size (10 MB)');
  }
  if (draftBytes > MAX_SEQUENCE_BYTES) {
    throw new RangeError('Draft sequence exceeds maximum allowed size (10 MB)');
  }
  if (refBytes + draftBytes > MAX_AGGREGATE_BYTES) {
    throw new RangeError('Total sequence size exceeds maximum allowed size (20 MB)');
  }
}

/**
 * Submit a new contig reordering job to the server.
 * Validates sequence sizes before sending.
 * @throws {RangeError} if sizes exceed limits
 * @throws {Error} on HTTP or network error
 */
export async function submitReorderJob(
  reference: ReorderSequence,
  draft: ReorderSequence,
  maxIterations: number,
): Promise<ReorderJobCreated> {
  validateSequenceSizes(reference, draft);

  const response = await fetch('/api/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference, draft, maxIterations }),
  });

  if (!response.ok) {
    throw new Error('Failed to submit reorder job');
  }

  return response.json() as Promise<ReorderJobCreated>;
}

/**
 * Get the current status of a contig reordering job.
 * @throws {Error} on HTTP or network error
 */
export async function getReorderStatus(jobId: string): Promise<ReorderJobStatus> {
  const response = await fetch(
    `/api/reorder/${encodeURIComponent(jobId)}/status`,
  );

  if (!response.ok) {
    throw new Error('Failed to get reorder job status');
  }

  return response.json() as Promise<ReorderJobStatus>;
}

/**
 * Download the result of a completed contig reordering job.
 * @throws {Error} on HTTP or network error
 */
export async function getReorderResult(jobId: string): Promise<ReorderResult> {
  const response = await fetch(
    `/api/reorder/${encodeURIComponent(jobId)}/result`,
  );

  if (!response.ok) {
    throw new Error('Failed to get reorder result');
  }

  return response.json() as Promise<ReorderResult>;
}

/**
 * Cancel a running or queued contig reordering job.
 * Best-effort — does not throw on failure.
 */
export async function cancelReorderJob(jobId: string): Promise<void> {
  try {
    await fetch(`/api/reorder/${encodeURIComponent(jobId)}`, {
      method: 'DELETE',
    });
  } catch {
    // Best-effort — ignore cancellation failures
  }
}
