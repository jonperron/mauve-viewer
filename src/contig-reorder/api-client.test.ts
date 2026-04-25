import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  submitReorder,
  getReorderStatus,
  getReorderResult,
  cancelReorder,
} from './api-client.ts';
import type {
  ReorderClientConfig,
  ReorderRequest,
  ReorderResult,
} from './types.ts';

const config: ReorderClientConfig = { baseUrl: 'http://localhost:3000' };

const sampleRequest: ReorderRequest = {
  reference: { name: 'reference.fasta', content: '>ref\nATCG', format: 'fasta' },
  draft: { name: 'draft.fasta', content: '>contig1\nATGC\n>contig2\nGGCC', format: 'fasta' },
  maxIterations: 15,
};

const sampleResult: ReorderResult = {
  orderedContigs: [
    { name: 'contig1', start: 1, end: 100, reversed: false, conflicting: false },
    { name: 'contig2', start: 101, end: 200, reversed: true, conflicting: false },
  ],
  reversedContigs: ['contig2'],
  conflictingContigs: [],
  iterationsPerformed: 3,
  converged: true,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('submitReorder', () => {
  it('sends POST request and returns job info', async () => {
    const mockResponse = { jobId: 'reorder-123', status: 'queued' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await submitReorder(config, sampleRequest);

    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleRequest),
    });
    expect(result).toEqual(mockResponse);
  });

  it('throws on server error with error message from body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Draft must be FASTA or GenBank' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(submitReorder(config, sampleRequest)).rejects.toThrow(
      'Draft must be FASTA or GenBank',
    );
  });

  it('throws generic message when server returns no error field', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 500 }),
    );

    await expect(submitReorder(config, sampleRequest)).rejects.toThrow(
      'Reorder submission failed (500)',
    );
  });
});

describe('getReorderStatus', () => {
  it('returns job status with iteration count', async () => {
    const mockResponse = {
      jobId: 'reorder-123',
      status: 'running',
      iteration: 4,
      maxIterations: 15,
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await getReorderStatus(config, 'reorder-123');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/reorder/reorder-123/status',
    );
    expect(result).toEqual(mockResponse);
  });

  it('encodes special characters in job ID', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ jobId: 'a/b', status: 'queued' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await getReorderStatus(config, 'a/b');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/reorder/a%2Fb/status',
    );
  });

  it('throws on not found', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 }),
    );

    await expect(getReorderStatus(config, 'missing')).rejects.toThrow(
      'Job not found',
    );
  });

  it('throws generic message on error without body field', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 503 }),
    );

    await expect(getReorderStatus(config, 'reorder-123')).rejects.toThrow(
      'Failed to get reorder status (503)',
    );
  });
});

describe('getReorderResult', () => {
  it('returns parsed reorder result', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sampleResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await getReorderResult(config, 'reorder-123');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/reorder/reorder-123/result',
    );
    expect(result).toEqual(sampleResult);
  });

  it('throws when job has no result yet', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Job not completed' }), {
        status: 404,
      }),
    );

    await expect(getReorderResult(config, 'reorder-123')).rejects.toThrow(
      'Job not completed',
    );
  });

  it('throws generic message on server error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 500 }),
    );

    await expect(getReorderResult(config, 'reorder-123')).rejects.toThrow(
      'Failed to get reorder result (500)',
    );
  });
});

describe('cancelReorder', () => {
  it('sends DELETE request', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    await cancelReorder(config, 'reorder-123');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/reorder/reorder-123',
      { method: 'DELETE' },
    );
  });

  it('encodes special characters in job ID', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    await cancelReorder(config, 'a/b');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/reorder/a%2Fb',
      { method: 'DELETE' },
    );
  });

  it('throws on failure with server error message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Cannot cancel completed job' }), {
        status: 409,
      }),
    );

    await expect(cancelReorder(config, 'reorder-123')).rejects.toThrow(
      'Cannot cancel completed job',
    );
  });

  it('throws generic message on error without body field', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 500 }),
    );

    await expect(cancelReorder(config, 'reorder-123')).rejects.toThrow(
      'Failed to cancel reorder job (500)',
    );
  });
});
