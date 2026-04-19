import type { HomologExportParameters } from '../../../export/homolog/homolog-export.ts';
import { DEFAULT_HOMOLOG_PARAMS } from '../../../export/homolog/homolog-export.ts';
import type { FeatureType } from '../../../annotations/types.ts';

/** Handle for homolog export dialog lifecycle */
export interface HomologExportDialogHandle {
  readonly element: HTMLElement;
  readonly destroy: () => void;
}

const FEATURE_TYPES: readonly FeatureType[] = ['CDS', 'gene', 'tRNA', 'rRNA', 'misc_RNA'];

/**
 * Create a configuration dialog for positional homolog export.
 * Shows identity/coverage thresholds and feature type selection.
 * Calls onConfirm with the chosen parameters.
 */
export function createHomologExportDialog(
  container: HTMLElement,
  onConfirm: (params: HomologExportParameters) => void,
): HomologExportDialogHandle {
  const dialog = document.createElement('div');
  dialog.className = 'export-config-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-label', 'Export Positional Orthologs');

  const backdrop = document.createElement('div');
  backdrop.className = 'export-config-backdrop';

  dialog.innerHTML = `
    <div class="export-dialog-content">
      <h3>Export Positional Orthologs</h3>
      <div class="export-field">
        <label for="homolog-min-identity">Min Identity (0-1):</label>
        <input type="number" id="homolog-min-identity" value="${DEFAULT_HOMOLOG_PARAMS.minIdentity}" min="0" max="1" step="0.05" />
      </div>
      <div class="export-field">
        <label for="homolog-max-identity">Max Identity (0-1):</label>
        <input type="number" id="homolog-max-identity" value="${DEFAULT_HOMOLOG_PARAMS.maxIdentity}" min="0" max="1" step="0.05" />
      </div>
      <div class="export-field">
        <label for="homolog-min-coverage">Min Coverage (0-1):</label>
        <input type="number" id="homolog-min-coverage" value="${DEFAULT_HOMOLOG_PARAMS.minCoverage}" min="0" max="1" step="0.05" />
      </div>
      <div class="export-field">
        <label for="homolog-max-coverage">Max Coverage (0-1):</label>
        <input type="number" id="homolog-max-coverage" value="${DEFAULT_HOMOLOG_PARAMS.maxCoverage}" min="0" max="1" step="0.05" />
      </div>
      <div class="export-field">
        <label for="homolog-feature-type">Feature Type:</label>
        <select id="homolog-feature-type">
          ${FEATURE_TYPES.map((ft) => `<option value="${ft}"${ft === DEFAULT_HOMOLOG_PARAMS.featureType ? ' selected' : ''}>${ft}</option>`).join('')}
        </select>
      </div>
      <div class="export-actions">
        <button type="button" class="export-cancel-btn">Cancel</button>
        <button type="button" class="export-confirm-btn">Export</button>
      </div>
    </div>
  `;

  container.appendChild(backdrop);
  container.appendChild(dialog);

  const minIdentityInput = dialog.querySelector('#homolog-min-identity') as HTMLInputElement;
  const maxIdentityInput = dialog.querySelector('#homolog-max-identity') as HTMLInputElement;
  const minCoverageInput = dialog.querySelector('#homolog-min-coverage') as HTMLInputElement;
  const maxCoverageInput = dialog.querySelector('#homolog-max-coverage') as HTMLInputElement;
  const featureTypeSelect = dialog.querySelector('#homolog-feature-type') as HTMLSelectElement;
  const cancelBtn = dialog.querySelector('.export-cancel-btn') as HTMLButtonElement;
  const confirmBtn = dialog.querySelector('.export-confirm-btn') as HTMLButtonElement;

  function handleCancel(): void {
    destroy();
  }

  function handleConfirm(): void {
    const params: HomologExportParameters = {
      minIdentity: clampNumber(parseFloat(minIdentityInput.value), 0, 1, DEFAULT_HOMOLOG_PARAMS.minIdentity),
      maxIdentity: clampNumber(parseFloat(maxIdentityInput.value), 0, 1, DEFAULT_HOMOLOG_PARAMS.maxIdentity),
      minCoverage: clampNumber(parseFloat(minCoverageInput.value), 0, 1, DEFAULT_HOMOLOG_PARAMS.minCoverage),
      maxCoverage: clampNumber(parseFloat(maxCoverageInput.value), 0, 1, DEFAULT_HOMOLOG_PARAMS.maxCoverage),
      featureType: (FEATURE_TYPES.includes(featureTypeSelect.value as FeatureType)
        ? featureTypeSelect.value
        : DEFAULT_HOMOLOG_PARAMS.featureType) as FeatureType,
    };
    destroy();
    onConfirm(params);
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
