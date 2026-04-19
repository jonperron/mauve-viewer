import { describe, it, expect } from 'vitest';
import { buildCommand } from './command-builder.js';
import type { MauveAlignerParams, ProgressiveMauveParams } from './types.js';

const binaryDir = '/usr/local/bin';
const outputPath = '/tmp/jobs/abc/output.xmfa';
const sequencePaths = ['/tmp/jobs/abc/seq_0.fasta', '/tmp/jobs/abc/seq_1.fasta'];

describe('buildCommand — mauveAligner', () => {
  const baseParams: MauveAlignerParams = {
    algorithm: 'mauveAligner',
    seedWeight: 'auto',
    collinear: false,
    fullAlignment: true,
    extendLcbs: true,
  };

  it('builds minimal command with auto seed weight', () => {
    const cmd = buildCommand(binaryDir, baseParams, outputPath, sequencePaths);

    expect(cmd[0]).toBe('/usr/local/bin/mauveAligner');
    expect(cmd).toContain(`--output=${outputPath}`);
    expect(cmd).not.toContainEqual(expect.stringContaining('--seed-size'));
    expect(cmd).toContain(`--output-guide-tree=${outputPath}.guide_tree`);
  });

  it('includes seed-size when not auto', () => {
    const cmd = buildCommand(
      binaryDir,
      { ...baseParams, seedWeight: 15 },
      outputPath,
      sequencePaths,
    );

    expect(cmd).toContain('--seed-size=15');
  });

  it('adds --no-recursion when fullAlignment is false', () => {
    const cmd = buildCommand(
      binaryDir,
      { ...baseParams, fullAlignment: false },
      outputPath,
      sequencePaths,
    );

    expect(cmd).toContain('--no-recursion');
    expect(cmd).not.toContainEqual(expect.stringContaining('--id-matrix'));
    expect(cmd).not.toContainEqual(expect.stringContaining('--output-alignment'));
  });

  it('adds --no-lcb-extension when extendLcbs is false', () => {
    const cmd = buildCommand(
      binaryDir,
      { ...baseParams, extendLcbs: false },
      outputPath,
      sequencePaths,
    );

    expect(cmd).toContain('--no-lcb-extension');
  });

  it('adds --collinear flag', () => {
    const cmd = buildCommand(
      binaryDir,
      { ...baseParams, collinear: true },
      outputPath,
      sequencePaths,
    );

    expect(cmd).toContain('--collinear');
  });

  it('adds --weight when minLcbWeight is set', () => {
    const cmd = buildCommand(
      binaryDir,
      { ...baseParams, minLcbWeight: 200 },
      outputPath,
      sequencePaths,
    );

    expect(cmd).toContain('--weight=200');
  });

  it('adds island parameters when set', () => {
    const cmd = buildCommand(
      binaryDir,
      { ...baseParams, islandSize: 50 },
      outputPath,
      sequencePaths,
    );

    expect(cmd).toContain('--island-size=50');
    expect(cmd).toContain(`--island-output=${outputPath}.islands`);
  });

  it('adds backbone parameters when both are set', () => {
    const cmd = buildCommand(
      binaryDir,
      { ...baseParams, backboneSize: 100, maxBackboneGap: 50 },
      outputPath,
      sequencePaths,
    );

    expect(cmd).toContain('--backbone-size=100');
    expect(cmd).toContain('--max-backbone-gap=50');
    expect(cmd).toContain(`--backbone-output=${outputPath}.backbone`);
  });

  it('adds full alignment outputs (id-matrix, alignment) when fullAlignment is true', () => {
    const cmd = buildCommand(binaryDir, baseParams, outputPath, sequencePaths);

    expect(cmd).toContain(`--id-matrix=${outputPath}.id_matrix`);
    expect(cmd).toContain(`--output-alignment=${outputPath}.alignment`);
  });

  it('appends sequence paths at the end', () => {
    const cmd = buildCommand(binaryDir, baseParams, outputPath, sequencePaths);

    expect(cmd.slice(-2)).toEqual(sequencePaths);
  });
});

describe('buildCommand — progressiveMauve', () => {
  const baseParams: ProgressiveMauveParams = {
    algorithm: 'progressiveMauve',
    seedWeight: 'auto',
    collinear: false,
    fullAlignment: true,
    seedFamilies: false,
    iterativeRefinement: true,
    sumOfPairsScoring: true,
  };

  it('builds minimal command', () => {
    const cmd = buildCommand(binaryDir, baseParams, outputPath, sequencePaths);

    expect(cmd[0]).toBe('/usr/local/bin/progressiveMauve');
    expect(cmd).toContain(`--output=${outputPath}`);
    expect(cmd).toContain(`--output-guide-tree=${outputPath}.guide_tree`);
    expect(cmd).toContain(`--backbone-output=${outputPath}.backbone`);
  });

  it('adds --seed-family when enabled', () => {
    const cmd = buildCommand(
      binaryDir,
      { ...baseParams, seedFamilies: true },
      outputPath,
      sequencePaths,
    );

    expect(cmd).toContain('--seed-family');
  });

  it('includes seed-weight when not auto', () => {
    const cmd = buildCommand(
      binaryDir,
      { ...baseParams, seedWeight: 11 },
      outputPath,
      sequencePaths,
    );

    expect(cmd).toContain('--seed-weight=11');
  });

  it('adds --skip-gapped-alignment when fullAlignment is false', () => {
    const cmd = buildCommand(
      binaryDir,
      { ...baseParams, fullAlignment: false },
      outputPath,
      sequencePaths,
    );

    expect(cmd).toContain('--skip-gapped-alignment');
  });

  it('adds --skip-refinement when iterativeRefinement is false', () => {
    const cmd = buildCommand(
      binaryDir,
      { ...baseParams, iterativeRefinement: false },
      outputPath,
      sequencePaths,
    );

    expect(cmd).toContain('--skip-refinement');
  });

  it('adds --scoring-scheme=ancestral when sumOfPairsScoring is false', () => {
    const cmd = buildCommand(
      binaryDir,
      { ...baseParams, sumOfPairsScoring: false },
      outputPath,
      sequencePaths,
    );

    expect(cmd).toContain('--scoring-scheme=ancestral');
  });

  it('adds --collinear flag', () => {
    const cmd = buildCommand(
      binaryDir,
      { ...baseParams, collinear: true },
      outputPath,
      sequencePaths,
    );

    expect(cmd).toContain('--collinear');
  });

  it('adds --weight when minLcbWeight is set', () => {
    const cmd = buildCommand(
      binaryDir,
      { ...baseParams, minLcbWeight: 100 },
      outputPath,
      sequencePaths,
    );

    expect(cmd).toContain('--weight=100');
  });

  it('appends sequence paths at the end', () => {
    const cmd = buildCommand(binaryDir, baseParams, outputPath, sequencePaths);

    expect(cmd.slice(-2)).toEqual(sequencePaths);
  });
});
