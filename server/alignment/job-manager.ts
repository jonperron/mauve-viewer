import { randomUUID } from 'node:crypto';
import { spawn as defaultSpawn, type ChildProcess, type SpawnOptionsWithoutStdio } from 'node:child_process';
import {
  mkdir as defaultMkdir,
  writeFile as defaultWriteFile,
  readFile as defaultReadFile,
  rm as defaultRm,
} from 'node:fs/promises';
import { join } from 'node:path';
import type {
  AlignmentJobStatus,
  AlignmentJobStatusResponse,
  AlignmentProgressEvent,
  AlignmentRequest,
} from './types.js';
import { buildCommand } from './command-builder.js';

/** I/O functions injected for testability. Defaults to Node.js built-ins. */
export interface JobManagerIO {
  readonly spawn: (cmd: string, args: readonly string[], opts: SpawnOptionsWithoutStdio) => ChildProcess;
  readonly mkdir: typeof defaultMkdir;
  readonly writeFile: typeof defaultWriteFile;
  readonly readFile: typeof defaultReadFile;
  readonly rm: typeof defaultRm;
}

const defaultIO: JobManagerIO = {
  spawn: defaultSpawn,
  mkdir: defaultMkdir,
  writeFile: defaultWriteFile,
  readFile: defaultReadFile,
  rm: defaultRm,
};

export interface JobManagerConfig {
  readonly binaryDir: string;
  readonly workDir: string;
  readonly maxConcurrent: number;
  readonly io?: Partial<JobManagerIO>;
}

interface Job {
  readonly id: string;
  readonly request: AlignmentRequest;
  readonly jobDir: string;
  status: AlignmentJobStatus;
  progress: string;
  error?: string;
  process?: ChildProcess;
  readonly listeners: Set<(event: AlignmentProgressEvent) => void>;
}

export class JobManager {
  private readonly config: JobManagerConfig;
  private readonly io: JobManagerIO;
  private readonly jobs = new Map<string, Job>();
  private runningCount = 0;
  private readonly queue: string[] = [];

  constructor(config: JobManagerConfig) {
    this.config = config;
    this.io = { ...defaultIO, ...config.io };
  }

  async submit(request: AlignmentRequest): Promise<string> {
    const jobId = randomUUID();
    const jobDir = join(this.config.workDir, jobId);
    await this.io.mkdir(jobDir, { recursive: true });

    const job: Job = {
      id: jobId,
      request,
      jobDir,
      status: 'queued',
      progress: '',
      listeners: new Set(),
    };
    this.jobs.set(jobId, job);

    if (this.runningCount < this.config.maxConcurrent) {
      await this.startJob(job);
    } else {
      this.queue.push(jobId);
    }

    return jobId;
  }

  getStatus(jobId: string): AlignmentJobStatusResponse | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;
    return {
      jobId: job.id,
      status: job.status,
      progress: job.progress || undefined,
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

    // Remove from queue if still queued
    const queueIdx = this.queue.indexOf(jobId);
    if (queueIdx >= 0) {
      this.queue.splice(queueIdx, 1); // Intentional mutation of internal queue
    }

    job.status = 'cancelled';
    this.broadcast(job, { jobId, type: 'cancelled' });
    return true;
  }

  async getResult(jobId: string): Promise<string | undefined> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'completed') return undefined;

    const outputPath = join(job.jobDir, 'output.xmfa');
    try {
      return await this.io.readFile(outputPath, 'utf-8') as string;
    } catch (_err: unknown) {
      return _err instanceof Error ? _err.message : String(_err);
    }
  }

  addProgressListener(
    jobId: string,
    listener: (event: AlignmentProgressEvent) => void,
  ): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    job.listeners.add(listener);
    return true;
  }

  removeProgressListener(
    jobId: string,
    listener: (event: AlignmentProgressEvent) => void,
  ): void {
    this.jobs.get(jobId)?.listeners.delete(listener);
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
    job.status = 'running';

    try {
      // Write sequence files to job directory
      const sequencePaths: string[] = [];
      for (let i = 0; i < job.request.sequences.length; i++) {
        const seq = job.request.sequences[i]!;
        const seqPath = join(job.jobDir, `seq_${i}_${sanitizeFilename(seq.name)}`);
        await this.io.writeFile(seqPath, seq.content, 'utf-8');
        sequencePaths.push(seqPath);
      }

      const outputPath = join(job.jobDir, 'output.xmfa');
      const cmd = buildCommand(
        this.config.binaryDir,
        job.request.params,
        outputPath,
        sequencePaths,
      );

      const [binary, ...args] = cmd;
      if (!binary) throw new Error('Empty command from buildCommand');
      const proc = this.io.spawn(binary, args, {
        cwd: job.jobDir,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      job.process = proc;

      proc.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8').trim();
        if (text) {
          job.progress = text;
          this.broadcast(job, { jobId: job.id, type: 'progress', message: text });
        }
      });

      proc.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8').trim();
        if (text) {
          job.progress = text;
          this.broadcast(job, { jobId: job.id, type: 'progress', message: text });
        }
      });

      proc.on('close', (code) => {
        this.runningCount--;

        if (job.status === 'cancelled') {
          // Already handled
        } else if (code === 0) {
          job.status = 'completed';
          this.broadcast(job, { jobId: job.id, type: 'completed' });
        } else {
          job.status = 'failed';
          job.error = `Process exited with code ${code}`;
          this.broadcast(job, {
            jobId: job.id,
            type: 'failed',
            message: job.error,
          });
        }

        this.processQueue();
      });

      proc.on('error', (err) => {
        this.runningCount--;
        job.status = 'failed';
        job.error = err.message;
        this.broadcast(job, {
          jobId: job.id,
          type: 'failed',
          message: err.message,
        });
        this.processQueue();
      });
    } catch (err) {
      this.runningCount--;
      job.status = 'failed';
      job.error = err instanceof Error ? err.message : String(err);
      this.broadcast(job, {
        jobId: job.id,
        type: 'failed',
        message: job.error,
      });
      this.processQueue();
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

  private broadcast(job: Job, event: AlignmentProgressEvent): void {
    for (const listener of job.listeners) {
      try {
        listener(event);
      } catch {
        // Listener threw — swallow to avoid breaking other listeners
      }
    }
  }
}

/** Sanitize a filename to prevent path traversal */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
