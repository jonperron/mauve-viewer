import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  submitAlignment,
  getAlignmentStatus,
  cancelAlignment,
  getAlignmentResult,
  subscribeToProgress,
} from './api-client.ts';
import type {
  AlignmentClientConfig,
  AlignmentRequest,
  AlignmentProgressEvent,
} from './types.ts';

const config: AlignmentClientConfig = { baseUrl: 'http://localhost:3000' };

const sampleRequest: AlignmentRequest = {
  sequences: [
    { name: 'genome1.fasta', content: '>g1\nATCG', format: 'fasta' },
    { name: 'genome2.fasta', content: '>g2\nATGC', format: 'fasta' },
  ],
  params: {
    algorithm: 'progressiveMauve',
    seedWeight: 'auto',
    collinear: false,
    fullAlignment: true,
    seedFamilies: true,
    iterativeRefinement: true,
    sumOfPairsScoring: true,
  },
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('submitAlignment', () => {
  it('sends POST request and returns job info', async () => {
    const mockResponse = { jobId: 'job-123', status: 'queued' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await submitAlignment(config, sampleRequest);

    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/align', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleRequest),
    });
    expect(result).toEqual(mockResponse);
  });

  it('throws on server error with error message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Invalid sequences' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(submitAlignment(config, sampleRequest)).rejects.toThrow(
      'Invalid sequences',
    );
  });

  it('throws generic message when server returns no error field', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 500 }),
    );

    await expect(submitAlignment(config, sampleRequest)).rejects.toThrow(
      'Alignment submission failed (500)',
    );
  });
});

describe('getAlignmentStatus', () => {
  it('returns job status for a valid job ID', async () => {
    const mockResponse = { jobId: 'job-123', status: 'running', progress: 'Anchoring...' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await getAlignmentStatus(config, 'job-123');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/align/job-123/status',
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

    await getAlignmentStatus(config, 'a/b');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/align/a%2Fb/status',
    );
  });

  it('throws on not found', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 }),
    );

    await expect(getAlignmentStatus(config, 'missing')).rejects.toThrow(
      'Job not found',
    );
  });
});

describe('cancelAlignment', () => {
  it('sends DELETE request', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    await cancelAlignment(config, 'job-123');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/align/job-123',
      { method: 'DELETE' },
    );
  });

  it('throws on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Cannot cancel completed job' }), {
        status: 409,
      }),
    );

    await expect(cancelAlignment(config, 'job-123')).rejects.toThrow(
      'Cannot cancel completed job',
    );
  });
});

describe('getAlignmentResult', () => {
  it('returns XMFA content as text', async () => {
    const xmfaContent = '#FormatVersion Mauve1\n> 1:1-100 +\nATCGATCG\n=';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(xmfaContent, { status: 200 }),
    );

    const result = await getAlignmentResult(config, 'job-123');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/align/job-123/result',
    );
    expect(result).toBe(xmfaContent);
  });

  it('throws when job has no result yet', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Job not completed' }), {
        status: 404,
      }),
    );

    await expect(getAlignmentResult(config, 'job-123')).rejects.toThrow(
      'Job not completed',
    );
  });
});

describe('subscribeToProgress', () => {
  it('derives WebSocket URL from HTTP baseUrl', () => {
    const { MockClass, constructorSpy } = createWebSocketMock();
    vi.stubGlobal('WebSocket', MockClass);

    subscribeToProgress(config, 'job-123', vi.fn());

    expect(constructorSpy).toHaveBeenCalledWith(
      'ws://localhost:3000/api/align/job-123/progress',
    );
  });

  it('uses explicit wsUrl when provided', () => {
    const wsConfig: AlignmentClientConfig = {
      baseUrl: 'http://localhost:3000',
      wsUrl: 'wss://custom:4000',
    };
    const { MockClass, constructorSpy } = createWebSocketMock();
    vi.stubGlobal('WebSocket', MockClass);

    subscribeToProgress(wsConfig, 'job-123', vi.fn());

    expect(constructorSpy).toHaveBeenCalledWith(
      'wss://custom:4000/api/align/job-123/progress',
    );
  });

  it('calls onEvent with parsed progress events', () => {
    const { MockClass, mockWs } = createWebSocketMock();
    vi.stubGlobal('WebSocket', MockClass);

    const onEvent = vi.fn();
    subscribeToProgress(config, 'job-123', onEvent);

    const event: AlignmentProgressEvent = {
      jobId: 'job-123',
      type: 'progress',
      message: 'Anchoring...',
    };
    mockWs.simulateMessage(JSON.stringify(event));

    expect(onEvent).toHaveBeenCalledWith(event);
  });

  it('ignores malformed messages', () => {
    const { MockClass, mockWs } = createWebSocketMock();
    vi.stubGlobal('WebSocket', MockClass);

    const onEvent = vi.fn();
    subscribeToProgress(config, 'job-123', onEvent);

    mockWs.simulateMessage('not json');

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('calls onError when WebSocket errors', () => {
    const { MockClass, mockWs } = createWebSocketMock();
    vi.stubGlobal('WebSocket', MockClass);

    const onError = vi.fn();
    subscribeToProgress(config, 'job-123', vi.fn(), onError);

    const errorEvent = new Event('error');
    mockWs.simulateError(errorEvent);

    expect(onError).toHaveBeenCalledWith(errorEvent);
  });

  it('returns cleanup function that closes the connection', () => {
    const { MockClass, mockWs } = createWebSocketMock();
    vi.stubGlobal('WebSocket', MockClass);

    const cleanup = subscribeToProgress(config, 'job-123', vi.fn());
    mockWs.readyState = 1; // WebSocket.OPEN
    cleanup();

    expect(mockWs.close).toHaveBeenCalled();
  });

  it('does not close an already-closed connection', () => {
    const { MockClass, mockWs } = createWebSocketMock();
    vi.stubGlobal('WebSocket', MockClass);

    const cleanup = subscribeToProgress(config, 'job-123', vi.fn());
    mockWs.readyState = 3; // WebSocket.CLOSED
    cleanup();

    expect(mockWs.close).not.toHaveBeenCalled();
  });
});

// ---- helpers ----

function createMockWebSocket() {
  const listeners = new Map<string, Array<(e: unknown) => void>>();

  return {
    readyState: 0, // CONNECTING
    close: vi.fn(),
    addEventListener(type: string, listener: (e: unknown) => void) {
      const arr = listeners.get(type) ?? [];
      arr.push(listener);
      listeners.set(type, arr);
    },
    simulateMessage(data: string) {
      for (const listener of listeners.get('message') ?? []) {
        listener({ data });
      }
    },
    simulateError(event: Event) {
      for (const listener of listeners.get('error') ?? []) {
        listener(event);
      }
    },
  };
}

function createWebSocketMock() {
  const mockWs = createMockWebSocket();
  const constructorSpy = vi.fn();

  class MockClass {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;

    constructor(url: string) {
      constructorSpy(url);
      return mockWs as unknown as MockClass;
    }
  }

  return { MockClass, constructorSpy, mockWs };
}
