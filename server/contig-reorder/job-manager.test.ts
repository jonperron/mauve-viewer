import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { ReorderJobManager, type ReorderJobManagerIO } from './job-manager.js';
import type { ReorderRequest } from './types.js';

function createMockProcess(): EventEmitter & {
  stdout: EventEmitter;
  stderr: EventEmitter;
  killed: boolean;
  kill: ReturnType<typeof vi.fn>;
} {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    killed: boolean;
    kill: ReturnType<typeof vi.fn>;
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.killed = false;
  proc.kill = vi.fn(() => {
    proc.killed = true;
  });
  return proc;
}

function createMockIO() {
  return {
    spawn: vi.fn(),
    mkdir: vi.fn(async () => undefined) as unknown as ReorderJobManagerIO['mkdir'],
    writeFile: vi.fn(async () => undefined) as unknown as ReorderJobManagerIO['writeFile'],
    readFile: vi.fn(async () => '') as unknown as ReorderJobManagerIO['readFile'],
    readdir: vi.fn(async () => [] as string[]) as unknown as ReorderJobManagerIO['readdir'],
    rm: vi.fn(async () => undefined) as unknown as ReorderJobManagerIO['rm'],
  };
}

const validRequest: ReorderRequest = {
  reference: { name: 'ref.fasta', content: '>ref\nATCG', format: 'fasta' },
  draft: { name: 'draft.fasta', content: '>draft\nGCTA', format: 'fasta' },
  maxIterations: 15,
};

let manager: ReorderJobManager;
let io: ReturnType<typeof createMockIO>;

beforeEach(() => {
  io = createMockIO();
  manager = new ReorderJobManager({
    jarPath: '/opt/mauve/Mauve.jar',
    workDir: '/tmp/reorder-test-jobs',
    maxConcurrent: 2,
    cleanupDelayMs: -1,
    io,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ReorderJobManager.submit', () => {
  it('returns a UUID-shaped job ID', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const jobId = await manager.submit(validRequest);

    expect(jobId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('starts job immediately when below max concurrency', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const jobId = await manager.submit(validRequest);
    const status = manager.getStatus(jobId);

    expect(status?.status).toBe('running');
    expect(io.spawn).toHaveBeenCalledTimes(1);
  });

  it('queues job when at max concurrency', async () => {
    const proc1 = createMockProcess();
    const proc2 = createMockProcess();
    io.spawn.mockReturnValueOnce(proc1 as never).mockReturnValueOnce(proc2 as never);

    await manager.submit(validRequest);
    await manager.submit(validRequest);
    const thirdId = await manager.submit(validRequest);

    expect(io.spawn).toHaveBeenCalledTimes(2);
    expect(manager.getStatus(thirdId)?.status).toBe('queued');
  });

  it('clamps maxIterations to 1–100', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const id1 = await manager.submit({ ...validRequest, maxIterations: 0 });
    const id2 = await manager.submit({ ...validRequest, maxIterations: 999 });

    expect(manager.getStatus(id1)?.maxIterations).toBe(1);
    expect(manager.getStatus(id2)?.maxIterations).toBe(100);
  });

  it('uses default 15 iterations when maxIterations is not provided', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const jobId = await manager.submit({ reference: validRequest.reference, draft: validRequest.draft });

    expect(manager.getStatus(jobId)?.maxIterations).toBe(15);
  });
});

describe('ReorderJobManager — job lifecycle', () => {
  it('marks job completed on process exit code 0', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const jobId = await manager.submit(validRequest);
    mockProc.emit('close', 0);

    expect(manager.getStatus(jobId)?.status).toBe('completed');
  });

  it('marks job failed on non-zero exit code', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const jobId = await manager.submit(validRequest);
    mockProc.emit('close', 1);

    const status = manager.getStatus(jobId);
    expect(status?.status).toBe('failed');
    expect(status?.error).toBe('Process exited with code 1');
  });

  it('marks job failed on process spawn error', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const jobId = await manager.submit(validRequest);
    mockProc.emit('error', new Error('ENOENT: java not found'));

    const status = manager.getStatus(jobId);
    expect(status?.status).toBe('failed');
    expect(status?.error).toBe('ENOENT: java not found');
  });

  it('dequeues next job after completion', async () => {
    const proc1 = createMockProcess();
    const proc2 = createMockProcess();
    io.spawn.mockReturnValueOnce(proc1 as never).mockReturnValueOnce(proc2 as never);

    const manager2 = new ReorderJobManager({
      jarPath: '/opt/mauve/Mauve.jar',
      workDir: '/tmp/reorder-test-jobs',
      maxConcurrent: 1,
      cleanupDelayMs: -1,
      io,
    });

    const id1 = await manager2.submit(validRequest);
    const id2 = await manager2.submit(validRequest);

    expect(manager2.getStatus(id2)?.status).toBe('queued');
    proc1.emit('close', 0);

    expect(manager2.getStatus(id1)?.status).toBe('completed');
    expect(manager2.getStatus(id2)?.status).toBe('running');
  });
});

describe('ReorderJobManager — iteration tracking', () => {
  it('starts at iteration 0', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const jobId = await manager.submit(validRequest);

    expect(manager.getStatus(jobId)?.iteration).toBe(0);
  });

  it('updates iteration when stdout emits "C: N" pattern', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const jobId = await manager.submit(validRequest);
    mockProc.stdout.emit('data', Buffer.from('C: 3\n'));

    expect(manager.getStatus(jobId)?.iteration).toBe(3);
  });

  it('updates iteration from stderr as well', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const jobId = await manager.submit(validRequest);
    mockProc.stderr.emit('data', Buffer.from('C: 2\n'));

    expect(manager.getStatus(jobId)?.iteration).toBe(2);
  });

  it('ignores non-matching stdout lines', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const jobId = await manager.submit(validRequest);
    mockProc.stdout.emit('data', Buffer.from('Starting alignment...\n'));

    expect(manager.getStatus(jobId)?.iteration).toBe(0);
  });
});

describe('ReorderJobManager.cancel', () => {
  it('returns false for unknown job', () => {
    expect(manager.cancel('nonexistent')).toBe(false);
  });

  it('cancels a running job and sends SIGTERM', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const jobId = await manager.submit(validRequest);
    const result = manager.cancel(jobId);

    expect(result).toBe(true);
    expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');
    expect(manager.getStatus(jobId)?.status).toBe('cancelled');
  });

  it('returns false for completed job', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const jobId = await manager.submit(validRequest);
    mockProc.emit('close', 0);

    expect(manager.cancel(jobId)).toBe(false);
  });
});

describe('ReorderJobManager.getResult', () => {
  it('returns undefined for an incomplete job', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const jobId = await manager.submit(validRequest);

    expect(await manager.getResult(jobId)).toBeUndefined();
  });

  it('returns undefined for an unknown job', async () => {
    expect(await manager.getResult('nonexistent')).toBeUndefined();
  });

  it('returns sequence and contigsTab for a completed job', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    io.readdir.mockResolvedValue(['draft_contigs.tab', 'draft.fasta', 'alignment3'] as never);
    io.readFile
      .mockResolvedValueOnce('>draft_reordered\nGCTA' as never)
      .mockResolvedValueOnce('tab-content' as never);

    const jobId = await manager.submit(validRequest);
    mockProc.stdout.emit('data', Buffer.from('C: 3\n'));
    mockProc.emit('close', 0);

    const result = await manager.getResult(jobId);
    expect(result?.sequence).toBe('>draft_reordered\nGCTA');
    expect(result?.contigsTab).toBe('tab-content');
  });
});
