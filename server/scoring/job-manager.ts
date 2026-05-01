import { randomUUID } from 'node:crypto';
import {
  spawn as defaultSpawn,
  type ChildProcess,
  type SpawnOptions,
} from 'node:child_process';
import {
  mkdir as defaultMkdir,
  writeFile as defaultWriteFile,
  readFile as defaultReadFile,
  rm as defaultRm,
} from 'node:fs/promises';
import { join } from 'node:path';
import type {
  ScoringJobStatus,
  ScoringJobStatusResponse,
  ScoringRequest,
  ScoringResult,
} from './types.js';
import { buildScoringCommand } from './command-builder.js';

/** I/O functions injected for testability. Defaults to Node.js built-ins. */
export interface ScoringJobManagerIO {
  readonly spawn: (
    cmd: string,
    args: readonly string[],
    opts: SpawnOptions,
  ) => ChildProcess;
  readonly mkdir: typeof defaultMkdir;
  readonly writeFile: typeof defaultWriteFile;
  readonly readFile: typeof defaultReadFile;
  readonly rm: typeof defaultRm;
}

const defaultIO: ScoringJobManagerIO = {
  spawn: defaultSpawn,
  mkdir: defaultMkdir,
  writeFile: defaultWriteFile,
  readFile: defaultReadFile,
  rm: defaultRm,
};

export interface ScoringJobManagerConfig {
  /** Directory containing progressiveMauve binary */
  readonly binaryDir: string;
  /** Directory where job working directories are created */
  readonly workDir: string;
  readonly maxConcurrent: number;
  /** Milliseconds to keep job state after completion. Use -1 to disable cleanup. */
  readonly cleanupDelayMs?: number;
  readonly io?: Partial<ScoringJobManagerIO>;
}

interface Job {
  readonly id: string;
  readonly request: ScoringRequest;
  readonly jobDir: string;
  status: ScoringJobStatus;
  error?: string;
  process?: ChildProcess;
  slotReleased: boolean;
}

/** Sanitize a filename to prevent path traversal */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export class ScoringJobManager {
  private readonly config: ScoringJobManagerConfig;
  private readonly io: ScoringJobManagerIO;
  private readonly jobs = new Map<string, Job>();
  private runningCount = 0;
  private readonly queue: string[] = [];
  private readonly cleanupDelayMs: number;

  constructor(config: ScoringJobManagerConfig) {
    this.config = config;
    this.io = { ...defaultIO, ...config.io };
    this.cleanupDelayMs = config.cleanupDelayMs ?? 5 * 60 * 1000;
  }

  async submit(request: ScoringRequest): Promise<string> {
    const jobId = randomUUID();
    const jobDir = join(this.config.workDir, jobId);
    await this.io.mkdir(jobDir, { recursive: true });

    const job: Job = {
      id: jobId,
      request,
      jobDir,
      status: 'queued',
      slotReleased: false,
    };
    this.jobs.set(jobId, job);

    if (this.runningCount < this.config.maxConcurrent) {
      await this.startJob(job);
    } else {
      this.queue.push(jobId);
    }

    return jobId;
  }

  getStatus(jobId: string): ScoringJobStatusResponse | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;
    return {
      jobId: job.id,
      status: job.status,
      error: job.error,
    };
  }

  cancel(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    if (job.status !== 'queued' && job.status !== 'running') return false;

    if (job.process && !job.process.killed) {
      job.process.kill('SIGTERM');
    }

    const queueIdx = this.queue.indexOf(jobId);
    if (queueIdx >= 0) {
      this.queue.splice(queueIdx, 1); // Intentional mutation of internal queue
      this.scheduleCleanup(job.id);
    }

    job.status = 'cancelled';
    return true;
  }

  async getResult(jobId: string): Promise<ScoringResult | undefined> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'completed') return undefined;

    const outputPath = join(job.jobDir, 'output.xmfa');
    try {
      const alignment = await this.io.readFile(outputPath, 'utf-8') as string;
      return { alignment };
    } catch {
      return undefined;
    }
  }

  private async startJob(job: Job): Promise<void> {
    this.runningCount++;
    job.status = 'running';

    try {
      const refFilename = sanitizeFilename(job.request.reference.name);
      const asmFilename = sanitizeFilename(job.request.assembly.name);
      const refPath = join(job.jobDir, `ref_${refFilename}`);
      const asmPath = join(job.jobDir, `asm_${asmFilename}`);
      const outputPath = join(job.jobDir, 'output.xmfa');

      await Promise.all([
        this.io.writeFile(refPath, job.request.reference.content, 'utf-8'),
        this.io.writeFile(asmPath, job.request.assembly.content, 'utf-8'),
      ]);

      const args = buildScoringCommand(
        this.config.binaryDir,
        job.request.options,
        outputPath,
        [refPath, asmPath],
      );

      const [cmd, ...cmdArgs] = args as [string, ...string[]];
      const child = this.io.spawn(cmd, cmdArgs, {
        cwd: job.jobDir,
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      job.process = child;

      await new Promise<void>((resolve) => {
        child.on('close', (code) => {
          this.releaseSlot(job);
          if (code === 0) {
            job.status = 'completed';
          } else if (job.status !== 'cancelled') {
            job.status = 'failed';
            job.error = `Scoring process exited with code ${code ?? 'null'}`;
          }
          this.scheduleCleanup(job.id);
          resolve();
        });

        child.on('error', (err) => {
          this.releaseSlot(job);
          if (job.status !== 'cancelled') {
            job.status = 'failed';
            job.error = err.message;
          }
          this.scheduleCleanup(job.id);
          resolve();
        });
      });
    } catch (err) {
      this.releaseSlot(job);
      job.status = 'failed';
      job.error = err instanceof Error ? err.message : String(err);
      this.scheduleCleanup(job.id);
    }
  }

  private releaseSlot(job: Job): void {
    if (job.slotReleased) return;
    job.slotReleased = true;
    this.runningCount--;
    this.drainQueue();
  }

  private drainQueue(): void {
    while (this.queue.length > 0 && this.runningCount < this.config.maxConcurrent) {
      const nextId = this.queue.shift()!;
      const nextJob = this.jobs.get(nextId);
      if (nextJob && nextJob.status === 'queued') {
        void this.startJob(nextJob);
      }
    }
  }

  private scheduleCleanup(jobId: string): void {
    if (this.cleanupDelayMs < 0) return;
    setTimeout(() => {
      const job = this.jobs.get(jobId);
      if (job) {
        this.jobs.delete(jobId);
        void this.io.rm(job.jobDir, { recursive: true, force: true });
      }
    }, this.cleanupDelayMs);
  }
}
