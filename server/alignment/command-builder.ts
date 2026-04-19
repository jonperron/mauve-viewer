import { join } from 'node:path';
import type { AlignmentParams, MauveAlignerParams, ProgressiveMauveParams } from './types.js';

/**
 * Builds a command-line argument array for the selected alignment binary.
 *
 * Mirrors the logic in the legacy Java classes:
 *  - MauveAlignFrame.makeAlignerCommand()
 *  - ProgressiveMauveAlignFrame.makeAlignerCommand()
 */
export function buildCommand(
  binaryDir: string,
  params: AlignmentParams,
  outputPath: string,
  sequencePaths: readonly string[],
): readonly string[] {
  if (params.algorithm === 'mauveAligner') {
    return buildMauveAlignerCommand(binaryDir, params, outputPath, sequencePaths);
  }
  return buildProgressiveMauveCommand(binaryDir, params, outputPath, sequencePaths);
}

function buildMauveAlignerCommand(
  binaryDir: string,
  params: MauveAlignerParams,
  outputPath: string,
  sequencePaths: readonly string[],
): readonly string[] {
  const cmd: string[] = [join(binaryDir, 'mauveAligner')];

  if (params.seedWeight !== 'auto') {
    cmd.push(`--seed-size=${params.seedWeight}`);
  }

  cmd.push(`--output=${outputPath}`);

  if (!params.fullAlignment) {
    cmd.push('--no-recursion');
  }

  if (!params.extendLcbs) {
    cmd.push('--no-lcb-extension');
  }

  if (params.collinear) {
    cmd.push('--collinear');
  }

  if (params.minLcbWeight !== undefined && params.minLcbWeight >= 0) {
    cmd.push(`--weight=${params.minLcbWeight}`);
  }

  if (params.fullAlignment) {
    if (params.islandSize !== undefined && params.islandSize > 0) {
      cmd.push(`--island-size=${params.islandSize}`);
      cmd.push(`--island-output=${outputPath}.islands`);
    }

    if (params.backboneSize !== undefined && params.maxBackboneGap !== undefined) {
      cmd.push(`--backbone-size=${params.backboneSize}`);
      cmd.push(`--max-backbone-gap=${params.maxBackboneGap}`);
      cmd.push(`--backbone-output=${outputPath}.backbone`);
    }

    cmd.push(`--id-matrix=${outputPath}.id_matrix`);
    cmd.push(`--output-alignment=${outputPath}.alignment`);
  }

  cmd.push(`--output-guide-tree=${outputPath}.guide_tree`);

  for (const seq of sequencePaths) {
    cmd.push(seq);
  }

  return cmd;
}

function buildProgressiveMauveCommand(
  binaryDir: string,
  params: ProgressiveMauveParams,
  outputPath: string,
  sequencePaths: readonly string[],
): readonly string[] {
  const cmd: string[] = [join(binaryDir, 'progressiveMauve')];

  if (params.seedFamilies) {
    cmd.push('--seed-family');
  }

  if (params.seedWeight !== 'auto') {
    cmd.push(`--seed-weight=${params.seedWeight}`);
  }

  cmd.push(`--output=${outputPath}`);

  if (!params.fullAlignment) {
    cmd.push('--skip-gapped-alignment');
  }

  if (!params.iterativeRefinement) {
    cmd.push('--skip-refinement');
  }

  if (!params.sumOfPairsScoring) {
    cmd.push('--scoring-scheme=ancestral');
  }

  if (params.collinear) {
    cmd.push('--collinear');
  }

  if (params.minLcbWeight !== undefined && params.minLcbWeight >= 0) {
    cmd.push(`--weight=${params.minLcbWeight}`);
  }

  cmd.push(`--output-guide-tree=${outputPath}.guide_tree`);
  cmd.push(`--backbone-output=${outputPath}.backbone`);

  for (const seq of sequencePaths) {
    cmd.push(seq);
  }

  return cmd;
}
