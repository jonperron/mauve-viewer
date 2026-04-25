import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  submitReorder,
  getReorderStatus,
  cancelReorder,
  getReorderResult,
} from './api-client.ts';
import type { ReorderClientConfig, ReorderRequest } from './types.ts';

const config: ReorderClientConfig = { baseUrl: 'http://localhost:3000' };

const validRequest: ReorderRequest = {
  reference: { name: 'ref.fasta', content: '>ref\nATCG', format: 'fasta' },
  draft: { name: 'draft.fasta', content: '>contig1\nGCTA', format: 'fasta' },
  maxIterations: 10,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// submitReorder
// ---------------------------------------------------------------------------

describe('submitReorder', () => {
  it('returns job ID and status on 201', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: 'abc-123', status: 'queued' }),
    }));

    const result = await submitReorder(config, validRequest);
    expect(result.jobId).toBe('abc-123');
    expect(result.status).toBe('queued');
  });

  it('POSTs to /api/reorder with JSON body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: 'x', status: 'queued' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await submitReorder(config, validRequest);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/reorder',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws on non-OK response with server error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'reference content is required' }),
    }));

    await expect(submitReorder(config, validRequest)).rejects.toThrow(
      'reference content is required',
    );
  });

  it('throws with status code when no error message in body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }));

    await expect(submitReorder(config, validRequest)).rejects.toThrow('500');
  });

  it('throws with fallback when error field is not a string', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 42 }),
    }));

    await expect(submitReorder(config, validRequest)).rejects.toThrow('400');
  });

  it('throws with fallback when json() throws on error response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => { throw new Error('invalid json'); },
    }));

    await expect(submitReorder(config, validRequest)).rejects.toThrow('503');
  });
});

// ---------------------------------------------------------------------------
// getReorderStatus
// ---------------------------------------------------------------------------

describe('getReorderStatus', () => {
  it('returns status response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jobId: 'abc',
        status: 'running',
        iteration: 3,
        maxIterations: 15,
      }),
    }));

    const status = await getReorderStatus(config, 'abc');
    expect(status.status).toBe('running');
    expect(status.iteration).toBe(3);
  });

  it('encodes jobId in URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: 'a/b', status: 'queued', iteration: 0, maxIterations: 15 }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await getReorderStatus(config, 'a/b');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('a%2Fb'),
    );
  });

  it('throws on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Job not found' }),
    }));

    await expect(getReorderStatus(config, 'unknown')).rejects.toThrow('Job not found');
  });
});

// ---------------------------------------------------------------------------
// cancelReorder
// ---------------------------------------------------------------------------

describe('cancelReorder', () => {
  it('resolves on 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    await expect(cancelReorder(config, 'abc')).resolves.toBeUndefined();
  });

  it('DELETEs /api/reorder/:jobId', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    await cancelReorder(config, 'my-job');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/reorder/my-job',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('throws on 409 Conflict', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Job cannot be cancelled' }),
    }));

    await expect(cancelReorder(config, 'abc')).rejects.toThrow('Job cannot be cancelled');
  });
});

// ---------------------------------------------------------------------------
// getReorderResult
// ---------------------------------------------------------------------------

describe('getReorderResult', () => {
  it('returns reorder result on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sequence: '>contig1\nATCG',
        contigsTab: 'Ordered Contigs\ntype\tlabel...',
      }),
    }));

    const result = await getReorderResult(config, 'abc');
    expect(result.sequence).toContain('>contig1');
    expect(result.contigsTab).toContain('Ordered Contigs');
  });

  it('throws on 404 when job not found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Result not available' }),
    }));

    await expect(getReorderResult(config, 'bad')).rejects.toThrow('Result not available');
  });
});
