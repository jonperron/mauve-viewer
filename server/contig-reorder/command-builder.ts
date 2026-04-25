import { join } from 'node:path';

/** Options for building the ContigOrderer command */
export interface ContigOrdererOptions {
  /** Path to Mauve.jar */
  readonly jarPath: string;
  /** Output directory for alignment subdirectories */
  readonly outputDir: string;
  /** Absolute path to the reference genome file */
  readonly referenceFile: string;
  /** Absolute path to the draft genome file */
  readonly draftFile: string;
  /** Maximum number of reordering iterations (1–100) */
  readonly maxIterations: number;
}

/**
 * Builds the command-line argument array for the ContigOrderer.
 *
 * Mirrors: java -cp Mauve.jar org.gel.mauve.contigs.ContigOrderer
 *            -output <dir> -ref <reference> -draft <draft>
 *
 * The first positional argument to ContigOrderer is the iteration limit.
 */
export function buildContigOrdererCommand(
  options: ContigOrdererOptions,
): readonly string[] {
  return [
    'java',
    '-cp',
    options.jarPath,
    'org.gel.mauve.contigs.ContigOrderer',
    String(options.maxIterations),
    '-output',
    options.outputDir,
    '-ref',
    options.referenceFile,
    '-draft',
    options.draftFile,
  ];
}

/**
 * Returns the path to the final alignment subdirectory given the output
 * directory and the iteration count that produced it.
 */
export function getAlignmentDir(outputDir: string, iteration: number): string {
  return join(outputDir, `alignment${iteration}`);
}
