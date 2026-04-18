import { describe, expect, it } from 'vitest';
import {
  projectLcbs,
  computePermutations,
  formatPermutationOutput,
  exportPermutations,
} from './permutation-export.ts';
import type { Lcb, Genome, XmfaAlignment } from '../../xmfa/types.ts';
import type { ContigMap } from './snp-export.ts';

function makeLcb(
  id: number,
  left: readonly number[],
  right: readonly number[],
  reverse: readonly boolean[],
  weight = 1,
): Lcb {
  return { id, left, right, reverse, weight };
}

function makeGenomes(count: number): readonly Genome[] {
  return Array.from({ length: count }, (_, i) => ({
    index: i,
    name: `genome${i}`,
    length: 10000,
    format: 'fasta',
  }));
}

function makeAlignment(
  lcbs: readonly Lcb[],
  genomes: readonly Genome[],
): XmfaAlignment {
  return {
    header: { formatVersion: '1', sequenceCount: genomes.length, sequenceEntries: [] },
    blocks: [],
    lcbs,
    genomes,
  };
}

describe('projectLcbs', () => {
  it('keeps LCBs present in all selected genomes', () => {
    const lcbs: readonly Lcb[] = [
      makeLcb(0, [100, 200, 300], [150, 250, 350], [false, false, false]),
      makeLcb(1, [400, 500, 600], [450, 550, 650], [false, true, false]),
    ];
    const result = projectLcbs(lcbs, [0, 1, 2]);
    expect(result).toHaveLength(2);
  });

  it('filters out LCBs not present in all selected genomes', () => {
    const lcbs: readonly Lcb[] = [
      makeLcb(0, [100, 200, 300], [150, 250, 350], [false, false, false]),
      makeLcb(1, [400, 0, 600], [450, 0, 650], [false, false, false]),
    ];
    const result = projectLcbs(lcbs, [0, 1, 2]);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(0);
  });

  it('filters to subset of genomes', () => {
    const lcbs: readonly Lcb[] = [
      makeLcb(0, [100, 200, 300], [150, 250, 350], [false, false, false]),
      makeLcb(1, [400, 0, 600], [450, 0, 650], [false, false, false]),
    ];
    // Only genomes 0 and 2 — LCB 1 has both present
    const result = projectLcbs(lcbs, [0, 2]);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no LCBs match', () => {
    const lcbs: readonly Lcb[] = [
      makeLcb(0, [100, 0, 300], [150, 0, 350], [false, false, false]),
    ];
    const result = projectLcbs(lcbs, [0, 1, 2]);
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty LCB list', () => {
    const result = projectLcbs([], [0, 1]);
    expect(result).toHaveLength(0);
  });
});

