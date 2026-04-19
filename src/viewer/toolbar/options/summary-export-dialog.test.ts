import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSummaryExportDialog } from './summary-export-dialog.ts';
import type { SummaryBlobBuilder } from './summary-export-dialog.ts';
import { DEFAULT_SUMMARY_OPTIONS } from '../../../export/summary/types.ts';
import type { SummaryOptions } from '../../../export/summary/types.ts';

function createContainer(): HTMLElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

function mockBlobBuilder(): SummaryBlobBuilder {
  return vi.fn(() => ({
    blobUrl: 'blob:http://localhost/fake-id',
    filename: 'alignment_summary.zip',
    revoke: vi.fn(),
  }));
}

describe('createSummaryExportDialog', () => {
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = createContainer();
    // jsdom doesn't implement showModal — stub it
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  });

  it('creates a native <dialog> element', () => {
    createSummaryExportDialog(container, mockBlobBuilder());

    const dialog = container.querySelector('dialog.summary-export-modal');
    expect(dialog).not.toBeNull();
    expect(dialog!.tagName).toBe('DIALOG');
  });

  it('opens the dialog as modal', () => {
    createSummaryExportDialog(container, mockBlobBuilder());

    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.hasAttribute('open')).toBe(true);
  });

  it('has correct aria-label', () => {
    createSummaryExportDialog(container, mockBlobBuilder());

    const dialog = container.querySelector('dialog')!;
    expect(dialog.getAttribute('aria-label')).toBe('Export Summary');
  });

  it('shows default option values in inputs', () => {
    createSummaryExportDialog(container, mockBlobBuilder());

    const islandMin = container.querySelector('#summary-island-min') as HTMLInputElement;
    const backboneMin = container.querySelector('#summary-backbone-min') as HTMLInputElement;
    const maxRatio = container.querySelector('#summary-max-ratio') as HTMLInputElement;
    const minContained = container.querySelector('#summary-min-contained') as HTMLInputElement;

    expect(islandMin.value).toBe(String(DEFAULT_SUMMARY_OPTIONS.islandMinLength));
    expect(backboneMin.value).toBe(String(DEFAULT_SUMMARY_OPTIONS.backboneMinLength));
    expect(maxRatio.value).toBe(String(DEFAULT_SUMMARY_OPTIONS.maxLengthRatio));
    expect(minContained.value).toBe(String(DEFAULT_SUMMARY_OPTIONS.minimumPercentContained));
  });

  it('calls buildBlob with default options when Export clicked without changes', () => {
    const buildBlob = mockBlobBuilder();
    createSummaryExportDialog(container, buildBlob);

    const confirmBtn = container.querySelector('.export-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    expect(buildBlob).toHaveBeenCalledOnce();
    const options: Partial<SummaryOptions> = (buildBlob as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(options.islandMinLength).toBe(DEFAULT_SUMMARY_OPTIONS.islandMinLength);
    expect(options.backboneMinLength).toBe(DEFAULT_SUMMARY_OPTIONS.backboneMinLength);
    expect(options.maxLengthRatio).toBe(DEFAULT_SUMMARY_OPTIONS.maxLengthRatio);
    expect(options.minimumPercentContained).toBe(DEFAULT_SUMMARY_OPTIONS.minimumPercentContained);
  });

  it('calls buildBlob with custom options when inputs changed', () => {
    const buildBlob = mockBlobBuilder();
    createSummaryExportDialog(container, buildBlob);

    const islandMin = container.querySelector('#summary-island-min') as HTMLInputElement;
    const maxRatio = container.querySelector('#summary-max-ratio') as HTMLInputElement;

    islandMin.value = '100';
    maxRatio.value = '5.0';

    const confirmBtn = container.querySelector('.export-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    expect(buildBlob).toHaveBeenCalledOnce();
    const options: Partial<SummaryOptions> = (buildBlob as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(options.islandMinLength).toBe(100);
    expect(options.maxLengthRatio).toBe(5.0);
  });

  it('clamps min percent contained to 0-1 range', () => {
    const buildBlob = mockBlobBuilder();
    createSummaryExportDialog(container, buildBlob);

    const minContained = container.querySelector('#summary-min-contained') as HTMLInputElement;
    minContained.value = '2.5';

    const confirmBtn = container.querySelector('.export-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    const options: Partial<SummaryOptions> = (buildBlob as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(options.minimumPercentContained).toBe(1);
  });

  it('clamps island min length to at least 1', () => {
    const buildBlob = mockBlobBuilder();
    createSummaryExportDialog(container, buildBlob);

    const islandMin = container.querySelector('#summary-island-min') as HTMLInputElement;
    islandMin.value = '-5';

    const confirmBtn = container.querySelector('.export-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    const options: Partial<SummaryOptions> = (buildBlob as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(options.islandMinLength).toBe(1);
  });

  it('uses fallback for NaN values', () => {
    const buildBlob = mockBlobBuilder();
    createSummaryExportDialog(container, buildBlob);

    const maxRatio = container.querySelector('#summary-max-ratio') as HTMLInputElement;
    maxRatio.value = 'abc';

    const confirmBtn = container.querySelector('.export-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    const options: Partial<SummaryOptions> = (buildBlob as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(options.maxLengthRatio).toBe(DEFAULT_SUMMARY_OPTIONS.maxLengthRatio);
  });

  it('replaces Export button with download link after Export click', () => {
    createSummaryExportDialog(container, mockBlobBuilder());

    const confirmBtn = container.querySelector('.export-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    const link = container.querySelector('a.export-confirm-btn') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.href).toBe('blob:http://localhost/fake-id');
    expect(link.download).toBe('alignment_summary.zip');
    expect(link.textContent).toContain('alignment_summary.zip');
  });

  it('dialog stays open after Export click (until download link is clicked)', () => {
    createSummaryExportDialog(container, mockBlobBuilder());

    const confirmBtn = container.querySelector('.export-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    const dialog = container.querySelector('dialog');
    expect(dialog).not.toBeNull();
  });

  it('removes dialog on Cancel click', () => {
    createSummaryExportDialog(container, mockBlobBuilder());

    const cancelBtn = container.querySelector('.export-cancel-btn') as HTMLButtonElement;
    cancelBtn.click();

    expect(container.querySelector('dialog')).toBeNull();
  });

  it('removes dialog on cancel event (Escape key)', () => {
    createSummaryExportDialog(container, mockBlobBuilder());

    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    dialog.dispatchEvent(new Event('cancel'));

    expect(container.querySelector('dialog')).toBeNull();
  });

  it('destroy method removes dialog element', () => {
    const handle = createSummaryExportDialog(container, mockBlobBuilder());

    handle.destroy();

    expect(container.querySelector('dialog')).toBeNull();
  });

  it('revokes blob URL on destroy', () => {
    const revoke = vi.fn();
    const buildBlob = vi.fn(() => ({
      blobUrl: 'blob:http://localhost/fake-id',
      filename: 'alignment_summary.zip',
      revoke,
    }));
    const handle = createSummaryExportDialog(container, buildBlob);

    const confirmBtn = container.querySelector('.export-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    handle.destroy();
    expect(revoke).toHaveBeenCalledOnce();
  });
});
