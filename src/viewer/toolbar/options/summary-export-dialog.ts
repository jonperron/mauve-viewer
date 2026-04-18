import type { SummaryOptions } from '../../../export/summary/types.ts';
import { DEFAULT_SUMMARY_OPTIONS } from '../../../export/summary/types.ts';

/** Handle for summary export dialog lifecycle */
export interface SummaryExportDialogHandle {
  readonly element: HTMLElement;
  readonly destroy: () => void;
}

/**
 * Create a configuration dialog for summary pipeline export.
 * Shows island/backbone length thresholds, max length ratio, and min percent contained.
 * Calls onConfirm with the chosen options.
 */
export function createSummaryExportDialog(
  container: HTMLElement,
  onConfirm: (options: Partial<SummaryOptions>) => void,
): SummaryExportDialogHandle {
  const dialog = document.createElement('div');
  dialog.className = 'export-config-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-label', 'Export Summary');

  const backdrop = document.createElement('div');
  backdrop.className = 'export-config-backdrop';

  dialog.innerHTML = `
    <div class="export-dialog-content">
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
    </div>
  `;

  container.appendChild(backdrop);
  container.appendChild(dialog);

  const islandMinInput = dialog.querySelector('#summary-island-min') as HTMLInputElement;
  const backboneMinInput = dialog.querySelector('#summary-backbone-min') as HTMLInputElement;
  const maxRatioInput = dialog.querySelector('#summary-max-ratio') as HTMLInputElement;
  const minContainedInput = dialog.querySelector('#summary-min-contained') as HTMLInputElement;
  const cancelBtn = dialog.querySelector('.export-cancel-btn') as HTMLButtonElement;
  const confirmBtn = dialog.querySelector('.export-confirm-btn') as HTMLButtonElement;

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
    destroy();
    onConfirm(options);
  }

  cancelBtn.addEventListener('click', handleCancel);
  confirmBtn.addEventListener('click', handleConfirm);
  backdrop.addEventListener('click', handleCancel);

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      handleCancel();
    }
  }
  document.addEventListener('keydown', onKeyDown);

  function destroy(): void {
    document.removeEventListener('keydown', onKeyDown);
    backdrop.remove();
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
