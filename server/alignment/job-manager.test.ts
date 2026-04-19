import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { JobManager, type JobManagerIO } from './job-manager.js';
import type { AlignmentRequest, AlignmentProgressEvent } from './types.js';

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
    mkdir: vi.fn(async () => undefined) as unknown as JobManagerIO['mkdir'],
    writeFile: vi.fn(async () => undefined) as unknown as JobManagerIO['writeFile'],
    readFile: vi.fn(async () => '') as unknown as JobManagerIO['readFile'],
    rm: vi.fn(async () => undefined) as unknown as JobManagerIO['rm'],
  };
}

const validRequest: AlignmentRequest = {
  sequences: [
    { name: 'genome1.fasta', content: '>g1\nATCG', format: 'fasta' },
    { name: 'genome2.fasta', content: '>g2\nGCTA', format: 'fasta' },
  ],
  params: {
    algorithm: 'progressiveMauve',
    seedWeight: 'auto',
    collinear: false,
    fullAlignment: true,
    seedFamilies: false,
    iterativeRefinement: true,
    sumOfPairsScoring: true,
  },
};

let manager: JobManager;
let io: ReturnType<typeof createMockIO>;

beforeEach(() => {
  io = createMockIO();
  manager = new JobManager({
    binaryDir: '/usr/local/bin',
    workDir: '/tmp/mauve-test-jobs',
    maxConcurrent: 2,
    io,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('JobManager.submit', () => {
  it('returns a unique job ID', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const jobId = await manager.submit(validRequest);

    expect(jobId).toMatch(/^[0-9a-f-]+$/);
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
    const proc3 = createMockProcess();
    io.spawn
      .mockReturnValueOnce(proc1 as never)
      .mockReturnValueOnce(proc2 as never)
      .mockReturnValueOnce(proc3 as never);

    await manager.submit(validRequest);
    await manager.submit(validRequest);
    const thirdId = await manager.submit(validRequest);

    expect(io.spawn).toHaveBeenCalledTimes(2);
    expect(manager.getStatus(thirdId)?.status).toBe('queued');
  });
});

describe('JobManager — job lifecycle', () => {
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
    mockProc.emit('error', new Error('ENOENT: binary not found'));

    const status = manager.getStatus(jobId);
    expect(status?.status).toBe('failed');
    expect(status?.error).toBe('ENOENT: binary not found');
  });
});

describe('JobManager — progress broadcasting', () => {
  it('broadcasts stdout progress to listeners', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const events: AlignmentProgressEvent[] = [];
    const jobId = await manager.submit(validRequest);
    manager.addProgressListener(jobId, (e) => events.push(e));

    mockProc.stdout.emit('data', Buffer.from('Anchoring...'));

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('progress');
    expect(events[0]?.message).toBe('Anchoring...');
  });

  it('broadcasts stderr progress to listeners', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const events: AlignmentProgressEvent[] = [];
    const jobId = await manager.submit(validRequest);
    manager.addProgressListener(jobId, (e) => events.push(e));

    mockProc.stderr.emit('data', Buffer.from('Warning: low seed weight'));

    expect(events).toHaveLength(1);
    expect(events[0]?.message).toBe('Warning: low seed weight');
  });

  it('broadcasts completed event', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const events: AlignmentProgressEvent[] = [];
    const jobId = await manager.submit(validRequest);
    manager.addProgressListener(jobId, (e) => events.push(e));

    mockProc.emit('close', 0);

    expect(events.some((e) => e.type === 'completed')).toBe(true);
  });

  it('broadcasts failed event', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const events: AlignmentProgressEvent[] = [];
    const jobId = await manager.submit(validRequest);
    manager.addProgressListener(jobId, (e) => events.push(e));

    mockProc.emit('close', 1);

    expect(events.some((e) => e.type === 'failed')).toBe(true);
  });

  it('removes listener', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const events: AlignmentProgressEvent[] = [];
    const jobId = await manager.submit(validRequest);
    const listener = (e: AlignmentProgressEvent) => events.push(e);

    manager.addProgressListener(jobId, listener);
    manager.removeProgressListener(jobId, listener);

    mockProc.stdout.emit('data', Buffer.from('data'));
    expect(events).toHaveLength(0);
  });

  it('returns false when adding listener for unknown job', () => {
    expect(manager.addProgressListener('nonexistent', vi.fn())).toBe(false);
  });
});

