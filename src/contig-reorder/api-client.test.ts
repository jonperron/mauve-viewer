import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateSequenceSizes,
  submitReorderJob,
  getReorderStatus,
  getReorderResult,
  cancelReorderJob,
  MAX_SEQUENCE_BYTES,
  MAX_AGGREGATE_BYTES,
} from './api-client.ts';
import type { ReorderSequence } from './api-client.ts';

const refSeq: ReorderSequence = {
  name: 'ref.fasta',
  content: '>ref\nATCG',
  format: 'fasta',
};

const draftSeq: ReorderSequence = {
  name: 'draft.fasta',
  content: '>draft\nGCTA',
  format: 'fasta',
};

describe('validateSequenceSizes', () => {
  it('passes for small sequences', () => {
    expect(() => validateSequenceSizes(refSeq, draftSeq)).not.toThrow();
  });

  it('throws when reference exceeds per-file limit', () => {
    const bigRef: ReorderSequence = {
      ...refSeq,
      content: 'A'.repeat(MAX_SEQUENCE_BYTES + 1),
    };
    expect(() => validateSequenceSizes(bigRef, draftSeq)).toThrow(RangeError);
    expect(() => validateSequenceSizes(bigRef, draftSeq)).toThrow(/reference/i);
  });

  it('throws when draft exceeds per-file limit', () => {
    const bigDraft: ReorderSequence = {
      ...draftSeq,
      content: 'A'.repeat(MAX_SEQUENCE_BYTES + 1),
    };
    expect(() => validateSequenceSizes(refSeq, bigDraft)).toThrow(RangeError);
    expect(() => validateSequenceSizes(refSeq, bigDraft)).toThrow(/draft/i);
  });

  it('throws when aggregate size exceeds limit', () => {
    const halfLimit = Math.ceil(MAX_AGGREGATE_BYTES / 2) + 1;
    const bigRef: ReorderSequence = { ...refSeq, content: 'A'.repeat(halfLimit) };
    const bigDraft: ReorderSequence = { ...draftSeq, content: 'A'.repeat(halfLimit) };
    expect(() => validateSequenceSizes(bigRef, bigDraft)).toThrow(RangeError);
    expect(() => validateSequenceSizes(bigRef, bigDraft)).toThrow(/total/i);
  });
});

describe('submitReorderJob', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('sends POST /api/reorder with correct body', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: 'abc', status: 'queued' }),
    } as Response);

    await submitReorderJob(refSeq, draftSeq, 15);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/reorder',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
    expect(body.reference).toEqual(refSeq);
    expect(body.draft).toEqual(draftSeq);
    expect(body.maxIterations).toBe(15);
  });

  it('returns the parsed job created response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: 'xyz', status: 'queued' }),
    } as Response);

    const result = await submitReorderJob(refSeq, draftSeq, 10);
    expect(result.jobId).toBe('xyz');
    expect(result.status).toBe('queued');
  });

  it('throws when response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 400 } as Response);

    await expect(submitReorderJob(refSeq, draftSeq, 15)).rejects.toThrow(
      'Failed to submit reorder job',
    );
  });

  it('throws before fetch when sequence sizes are too large', async () => {
    const bigRef: ReorderSequence = {
      ...refSeq,
      content: 'A'.repeat(MAX_SEQUENCE_BYTES + 1),
    };

    await expect(submitReorderJob(bigRef, draftSeq, 15)).rejects.toThrow(RangeError);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('getReorderStatus', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('fetches the correct URL', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        jobId: 'abc',
        status: 'running',
        iteration: 2,
        maxIterations: 15,
      }),
    } as Response);

    await getReorderStatus('abc');

    expect(mockFetch).toHaveBeenCalledWith('/api/reorder/abc/status');
  });

  it('returns parsed status', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        jobId: 'abc',
        status: 'running',
        iteration: 3,
        maxIterations: 15,
      }),
    } as Response);

    const status = await getReorderStatus('abc');
    expect(status.iteration).toBe(3);
    expect(status.status).toBe('running');
  });

  it('throws when response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);

    await expect(getReorderStatus('bad-id')).rejects.toThrow(
      'Failed to get reorder job status',
    );
  });
});

describe('getReorderResult', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('fetches result from correct URL', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ sequence: '>c1\nATCG', contigsTab: 'tab' }),
    } as Response);

    await getReorderResult('abc');

    expect(mockFetch).toHaveBeenCalledWith('/api/reorder/abc/result');
  });

  it('returns sequence and contigsTab', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ sequence: '>c1\nATCG', contigsTab: 'Ordered:\nc1\n' }),
    } as Response);

    const result = await getReorderResult('abc');
    expect(result.sequence).toBe('>c1\nATCG');
    expect(result.contigsTab).toBe('Ordered:\nc1\n');
  });

  it('throws when response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);

    await expect(getReorderResult('abc')).rejects.toThrow(
      'Failed to get reorder result',
    );
  });
});

describe('cancelReorderJob', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('sends DELETE to correct URL', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

    await cancelReorderJob('abc');

    expect(fetch).toHaveBeenCalledWith('/api/reorder/abc', { method: 'DELETE' });
  });

  it('does not throw on network failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network error'));

    await expect(cancelReorderJob('abc')).resolves.toBeUndefined();
  });

  it('does not throw when response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);

    await expect(cancelReorderJob('abc')).resolves.toBeUndefined();
  });
});
