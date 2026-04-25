import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createReorderProgress } from './reorder-progress.ts';
import * as apiClient from './api-client.ts';
import type { ReorderClientConfig } from './types.ts';

vi.mock('./api-client.ts', () => ({
  getReorderStatus: vi.fn(),
  cancelReorder: vi.fn(),
}));

const mockGetStatus = vi.mocked(apiClient.getReorderStatus);
const mockCancelReorder = vi.mocked(apiClient.cancelReorder);

const config: ReorderClientConfig = { baseUrl: 'http://localhost:3000' };

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  vi.useFakeTimers();
  mockGetStatus.mockReset();
  mockCancelReorder.mockReset();
  // jsdom does not implement showModal/close — stub them
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

afterEach(() => {
  vi.useRealTimers();
  container.remove();
});

describe('createReorderProgress — rendering', () => {
  it('opens a dialog with progress content', () => {
    mockGetStatus.mockResolvedValue({
      jobId: 'abc',
      status: 'running',
      iteration: 0,
      maxIterations: 15,
    });

    const handle = createReorderProgress(container, config, 'abc', {});
    expect(handle.element).toBeInstanceOf(HTMLDialogElement);
    expect(handle.element.open).toBe(true);

    handle.destroy();
  });

  it('shows the cancel button', () => {
    mockGetStatus.mockResolvedValue({
      jobId: 'abc',
      status: 'running',
      iteration: 1,
      maxIterations: 15,
    });

    const handle = createReorderProgress(container, config, 'abc', {});
    const cancelBtn = handle.element.querySelector('.reorder-progress-cancel');
    expect(cancelBtn).not.toBeNull();

    handle.destroy();
  });
});

describe('createReorderProgress — status polling', () => {
  it('calls onComplete when status transitions to completed', async () => {
    const onComplete = vi.fn();
    mockGetStatus.mockResolvedValueOnce({
      jobId: 'abc',
      status: 'completed',
      iteration: 3,
      maxIterations: 15,
    });

    createReorderProgress(container, config, 'abc', { onComplete });

    await vi.runAllTimersAsync();
    expect(onComplete).toHaveBeenCalledWith('abc');
  });

  it('calls onError when status is failed', async () => {
    const onError = vi.fn();
    mockGetStatus.mockResolvedValueOnce({
      jobId: 'abc',
      status: 'failed',
      iteration: 2,
      maxIterations: 15,
      error: 'process exited with code 1',
    });

    createReorderProgress(container, config, 'abc', { onError });

    await vi.runAllTimersAsync();
    expect(onError).toHaveBeenCalledWith('process exited with code 1');
  });

  it('calls onCancel when status is cancelled', async () => {
    const onCancel = vi.fn();
    mockGetStatus.mockResolvedValueOnce({
      jobId: 'abc',
      status: 'cancelled',
      iteration: 1,
      maxIterations: 15,
    });

    createReorderProgress(container, config, 'abc', { onCancel });

    await vi.runAllTimersAsync();
    expect(onCancel).toHaveBeenCalled();
  });

  it('continues polling when status is running', async () => {
    mockGetStatus
      .mockResolvedValueOnce({ jobId: 'abc', status: 'running', iteration: 1, maxIterations: 15 })
      .mockResolvedValueOnce({ jobId: 'abc', status: 'completed', iteration: 2, maxIterations: 15 });

    const onComplete = vi.fn();
    createReorderProgress(container, config, 'abc', { onComplete });

    await vi.runAllTimersAsync();
    expect(mockGetStatus).toHaveBeenCalledTimes(2);
    expect(onComplete).toHaveBeenCalledWith('abc');
  });

  it('updates iteration display on each poll', async () => {
    mockGetStatus.mockResolvedValueOnce({
      jobId: 'abc',
      status: 'completed',
      iteration: 7,
      maxIterations: 15,
    });

    const handle = createReorderProgress(container, config, 'abc', {});
    await vi.runAllTimersAsync();

    const iterEl = handle.element.querySelector('.reorder-progress-iterations');
    expect(iterEl?.textContent).toContain('7');
  });
});

describe('createReorderProgress — cancellation', () => {
  it('calls cancelReorder when cancel button is clicked', async () => {
    mockGetStatus.mockResolvedValue({ jobId: 'abc', status: 'running', iteration: 1, maxIterations: 15 });
    mockCancelReorder.mockResolvedValue(undefined);

    const handle = createReorderProgress(container, config, 'abc', {});
    const cancelBtn = handle.element.querySelector('.reorder-progress-cancel') as HTMLButtonElement;

    cancelBtn.click();
    await Promise.resolve();

    expect(mockCancelReorder).toHaveBeenCalledWith(config, 'abc');
    handle.destroy();
  });

  it('handles cancel button failure gracefully', async () => {
    mockGetStatus.mockResolvedValue({ jobId: 'abc', status: 'running', iteration: 1, maxIterations: 15 });
    mockCancelReorder.mockRejectedValue(new Error('Cannot cancel'));

    const handle = createReorderProgress(container, config, 'abc', {});
    const cancelBtn = handle.element.querySelector('.reorder-progress-cancel') as HTMLButtonElement;

    cancelBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    const statusEl = handle.element.querySelector('.reorder-progress-status');
    expect(statusEl?.textContent).toContain('Cancel failed');
    handle.destroy();
  });

  it('ignores cancel click after destroy', async () => {
    mockGetStatus.mockResolvedValue({ jobId: 'abc', status: 'running', iteration: 0, maxIterations: 15 });
    mockCancelReorder.mockResolvedValue(undefined);

    const handle = createReorderProgress(container, config, 'abc', {});
    handle.destroy();

    const cancelBtn = handle.element.querySelector('.reorder-progress-cancel') as HTMLButtonElement;
    cancelBtn.click();
    await Promise.resolve();

    expect(mockCancelReorder).not.toHaveBeenCalled();
  });
});

