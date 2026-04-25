import {
  submitReorderJob,
  getReorderStatus,
  getReorderResult,
  cancelReorderJob,
} from './api-client.ts';
import type { ReorderFormat, ReorderResult } from './api-client.ts';

/** Polling interval in milliseconds between status checks */
const POLL_INTERVAL_MS = 2000;

/** Maximum allowed file size for a single sequence (10 MB) */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Default maximum number of reordering iterations */
const DEFAULT_MAX_ITERATIONS = 15;

/** Handle returned by createReorderDialog for lifecycle management */
export interface ReorderDialogHandle {
  readonly element: HTMLDialogElement;
  readonly destroy: () => void;
}

/** Callback invoked when reordering completes successfully */
export type ReorderDoneCallback = (result: ReorderResult) => void;

function detectFormat(filename: string): ReorderFormat {
  const lower = filename.toLowerCase();
  if (
    lower.endsWith('.gbk') ||
    lower.endsWith('.gb') ||
    lower.endsWith('.genbank')
  ) {
    return 'genbank';
  }
  return 'fasta';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Create a native `<dialog>` modal for Mauve Contig Mover configuration.
 *
 * Shows three sequential phases:
 *  - Input: file pickers for reference and draft, max iterations
 *  - Progress: real-time iteration count via polling
 *  - Done: completion message with optional result download
 *
 * Polls GET /api/reorder/:jobId/status every 2 seconds using sequential
 * setTimeout. On dialog teardown, cancels the active job best-effort.
 *
 * @param container - Element to append the dialog to
 * @param onDone - Optional callback invoked on successful completion
 */
export function createReorderDialog(
  container: HTMLElement,
  onDone?: ReorderDoneCallback,
): ReorderDialogHandle {
  const dialog = document.createElement('dialog');
  dialog.className = 'reorder-dialog';
  dialog.setAttribute('aria-label', 'Order Contigs');

  // Mutable state for cleanup — intentional exception to immutability rule
  let activeJobId: string | undefined;
  let pollTimerId: ReturnType<typeof setTimeout> | undefined;
  let destroyed = false;

  dialog.innerHTML = `
    <div class="export-dialog-content reorder-dialog-content">
      <h3>Order Contigs (Mauve Contig Mover)</h3>

      <div class="reorder-phase reorder-phase-input">
        <div class="export-field">
          <label for="reorder-ref-file">Reference genome:</label>
          <div class="reorder-file-row">
            <span class="reorder-file-name reorder-ref-name" aria-live="polite">No file selected</span>
            <button type="button" class="reorder-browse-btn reorder-ref-browse">Browse...</button>
            <input type="file" class="reorder-file-input reorder-ref-input"
              accept=".fasta,.fa,.fna,.fas,.gbk,.gb,.genbank"
              aria-label="Reference genome file" />
          </div>
        </div>
        <div class="export-field">
          <label for="reorder-draft-file">Draft genome (FASTA or GenBank):</label>
          <div class="reorder-file-row">
            <span class="reorder-file-name reorder-draft-name" aria-live="polite">No file selected</span>
            <button type="button" class="reorder-browse-btn reorder-draft-browse">Browse...</button>
            <input type="file" class="reorder-file-input reorder-draft-input"
              accept=".fasta,.fa,.fna,.fas,.fbk,.gbk,.gb,.genbank"
              aria-label="Draft genome file" />
          </div>
        </div>
        <div class="export-field">
          <label for="reorder-max-iter">Max iterations (1–100):</label>
          <input type="number" id="reorder-max-iter"
            value="${DEFAULT_MAX_ITERATIONS}" min="1" max="100" step="1" />
        </div>
        <p class="reorder-error-msg" role="alert" aria-live="assertive" style="display:none;color:var(--color-error,#c00)"></p>
        <div class="export-actions">
          <button type="button" class="export-cancel-btn reorder-close-btn">Cancel</button>
          <button type="button" class="export-confirm-btn reorder-start-btn" disabled>Start</button>
        </div>
      </div>

      <div class="reorder-phase reorder-phase-progress" style="display:none;">
        <p class="reorder-progress-text" aria-live="polite">Preparing...</p>
        <p class="reorder-error-msg reorder-progress-error" role="alert" aria-live="assertive" style="display:none;color:var(--color-error,#c00)"></p>
        <div class="export-actions">
          <button type="button" class="export-cancel-btn reorder-cancel-btn">Cancel</button>
        </div>
      </div>

      <div class="reorder-phase reorder-phase-done" style="display:none;">
        <p class="reorder-done-text" aria-live="polite"></p>
        <div class="export-actions">
          <button type="button" class="reorder-download-btn" style="display:none;">Download Reordered Sequence</button>
          <button type="button" class="export-confirm-btn reorder-close-done-btn">Close</button>
        </div>
      </div>
    </div>
  `;

  container.appendChild(dialog);
  dialog.showModal();

  // Query elements
  const inputPhase = dialog.querySelector('.reorder-phase-input') as HTMLDivElement;
  const progressPhase = dialog.querySelector('.reorder-phase-progress') as HTMLDivElement;
  const donePhase = dialog.querySelector('.reorder-phase-done') as HTMLDivElement;

  const refFileInput = dialog.querySelector('.reorder-ref-input') as HTMLInputElement;
  const refBrowseBtn = dialog.querySelector('.reorder-ref-browse') as HTMLButtonElement;
  const refNameSpan = dialog.querySelector('.reorder-ref-name') as HTMLSpanElement;

  const draftFileInput = dialog.querySelector('.reorder-draft-input') as HTMLInputElement;
  const draftBrowseBtn = dialog.querySelector('.reorder-draft-browse') as HTMLButtonElement;
  const draftNameSpan = dialog.querySelector('.reorder-draft-name') as HTMLSpanElement;

  const maxIterInput = dialog.querySelector('#reorder-max-iter') as HTMLInputElement;
  const inputErrorMsg = dialog.querySelector('.reorder-phase-input .reorder-error-msg') as HTMLParagraphElement;
  const startBtn = dialog.querySelector('.reorder-start-btn') as HTMLButtonElement;
  const closeBtn = dialog.querySelector('.reorder-close-btn') as HTMLButtonElement;

  const progressText = dialog.querySelector('.reorder-progress-text') as HTMLParagraphElement;
  const progressError = dialog.querySelector('.reorder-progress-error') as HTMLParagraphElement;
  const cancelBtn = dialog.querySelector('.reorder-cancel-btn') as HTMLButtonElement;

  const doneText = dialog.querySelector('.reorder-done-text') as HTMLParagraphElement;
  const downloadBtn = dialog.querySelector('.reorder-download-btn') as HTMLButtonElement;
  const closeDoneBtn = dialog.querySelector('.reorder-close-done-btn') as HTMLButtonElement;

  // Mutable state — intentional exception
  let refFile: File | undefined;
  let draftFile: File | undefined;
  let lastResult: ReorderResult | undefined;

  function showPhase(phase: 'input' | 'progress' | 'done'): void {
    inputPhase.style.display = phase === 'input' ? '' : 'none';
    progressPhase.style.display = phase === 'progress' ? '' : 'none';
    donePhase.style.display = phase === 'done' ? '' : 'none';
  }

  function updateStartBtn(): void {
    startBtn.disabled = !refFile || !draftFile;
  }

  function showInputError(msg: string): void {
    inputErrorMsg.textContent = msg;
    inputErrorMsg.style.display = '';
  }

  function hideInputError(): void {
    inputErrorMsg.style.display = 'none';
    inputErrorMsg.textContent = '';
  }

  function showProgressError(msg: string): void {
    progressError.textContent = msg;
    progressError.style.display = '';
  }

  function updateProgressText(iteration: number, maxIterations: number): void {
    progressText.textContent =
      iteration === 0
        ? 'Preparing...'
        : `Iteration ${iteration} of ${maxIterations} complete`;
  }

  function stopPolling(): void {
    if (pollTimerId !== undefined) {
      clearTimeout(pollTimerId);
      pollTimerId = undefined;
    }
  }

  function cancelActiveJob(): void {
    stopPolling();
    if (activeJobId !== undefined) {
      void cancelReorderJob(activeJobId);
      activeJobId = undefined;
    }
  }

  function scheduleNextPoll(jobId: string): void {
    if (destroyed) return;
    pollTimerId = setTimeout(() => {
      void pollStatus(jobId);
    }, POLL_INTERVAL_MS);
  }

  async function pollStatus(jobId: string): Promise<void> {
    if (destroyed) return;
    pollTimerId = undefined;

    try {
      const status = await getReorderStatus(jobId);

      if (destroyed) return;

      if (status.status === 'completed') {
        activeJobId = undefined;
        const result = await getReorderResult(jobId);
        if (destroyed) return;
        lastResult = result;
        onDone?.(result);
        showPhase('done');
        doneText.textContent = `Reordering complete after ${status.iteration} iteration(s).`;
        downloadBtn.style.display = '';
      } else if (status.status === 'running' || status.status === 'queued') {
        updateProgressText(status.iteration, status.maxIterations);
        scheduleNextPoll(jobId);
      } else {
        // failed or cancelled
        activeJobId = undefined;
        showPhase('done');
        doneText.textContent = 'Reordering failed.';
        showProgressError('The reordering process encountered an error.');
        donePhase.querySelector('.reorder-progress-error')?.remove();
        // Show error in done phase
        const errP = document.createElement('p');
        errP.style.color = 'var(--color-error,#c00)';
        errP.textContent = 'An error occurred during reordering.';
        doneText.after(errP);
      }
    } catch {
      if (destroyed) return;
      activeJobId = undefined;
      showPhase('done');
      doneText.textContent = 'Reordering failed.';
      const errP = document.createElement('p');
      errP.style.color = 'var(--color-error,#c00)';
      errP.textContent = 'An error occurred while communicating with the server.';
      doneText.after(errP);
    }
  }

  async function startReorder(): Promise<void> {
    if (!refFile || !draftFile) return;
    hideInputError();

    if (refFile.size > MAX_FILE_BYTES) {
      showInputError('Reference file is too large (max 10 MB).');
      return;
    }
    if (draftFile.size > MAX_FILE_BYTES) {
      showInputError('Draft file is too large (max 10 MB).');
      return;
    }

    startBtn.disabled = true;

    let refContent: string;
    let draftContent: string;
    try {
      [refContent, draftContent] = await Promise.all([
        refFile.text(),
        draftFile.text(),
      ]);
    } catch {
      showInputError('Failed to read the selected files.');
      startBtn.disabled = false;
      return;
    }

    const maxIterations = Math.max(
      1,
      Math.min(100, Math.trunc(Number(maxIterInput.value) || DEFAULT_MAX_ITERATIONS)),
    );

    showPhase('progress');
    updateProgressText(0, maxIterations);

    try {
      const { jobId } = await submitReorderJob(
        { name: refFile.name, content: refContent, format: detectFormat(refFile.name) },
        { name: draftFile.name, content: draftContent, format: detectFormat(draftFile.name) },
        maxIterations,
      );
      activeJobId = jobId;
      scheduleNextPoll(jobId);
    } catch {
      showPhase('input');
      showInputError('Failed to submit the reordering job. Check that the server is available.');
      startBtn.disabled = false;
    }
  }

  // File picker wiring
  refBrowseBtn.addEventListener('click', () => refFileInput.click());
  draftBrowseBtn.addEventListener('click', () => draftFileInput.click());

  refFileInput.addEventListener('change', () => {
    const file = refFileInput.files?.[0];
    if (file) {
      refFile = file;
      refNameSpan.textContent = escapeHtml(file.name);
    }
    updateStartBtn();
  });

  draftFileInput.addEventListener('change', () => {
    const file = draftFileInput.files?.[0];
    if (file) {
      draftFile = file;
      draftNameSpan.textContent = escapeHtml(file.name);
    }
    updateStartBtn();
  });

  // Button actions
  startBtn.addEventListener('click', () => {
    void startReorder();
  });

  closeBtn.addEventListener('click', () => {
    destroy();
  });

  cancelBtn.addEventListener('click', () => {
    cancelActiveJob();
    showPhase('input');
    startBtn.disabled = !refFile || !draftFile;
  });

  closeDoneBtn.addEventListener('click', () => {
    destroy();
  });

  downloadBtn.addEventListener('click', () => {
    if (!lastResult) return;
    const blob = new Blob([lastResult.sequence], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = draftFile
      ? draftFile.name.replace(/\.[^.]+$/, '_reordered.fasta')
      : 'reordered.fasta';
    a.click();
    URL.revokeObjectURL(url);
  });

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    cancelActiveJob();
    dialog.close();
    dialog.remove();
  }

  return { element: dialog, destroy };
}
