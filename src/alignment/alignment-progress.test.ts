import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAlignmentProgress } from './alignment-progress.ts';
import type { AlignmentProgressHandle } from './alignment-progress.ts';
import type { AlignmentClientConfig, AlignmentProgressEvent } from './types.ts';
import * as apiClient from './api-client.ts';

vi.mock('./api-client.ts', () => ({
  subscribeToProgress: vi.fn(),
  cancelAlignment: vi.fn(),
}));

const mockSubscribeToProgress = vi.mocked(apiClient.subscribeToProgress);
const mockCancelAlignment = vi.mocked(apiClient.cancelAlignment);

const config: AlignmentClientConfig = { baseUrl: 'http://localhost:3000' };
const JOB_ID = 'test-job-42';

function createContainer(): HTMLElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

function setupSubscribeMock(): {
  triggerEvent: (event: AlignmentProgressEvent) => void;
  triggerError: (event: Event) => void;
  unsubscribe: ReturnType<typeof vi.fn>;
} {
  let onEvent: ((event: AlignmentProgressEvent) => void) | undefined;
  let onError: ((event: Event) => void) | undefined;
  const unsubscribe = vi.fn();

  mockSubscribeToProgress.mockImplementation((_cfg, _jobId, cb, errCb) => {
    onEvent = cb;
    onError = errCb;
    return unsubscribe;
  });

  return {
    triggerEvent(event: AlignmentProgressEvent) {
      onEvent?.(event);
    },
    triggerError(event: Event) {
      onError?.(event);
    },
    unsubscribe,
  };
}

