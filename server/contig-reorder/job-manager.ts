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
  readdir as defaultReaddir,
  rm as defaultRm,
} from 'node:fs/promises';
import { join } from 'node:path';
import type {
  ReorderJobStatus,
  ReorderJobStatusResponse,
  ReorderRequest,
  ReorderResult,
} from './types.js';
import { buildContigOrdererCommand } from './command-builder.js';

/** Minimum allowed maxIterations value */
const MIN_ITERATIONS = 1;
/** Maximum allowed maxIterations value */
const MAX_ITERATIONS = 100;
/** Default maxIterations when not specified */
const DEFAULT_ITERATIONS = 15;

/** Pattern in ContigOrderer stdout indicating a completed iteration (e.g. "C: 3") */
const ITERATION_PATTERN = /^C:\s*(\d+)$/m;

/** I/O functions injected for testability. Defaults to Node.js built-ins. */
export interface ReorderJobManagerIO {
  readonly spawn: (
    cmd: string,
    args: readonly string[],
    opts: SpawnOptions,
  ) => ChildProcess;
  readonly mkdir: typeof defaultMkdir;
  readonly writeFile: typeof defaultWriteFile;
  readonly readFile: typeof defaultReadFile;
  readonly readdir: typeof defaultReaddir;
  readonly rm: typeof defaultRm;
}

const defaultIO: ReorderJobManagerIO = {
  spawn: defaultSpawn,
  mkdir: defaultMkdir,
  writeFile: defaultWriteFile,
  readFile: defaultReadFile,
  readdir: defaultReaddir,
  rm: defaultRm,
};

export interface ReorderJobManagerConfig {
  /** Path to Mauve.jar */
  readonly jarPath: string;
  /** Directory where job working directories are created */
  readonly workDir: string;
  readonly maxConcurrent: number;
  /** Milliseconds to keep job state after completion. Use -1 to disable cleanup. */
  readonly cleanupDelayMs?: number;
  readonly io?: Partial<ReorderJobManagerIO>;
}

interface Job {
  readonly id: string;
  readonly request: ReorderRequest;
  readonly jobDir: string;
  readonly maxIterations: number;
  status: ReorderJobStatus;
  iteration: number;
  error?: string;
  process?: ChildProcess;
  slotReleased: boolean;
}

/** Sanitize a filename to prevent path traversal */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Clamp a value to the allowed iteration range.
 * Returns DEFAULT_ITERATIONS if the input is undefined.
 */
function clampIterations(value: number | undefined): number {
  if (value === undefined) return DEFAULT_ITERATIONS;
  return Math.max(MIN_ITERATIONS, Math.min(MAX_ITERATIONS, Math.trunc(value)));
}

export class ReorderJobManager {
  private readonly config: ReorderJobManagerConfig;
  private readonly io: ReorderJobManagerIO;
  private readonly jobs = new Map<string, Job>();
  private runningCount = 0;
  private readonly queue: string[] = [];
  private readonly cleanupDelayMs: number;

  constructor(config: ReorderJobManagerConfig) {
    this.config = config;
    this.io = { ...defaultIO, ...config.io };
    this.cleanupDelayMs = config.cleanupDelayMs ?? 5 * 60 * 1000;
  }