describe('JobManager.cancel', () => {
  it('kills a running process', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const jobId = await manager.submit(validRequest);
    const result = manager.cancel(jobId);

    expect(result).toBe(true);
    expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');
    expect(manager.getStatus(jobId)?.status).toBe('cancelled');
  });

  it('broadcasts cancelled event', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const events: AlignmentProgressEvent[] = [];
    const jobId = await manager.submit(validRequest);
    manager.addProgressListener(jobId, (e) => events.push(e));
    manager.cancel(jobId);

    expect(events.some((e) => e.type === 'cancelled')).toBe(true);
  });

  it('returns false for unknown job', () => {
    expect(manager.cancel('nonexistent')).toBe(false);
  });

  it('returns false for completed job', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const jobId = await manager.submit(validRequest);
    mockProc.emit('close', 0);

    expect(manager.cancel(jobId)).toBe(false);
  });
});

describe('JobManager.getResult', () => {
  it('returns xmfa content for completed job', async () => {
    const xmfa = '#FormatVersion Mauve1\n=';
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);
    io.readFile.mockResolvedValue(xmfa);

    const jobId = await manager.submit(validRequest);
    mockProc.emit('close', 0);

    const result = await manager.getResult(jobId);
    expect(result).toBe(xmfa);
  });

  it('returns undefined for non-completed job', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const jobId = await manager.submit(validRequest);
    const result = await manager.getResult(jobId);

    expect(result).toBeUndefined();
  });

  it('returns undefined for unknown job', async () => {
    expect(await manager.getResult('nonexistent')).toBeUndefined();
  });
});

describe('JobManager.cleanup', () => {
  it('removes job directory and deletes job record', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const jobId = await manager.submit(validRequest);
    mockProc.emit('close', 0);

    await manager.cleanup(jobId);

    expect(io.rm).toHaveBeenCalled();
    expect(manager.getStatus(jobId)).toBeUndefined();
  });

  it('does nothing for running jobs', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const jobId = await manager.submit(validRequest);
    await manager.cleanup(jobId);

    expect(io.rm).not.toHaveBeenCalled();
    expect(manager.getStatus(jobId)).not.toBeUndefined();
  });

  it('does nothing for unknown jobs', async () => {
    await manager.cleanup('nonexistent');
    expect(io.rm).not.toHaveBeenCalled();
  });
});

describe('JobManager — queue processing', () => {
  it('starts queued jobs when running jobs complete', async () => {
    const proc1 = createMockProcess();
    const proc2 = createMockProcess();
    const proc3 = createMockProcess();
    io.spawn
      .mockReturnValueOnce(proc1 as never)
      .mockReturnValueOnce(proc2 as never)
      .mockReturnValueOnce(proc3 as never);

    await manager.submit(validRequest);
    await manager.submit(validRequest);
    const thirdId = await manager.submit(validRequest);

    expect(manager.getStatus(thirdId)?.status).toBe('queued');

    // Complete first job — third should start
    proc1.emit('close', 0);

    // Wait for async startJob to process
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(manager.getStatus(thirdId)?.status).toBe('running');
    expect(io.spawn).toHaveBeenCalledTimes(3);
  });
});

describe('JobManager.getStatus', () => {
  it('returns undefined for unknown job', () => {
    expect(manager.getStatus('nonexistent')).toBeUndefined();
  });

  it('includes progress message', async () => {
    const mockProc = createMockProcess();
    io.spawn.mockReturnValue(mockProc as never);

    const jobId = await manager.submit(validRequest);
    mockProc.stdout.emit('data', Buffer.from('Extending LCBs'));

    const status = manager.getStatus(jobId);
    expect(status?.progress).toBe('Extending LCBs');
  });
});