describe('createAlignmentProgress', () => {
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = createContainer();
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  });

  it('creates a dialog element with progress class', () => {
    const sub = setupSubscribeMock();
    createAlignmentProgress(container, config, JOB_ID, {});

    const dialog = container.querySelector('dialog.alignment-progress-dialog');
    expect(dialog).not.toBeNull();
    expect(dialog!.hasAttribute('open')).toBe(true);
    sub.unsubscribe();
  });

  it('has correct aria-label', () => {
    setupSubscribeMock();
    createAlignmentProgress(container, config, JOB_ID, {});

    const dialog = container.querySelector('dialog')!;
    expect(dialog.getAttribute('aria-label')).toBe('Alignment Progress');
  });

  it('shows initial status message', () => {
    setupSubscribeMock();
    createAlignmentProgress(container, config, JOB_ID, {});

    const status = container.querySelector('.align-progress-status');
    expect(status).not.toBeNull();
    expect(status!.textContent).toBe('Starting alignment...');
  });

  it('shows a progress indicator', () => {
    setupSubscribeMock();
    createAlignmentProgress(container, config, JOB_ID, {});

    const indicator = container.querySelector('.align-progress-indicator');
    expect(indicator).not.toBeNull();
  });

  it('shows a cancel button', () => {
    setupSubscribeMock();
    createAlignmentProgress(container, config, JOB_ID, {});

    const cancelBtn = container.querySelector('.align-progress-cancel') as HTMLButtonElement;
    expect(cancelBtn).not.toBeNull();
    expect(cancelBtn.textContent).toBe('Cancel');
    expect(cancelBtn.disabled).toBe(false);
  });

  it('shows a log area for messages', () => {
    setupSubscribeMock();
    createAlignmentProgress(container, config, JOB_ID, {});

    const log = container.querySelector('.align-progress-log');
    expect(log).not.toBeNull();
  });

  it('subscribes to WebSocket progress events', () => {
    setupSubscribeMock();
    createAlignmentProgress(container, config, JOB_ID, {});

    expect(mockSubscribeToProgress).toHaveBeenCalledWith(
      config,
      JOB_ID,
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('updates status and log on progress event', () => {
    const sub = setupSubscribeMock();
    createAlignmentProgress(container, config, JOB_ID, {});

    sub.triggerEvent({ jobId: JOB_ID, type: 'progress', message: 'Anchoring matches...' });

    const status = container.querySelector('.align-progress-status')!;
    expect(status.textContent).toBe('Anchoring matches...');

    const log = container.querySelector('.align-progress-log')!;
    expect(log.textContent).toContain('Anchoring matches...');
  });

  it('appends multiple progress messages to the log', () => {
    const sub = setupSubscribeMock();
    createAlignmentProgress(container, config, JOB_ID, {});

    sub.triggerEvent({ jobId: JOB_ID, type: 'progress', message: 'Anchoring...' });
    sub.triggerEvent({ jobId: JOB_ID, type: 'progress', message: 'Extending LCBs...' });
    sub.triggerEvent({ jobId: JOB_ID, type: 'progress', message: 'Refining alignment...' });

    const logEntries = container.querySelectorAll('.align-progress-log-entry');
    expect(logEntries.length).toBe(3);
  });

  it('calls onComplete and disables cancel on completed event', () => {
    const sub = setupSubscribeMock();
    const onComplete = vi.fn();
    createAlignmentProgress(container, config, JOB_ID, { onComplete });

    sub.triggerEvent({ jobId: JOB_ID, type: 'completed' });

    expect(onComplete).toHaveBeenCalledWith(JOB_ID);
    const cancelBtn = container.querySelector('.align-progress-cancel') as HTMLButtonElement;
    expect(cancelBtn.disabled).toBe(true);
  });

  it('shows completion status on completed event', () => {
    const sub = setupSubscribeMock();
    createAlignmentProgress(container, config, JOB_ID, {});

    sub.triggerEvent({ jobId: JOB_ID, type: 'completed' });

    const status = container.querySelector('.align-progress-status')!;
    expect(status.textContent).toBe('Alignment completed');
  });

  it('shows error message on failed event', () => {
    const sub = setupSubscribeMock();
    const onError = vi.fn();
    createAlignmentProgress(container, config, JOB_ID, { onError });

    sub.triggerEvent({ jobId: JOB_ID, type: 'failed', message: 'Out of memory' });

    const status = container.querySelector('.align-progress-status')!;
    expect(status.textContent).toBe('Alignment failed: Out of memory');
    expect(onError).toHaveBeenCalledWith('Out of memory');
  });

  it('shows generic error when failed event has no message', () => {
    const sub = setupSubscribeMock();
    createAlignmentProgress(container, config, JOB_ID, {});

    sub.triggerEvent({ jobId: JOB_ID, type: 'failed' });

    const status = container.querySelector('.align-progress-status')!;
    expect(status.textContent).toBe('Alignment failed');
  });

  it('shows cancelled status on cancelled event', () => {
    const sub = setupSubscribeMock();
    const onCancel = vi.fn();
    createAlignmentProgress(container, config, JOB_ID, { onCancel });

    sub.triggerEvent({ jobId: JOB_ID, type: 'cancelled' });

    const status = container.querySelector('.align-progress-status')!;
    expect(status.textContent).toBe('Alignment cancelled');
    expect(onCancel).toHaveBeenCalled();
  });

  it('disables cancel button on terminal event', () => {
    const sub = setupSubscribeMock();
    createAlignmentProgress(container, config, JOB_ID, {});

    sub.triggerEvent({ jobId: JOB_ID, type: 'failed', message: 'error' });

    const cancelBtn = container.querySelector('.align-progress-cancel') as HTMLButtonElement;
    expect(cancelBtn.disabled).toBe(true);
  });

  it('calls cancelAlignment when cancel button is clicked', () => {
    setupSubscribeMock();
    mockCancelAlignment.mockResolvedValue(undefined);

    createAlignmentProgress(container, config, JOB_ID, {});

    const cancelBtn = container.querySelector('.align-progress-cancel') as HTMLButtonElement;
    cancelBtn.click();

    expect(mockCancelAlignment).toHaveBeenCalledWith(config, JOB_ID);
  });

  it('disables cancel button during cancellation request', () => {
    setupSubscribeMock();
    mockCancelAlignment.mockReturnValue(new Promise(() => {}));

    createAlignmentProgress(container, config, JOB_ID, {});

    const cancelBtn = container.querySelector('.align-progress-cancel') as HTMLButtonElement;
    cancelBtn.click();

    expect(cancelBtn.disabled).toBe(true);
  });

  it('re-enables cancel button if cancellation request fails', async () => {
    setupSubscribeMock();
    mockCancelAlignment.mockRejectedValue(new Error('Network error'));

    createAlignmentProgress(container, config, JOB_ID, {});

    const cancelBtn = container.querySelector('.align-progress-cancel') as HTMLButtonElement;
    cancelBtn.click();

    await vi.waitFor(() => {
      expect(cancelBtn.disabled).toBe(false);
    });

    const status = container.querySelector('.align-progress-status')!;
    expect(status.textContent).toContain('Cancel failed');
  });

  it('handles WebSocket error event', () => {
    const sub = setupSubscribeMock();
    createAlignmentProgress(container, config, JOB_ID, {});

    sub.triggerError(new Event('error'));

    const status = container.querySelector('.align-progress-status')!;
    expect(status.textContent).toBe('Connection lost');
  });

  it('unsubscribes from WebSocket on destroy', () => {
    const sub = setupSubscribeMock();
    const handle = createAlignmentProgress(container, config, JOB_ID, {});

    handle.destroy();

    expect(sub.unsubscribe).toHaveBeenCalled();
  });

  it('removes dialog on destroy', () => {
    setupSubscribeMock();
    const handle = createAlignmentProgress(container, config, JOB_ID, {});

    handle.destroy();

    expect(container.querySelector('dialog')).toBeNull();
  });

  it('cleans up on completed event followed by destroy', () => {
    const sub = setupSubscribeMock();
    const handle = createAlignmentProgress(container, config, JOB_ID, {});

    sub.triggerEvent({ jobId: JOB_ID, type: 'completed' });
    handle.destroy();

    expect(sub.unsubscribe).toHaveBeenCalled();
    expect(container.querySelector('dialog')).toBeNull();
  });

  it('keeps status when progress event has no message', () => {
    const sub = setupSubscribeMock();
    createAlignmentProgress(container, config, JOB_ID, {});

    sub.triggerEvent({ jobId: JOB_ID, type: 'progress' });

    const status = container.querySelector('.align-progress-status')!;
    expect(status.textContent).toBe('Starting alignment...');
    const logEntries = container.querySelectorAll('.align-progress-log-entry');
    expect(logEntries.length).toBe(0);
  });

  it('ignores cancel click after terminal event', () => {
    const sub = setupSubscribeMock();
    mockCancelAlignment.mockResolvedValue(undefined);
    createAlignmentProgress(container, config, JOB_ID, {});

    sub.triggerEvent({ jobId: JOB_ID, type: 'completed' });

    const cancelBtn = container.querySelector('.align-progress-cancel') as HTMLButtonElement;
    cancelBtn.click();

    expect(mockCancelAlignment).not.toHaveBeenCalled();
  });

  it('handles non-Error rejection on cancel', async () => {
    setupSubscribeMock();
    mockCancelAlignment.mockRejectedValue('string error');

    createAlignmentProgress(container, config, JOB_ID, {});

    const cancelBtn = container.querySelector('.align-progress-cancel') as HTMLButtonElement;
    cancelBtn.click();

    await vi.waitFor(() => {
      expect(cancelBtn.disabled).toBe(false);
    });

    const status = container.querySelector('.align-progress-status')!;
    expect(status.textContent).toContain('Cancel failed: Unknown error');
  });

  it('ignores WebSocket error after terminal event', () => {
    const sub = setupSubscribeMock();
    createAlignmentProgress(container, config, JOB_ID, {});

    sub.triggerEvent({ jobId: JOB_ID, type: 'completed' });
    sub.triggerError(new Event('error'));

    const status = container.querySelector('.align-progress-status')!;
    expect(status.textContent).toBe('Alignment completed');
  });

  it('prevents dialog close on Escape key', () => {
    setupSubscribeMock();
    createAlignmentProgress(container, config, JOB_ID, {});

    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    const cancelEvent = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancelEvent);

    expect(cancelEvent.defaultPrevented).toBe(true);
    expect(dialog.hasAttribute('open')).toBe(true);
  });

  it('auto-scrolls log to bottom on new messages', () => {
    const sub = setupSubscribeMock();
    createAlignmentProgress(container, config, JOB_ID, {});

    const log = container.querySelector('.align-progress-log') as HTMLElement;
    Object.defineProperty(log, 'scrollHeight', { value: 500, configurable: true });

    sub.triggerEvent({ jobId: JOB_ID, type: 'progress', message: 'Line 1' });

    expect(log.scrollTop).toBe(500);
  });

  it('shows close button after terminal event', () => {
    const sub = setupSubscribeMock();
    createAlignmentProgress(container, config, JOB_ID, {});

    sub.triggerEvent({ jobId: JOB_ID, type: 'completed' });

    const closeBtn = container.querySelector('.align-progress-close') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
  });

  it('destroys dialog when close button is clicked', () => {
    const sub = setupSubscribeMock();
    createAlignmentProgress(container, config, JOB_ID, {});

    sub.triggerEvent({ jobId: JOB_ID, type: 'completed' });

    const closeBtn = container.querySelector('.align-progress-close') as HTMLButtonElement;
    closeBtn.click();

    expect(container.querySelector('dialog')).toBeNull();
    sub.unsubscribe();
  });

  it('returns a handle with element and destroy', () => {
    setupSubscribeMock();
    const handle: AlignmentProgressHandle = createAlignmentProgress(container, config, JOB_ID, {});

    expect(handle.element).toBeInstanceOf(HTMLDialogElement);
    expect(typeof handle.destroy).toBe('function');
  });
});
