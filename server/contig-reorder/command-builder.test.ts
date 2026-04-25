import { describe, it, expect } from 'vitest';
import { buildContigOrdererCommand, getAlignmentDir } from './command-builder.js';

const baseOptions = {
  jarPath: '/opt/mauve/Mauve.jar',
  outputDir: '/tmp/job-1',
  referenceFile: '/tmp/job-1/ref.fasta',
  draftFile: '/tmp/job-1/draft.fasta',
  maxIterations: 15,
};

describe('buildContigOrdererCommand', () => {
  it('produces a java invocation of ContigOrderer', () => {
    const cmd = buildContigOrdererCommand(baseOptions);

    expect(cmd[0]).toBe('java');
    expect(cmd).toContain('-cp');
    expect(cmd).toContain('/opt/mauve/Mauve.jar');
    expect(cmd).toContain('org.gel.mauve.contigs.ContigOrderer');
  });

  it('places the iteration limit as the first ContigOrderer argument', () => {
    const cmd = buildContigOrdererCommand({ ...baseOptions, maxIterations: 5 });
    const classIdx = cmd.indexOf('org.gel.mauve.contigs.ContigOrderer');

    expect(cmd[classIdx + 1]).toBe('5');
  });

  it('includes -output, -ref, -draft flags with correct paths', () => {
    const cmd = buildContigOrdererCommand(baseOptions);
    const outputIdx = cmd.indexOf('-output');
    const refIdx = cmd.indexOf('-ref');
    const draftIdx = cmd.indexOf('-draft');

    expect(cmd[outputIdx + 1]).toBe('/tmp/job-1');
    expect(cmd[refIdx + 1]).toBe('/tmp/job-1/ref.fasta');
    expect(cmd[draftIdx + 1]).toBe('/tmp/job-1/draft.fasta');
  });

  it('returns an immutable array with no undefined entries', () => {
    const cmd = buildContigOrdererCommand(baseOptions);

    expect(cmd.every((arg) => arg !== undefined)).toBe(true);
  });
});

describe('getAlignmentDir', () => {
  it('returns outputDir/alignmentN for iteration N', () => {
    expect(getAlignmentDir('/tmp/job-1', 3)).toBe('/tmp/job-1/alignment3');
  });

  it('handles iteration 1', () => {
    expect(getAlignmentDir('/tmp/out', 1)).toBe('/tmp/out/alignment1');
  });
});