  async submit(request: ReorderRequest): Promise<string> {
    const jobId = randomUUID();
    const jobDir = join(this.config.workDir, jobId);
    await this.io.mkdir(jobDir, { recursive: true });

    const maxIterations = clampIterations(request.maxIterations);

    const job: Job = {
      id: jobId,
      request,
      jobDir,
      maxIterations,
      status: 'queued',
      iteration: 0,
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

  getStatus(jobId: string): ReorderJobStatusResponse | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;
    return {
      jobId: job.id,
      status: job.status,
      iteration: job.iteration,
      maxIterations: job.maxIterations,
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

  async getResult(jobId: string): Promise<ReorderResult | undefined> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'completed') return undefined;

    try {
      return await this.readResult(job.jobDir, job.iteration);
    } catch {
      return undefined;
    }
  }

  async cleanup(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    if (job.status === 'running' || job.status === 'queued') return;

    await this.io.rm(job.jobDir, { recursive: true, force: true });
    this.jobs.delete(jobId);
  }

  private async startJob(job: Job): Promise<void> {
    this.runningCount++;
    job.slotReleased = false;
    job.status = 'running';

    try {
      const refName = sanitizeFilename(job.request.reference.name);
      const draftName = sanitizeFilename(job.request.draft.name);

      const refPath = join(job.jobDir, refName);
      const draftPath = join(job.jobDir, draftName);
      const outputDir = join(job.jobDir, 'output');

      await Promise.all([
        this.io.writeFile(refPath, job.request.reference.content, 'utf-8'),
        this.io.writeFile(draftPath, job.request.draft.content, 'utf-8'),
        this.io.mkdir(outputDir, { recursive: true }),
      ]);

      const cmd = buildContigOrdererCommand({
        jarPath: this.config.jarPath,
        outputDir,
        referenceFile: refPath,
        draftFile: draftPath,
        maxIterations: job.maxIterations,
      });

      const [binary, ...args] = cmd;
      if (!binary) throw new Error('Empty command from buildContigOrdererCommand');

      const proc = this.io.spawn(binary, args, {
        cwd: job.jobDir,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      job.process = proc;

      const handleOutput = (chunk: Buffer): void => {
        const text = chunk.toString('utf-8');
        const match = ITERATION_PATTERN.exec(text);
        if (match) {
          const num = parseInt(match[1]!, 10);
          if (!isNaN(num)) {
            job.iteration = num;
          }
        }
      };

      proc.stdout?.on('data', handleOutput);
      proc.stderr?.on('data', handleOutput);

      proc.on('close', (code) => {
        this.releaseRunningSlot(job);

        if (job.status !== 'cancelled') {
          if (code === 0) {
            job.status = 'completed';
          } else {
            job.status = 'failed';
            job.error = `Process exited with code ${code}`;
          }
        }

        this.processQueue();
        this.scheduleCleanup(job.id);
      });

      proc.on('error', (err) => {
        this.releaseRunningSlot(job);
        job.status = 'failed';
        job.error = err.message;
        this.processQueue();
        this.scheduleCleanup(job.id);
      });
    } catch (err) {
      this.releaseRunningSlot(job);
      job.status = 'failed';
      job.error = err instanceof Error ? err.message : String(err);
      this.processQueue();
      this.scheduleCleanup(job.id);
    }
  }

  private async readResult(
    jobDir: string,
    iteration: number,
  ): Promise<ReorderResult> {
    const outputDir = join(jobDir, 'output');

    // Find the last alignment directory by scanning for alignmentN entries
    const lastIteration = await this.findLastIteration(outputDir, iteration);
    const alignDir = join(outputDir, `alignment${lastIteration}`);
    const files = await this.io.readdir(alignDir);

    const contigsTabFile = files.find((f) => f.endsWith('_contigs.tab'));
    const sequenceFile = files.find(
      (f) =>
        (f.endsWith('.fasta') || f.endsWith('.gbk') || f.endsWith('.fa')) &&
        !f.startsWith('alignment'),
    );

    if (!contigsTabFile) {
      throw new Error('No *_contigs.tab file found in final alignment directory');
    }
    if (!sequenceFile) {
      throw new Error('No reordered sequence file found in final alignment directory');
    }

    const [sequence, contigsTab] = await Promise.all([
      this.io.readFile(join(alignDir, sequenceFile), 'utf-8') as Promise<string>,
      this.io.readFile(join(alignDir, contigsTabFile), 'utf-8') as Promise<string>,
    ]);

    return { sequence, contigsTab };
  }

  private async findLastIteration(
    outputDir: string,
    knownIteration: number,
  ): Promise<number> {
    if (knownIteration > 0) return knownIteration;

    // Fallback: scan directory for alignmentN subdirectories
    try {
      const entries = await this.io.readdir(outputDir);
      const nums = entries
        .map((e) => {
          const m = /^alignment(\d+)$/.exec(e);
          return m ? parseInt(m[1]!, 10) : 0;
        })
        .filter((n) => n > 0);
      return nums.length > 0 ? Math.max(...nums) : 1;
    } catch {
      return 1;
    }
  }

  private processQueue(): void {
    while (this.runningCount < this.config.maxConcurrent && this.queue.length > 0) {
      const nextId = this.queue.shift()!;
      const nextJob = this.jobs.get(nextId);
      if (nextJob && nextJob.status === 'queued') {
        void this.startJob(nextJob);
      }
    }
  }

  private releaseRunningSlot(job: Job): void {
    if (job.slotReleased) return;
    job.slotReleased = true;
    this.runningCount = Math.max(0, this.runningCount - 1);
  }

  private scheduleCleanup(jobId: string): void {
    if (this.cleanupDelayMs < 0) return;

    const timer = setTimeout(() => {
      void this.cleanup(jobId).catch(() => {
        // Ignore cleanup failures — non-fatal.
      });
    }, this.cleanupDelayMs);

    timer.unref?.();
  }
}
