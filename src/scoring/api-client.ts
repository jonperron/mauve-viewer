/**
 * REST API client for the Assembly Scoring service.
 *
 * Provides typed wrappers for all /api/score/** endpoints.
 */
import type {
  ScoringClientConfig,
  ScoringJobCreated,
  ScoringJobStatusResponse,
  ScoringRequest,
  ScoringResult,
} from './types.ts';

function extractErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const err = (body as { readonly error: unknown }).error;
    if (typeof err === 'string') return err;
  }
  return fallback;
}

/**
 * Submit a new assembly scoring job.
 *
 * POST /api/score
 */
export async function submitScore(
  config: ScoringClientConfig,
  request: ScoringRequest,
): Promise<ScoringJobCreated> {
  const response = await fetch(`${config.baseUrl}/api/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    throw new Error(
      extractErrorMessage(body, `Score submission failed (${response.status})`),
    );
  }
  const data: unknown = await response.json();
  return data as ScoringJobCreated;
}

/**
 * Poll the status of a scoring job.
 *
 * GET /api/score/:jobId/status
 */
export async function getScoreStatus(
  config: ScoringClientConfig,
  jobId: string,
): Promise<ScoringJobStatusResponse> {
  const response = await fetch(
    `${config.baseUrl}/api/score/${encodeURIComponent(jobId)}/status`,
  );
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    throw new Error(
      extractErrorMessage(body, `Failed to get score status (${response.status})`),
    );
  }
  const data: unknown = await response.json();
  return data as ScoringJobStatusResponse;
}

/**
 * Cancel a running or queued scoring job.
 *
 * DELETE /api/score/:jobId
 */
export async function cancelScore(
  config: ScoringClientConfig,
  jobId: string,
): Promise<void> {
  const response = await fetch(
    `${config.baseUrl}/api/score/${encodeURIComponent(jobId)}`,
    { method: 'DELETE' },
  );
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    throw new Error(
      extractErrorMessage(body, `Failed to cancel scoring job (${response.status})`),
    );
  }
}

/**
 * Download the result of a completed scoring job.
 *
 * GET /api/score/:jobId/result
 */
export async function getScoreResult(
  config: ScoringClientConfig,
  jobId: string,
): Promise<ScoringResult> {
  const response = await fetch(
    `${config.baseUrl}/api/score/${encodeURIComponent(jobId)}/result`,
  );
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    throw new Error(
      extractErrorMessage(body, `Failed to get score result (${response.status})`),
    );
  }
  const data: unknown = await response.json();
  return data as ScoringResult;
}
