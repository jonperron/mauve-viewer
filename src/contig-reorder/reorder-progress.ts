/**
 * Progress dialog for Mauve Contig Mover (MCM) reordering jobs.
 *
 * Polls GET /api/reorder/:jobId/status at a fixed interval and updates
 * the UI with the current iteration count and job status. When the job
 * completes, calls the onComplete callback with the jobId. When it fails
 * or is cancelled, calls the respective callback.
 *
 * Uses sequential setTimeout-based polling to avoid overlapping requests.
 */
import type { ReorderClientConfig, ReorderJobStatusResponse } from './types.ts';
import { getReorderStatus, cancelReorder } from './api-client.ts';

/** Polling interval in milliseconds */
const POLL_INTERVAL_MS = 2000;

/** Callbacks for reorder job lifecycle events */
export interface ReorderProgressCallbacks {
  readonly onComplete?: (jobId: string) => void;
  readonly onError?: (message: string) => void;
  readonly onCancel?: () => void;
}

/** Handle for the reorder progress dialog lifecycle */
export interface ReorderProgressHandle {
  readonly element: HTMLDialogElement;
  readonly destroy: () => void;
}

function buildDialogHtml(): string {
  return `
    <div class="reorder-progress-content">
      <h3>Contig Reordering in Progress</h3>
      <div class="reorder-progress-indicator" role="progressbar" aria-label="Reorder progress"></div>
      <p class="reorder-progress-status">Starting reordering...</p>
      <p class="reorder-progress-iterations"></p>
      <div class="reorder-progress-actions">
        <button type="button" class="reorder-progress-cancel">Cancel</button>
      </div>
    </div>
  `;
}

function showCloseButton(actionsEl: HTMLElement, onDestroy: () => void): void {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'reorder-progress-close';
  btn.textContent = 'Close';
  btn.addEventListener('click', onDestroy);
  actionsEl.appendChild(btn);
}

/**
 * Create a modal dialog that polls a reorder job's status and shows progress.
 *
 * The dialog uses sequential setTimeout polling (not setInterval) to avoid
 * overlapping async status requests. The polling timer is cleared as soon as
 * the job reaches a terminal state.
 */
export function createReorderProgress(
  container: HTMLElement,
  config: ReorderClientConfig,
  jobId: string,
  callbacks: ReorderProgressCallbacks,
): ReorderProgressHandle {
  const dialog = document.createElement('dialog');
  dialog.className = 'reorder-progress-dialog';
  dialog.setAttribute('aria-label', 'Contig Reordering Progress');
  dialog.innerHTML = buildDialogHtml();

  container.appendChild(dialog);
  dialog.showModal();

  const statusEl = dialog.querySelector('.reorder-progress-status') as HTMLParagraphElement;
  const iterationsEl = dialog.querySelector('.reorder-progress-iterations') as HTMLParagraphElement;
  const cancelBtn = dialog.querySelector('.reorder-progress-cancel') as HTMLButtonElement;
  const actionsEl = dialog.querySelector('.reorder-progress-actions') as HTMLDivElement;

  let terminated = false;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;

  function setTerminal(): void {
    terminated = true;
    cancelBtn.disabled = true;
    if (pollTimer !== undefined) {
      clearTimeout(pollTimer);
      pollTimer = undefined;
    }
    showCloseButton(actionsEl, destroy);
  }

  function handleStatus(status: ReorderJobStatusResponse): void {
    if (terminated) return;

    iterationsEl.textContent =
      `Iteration ${status.iteration} / ${status.maxIterations}`;

    switch (status.status) {
      case 'queued':
        statusEl.textContent = 'Waiting in queue...';
        scheduleNextPoll();
        break;

      case 'running':
        statusEl.textContent = 'Aligning and reordering contigs...';
        scheduleNextPoll();
        break;

      case 'completed':
        statusEl.textContent = `Completed after ${status.iteration} iteration(s)`;
        setTerminal();
        callbacks.onComplete?.(jobId);
        break;

      case 'failed':
        statusEl.textContent = `Reordering failed: ${status.error ?? 'unknown error'}`;
        setTerminal();
        callbacks.onError?.(status.error ?? 'Reordering failed');
        break;

      case 'cancelled':
        statusEl.textContent = 'Reordering was cancelled';
        setTerminal();
        callbacks.onCancel?.();
        break;
    }
  }

  function poll(): void {
    if (terminated) return;

    getReorderStatus(config, jobId)
      .then((status) => {
        handleStatus(status);
      })
      .catch((err: unknown) => {
        if (!terminated) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          statusEl.textContent = `Connection error: ${message}`;
          scheduleNextPoll();
        }
      });
  }

  function scheduleNextPoll(): void {
    if (terminated) return;
    pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
  }

  cancelBtn.addEventListener('click', () => {
    if (terminated) return;
    cancelBtn.disabled = true;
    statusEl.textContent = 'Cancelling...';
    iterationsEl.textContent = '';

    cancelReorder(config, jobId).catch((err: unknown) => {
      if (!terminated) {
        cancelBtn.disabled = false;
        const msg = err instanceof Error ? err.message : 'Unknown error';
        statusEl.textContent = `Cancel failed: ${msg}`;
      }
    });
  });

  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
  });

  function destroy(): void {
    terminated = true;
    if (pollTimer !== undefined) {
      clearTimeout(pollTimer);
      pollTimer = undefined;
    }
    if (dialog.open) {
      dialog.close();
    }
    dialog.remove();
  }

  // Start polling
  scheduleNextPoll();

  return { element: dialog, destroy };
}
