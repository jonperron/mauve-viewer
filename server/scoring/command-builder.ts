import { join } from 'node:path';
import type { ScoringOptions } from './types.js';

/** Default minimum LCB weight for scoring alignment */
const DEFAULT_WEIGHT = 200;

/**
 * Builds the progressiveMauve command for assembly scoring.
 *
 * Mirrors the Java ScoreAssembly default alignment arguments:
 *   --skip-refinement --weight=200
 */
export function buildScoringCommand(
  binaryDir: string,
  options: ScoringOptions | undefined,
  outputPath: string,
  sequencePaths: readonly string[],
): readonly string[] {
  const skipRefinement = options?.skipRefinement ?? true;
  const weight = options?.weight ?? DEFAULT_WEIGHT;

  const cmd: string[] = [join(binaryDir, 'progressiveMauve')];

  if (skipRefinement) {
    cmd.push('--skip-refinement');
  }

  cmd.push(`--weight=${weight}`);
  cmd.push(`--output=${outputPath}`);

  for (const seq of sequencePaths) {
    cmd.push(seq);
  }

  return cmd;
}
