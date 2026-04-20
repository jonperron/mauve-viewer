import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAlignmentDialog } from './alignment-dialog.ts';
import type { LoadedSequence, AlignmentDialogResult } from './alignment-dialog.ts';

function createContainer(): HTMLElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

function makeFastaSequence(name: string): LoadedSequence {
  return { name, content: '>seq\nACGT', format: 'fasta' };
}

function twoSequences(): readonly LoadedSequence[] {
  return [makeFastaSequence('genome1.fasta'), makeFastaSequence('genome2.fasta')];
}

describe('createAlignmentDialog', () => {
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = createContainer();
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  });

  it('creates a native <dialog> element', () => {
    createAlignmentDialog(container, [], vi.fn());

    const dialog = container.querySelector('dialog.alignment-dialog');
    expect(dialog).not.toBeNull();
    expect(dialog!.tagName).toBe('DIALOG');
  });

  it('opens the dialog as modal', () => {
    createAlignmentDialog(container, [], vi.fn());

    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.hasAttribute('open')).toBe(true);
  });

  it('has correct aria-label', () => {
    createAlignmentDialog(container, [], vi.fn());

    const dialog = container.querySelector('dialog')!;
    expect(dialog.getAttribute('aria-label')).toBe('Align Sequences');
  });

  it('shows loaded sequences in the sequence list', () => {
    createAlignmentDialog(container, twoSequences(), vi.fn());

    const items = container.querySelectorAll('.align-seq-item');
    expect(items.length).toBe(2);
    expect(items[0]!.querySelector('.align-seq-name')!.textContent).toBe('genome1.fasta');
    expect(items[1]!.querySelector('.align-seq-name')!.textContent).toBe('genome2.fasta');
  });

  it('shows sequence count', () => {
    createAlignmentDialog(container, twoSequences(), vi.fn());

    const count = container.querySelector('.align-seq-count-value');
    expect(count!.textContent).toBe('2');
  });

  it('defaults to progressiveMauve algorithm', () => {
    createAlignmentDialog(container, [], vi.fn());

    const select = container.querySelector('#align-algorithm') as HTMLSelectElement;
    expect(select.value).toBe('progressiveMauve');
  });

  it('defaults to auto seed weight (checkbox checked)', () => {
    createAlignmentDialog(container, [], vi.fn());

    const checkbox = container.querySelector('#align-default-seed') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('hides seed weight input when default seed is checked', () => {
    createAlignmentDialog(container, [], vi.fn());

    const field = container.querySelector('.align-seed-weight-field') as HTMLDivElement;
    expect(field.style.display).toBe('none');
  });

  it('shows seed weight input when default seed is unchecked', () => {
    createAlignmentDialog(container, [], vi.fn());

    const checkbox = container.querySelector('#align-default-seed') as HTMLInputElement;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));

    const field = container.querySelector('.align-seed-weight-field') as HTMLDivElement;
    expect(field.style.display).toBe('');
  });

  it('shows progressiveMauve fields by default', () => {
    createAlignmentDialog(container, [], vi.fn());

    const progressive = container.querySelector('.align-progressive-fields') as HTMLFieldSetElement;
    const mauve = container.querySelector('.align-mauve-aligner-fields') as HTMLFieldSetElement;
    expect(progressive.style.display).toBe('');
    expect(mauve.style.display).toBe('none');
  });

  it('toggles algorithm-specific fields on algorithm change', () => {
    createAlignmentDialog(container, [], vi.fn());

    const select = container.querySelector('#align-algorithm') as HTMLSelectElement;
    select.value = 'mauveAligner';
    select.dispatchEvent(new Event('change'));

    const progressive = container.querySelector('.align-progressive-fields') as HTMLFieldSetElement;
    const mauve = container.querySelector('.align-mauve-aligner-fields') as HTMLFieldSetElement;
    expect(progressive.style.display).toBe('none');
    expect(mauve.style.display).toBe('');
  });

  it('disables submit button when fewer than 2 sequences', () => {
    createAlignmentDialog(container, [makeFastaSequence('one.fasta')], vi.fn());

    const btn = container.querySelector('.align-submit-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('enables submit button with 2+ sequences', () => {
    createAlignmentDialog(container, twoSequences(), vi.fn());

    const btn = container.querySelector('.align-submit-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('removes a sequence when remove button clicked', () => {
    createAlignmentDialog(container, twoSequences(), vi.fn());

    const removeBtn = container.querySelector('.align-seq-remove[data-index="0"]') as HTMLButtonElement;
    removeBtn.click();

    const items = container.querySelectorAll('.align-seq-item');
    expect(items.length).toBe(1);
    expect(container.querySelector('.align-seq-count-value')!.textContent).toBe('1');
  });

  it('calls onConfirm with progressiveMauve params by default', () => {
    const onConfirm = vi.fn();
    createAlignmentDialog(container, twoSequences(), onConfirm);

    const btn = container.querySelector('.align-submit-btn') as HTMLButtonElement;
    btn.click();

    expect(onConfirm).toHaveBeenCalledOnce();
    const result: AlignmentDialogResult = onConfirm.mock.calls[0]![0];
    expect(result.params.algorithm).toBe('progressiveMauve');
    expect(result.params.seedWeight).toBe('auto');
    expect(result.params.collinear).toBe(false);
    expect(result.params.fullAlignment).toBe(true);
    expect(result.sequences.length).toBe(2);
  });

  it('calls onConfirm with mauveAligner params when selected', () => {
    const onConfirm = vi.fn();
    createAlignmentDialog(container, twoSequences(), onConfirm);

    const select = container.querySelector('#align-algorithm') as HTMLSelectElement;
    select.value = 'mauveAligner';
    select.dispatchEvent(new Event('change'));

    const btn = container.querySelector('.align-submit-btn') as HTMLButtonElement;
    btn.click();

    const result: AlignmentDialogResult = onConfirm.mock.calls[0]![0];
    expect(result.params.algorithm).toBe('mauveAligner');
    expect('extendLcbs' in result.params).toBe(true);
  });

  it('includes custom seed weight when default seed unchecked', () => {
    const onConfirm = vi.fn();
    createAlignmentDialog(container, twoSequences(), onConfirm);

    const defaultSeed = container.querySelector('#align-default-seed') as HTMLInputElement;
    defaultSeed.checked = false;
    defaultSeed.dispatchEvent(new Event('change'));

    const seedInput = container.querySelector('#align-seed-weight') as HTMLInputElement;
    seedInput.value = '11';

    const btn = container.querySelector('.align-submit-btn') as HTMLButtonElement;
    btn.click();

    const result: AlignmentDialogResult = onConfirm.mock.calls[0]![0];
    expect(result.params.seedWeight).toBe(11);
  });

  it('includes min LCB weight when specified', () => {
    const onConfirm = vi.fn();
    createAlignmentDialog(container, twoSequences(), onConfirm);

    const lcbInput = container.querySelector('#align-min-lcb-weight') as HTMLInputElement;
    lcbInput.value = '200';

    const btn = container.querySelector('.align-submit-btn') as HTMLButtonElement;
    btn.click();

    const result: AlignmentDialogResult = onConfirm.mock.calls[0]![0];
    expect(result.params.minLcbWeight).toBe(200);
  });

  it('omits minLcbWeight when set to "default"', () => {
    const onConfirm = vi.fn();
    createAlignmentDialog(container, twoSequences(), onConfirm);

    const btn = container.querySelector('.align-submit-btn') as HTMLButtonElement;
    btn.click();

    const result: AlignmentDialogResult = onConfirm.mock.calls[0]![0];
    expect(result.params.minLcbWeight).toBeUndefined();
  });

  it('includes progressiveMauve-specific toggles', () => {
    const onConfirm = vi.fn();
    createAlignmentDialog(container, twoSequences(), onConfirm);

    const seedFamilies = container.querySelector('#align-seed-families') as HTMLInputElement;
    seedFamilies.checked = true;

    const iterative = container.querySelector('#align-iterative-refinement') as HTMLInputElement;
    iterative.checked = false;

    const btn = container.querySelector('.align-submit-btn') as HTMLButtonElement;
    btn.click();

    const result: AlignmentDialogResult = onConfirm.mock.calls[0]![0];
    expect(result.params.algorithm).toBe('progressiveMauve');
    const params = result.params as { seedFamilies: boolean; iterativeRefinement: boolean; sumOfPairsScoring: boolean };
    expect(params.seedFamilies).toBe(true);
    expect(params.iterativeRefinement).toBe(false);
    expect(params.sumOfPairsScoring).toBe(true);
  });

  it('clamps seed weight to 3-21 range', () => {
    const onConfirm = vi.fn();
    createAlignmentDialog(container, twoSequences(), onConfirm);

    const defaultSeed = container.querySelector('#align-default-seed') as HTMLInputElement;
    defaultSeed.checked = false;
    defaultSeed.dispatchEvent(new Event('change'));

    const seedInput = container.querySelector('#align-seed-weight') as HTMLInputElement;
    seedInput.value = '50';

    const btn = container.querySelector('.align-submit-btn') as HTMLButtonElement;
    btn.click();

    const result: AlignmentDialogResult = onConfirm.mock.calls[0]![0];
    expect(result.params.seedWeight).toBe(21);
  });

  it('does not call onConfirm with fewer than 2 sequences', () => {
    const onConfirm = vi.fn();
    createAlignmentDialog(container, [makeFastaSequence('one.fasta')], onConfirm);

    const btn = container.querySelector('.align-submit-btn') as HTMLButtonElement;
    btn.click();

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('removes dialog on Cancel click', () => {
    createAlignmentDialog(container, [], vi.fn());

    const cancelBtn = container.querySelector('.export-cancel-btn') as HTMLButtonElement;
    cancelBtn.click();

    expect(container.querySelector('dialog')).toBeNull();
  });

  it('removes dialog on cancel event (Escape)', () => {
    createAlignmentDialog(container, [], vi.fn());

    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    dialog.dispatchEvent(new Event('cancel'));

    expect(container.querySelector('dialog')).toBeNull();
  });

  it('removes dialog after confirm', () => {
    createAlignmentDialog(container, twoSequences(), vi.fn());

    const btn = container.querySelector('.align-submit-btn') as HTMLButtonElement;
    btn.click();

    expect(container.querySelector('dialog')).toBeNull();
  });

  it('destroy method removes dialog element', () => {
    const handle = createAlignmentDialog(container, [], vi.fn());

    handle.destroy();

    expect(container.querySelector('dialog')).toBeNull();
  });

  it('preserves format selection per sequence', () => {
    const seqs: readonly LoadedSequence[] = [
      { name: 'genome.gbk', content: 'LOCUS...', format: 'genbank' },
      makeFastaSequence('genome2.fasta'),
    ];
    const onConfirm = vi.fn();
    createAlignmentDialog(container, seqs, onConfirm);

    const formatSelects = container.querySelectorAll('.align-seq-format');
    expect((formatSelects[0] as HTMLSelectElement).value).toBe('genbank');
    expect((formatSelects[1] as HTMLSelectElement).value).toBe('fasta');

    const btn = container.querySelector('.align-submit-btn') as HTMLButtonElement;
    btn.click();

    const result: AlignmentDialogResult = onConfirm.mock.calls[0]![0];
    expect(result.sequences[0]!.format).toBe('genbank');
    expect(result.sequences[1]!.format).toBe('fasta');
  });

  it('adds files via file input change', async () => {
    createAlignmentDialog(container, [], vi.fn());

    const fileInput = container.querySelector('.align-seq-file-input') as HTMLInputElement;
    const file = new File(['>seq\nACGT'], 'new-genome.fasta', { type: 'text/plain' });

    Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
    fileInput.dispatchEvent(new Event('change'));

    // Wait for async file reading
    await new Promise((resolve) => { setTimeout(resolve, 10); });

    const items = container.querySelectorAll('.align-seq-item');
    expect(items.length).toBe(1);
    expect(items[0]!.querySelector('.align-seq-name')!.textContent).toBe('new-genome.fasta');
  });

  it('updates format when sequence format select changes', () => {
    const seqs: readonly LoadedSequence[] = [
      makeFastaSequence('genome1.fasta'),
      makeFastaSequence('genome2.fasta'),
    ];
    const onConfirm = vi.fn();
    createAlignmentDialog(container, seqs, onConfirm);

    const formatSelect = container.querySelector('.align-seq-format[data-index="0"]') as HTMLSelectElement;
    formatSelect.value = 'genbank';
    formatSelect.dispatchEvent(new Event('change', { bubbles: true }));

    const btn = container.querySelector('.align-submit-btn') as HTMLButtonElement;
    btn.click();

    const result: AlignmentDialogResult = onConfirm.mock.calls[0]![0];
    expect(result.sequences[0]!.format).toBe('genbank');
  });

  it('collinear toggle is off by default', () => {
    createAlignmentDialog(container, [], vi.fn());

    const checkbox = container.querySelector('#align-collinear') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('full alignment toggle is on by default', () => {
    createAlignmentDialog(container, [], vi.fn());

    const checkbox = container.querySelector('#align-full-alignment') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('escapes HTML in sequence names', () => {
    const seqs: readonly LoadedSequence[] = [
      { name: '<script>alert("xss")</script>', content: 'ACGT', format: 'fasta' },
      makeFastaSequence('genome2.fasta'),
    ];
    createAlignmentDialog(container, seqs, vi.fn());

    const name = container.querySelector('.align-seq-name')!;
    expect(name.textContent).toBe('<script>alert("xss")</script>');
    expect(name.innerHTML).not.toContain('<script>');
  });

  it('detects genbank format from .gbk extension', async () => {
    createAlignmentDialog(container, [], vi.fn());

    const fileInput = container.querySelector('.align-seq-file-input') as HTMLInputElement;
    const file = new File(['LOCUS test'], 'genome.gbk', { type: 'text/plain' });
    Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
    fileInput.dispatchEvent(new Event('change'));

    await new Promise((resolve) => { setTimeout(resolve, 10); });

    const formatSelect = container.querySelector('.align-seq-format') as HTMLSelectElement;
    expect(formatSelect.value).toBe('genbank');
  });

  it('detects embl format from .embl extension', async () => {
    createAlignmentDialog(container, [], vi.fn());

    const fileInput = container.querySelector('.align-seq-file-input') as HTMLInputElement;
    const file = new File(['ID test'], 'genome.embl', { type: 'text/plain' });
    Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
    fileInput.dispatchEvent(new Event('change'));

    await new Promise((resolve) => { setTimeout(resolve, 10); });

    const formatSelect = container.querySelector('.align-seq-format') as HTMLSelectElement;
    expect(formatSelect.value).toBe('embl');
  });

  it('removes dialog on backdrop click', () => {
    createAlignmentDialog(container, [], vi.fn());

    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(container.querySelector('dialog')).toBeNull();
  });

  it('uses fallback for NaN seed weight', () => {
    const onConfirm = vi.fn();
    createAlignmentDialog(container, twoSequences(), onConfirm);

    const defaultSeed = container.querySelector('#align-default-seed') as HTMLInputElement;
    defaultSeed.checked = false;
    defaultSeed.dispatchEvent(new Event('change'));

    const seedInput = container.querySelector('#align-seed-weight') as HTMLInputElement;
    seedInput.value = 'abc';

    const btn = container.querySelector('.align-submit-btn') as HTMLButtonElement;
    btn.click();

    const result: AlignmentDialogResult = onConfirm.mock.calls[0]![0];
    expect(result.params.seedWeight).toBe(15);
  });

  it('switches to mauveAligner fields correctly', () => {
    createAlignmentDialog(container, [], vi.fn());

    const select = container.querySelector('#align-algorithm') as HTMLSelectElement;
    select.value = 'mauveAligner';
    select.dispatchEvent(new Event('change'));

    const mauve = container.querySelector('.align-mauve-aligner-fields') as HTMLFieldSetElement;
    expect(mauve.style.display).toBe('');

    // Switch back
    select.value = 'progressiveMauve';
    select.dispatchEvent(new Event('change'));

    const progressive = container.querySelector('.align-progressive-fields') as HTMLFieldSetElement;
    expect(progressive.style.display).toBe('');
    expect(mauve.style.display).toBe('none');
  });

  it('handles drop zone dragover and dragleave', () => {
    createAlignmentDialog(container, [], vi.fn());

    const dropZone = container.querySelector('.align-seq-drop-zone') as HTMLDivElement;

    dropZone.dispatchEvent(new Event('dragover', { cancelable: true }));
    expect(dropZone.classList.contains('align-drop-active')).toBe(true);

    dropZone.dispatchEvent(new Event('dragleave'));
    expect(dropZone.classList.contains('align-drop-active')).toBe(false);
  });

  it('triggers file picker on drop zone click', () => {
    createAlignmentDialog(container, [], vi.fn());

    const dropZone = container.querySelector('.align-seq-drop-zone') as HTMLDivElement;
    const fileInput = container.querySelector('.align-seq-file-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    dropZone.click();

    expect(clickSpy).toHaveBeenCalled();
  });

  it('triggers file picker on drop zone Enter key', () => {
    createAlignmentDialog(container, [], vi.fn());

    const dropZone = container.querySelector('.align-seq-drop-zone') as HTMLDivElement;
    const fileInput = container.querySelector('.align-seq-file-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    dropZone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true, bubbles: true }));

    expect(clickSpy).toHaveBeenCalled();
  });

  it('triggers file picker on drop zone Space key', () => {
    createAlignmentDialog(container, [], vi.fn());

    const dropZone = container.querySelector('.align-seq-drop-zone') as HTMLDivElement;
    const fileInput = container.querySelector('.align-seq-file-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    dropZone.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', cancelable: true, bubbles: true }));

    expect(clickSpy).toHaveBeenCalled();
  });

  it('does not trigger file picker on non-Enter/Space keydown', () => {
    createAlignmentDialog(container, [], vi.fn());

    const dropZone = container.querySelector('.align-seq-drop-zone') as HTMLDivElement;
    const fileInput = container.querySelector('.align-seq-file-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    dropZone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true, bubbles: true }));

    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('adds files via drop event', async () => {
    createAlignmentDialog(container, [], vi.fn());

    const dropZone = container.querySelector('.align-seq-drop-zone') as HTMLDivElement;
    const file = new File(['>seq\nACGT'], 'dropped.fasta', { type: 'text/plain' });

    const dropEvent = new Event('drop', { cancelable: true }) as Event & { dataTransfer?: DataTransfer };
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { files: [file] },
    });
    dropZone.dispatchEvent(dropEvent);

    await new Promise((resolve) => { setTimeout(resolve, 10); });

    const items = container.querySelectorAll('.align-seq-item');
    expect(items.length).toBe(1);
    expect(items[0]!.querySelector('.align-seq-name')!.textContent).toBe('dropped.fasta');
  });

  it('ignores drop with no files', () => {
    createAlignmentDialog(container, [], vi.fn());

    const dropZone = container.querySelector('.align-seq-drop-zone') as HTMLDivElement;

    const dropEvent = new Event('drop', { cancelable: true }) as Event & { dataTransfer?: DataTransfer };
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { files: [] },
    });
    dropZone.dispatchEvent(dropEvent);

    const items = container.querySelectorAll('.align-seq-item');
    expect(items.length).toBe(0);
  });

  it('handles NaN min LCB weight gracefully', () => {
    const onConfirm = vi.fn();
    createAlignmentDialog(container, twoSequences(), onConfirm);

    const lcbInput = container.querySelector('#align-min-lcb-weight') as HTMLInputElement;
    lcbInput.value = 'invalid';

    const btn = container.querySelector('.align-submit-btn') as HTMLButtonElement;
    btn.click();

    const result: AlignmentDialogResult = onConfirm.mock.calls[0]![0];
    expect(result.params.minLcbWeight).toBeUndefined();
  });

  it('detects .gb extension as genbank format', async () => {
    createAlignmentDialog(container, [], vi.fn());

    const fileInput = container.querySelector('.align-seq-file-input') as HTMLInputElement;
    const file = new File(['LOCUS test'], 'genome.gb', { type: 'text/plain' });
    Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
    fileInput.dispatchEvent(new Event('change'));

    await new Promise((resolve) => { setTimeout(resolve, 10); });

    const formatSelect = container.querySelector('.align-seq-format') as HTMLSelectElement;
    expect(formatSelect.value).toBe('genbank');
  });

  it('defaults unknown extension to fasta', async () => {
    createAlignmentDialog(container, [], vi.fn());

    const fileInput = container.querySelector('.align-seq-file-input') as HTMLInputElement;
    const file = new File(['ACGT'], 'genome.txt', { type: 'text/plain' });
    Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
    fileInput.dispatchEvent(new Event('change'));

    await new Promise((resolve) => { setTimeout(resolve, 10); });

    const formatSelect = container.querySelector('.align-seq-format') as HTMLSelectElement;
    expect(formatSelect.value).toBe('fasta');
  });
});
