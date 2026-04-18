import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSummaryExportDialog } from './summary-export-dialog.ts';
import { DEFAULT_SUMMARY_OPTIONS } from '../../../export/summary/types.ts';
import type { SummaryOptions } from '../../../export/summary/types.ts';

function createContainer(): HTMLElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

describe('createSummaryExportDialog', () => {
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = createContainer();
  });

  it('creates dialog and backdrop elements', () => {
    const onConfirm = vi.fn();
    createSummaryExportDialog(container, onConfirm);

    expect(container.querySelector('.export-config-dialog')).not.toBeNull();
    expect(container.querySelector('.export-config-backdrop')).not.toBeNull();
  });

  it('has correct role and aria-label', () => {
    const onConfirm = vi.fn();
    createSummaryExportDialog(container, onConfirm);

    const dialog = container.querySelector('.export-config-dialog')!;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('Export Summary');
  });

  it('shows default option values in inputs', () => {
    const onConfirm = vi.fn();
    createSummaryExportDialog(container, onConfirm);

    const islandMin = container.querySelector('#summary-island-min') as HTMLInputElement;
    const backboneMin = container.querySelector('#summary-backbone-min') as HTMLInputElement;
    const maxRatio = container.querySelector('#summary-max-ratio') as HTMLInputElement;
    const minContained = container.querySelector('#summary-min-contained') as HTMLInputElement;

    expect(islandMin.value).toBe(String(DEFAULT_SUMMARY_OPTIONS.islandMinLength));
    expect(backboneMin.value).toBe(String(DEFAULT_SUMMARY_OPTIONS.backboneMinLength));
    expect(maxRatio.value).toBe(String(DEFAULT_SUMMARY_OPTIONS.maxLengthRatio));
    expect(minContained.value).toBe(String(DEFAULT_SUMMARY_OPTIONS.minimumPercentContained));
  });

  it('calls onConfirm with default options when Export clicked without changes', () => {
    const onConfirm = vi.fn();
    createSummaryExportDialog(container, onConfirm);

    const confirmBtn = container.querySelector('.export-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    expect(onConfirm).toHaveBeenCalledOnce();
    const options: Partial<SummaryOptions> = onConfirm.mock.calls[0]![0];
    expect(options.islandMinLength).toBe(DEFAULT_SUMMARY_OPTIONS.islandMinLength);
    expect(options.backboneMinLength).toBe(DEFAULT_SUMMARY_OPTIONS.backboneMinLength);
    expect(options.maxLengthRatio).toBe(DEFAULT_SUMMARY_OPTIONS.maxLengthRatio);
    expect(options.minimumPercentContained).toBe(DEFAULT_SUMMARY_OPTIONS.minimumPercentContained);
  });

  it('calls onConfirm with custom options when inputs changed', () => {
    const onConfirm = vi.fn();
    createSummaryExportDialog(container, onConfirm);

    const islandMin = container.querySelector('#summary-island-min') as HTMLInputElement;
    const maxRatio = container.querySelector('#summary-max-ratio') as HTMLInputElement;

    islandMin.value = '100';
    maxRatio.value = '5.0';

    const confirmBtn = container.querySelector('.export-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    expect(onConfirm).toHaveBeenCalledOnce();
    const options: Partial<SummaryOptions> = onConfirm.mock.calls[0]![0];
    expect(options.islandMinLength).toBe(100);
    expect(options.maxLengthRatio).toBe(5.0);
  });

  it('clamps min percent contained to 0-1 range', () => {
    const onConfirm = vi.fn();
    createSummaryExportDialog(container, onConfirm);

    const minContained = container.querySelector('#summary-min-contained') as HTMLInputElement;
    minContained.value = '2.5';

    const confirmBtn = container.querySelector('.export-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    const options: Partial<SummaryOptions> = onConfirm.mock.calls[0]![0];
    expect(options.minimumPercentContained).toBe(1);
  });

  it('clamps island min length to at least 1', () => {
    const onConfirm = vi.fn();
    createSummaryExportDialog(container, onConfirm);

    const islandMin = container.querySelector('#summary-island-min') as HTMLInputElement;
    islandMin.value = '-5';

    const confirmBtn = container.querySelector('.export-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    const options: Partial<SummaryOptions> = onConfirm.mock.calls[0]![0];
    expect(options.islandMinLength).toBe(1);
  });

  it('uses fallback for NaN values', () => {
    const onConfirm = vi.fn();
    createSummaryExportDialog(container, onConfirm);

    const maxRatio = container.querySelector('#summary-max-ratio') as HTMLInputElement;
    maxRatio.value = 'abc';

    const confirmBtn = container.querySelector('.export-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    const options: Partial<SummaryOptions> = onConfirm.mock.calls[0]![0];
    expect(options.maxLengthRatio).toBe(DEFAULT_SUMMARY_OPTIONS.maxLengthRatio);
  });

  it('removes dialog on Cancel click', () => {
    const onConfirm = vi.fn();
    createSummaryExportDialog(container, onConfirm);

    const cancelBtn = container.querySelector('.export-cancel-btn') as HTMLButtonElement;
    cancelBtn.click();

    expect(container.querySelector('.export-config-dialog')).toBeNull();
    expect(container.querySelector('.export-config-backdrop')).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('removes dialog on backdrop click', () => {
    const onConfirm = vi.fn();
    createSummaryExportDialog(container, onConfirm);

    const backdrop = container.querySelector('.export-config-backdrop') as HTMLElement;
    backdrop.click();

    expect(container.querySelector('.export-config-dialog')).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('removes dialog on Escape key', () => {
    const onConfirm = vi.fn();
    createSummaryExportDialog(container, onConfirm);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(container.querySelector('.export-config-dialog')).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('removes dialog after Export click', () => {
    const onConfirm = vi.fn();
    createSummaryExportDialog(container, onConfirm);

    const confirmBtn = container.querySelector('.export-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    expect(container.querySelector('.export-config-dialog')).toBeNull();
  });

  it('destroy method removes dialog elements', () => {
    const onConfirm = vi.fn();
    const handle = createSummaryExportDialog(container, onConfirm);

    handle.destroy();

    expect(container.querySelector('.export-config-dialog')).toBeNull();
    expect(container.querySelector('.export-config-backdrop')).toBeNull();
  });
});
