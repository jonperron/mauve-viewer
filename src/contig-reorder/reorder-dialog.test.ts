import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createReorderDialog } from './reorder-dialog.ts';

function createContainer(): HTMLElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

function makeFile(name: string, content: string, type = 'text/plain'): File {
  return new File([content], name, { type });
}

beforeEach(() => {
  document.body.innerHTML = '';
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('createReorderDialog', () => {
  it('creates a native <dialog> element appended to container', () => {
    const container = createContainer();
    createReorderDialog(container);

    const dialog = container.querySelector('dialog.reorder-dialog');
    expect(dialog).not.toBeNull();
    expect(dialog!.tagName).toBe('DIALOG');
  });

  it('opens the dialog as modal', () => {
    const container = createContainer();
    createReorderDialog(container);

    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.hasAttribute('open')).toBe(true);
  });

  it('has correct aria-label', () => {
    const container = createContainer();
    createReorderDialog(container);

    const dialog = container.querySelector('dialog')!;
    expect(dialog.getAttribute('aria-label')).toBe('Order Contigs');
  });

  it('shows the input phase initially', () => {
    const container = createContainer();
    createReorderDialog(container);

    const inputPhase = container.querySelector('.reorder-phase-input') as HTMLDivElement;
    const progressPhase = container.querySelector('.reorder-phase-progress') as HTMLDivElement;
    const donePhase = container.querySelector('.reorder-phase-done') as HTMLDivElement;

    expect(inputPhase.style.display).not.toBe('none');
    expect(progressPhase.style.display).toBe('none');
    expect(donePhase.style.display).toBe('none');
  });

  it('Start button is disabled initially', () => {
    const container = createContainer();
    createReorderDialog(container);

    const startBtn = container.querySelector('.reorder-start-btn') as HTMLButtonElement;
    expect(startBtn.disabled).toBe(true);
  });

  it('Start button remains disabled with only reference file selected', async () => {
    const container = createContainer();
    createReorderDialog(container);

    const refInput = container.querySelector('.reorder-ref-input') as HTMLInputElement;
    Object.defineProperty(refInput, 'files', {
      value: [makeFile('ref.fasta', '>ref\nATCG')],
    });
    refInput.dispatchEvent(new Event('change'));

    const startBtn = container.querySelector('.reorder-start-btn') as HTMLButtonElement;
    expect(startBtn.disabled).toBe(true);
  });

  it('Start button is enabled when both files are selected', () => {
    const container = createContainer();
    createReorderDialog(container);

    const refInput = container.querySelector('.reorder-ref-input') as HTMLInputElement;
    const draftInput = container.querySelector('.reorder-draft-input') as HTMLInputElement;

    Object.defineProperty(refInput, 'files', {
      value: [makeFile('ref.fasta', '>ref\nATCG')],
    });
    refInput.dispatchEvent(new Event('change'));

    Object.defineProperty(draftInput, 'files', {
      value: [makeFile('draft.fasta', '>draft\nGCTA')],
    });
    draftInput.dispatchEvent(new Event('change'));

    const startBtn = container.querySelector('.reorder-start-btn') as HTMLButtonElement;
    expect(startBtn.disabled).toBe(false);
  });

  it('shows reference filename after file selection', () => {
    const container = createContainer();
    createReorderDialog(container);

    const refInput = container.querySelector('.reorder-ref-input') as HTMLInputElement;
    Object.defineProperty(refInput, 'files', {
      value: [makeFile('my-ref.fasta', '>ref\nATCG')],
    });
    refInput.dispatchEvent(new Event('change'));

    const refName = container.querySelector('.reorder-ref-name') as HTMLSpanElement;
    expect(refName.textContent).toContain('my-ref.fasta');
  });

  it('shows draft filename after file selection', () => {
    const container = createContainer();
    createReorderDialog(container);

    const draftInput = container.querySelector('.reorder-draft-input') as HTMLInputElement;
    Object.defineProperty(draftInput, 'files', {
      value: [makeFile('my-draft.gbk', 'LOCUS draft')],
    });
    draftInput.dispatchEvent(new Event('change'));

    const draftName = container.querySelector('.reorder-draft-name') as HTMLSpanElement;
    expect(draftName.textContent).toContain('my-draft.gbk');
  });

  it('defaults max iterations to 15', () => {
    const container = createContainer();
    createReorderDialog(container);

    const maxIterInput = container.querySelector('#reorder-max-iter') as HTMLInputElement;
    expect(maxIterInput.value).toBe('15');
  });

  it('Cancel button closes and removes dialog', () => {
    const container = createContainer();
    createReorderDialog(container);

    const closeBtn = container.querySelector('.reorder-close-btn') as HTMLButtonElement;
    closeBtn.click();

    expect(container.querySelector('dialog')).toBeNull();
  });

  it('destroy() closes and removes dialog', () => {
    const container = createContainer();
    const handle = createReorderDialog(container);

    handle.destroy();

    expect(container.querySelector('dialog')).toBeNull();
  });

  it('destroy() is idempotent', () => {
    const container = createContainer();
    const handle = createReorderDialog(container);

    expect(() => {
      handle.destroy();
      handle.destroy();
    }).not.toThrow();
  });

  it('submits job when Start is clicked with both files', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-1', status: 'queued' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobId: 'job-1',
          status: 'running',
          iteration: 1,
          maxIterations: 15,
        }),
      } as Response);

    const container = createContainer();
    createReorderDialog(container);

    const refInput = container.querySelector('.reorder-ref-input') as HTMLInputElement;
    const draftInput = container.querySelector('.reorder-draft-input') as HTMLInputElement;

    Object.defineProperty(refInput, 'files', {
      value: [makeFile('ref.fasta', '>ref\nATCG')],
    });
    refInput.dispatchEvent(new Event('change'));

    Object.defineProperty(draftInput, 'files', {
      value: [makeFile('draft.fasta', '>draft\nGCTA')],
    });
    draftInput.dispatchEvent(new Event('change'));

    const startBtn = container.querySelector('.reorder-start-btn') as HTMLButtonElement;
    startBtn.click();

    // Wait for async submit to complete
    await new Promise((r) => setTimeout(r, 0));

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/reorder',
      expect.objectContaining({ method: 'POST' }),
    );

    const progressPhase = container.querySelector('.reorder-phase-progress') as HTMLDivElement;
    expect(progressPhase.style.display).not.toBe('none');
  });

  it('shows error in input phase when submit fails', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as Response);

    const container = createContainer();
    createReorderDialog(container);

    const refInput = container.querySelector('.reorder-ref-input') as HTMLInputElement;
    const draftInput = container.querySelector('.reorder-draft-input') as HTMLInputElement;

    Object.defineProperty(refInput, 'files', {
      value: [makeFile('ref.fasta', '>ref\nATCG')],
    });
    refInput.dispatchEvent(new Event('change'));

    Object.defineProperty(draftInput, 'files', {
      value: [makeFile('draft.fasta', '>draft\nGCTA')],
    });
    draftInput.dispatchEvent(new Event('change'));

    const startBtn = container.querySelector('.reorder-start-btn') as HTMLButtonElement;
    startBtn.click();

    await new Promise((r) => setTimeout(r, 0));

    const inputPhase = container.querySelector('.reorder-phase-input') as HTMLDivElement;
    const errorMsg = inputPhase.querySelector('.reorder-error-msg') as HTMLParagraphElement;

    expect(inputPhase.style.display).not.toBe('none');
    expect(errorMsg.style.display).not.toBe('none');
    expect(errorMsg.textContent).toBeTruthy();
  });

  it('Cancel in progress phase cancels job and returns to input phase', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-2', status: 'queued' }),
      } as Response)
      .mockResolvedValue({ ok: true } as Response);

    const container = createContainer();
    createReorderDialog(container);

    const refInput = container.querySelector('.reorder-ref-input') as HTMLInputElement;
    const draftInput = container.querySelector('.reorder-draft-input') as HTMLInputElement;
    Object.defineProperty(refInput, 'files', { value: [makeFile('r.fasta', '>r\nA')] });
    refInput.dispatchEvent(new Event('change'));
    Object.defineProperty(draftInput, 'files', { value: [makeFile('d.fasta', '>d\nT')] });
    draftInput.dispatchEvent(new Event('change'));

    container.querySelector<HTMLButtonElement>('.reorder-start-btn')!.click();
    await new Promise((r) => setTimeout(r, 0));

    container.querySelector<HTMLButtonElement>('.reorder-cancel-btn')!.click();

    const inputPhase = container.querySelector('.reorder-phase-input') as HTMLDivElement;
    expect(inputPhase.style.display).not.toBe('none');

    const deleteCall = vi.mocked(fetch).mock.calls.find(
      (call) => call[1] && (call[1] as RequestInit).method === 'DELETE',
    );
    expect(deleteCall).toBeDefined();
  });

  it('invokes onDone callback when job completes', async () => {
    const onDone = vi.fn();

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-3', status: 'queued' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobId: 'job-3',
          status: 'completed',
          iteration: 3,
          maxIterations: 15,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sequence: '>c1\nATCG', contigsTab: 'tab' }),
      } as Response);

    vi.useFakeTimers();

    const container = createContainer();
    createReorderDialog(container, onDone);

    const refInput = container.querySelector('.reorder-ref-input') as HTMLInputElement;
    const draftInput = container.querySelector('.reorder-draft-input') as HTMLInputElement;
    Object.defineProperty(refInput, 'files', { value: [makeFile('r.fasta', '>r\nA')] });
    refInput.dispatchEvent(new Event('change'));
    Object.defineProperty(draftInput, 'files', { value: [makeFile('d.fasta', '>d\nT')] });
    draftInput.dispatchEvent(new Event('change'));

    container.querySelector<HTMLButtonElement>('.reorder-start-btn')!.click();

    // Flush microtasks: file reads → fetch submit → scheduleNextPoll
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // Advance fake timers past the 2s poll interval; also flushes resulting async
    await vi.advanceTimersByTimeAsync(2001);

    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({ sequence: '>c1\nATCG' }),
    );

    const donePhase = container.querySelector('.reorder-phase-done') as HTMLDivElement;
    expect(donePhase.style.display).not.toBe('none');
  });

  it('destroy() best-effort cancels active job', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-4', status: 'queued' }),
      } as Response)
      .mockResolvedValue({ ok: true } as Response);

    const container = createContainer();
    const handle = createReorderDialog(container);

    const refInput = container.querySelector('.reorder-ref-input') as HTMLInputElement;
    const draftInput = container.querySelector('.reorder-draft-input') as HTMLInputElement;
    Object.defineProperty(refInput, 'files', { value: [makeFile('r.fasta', '>r\nA')] });
    refInput.dispatchEvent(new Event('change'));
    Object.defineProperty(draftInput, 'files', { value: [makeFile('d.fasta', '>d\nT')] });
    draftInput.dispatchEvent(new Event('change'));

    container.querySelector<HTMLButtonElement>('.reorder-start-btn')!.click();
    await new Promise((r) => setTimeout(r, 0));

    handle.destroy();

    const deleteCall = vi.mocked(fetch).mock.calls.find(
      (call) => call[1] && (call[1] as RequestInit).method === 'DELETE',
    );
    expect(deleteCall).toBeDefined();
  });
});
