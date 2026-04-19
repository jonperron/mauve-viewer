import type {
  AlignmentClientConfig,
  AlignmentJobCreated,
  AlignmentJobStatusResponse,
  AlignmentProgressEvent,
  AlignmentRequest,
} from './types.ts';

function extractErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const err = (body as { readonly error: unknown }).error;
    if (typeof err === 'string') return err;
  }
  return fallback;
}

/**
 * Submits an alignment job to the server.
 *
 * POST /api/align
 */
export async function submitAlignment(
  config: AlignmentClientConfig,
  request: AlignmentRequest,
): Promise<AlignmentJobCreated> {
  const response = await fetch(`${config.baseUrl}/api/align`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(body, `Alignment submission failed (${response.status})`));
  }
  return response.json() as Promise<AlignmentJobCreated>;
}

/**
 * Polls the status of an alignment job.
 *
 * GET /api/align/:jobId/status
 */
export async function getAlignmentStatus(
  config: AlignmentClientConfig,
  jobId: string,
): Promise<AlignmentJobStatusResponse> {
  const response = await fetch(
    `${config.baseUrl}/api/align/${encodeURIComponent(jobId)}/status`,
  );
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(body, `Failed to get job status (${response.status})`));
  }
  return response.json() as Promise<AlignmentJobStatusResponse>;
}

/**
 * Cancels a running alignment job.
 *
 * DELETE /api/align/:jobId
 */
export async function cancelAlignment(
  config: AlignmentClientConfig,
  jobId: string,
): Promise<void> {
  const response = await fetch(
    `${config.baseUrl}/api/align/${encodeURIComponent(jobId)}`,
    { method: 'DELETE' },
  );
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(body, `Failed to cancel job (${response.status})`));
  }
}

/**
 * Downloads the XMFA alignment result for a completed job.
 *
 * GET /api/align/:jobId/result
 */
export async function getAlignmentResult(
  config: AlignmentClientConfig,
  jobId: string,
): Promise<string> {
  const response = await fetch(
    `${config.baseUrl}/api/align/${encodeURIComponent(jobId)}/result`,
  );
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(body, `Failed to get alignment result (${response.status})`));
  }
  return response.text();
}

/**
 * Opens a WebSocket connection for real-time progress updates on an
 * alignment job. Returns a cleanup function to close the connection.
 */
export function subscribeToProgress(
  config: AlignmentClientConfig,
  jobId: string,
  onEvent: (event: AlignmentProgressEvent) => void,
  onError?: (error: Event) => void,
): () => void {
  const wsBase = config.wsUrl ?? config.baseUrl.replace(/^http/, 'ws');
  const url = `${wsBase}/api/align/${encodeURIComponent(jobId)}/progress`;
  const ws = new WebSocket(url);

  ws.addEventListener('message', (event) => {
    try {
      const data = typeof event.data === 'string' ? event.data : String(event.data);
      const parsed: unknown = JSON.parse(data);
      if (
        typeof parsed === 'object' && parsed !== null
        && 'jobId' in parsed && 'type' in parsed
      ) {
        onEvent(parsed as AlignmentProgressEvent);
      }
    } catch {
      // Ignore malformed messages
    }
  });

  ws.addEventListener('error', (event) => {
    onError?.(event);
  });

  ws.addEventListener('close', () => {
    // Connection closed — no action needed
  });

  return () => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  };
}
