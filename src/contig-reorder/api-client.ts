import type {
  ReorderClientConfig,
  ReorderJobCreated,
  ReorderJobStatusResponse,
  ReorderRequest,
  ReorderResult,
} from './types.ts';

function extractErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const err = (body as { readonly error: unknown }).error;
    if (typeof err === 'string') return err;
  }
  return fallback;
}

/**
 * Submits a contig reordering job to the server.
 *
 * POST /api/reorder
 */
export async function submitReorder(
  config: ReorderClientConfig,
  request: ReorderRequest,
): Promise<ReorderJobCreated> {
  const response = await fetch(`${config.baseUrl}/api/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(body, `Reorder submission failed (${response.status})`));
  }
  return response.json() as Promise<ReorderJobCreated>;
}

/**
 * Polls the status of a contig reordering job.
 * Returns the current iteration count when the job is running.
 *
 * GET /api/reorder/:jobId/status
 */
export async function getReorderStatus(
  config: ReorderClientConfig,
  jobId: string,
): Promise<ReorderJobStatusResponse> {
  const response = await fetch(
    `${config.baseUrl}/api/reorder/${encodeURIComponent(jobId)}/status`,
  );
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(body, `Failed to get reorder status (${response.status})`));
  }
  return response.json() as Promise<ReorderJobStatusResponse>;
}

/**
 * Downloads the reordering result for a completed job.
 * Returns the parsed contig ordering with convergence information.
 *
 * GET /api/reorder/:jobId/result
 */
export async function getReorderResult(
  config: ReorderClientConfig,
  jobId: string,
): Promise<ReorderResult> {
  const response = await fetch(
    `${config.baseUrl}/api/reorder/${encodeURIComponent(jobId)}/result`,
  );
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(body, `Failed to get reorder result (${response.status})`));
  }
  return response.json() as Promise<ReorderResult>;
}

/**
 * Cancels a running contig reordering job.
 * Intermediate results from completed iterations remain available.
 *
 * DELETE /api/reorder/:jobId
 */
export async function cancelReorder(
  config: ReorderClientConfig,
  jobId: string,
): Promise<void> {
  const response = await fetch(
    `${config.baseUrl}/api/reorder/${encodeURIComponent(jobId)}`,
    { method: 'DELETE' },
  );
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(body, `Failed to cancel reorder job (${response.status})`));
  }
}