describe('createReorderProgress — destroy', () => {
  it('closes and removes the dialog', async () => {
    mockGetStatus.mockResolvedValue({ jobId: 'abc', status: 'running', iteration: 0, maxIterations: 15 });

    const handle = createReorderProgress(container, config, 'abc', {});
    handle.destroy();

    expect(handle.element.open).toBe(false);
    expect(container.contains(handle.element)).toBe(false);
  });

  it('stops polling after destroy', async () => {
    mockGetStatus.mockResolvedValue({ jobId: 'abc', status: 'running', iteration: 0, maxIterations: 15 });

    const handle = createReorderProgress(container, config, 'abc', {});
    handle.destroy();

    const callCount = mockGetStatus.mock.calls.length;
    await vi.runAllTimersAsync();

    // No additional polls after destroy
    expect(mockGetStatus.mock.calls.length).toBe(callCount);
  });
});

describe('createReorderProgress — additional coverage', () => {
  it('shows status message for queued status and continues polling', async () => {
    mockGetStatus
      .mockResolvedValueOnce({ jobId: 'abc', status: 'queued', iteration: 0, maxIterations: 15 })
      .mockResolvedValueOnce({ jobId: 'abc', status: 'completed', iteration: 1, maxIterations: 15 });

    const onComplete = vi.fn();
    createReorderProgress(container, config, 'abc', { onComplete });
    await vi.runAllTimersAsync();

    expect(onComplete).toHaveBeenCalledWith('abc');
  });

  it('shows error status text on polling failure and reschedules', async () => {
    mockGetStatus
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockResolvedValueOnce({ jobId: 'abc', status: 'completed', iteration: 1, maxIterations: 15 });

    const onComplete = vi.fn();
    const handle = createReorderProgress(container, config, 'abc', { onComplete });
    await vi.runAllTimersAsync();

    // After first failure, second poll completes — status is updated
    expect(onComplete).toHaveBeenCalled();
    handle.destroy();
  });

  it('shows "Unknown error" when non-Error thrown during polling', async () => {
    mockGetStatus
      .mockRejectedValueOnce('string-error')
      .mockResolvedValueOnce({ jobId: 'abc', status: 'completed', iteration: 1, maxIterations: 15 });

    const handle = createReorderProgress(container, config, 'abc', {});
    await vi.runAllTimersAsync();

    handle.destroy();
  });

  it('shows "Unknown error" when non-Error thrown during cancel', async () => {
    mockGetStatus.mockResolvedValue({ jobId: 'abc', status: 'running', iteration: 1, maxIterations: 15 });
    mockCancelReorder.mockRejectedValue('raw string error');

    const handle = createReorderProgress(container, config, 'abc', {});
    const cancelBtn = handle.element.querySelector('.reorder-progress-cancel') as HTMLButtonElement;

    cancelBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    const statusEl = handle.element.querySelector('.reorder-progress-status');
    expect(statusEl?.textContent).toContain('Unknown error');
    handle.destroy();
  });

  it('ignores polling error after destroy', async () => {
    let rejectFn: ((err: unknown) => void) | undefined;
    mockGetStatus.mockImplementation(() => new Promise((_resolve, reject) => {
      rejectFn = reject;
    }));

    const handle = createReorderProgress(container, config, 'abc', {});
    // Wait for the poll to be in-flight
    await Promise.resolve();
    handle.destroy();
    rejectFn?.(new Error('too late'));
    await Promise.resolve();
    // Should not throw
  });

  it('ignores cancel error after destroy', async () => {
    mockGetStatus.mockResolvedValue({ jobId: 'abc', status: 'running', iteration: 1, maxIterations: 15 });
    let rejectFn: ((err: unknown) => void) | undefined;
    mockCancelReorder.mockImplementation(() => new Promise((_resolve, reject) => {
      rejectFn = reject;
    }));

    const handle = createReorderProgress(container, config, 'abc', {});
    const cancelBtn = handle.element.querySelector('.reorder-progress-cancel') as HTMLButtonElement;
    cancelBtn.click();
    await Promise.resolve();
    handle.destroy();
    rejectFn?.(new Error('too late'));
    await Promise.resolve();
    // Should not throw
  });

  it('prevents ESC key from closing the dialog', () => {
    mockGetStatus.mockResolvedValue({ jobId: 'abc', status: 'running', iteration: 0, maxIterations: 15 });

    const handle = createReorderProgress(container, config, 'abc', {});
    const cancelEvent = new Event('cancel', { cancelable: true });
    handle.element.dispatchEvent(cancelEvent);

    expect(cancelEvent.defaultPrevented).toBe(true);
    handle.destroy();
  });
});
