import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  submitScore,
  getScoreStatus,
  cancelScore,
  getScoreResult,
} from './api-client.ts';
import type { ScoringClientConfig, ScoringRequest } from './types.ts';

const config: ScoringClientConfig = { baseUrl: 'http://localhost:3000' };

const validRequest: ScoringRequest = {
  reference: { name: 'ref.fasta', content: '>ref\nATCG', format: 'fasta' },
  assembly: { name: 'draft.fasta', content: '>contig1\nGCTA', format: 'fasta' },
};

beforeEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// submitScore
// ---------------------------------------------------------------------------

describe('submitScore', () => {
  it('returns job ID and status on 201', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: 'abc-123', status: 'queued' }),
    }));

    const result = await submitScore(config, validRequest);
    expect(result.jobId).toBe('abc-123');
    expect(result.status).toBe('queued');
  });

  it('POSTs to /api/score with JSON body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: 'x', status: 'queued' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await submitScore(config, validRequest);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/score',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('includes options in request body when provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: 'x', status: 'queued' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const requestWithOptions: ScoringRequest = {
      ...validRequest,
      options: { batch: true, noCds: true, skipRefinement: true, weight: 200 },
    };
    await submitScore(config, requestWithOptions);

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body as string) as ScoringRequest;
    expect(body.options?.batch).toBe(true);
    expect(body.options?.weight).toBe(200);
  });

  it('throws on non-OK response with server error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'assembly content is required' }),
    }));

    await expect(submitScore(config, validRequest)).rejects.toThrow(
      'assembly content is required',
    );
  });

  it('throws with status code when no error message in body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }));

    await expect(submitScore(config, validRequest)).rejects.toThrow('500');
  });

  it('throws with fallback when error field is not a string', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 42 }),
    }));

    await expect(submitScore(config, validRequest)).rejects.toThrow('400');
  });
});

// ---------------------------------------------------------------------------
// getScoreStatus
// ---------------------------------------------------------------------------

describe('getScoreStatus', () => {
  it('returns status response on 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: 'abc-123', status: 'running' }),
    }));

    const result = await getScoreStatus(config, 'abc-123');
    expect(result.jobId).toBe('abc-123');
    expect(result.status).toBe('running');
  });

  it('GETs the correct URL with encoded job ID', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: 'id/with/slashes', status: 'queued' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await getScoreStatus(config, 'id/with/slashes');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/score/id%2Fwith%2Fslashes/status',
    );
  });

  it('throws on 404 with server error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Job not found' }),
    }));

    await expect(getScoreStatus(config, 'missing-id')).rejects.toThrow('Job not found');
  });
});

// ---------------------------------------------------------------------------
// cancelScore
// ---------------------------------------------------------------------------

describe('cancelScore', () => {
  it('resolves on 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));

    await expect(cancelScore(config, 'abc-123')).resolves.toBeUndefined();
  });

  it('DELETEs the correct URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', mockFetch);

    await cancelScore(config, 'abc-123');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/score/abc-123',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('throws on 409 with server error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Job cannot be cancelled' }),
    }));

    await expect(cancelScore(config, 'abc-123')).rejects.toThrow('Job cannot be cancelled');
  });
});

// ---------------------------------------------------------------------------
// getScoreResult
// ---------------------------------------------------------------------------

describe('getScoreResult', () => {
  it('returns scoring result on 200', async () => {
    const mockResult = { alignment: '#FormatVersion Mauve1\n' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResult,
    }));

    const result = await getScoreResult(config, 'abc-123');
    expect(result.alignment).toBe('#FormatVersion Mauve1\n');
  });

  it('GETs the correct URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ alignment: '' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await getScoreResult(config, 'abc-123');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/score/abc-123/result',
    );
  });

  it('throws on 404 when result not yet available', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Result not available' }),
    }));

    await expect(getScoreResult(config, 'abc-123')).rejects.toThrow('Result not available');
  });
});
