import type { AlignmentClientConfig, AlignmentProgressEvent } from './types.ts';
import { cancelAlignment, subscribeToProgress } from './api-client.ts';

/** Callbacks for alignment lifecycle events */
export interface AlignmentProgressCallbacks {
  readonly onComplete?: (jobId: string) => void;
  readonly onError?: (message: string) => void;
  readonly onCancel?: () => void;
}

/** Handle for alignment progress dialog lifecycle */
export interface AlignmentProgressHandle {
  readonly element: HTMLDialogElement;
  readonly destroy: () => void;
}

function buildDialogHtml(): string {
  return `
    <div class="alignment-progress-content">
      <h3>Alignment in progress</h3>
      <div class="align-progress-indicator" role="progressbar" aria-label="Alignment progress"></div>
      <p class="align-progress-status">Starting alignment...</p>
      <div class="align-progress-log" aria-live="polite" aria-label="Alignment log"></div>
      <div class="align-progress-actions">
        <button type="button" class="align-progress-cancel">Cancel</button>
      </div>
    </div>
  `;
}

interface ProgressElements {
  readonly dialog: HTMLDialogElement;
  readonly statusEl: HTMLParagraphElement;
  readonly logEl: HTMLDivElement;
  readonly cancelBtn: HTMLButtonElement;
  readonly actionsEl: HTMLDivElement;
}

function appendLogEntry(logEl: HTMLDivElement, message: string): void {
  const entry = document.createElement('div');
  entry.className = 'align-progress-log-entry';
  entry.textContent = message;
  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
}

function showCloseButton(actionsEl: HTMLDivElement, destroy: () => void): void {
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'align-progress-close';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', destroy);
  actionsEl.appendChild(closeBtn);
}

function handleProgressEvent(
  event: AlignmentProgressEvent,
  els: ProgressElements,
  jobId: string,
  callbacks: AlignmentProgressCallbacks,
  setTerminal: () => void,
): void {
  switch (event.type) {
    case 'progress':
      if (event.message) {
        els.statusEl.textContent = event.message;
        appendLogEntry(els.logEl, event.message);
      }
      break;

    case 'completed':
      els.statusEl.textContent = 'Alignment completed';
      appendLogEntry(els.logEl, 'Alignment completed');
      setTerminal();
      callbacks.onComplete?.(jobId);
      break;

    case 'failed': {
      const msg = event.message
        ? `Alignment failed: ${event.message}`
        : 'Alignment failed';
      els.statusEl.textContent = msg;
      appendLogEntry(els.logEl, msg);
      setTerminal();
      callbacks.onError?.(event.message ?? 'Alignment failed');
      break;
    }

    case 'cancelled':
      els.statusEl.textContent = 'Alignment cancelled';
      appendLogEntry(els.logEl, 'Alignment cancelled');
      setTerminal();
      callbacks.onCancel?.();
      break;
  }
}

/**
 * Create a modal dialog showing real-time alignment progress.
 *
 * Subscribes to the WebSocket progress stream for the given job and
 * displays status messages, a log of all output, and a cancel button.
 * On completion, calls the `onComplete` callback so the caller can
 * fetch and load the XMFA result.
 */
export function createAlignmentProgress(
  container: HTMLElement,
  config: AlignmentClientConfig,
  jobId: string,
  callbacks: AlignmentProgressCallbacks,
): AlignmentProgressHandle {
  const dialog = document.createElement('dialog');
  dialog.className = 'alignment-progress-dialog';
  dialog.setAttribute('aria-label', 'Alignment Progress');
  dialog.innerHTML = buildDialogHtml();

  container.appendChild(dialog);
  dialog.showModal();

  const els: ProgressElements = {
    dialog,
    statusEl: dialog.querySelector('.align-progress-status') as HTMLParagraphElement,
    logEl: dialog.querySelector('.align-progress-log') as HTMLDivElement,
    cancelBtn: dialog.querySelector('.align-progress-cancel') as HTMLButtonElement,
    actionsEl: dialog.querySelector('.align-progress-actions') as HTMLDivElement,
  };

  let terminated = false;

  function setTerminal(): void {
    terminated = true;
    els.cancelBtn.disabled = true;
    showCloseButton(els.actionsEl, destroy);
  }

  const unsubscribe = subscribeToProgress(
    config,
    jobId,
    (event) => { handleProgressEvent(event, els, jobId, callbacks, setTerminal); },
    () => {
      if (!terminated) {
        els.statusEl.textContent = 'Connection lost';
        appendLogEntry(els.logEl, 'Connection lost');
      }
    },
  );

  els.cancelBtn.addEventListener('click', () => {
    if (terminated) return;
    els.cancelBtn.disabled = true;
    els.statusEl.textContent = 'Cancelling...';

    cancelAlignment(config, jobId).catch((err: unknown) => {
      if (!terminated) {
        els.cancelBtn.disabled = false;
        const msg = err instanceof Error ? err.message : 'Unknown error';
        els.statusEl.textContent = `Cancel failed: ${msg}`;
      }
    });
  });

  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
  });

  function destroy(): void {
    unsubscribe();
    if (dialog.open) {
      dialog.close();
    }
    dialog.remove();
  }

  return { element: dialog, destroy };
}
