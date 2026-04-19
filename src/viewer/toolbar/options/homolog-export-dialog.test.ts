import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHomologExportDialog } from './homolog-export-dialog.ts';
import { DEFAULT_HOMOLOG_PARAMS } from '../../../export/homolog/homolog-export.ts';
import type { HomologExportParameters } from '../../../export/homolog/homolog-export.ts';

function createContainer(): HTMLElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

describe('createHomologExportDialog', () => {
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = createContainer();
  });

  it('creates dialog and backdrop elements', () => {
    const onConfirm = vi.fn();
    createHomologExportDialog(container, onConfirm);

    expect(container.querySelector('.export-config-dialog')).not.toBeNull();
    expect(container.querySelector('.export-config-backdrop')).not.toBeNull();
  });

  it('has correct role and aria-label', () => {
    const onConfirm = vi.fn();
    createHomologExportDialog(container, onConfirm);

    const dialog = container.querySelector('.export-config-dialog')!;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('Export Positional Orthologs');
  });

  it('shows default parameter values in inputs', () => {
    const onConfirm = vi.fn();
    createHomologExportDialog(container, onConfirm);

    const minId = container.querySelector('#homolog-min-identity') as HTMLInputElement;
    const maxId = container.querySelector('#homolog-max-identity') as HTMLInputElement;
    const minCov = container.querySelector('#homolog-min-coverage') as HTMLInputElement;
    const maxCov = container.querySelector('#homolog-max-coverage') as HTMLInputElement;
    const featureType = container.querySelector('#homolog-feature-type') as HTMLSelectElement;

    expect(minId.value).toBe(String(DEFAULT_HOMOLOG_PARAMS.minIdentity));
    expect(maxId.value).toBe(String(DEFAULT_HOMOLOG_PARAMS.maxIdentity));
    expect(minCov.value).toBe(String(DEFAULT_HOMOLOG_PARAMS.minCoverage));
    expect(maxCov.value).toBe(String(DEFAULT_HOMOLOG_PARAMS.maxCoverage));
    expect(featureType.value).toBe(DEFAULT_HOMOLOG_PARAMS.featureType);
  });

  it('calls onConfirm with default params when Export clicked without changes', () => {
    const onConfirm = vi.fn();
    createHomologExportDialog(container, onConfirm);

    const confirmBtn = container.querySelector('.export-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    expect(onConfirm).toHaveBeenCalledOnce();
    const params: HomologExportParameters = onConfirm.mock.calls[0]![0];
    expect(params.minIdentity).toBe(DEFAULT_HOMOLOG_PARAMS.minIdentity);
    expect(params.maxIdentity).toBe(DEFAULT_HOMOLOG_PARAMS.maxIdentity);
    expect(params.minCoverage).toBe(DEFAULT_HOMOLOG_PARAMS.minCoverage);
    expect(params.maxCoverage).toBe(DEFAULT_HOMOLOG_PARAMS.maxCoverage);
    expect(params.featureType).toBe(DEFAULT_HOMOLOG_PARAMS.featureType);
  });

  it('calls onConfirm with custom params when inputs changed', () => {
    const onConfirm = vi.fn();
    createHomologExportDialog(container, onConfirm);

    const minId = container.querySelector('#homolog-min-identity') as HTMLInputElement;
    const maxCov = container.querySelector('#homolog-max-coverage') as HTMLInputElement;
    const featureType = container.querySelector('#homolog-feature-type') as HTMLSelectElement;

    minId.value = '0.8';
    maxCov.value = '0.95';
    featureType.value = 'tRNA';

    const confirmBtn = container.querySelector('.export-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    expect(onConfirm).toHaveBeenCalledOnce();
    const params: HomologExportParameters = onConfirm.mock.calls[0]![0];
    expect(params.minIdentity).toBe(0.8);
    expect(params.maxCoverage).toBe(0.95);
    expect(params.featureType).toBe('tRNA');
  });

  it('clamps out-of-range values', () => {
    const onConfirm = vi.fn();
    createHomologExportDialog(container, onConfirm);

    const minId = container.querySelector('#homolog-min-identity') as HTMLInputElement;
    minId.value = '5';

    const confirmBtn = container.querySelector('.export-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    const params: HomologExportParameters = onConfirm.mock.calls[0]![0];
    expect(params.minIdentity).toBe(1);
  });

  it('removes dialog on Cancel click', () => {
    const onConfirm = vi.fn();
    createHomologExportDialog(container, onConfirm);

    const cancelBtn = container.querySelector('.export-cancel-btn') as HTMLButtonElement;
    cancelBtn.click();

    expect(container.querySelector('.export-config-dialog')).toBeNull();
    expect(container.querySelector('.export-config-backdrop')).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('removes dialog on backdrop click', () => {
    const onConfirm = vi.fn();
    createHomologExportDialog(container, onConfirm);

    const backdrop = container.querySelector('.export-config-backdrop') as HTMLElement;
    backdrop.click();

    expect(container.querySelector('.export-config-dialog')).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('removes dialog on Escape key', () => {
    const onConfirm = vi.fn();
    createHomologExportDialog(container, onConfirm);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(container.querySelector('.export-config-dialog')).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('removes dialog after Export click', () => {
    const onConfirm = vi.fn();
    createHomologExportDialog(container, onConfirm);

    const confirmBtn = container.querySelector('.export-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    expect(container.querySelector('.export-config-dialog')).toBeNull();
  });

  it('destroy method removes dialog elements', () => {
    const onConfirm = vi.fn();
    const handle = createHomologExportDialog(container, onConfirm);

    handle.destroy();

    expect(container.querySelector('.export-config-dialog')).toBeNull();
    expect(container.querySelector('.export-config-backdrop')).toBeNull();
  });

  it('has all five feature type options in the select', () => {
    const onConfirm = vi.fn();
    createHomologExportDialog(container, onConfirm);

    const options = container.querySelectorAll('#homolog-feature-type option');
    const values = Array.from(options).map((o) => (o as HTMLOptionElement).value);
    expect(values).toEqual(['CDS', 'gene', 'tRNA', 'rRNA', 'misc_RNA']);
  });
});
