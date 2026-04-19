import type { SummaryOptions } from '../../../export/summary/types.ts';
import { DEFAULT_SUMMARY_OPTIONS } from '../../../export/summary/types.ts';

/** Handle for summary export dialog lifecycle */
export interface SummaryExportDialogHandle {
  readonly element: HTMLDialogElement;
  readonly destroy: () => void;
}

/** Callback that builds the blob URL from the chosen options */
export type SummaryBlobBuilder = (options: Partial<SummaryOptions>) => {
  readonly blobUrl: string;
  readonly filename: string;
  readonly revoke: () => void;
};

/**
 * Create a native `<dialog>` modal for summary pipeline export.
 * Shows island/backbone length thresholds, max length ratio, and min percent contained.
 * When the user clicks Export, the pipeline runs and a real download link appears.
 */
export function createSummaryExportDialog(
  container: HTMLElement,
  buildBlob: SummaryBlobBuilder,
): SummaryExportDialogHandle {
  const dialog = document.createElement('dialog');
  dialog.className = 'summary-export-modal';
  dialog.setAttribute('aria-label', 'Export Summary');

  dialog.innerHTML = `
    <form method="dialog" class="export-dialog-content">
      <h3>Export Summary</h3>
      <div class="export-field">
        <label for="summary-island-min">Island Min Length (bp):</label>
        <input type="number" id="summary-island-min" value="${DEFAULT_SUMMARY_OPTIONS.islandMinLength}" min="1" step="1" />
      </div>
      <div class="export-field">
        <label for="summary-backbone-min">Backbone Min Length (bp):</label>
        <input type="number" id="summary-backbone-min" value="${DEFAULT_SUMMARY_OPTIONS.backboneMinLength}" min="1" step="1" />
      </div>
      <div class="export-field">
        <label for="summary-max-ratio">Max Length Ratio:</label>
        <input type="number" id="summary-max-ratio" value="${DEFAULT_SUMMARY_OPTIONS.maxLengthRatio}" min="0.1" step="0.1" />
      </div>
      <div class="export-field">
        <label for="summary-min-contained">Min Percent Contained (0-1):</label>
        <input type="number" id="summary-min-contained" value="${DEFAULT_SUMMARY_OPTIONS.minimumPercentContained}" min="0" max="1" step="0.05" />
      </div>
      <div class="export-actions">
        <button type="button" class="export-cancel-btn">Cancel</button>
        <button type="button" class="export-confirm-btn">Export</button>
      </div>
    </form>
  `;

  container.appendChild(dialog);
  dialog.showModal();

  const islandMinInput = dialog.querySelector('#summary-island-min') as HTMLInputElement;
  const backboneMinInput = dialog.querySelector('#summary-backbone-min') as HTMLInputElement;
  const maxRatioInput = dialog.querySelector('#summary-max-ratio') as HTMLInputElement;
  const minContainedInput = dialog.querySelector('#summary-min-contained') as HTMLInputElement;
  const cancelBtn = dialog.querySelector('.export-cancel-btn') as HTMLButtonElement;
  const confirmBtn = dialog.querySelector('.export-confirm-btn') as HTMLButtonElement;
  const actionsDiv = dialog.querySelector('.export-actions') as HTMLDivElement;

  // Track blob URL for cleanup
  let revokeBlob: (() => void) | undefined;

  function handleCancel(): void {
    destroy();
  }

  function handleConfirm(): void {
    const options: Partial<SummaryOptions> = {
      islandMinLength: clampInt(parseInt(islandMinInput.value, 10), 1, Infinity, DEFAULT_SUMMARY_OPTIONS.islandMinLength),
      backboneMinLength: clampInt(parseInt(backboneMinInput.value, 10), 1, Infinity, DEFAULT_SUMMARY_OPTIONS.backboneMinLength),
      maxLengthRatio: clampNumber(parseFloat(maxRatioInput.value), 0.1, Infinity, DEFAULT_SUMMARY_OPTIONS.maxLengthRatio),
      minimumPercentContained: clampNumber(parseFloat(minContainedInput.value), 0, 1, DEFAULT_SUMMARY_OPTIONS.minimumPercentContained),
    };

    // Run pipeline and build blob
    const { blobUrl, filename, revoke } = buildBlob(options);
    revokeBlob = revoke;

    // Replace button area with a real download link
    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = filename;
    downloadLink.className = 'export-confirm-btn';
    downloadLink.textContent = `Download ${filename}`;
    downloadLink.addEventListener('click', () => {
      // Close dialog shortly after download starts
      setTimeout(() => destroy(), 100);
    });

    actionsDiv.replaceChildren(cancelBtn, downloadLink);
  }

  cancelBtn.addEventListener('click', handleCancel);
  confirmBtn.addEventListener('click', handleConfirm);

  // Close on click outside (backdrop click)
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      handleCancel();
    }
  });

  // Native <dialog> handles Escape via 'cancel' event
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    handleCancel();
  });

  function destroy(): void {
    revokeBlob?.();
    if (dialog.open) {
      dialog.close();
    }
    dialog.remove();
  }

  return { element: dialog, destroy };
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (Number.isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (Number.isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}