describe('computePermutations', () => {
  it('computes basic forward-strand permutation for 2 genomes', () => {
    // Genome 0: LCBs in order 0, 1, 2
    // Genome 1: LCBs in order 1, 0, 2 (different positional order)
    const lcbs: readonly Lcb[] = [
      makeLcb(0, [100, 500], [200, 600], [false, false]),
      makeLcb(1, [300, 100], [400, 200], [false, false]),
      makeLcb(2, [500, 700], [600, 800], [false, false]),
    ];
    const genomes = makeGenomes(2);
    const perms = computePermutations(lcbs, genomes, [0, 1]);

    // Genome 0: ordered by left[0]: LCB0(100), LCB1(300), LCB2(500) → 1,2,3
    expect(perms[0]!.chromosomes).toHaveLength(1);
    expect(perms[0]!.chromosomes[0]!.values).toEqual([1, 2, 3]);

    // Genome 1: ordered by left[1]: LCB1(100), LCB0(500), LCB2(700) → 2,1,3
    expect(perms[1]!.chromosomes).toHaveLength(1);
    expect(perms[1]!.chromosomes[0]!.values).toEqual([2, 1, 3]);
  });

  it('uses negative signs for reverse-strand LCBs', () => {
    const lcbs: readonly Lcb[] = [
      makeLcb(0, [100, 500], [200, 600], [false, true]),
      makeLcb(1, [300, 100], [400, 200], [true, false]),
    ];
    const genomes = makeGenomes(2);
    const perms = computePermutations(lcbs, genomes, [0, 1]);

    // Genome 0: LCB0 forward, LCB1 reverse → 1,-2
    expect(perms[0]!.chromosomes[0]!.values).toEqual([1, -2]);

    // Genome 1: LCB1 forward at 100, LCB0 reverse at 500 → 2,-1
    expect(perms[1]!.chromosomes[0]!.values).toEqual([2, -1]);
  });

  it('splits permutation by contig boundaries', () => {
    // Genome 0 has 2 contigs: [1-500] and [501-1000]
    // LCB 0 at 100-200 (contig 1), LCB 1 at 600-700 (contig 2)
    const lcbs: readonly Lcb[] = [
      makeLcb(0, [100, 100], [200, 200], [false, false]),
      makeLcb(1, [600, 300], [700, 400], [false, false]),
    ];
    const genomes = makeGenomes(2);
    const contigMap: ContigMap = new Map([
      [0, [{ position: 1, name: 'chr1' }, { position: 501, name: 'chr2' }]],
      [1, [{ position: 1, name: 'contigA' }]],
    ]);
    const perms = computePermutations(lcbs, genomes, [0, 1], contigMap);

    // Genome 0: 2 chromosomes — LCB0 in chr1, LCB1 in chr2
    expect(perms[0]!.chromosomes).toHaveLength(2);
    expect(perms[0]!.chromosomes[0]!.values).toEqual([1]);
    expect(perms[0]!.chromosomes[1]!.values).toEqual([2]);

    // Genome 1: 1 chromosome (single contig) — both LCBs in contigA
    expect(perms[1]!.chromosomes).toHaveLength(1);
    expect(perms[1]!.chromosomes[0]!.values).toEqual([1, 2]);
  });

  it('handles single LCB', () => {
    const lcbs: readonly Lcb[] = [
      makeLcb(0, [100, 200], [200, 300], [false, false]),
    ];
    const genomes = makeGenomes(2);
    const perms = computePermutations(lcbs, genomes, [0, 1]);

    expect(perms[0]!.chromosomes[0]!.values).toEqual([1]);
    expect(perms[1]!.chromosomes[0]!.values).toEqual([1]);
  });

  it('returns empty chromosomes for empty LCB list', () => {
    const genomes = makeGenomes(2);
    const perms = computePermutations([], genomes, [0, 1]);

    expect(perms[0]!.chromosomes).toHaveLength(0);
    expect(perms[1]!.chromosomes).toHaveLength(0);
  });

  it('handles genome subset projection', () => {
    // 3 genomes but we only export genomes 0 and 2
    // LCB 1 is absent in genome 2 → filtered
    const lcbs: readonly Lcb[] = [
      makeLcb(0, [100, 200, 300], [150, 250, 350], [false, false, false]),
      makeLcb(1, [400, 500, 0], [450, 550, 0], [false, false, false]),
      makeLcb(2, [600, 700, 100], [650, 750, 150], [false, true, true]),
    ];
    const genomes = makeGenomes(3);
    const perms = computePermutations(lcbs, genomes, [0, 2]);

    // Only LCBs 0 and 2 are present in both genomes 0 and 2
    // Genome 0: LCB0(100), LCB2(600) → 1,2
    expect(perms).toHaveLength(2);
    expect(perms[0]!.chromosomes[0]!.values).toEqual([1, 2]);

    // Genome 2: LCB2 reverse at 100, LCB0 forward at 300 → -2,1
    expect(perms[1]!.chromosomes[0]!.values).toEqual([-2, 1]);
  });
});

describe('formatPermutationOutput', () => {
  it('formats basic permutation with header comments', () => {
    const genomes = makeGenomes(2);
    const perms = computePermutations(
      [
        makeLcb(0, [100, 300], [200, 400], [false, false]),
        makeLcb(1, [300, 100], [400, 200], [false, true]),
      ],
      genomes,
      [0, 1],
    );
    const output = formatPermutationOutput(perms, genomes, [0, 1]);

    expect(output).toContain('# Genome 0: genome0');
    expect(output).toContain('# Genome 1: genome1');
    // Genome 0: 1,2$
    // Genome 1: -2,1$
    const lines = output.split('\n').filter((l) => !l.startsWith('#') && l.trim() !== '');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('1,2$');
    expect(lines[1]).toBe('-2,1$');
  });

  it('separates chromosomes with $ delimiter', () => {
    const genomes = makeGenomes(1);
    const contigMap: ContigMap = new Map([
      [0, [{ position: 1, name: 'chr1' }, { position: 501, name: 'chr2' }]],
    ]);
    const lcbs: readonly Lcb[] = [
      makeLcb(0, [100], [200], [false]),
      makeLcb(1, [600], [700], [true]),
    ];
    const perms = computePermutations(lcbs, genomes, [0], contigMap);
    const output = formatPermutationOutput(perms, genomes, [0]);

    const lines = output.split('\n').filter((l) => !l.startsWith('#') && l.trim() !== '');
    expect(lines[0]).toBe('1$ -2$');
  });

  it('returns empty content for no permutations', () => {
    const genomes = makeGenomes(2);
    const perms = computePermutations([], genomes, [0, 1]);
    const output = formatPermutationOutput(perms, genomes, [0, 1]);

    const lines = output.split('\n').filter((l) => !l.startsWith('#') && l.trim() !== '');
    // Each genome gets an empty line
    expect(lines).toHaveLength(0);
  });
});

describe('exportPermutations', () => {
  it('combines projection, computation, and formatting', () => {
    const lcbs: readonly Lcb[] = [
      makeLcb(0, [100, 500], [200, 600], [false, true]),
      makeLcb(1, [300, 100], [400, 200], [false, false]),
    ];
    const genomes = makeGenomes(2);
    const alignment = makeAlignment(lcbs, genomes);

    const output = exportPermutations(alignment);

    expect(output).toContain('genome0');
    expect(output).toContain('genome1');
    // Should contain permutation lines
    const lines = output.split('\n').filter((l) => !l.startsWith('#') && l.trim() !== '');
    expect(lines).toHaveLength(2);
  });

  it('supports genome subset selection', () => {
    const lcbs: readonly Lcb[] = [
      makeLcb(0, [100, 200, 300], [150, 250, 350], [false, false, false]),
      makeLcb(1, [400, 0, 600], [450, 0, 650], [false, false, true]),
    ];
    const genomes = makeGenomes(3);
    const alignment = makeAlignment(lcbs, genomes);

    // Export only genomes 0 and 2
    const output = exportPermutations(alignment, [0, 2]);

    expect(output).toContain('genome0');
    expect(output).toContain('genome2');
    expect(output).not.toContain('genome1');
    const lines = output.split('\n').filter((l) => !l.startsWith('#') && l.trim() !== '');
    expect(lines).toHaveLength(2);
  });

  it('passes contig map for chromosome splitting', () => {
    const lcbs: readonly Lcb[] = [
      makeLcb(0, [100], [200], [false]),
      makeLcb(1, [600], [700], [true]),
    ];
    const genomes = makeGenomes(1);
    const alignment = makeAlignment(lcbs, genomes);
    const contigMap: ContigMap = new Map([
      [0, [{ position: 1, name: 'chr1' }, { position: 501, name: 'chr2' }]],
    ]);

    const output = exportPermutations(alignment, undefined, contigMap);

    const lines = output.split('\n').filter((l) => !l.startsWith('#') && l.trim() !== '');
    expect(lines[0]).toBe('1$ -2$');
  });

  it('returns only header for empty LCB list', () => {
    const genomes = makeGenomes(2);
    const alignment = makeAlignment([], genomes);

    const output = exportPermutations(alignment);
    const dataLines = output.split('\n').filter((l) => !l.startsWith('#') && l.trim() !== '');
    expect(dataLines).toHaveLength(0);
  });
});
