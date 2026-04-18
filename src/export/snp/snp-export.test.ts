import { describe, expect, it } from 'vitest';
import { extractSnps, formatSnpTable, exportSnps, resolveContig } from './snp-export.ts';
import type { XmfaAlignment, AlignmentBlock, Genome } from '../import/xmfa/types.ts';
import type { ContigBoundary } from '../annotations/types.ts';
import type { ContigMap } from './snp-export.ts';

function makeAlignment(
  sequences: string[][],
  options?: { genomeLength?: number; starts?: number[][] },
): XmfaAlignment {
  const genomeCount = sequences[0]!.length;
  const genomeLength = options?.genomeLength ?? 1000;
  const blocks: AlignmentBlock[] = sequences.map((seqs, blockIdx) => ({
    segments: seqs.map((seqData, gi) => {
      const nonGapLen = seqData.replace(/-/g, '').length;
      const start = options?.starts?.[blockIdx]?.[gi] ?? blockIdx * 100 + 1;
      return {
        sequenceIndex: gi + 1, // 1-based like real XMFA
        start,
        end: start + nonGapLen - 1,
        strand: '+' as const,
        sourceFile: `genome${gi}.fasta`,
        sequenceData: seqData,
      };
    }),
  }));

  const genomes: Genome[] = Array.from({ length: genomeCount }, (_, i) => ({
    index: i + 1, // 1-based like real XMFA
    name: `genome${i}`,
    length: genomeLength,
    format: 'fasta',
  }));

  return {
    header: { formatVersion: '1', sequenceCount: genomeCount, sequenceEntries: [] },
    blocks,
    lcbs: [],
    genomes,
  };
}

describe('resolveContig', () => {
  it('returns genome name when no contigs are defined', () => {
    const result = resolveContig(150, [], 'genome0');
    expect(result.contigName).toBe('genome0');
    expect(result.positionInContig).toBe(150);
  });

  it('resolves position within a single contig', () => {
    const contigs: ContigBoundary[] = [{ position: 1, name: 'contig1' }];
    const result = resolveContig(50, contigs, 'genome0');
    expect(result.contigName).toBe('contig1');
    expect(result.positionInContig).toBe(50);
  });

  it('resolves position in second contig', () => {
    const contigs: ContigBoundary[] = [
      { position: 1, name: 'contig1' },
      { position: 500, name: 'contig2' },
    ];
    const result = resolveContig(600, contigs, 'genome0');
    expect(result.contigName).toBe('contig2');
    expect(result.positionInContig).toBe(101);
  });

  it('resolves position at exact contig boundary', () => {
    const contigs: ContigBoundary[] = [
      { position: 1, name: 'contig1' },
      { position: 500, name: 'contig2' },
    ];
    const result = resolveContig(500, contigs, 'genome0');
    expect(result.contigName).toBe('contig2');
    expect(result.positionInContig).toBe(1);
  });

  it('falls back to first contig when position is before first boundary', () => {
    const contigs: ContigBoundary[] = [
      { position: 100, name: 'contig1' },
      { position: 500, name: 'contig2' },
    ];
    const result = resolveContig(50, contigs, 'genome0');
    expect(result.contigName).toBe('contig1');
    expect(result.positionInContig).toBe(50);
  });
});

describe('extractSnps', () => {
  it('detects a simple SNP between two genomes', () => {
    const alignment = makeAlignment([['ACGT', 'AGGT']]);
    const snps = extractSnps(alignment);
    expect(snps).toHaveLength(1);
    expect(snps[0]!.pattern).toBe('CG');
    // Position should be start+1 (second column, first non-gap offset = 1)
    expect(snps[0]!.genomePositions[0]!.genomeWidePosition).toBe(2);
    expect(snps[0]!.genomePositions[1]!.genomeWidePosition).toBe(2);
  });

  it('returns empty for identical sequences', () => {
    const alignment = makeAlignment([['ACGT', 'ACGT']]);
    const snps = extractSnps(alignment);
    expect(snps).toHaveLength(0);
  });

  it('detects multiple SNPs in one block', () => {
    const alignment = makeAlignment([['ACGT', 'TGCA']]);
    const snps = extractSnps(alignment);
    // Columns: A≠T, C≠G, G≠C, T≠A → 4 SNPs
    expect(snps).toHaveLength(4);
  });

  it('ignores all-gap columns', () => {
    const alignment = makeAlignment([['A-GT', 'A-GT']]);
    const snps = extractSnps(alignment);
    expect(snps).toHaveLength(0);
  });

  it('does not count gaps as polymorphisms against a single base', () => {
    // Column with A and - → only one non-gap base → NOT polymorphic
    const alignment = makeAlignment([['A', '-']]);
    const snps = extractSnps(alignment);
    expect(snps).toHaveLength(0);
  });

  it('treats IUPAC ambiguity codes as potential SNPs', () => {
    // R (purine = A/G) vs A → polymorphic because R ≠ A
    const alignment = makeAlignment([['A', 'R']]);
    const snps = extractSnps(alignment);
    expect(snps).toHaveLength(1);
    expect(snps[0]!.pattern).toMatch(/[Aa][Rr]/i);
  });

  it('handles three genomes', () => {
    const alignment = makeAlignment([['ACG', 'ACG', 'ATG']]);
    const snps = extractSnps(alignment);
    // Column 1: C,C,T → polymorphic
    expect(snps).toHaveLength(1);
    expect(snps[0]!.pattern).toBe('CCT');
    expect(snps[0]!.genomePositions).toHaveLength(3);
  });

  it('handles multiple blocks', () => {
    const alignment = makeAlignment([
      ['AC', 'AG'],
      ['TT', 'GT'],
    ]);
    const snps = extractSnps(alignment);
    // Block 0: col 1 → C vs G
    // Block 1: col 0 → T vs G
    expect(snps).toHaveLength(2);
  });

  it('skips blocks with only one segment', () => {
    const alignment: XmfaAlignment = {
      header: { formatVersion: '1', sequenceCount: 2, sequenceEntries: [] },
      blocks: [{
        segments: [{
          sequenceIndex: 1,
          start: 1,
          end: 4,
          strand: '+',
          sourceFile: 'g.fa',
          sequenceData: 'ACGT',
        }],
      }],
      lcbs: [],
      genomes: [
        { index: 1, name: 'g0', length: 100, format: 'fasta' },
        { index: 2, name: 'g1', length: 100, format: 'fasta' },
      ],
    };
    const snps = extractSnps(alignment);
    expect(snps).toHaveLength(0);
  });

  it('uses contig map when provided', () => {
    const alignment = makeAlignment([['AC', 'AG']], { starts: [[500, 500]] });
    const contigMap: ContigMap = new Map([
      [0, [{ position: 1, name: 'contigA' }, { position: 400, name: 'contigB' }]],
      [1, [{ position: 1, name: 'contigX' }]],
    ]);
    const snps = extractSnps(alignment, contigMap);
    expect(snps).toHaveLength(1);
    expect(snps[0]!.genomePositions[0]!.contigName).toBe('contigB');
    expect(snps[0]!.genomePositions[0]!.positionInContig).toBe(102);
    expect(snps[0]!.genomePositions[1]!.contigName).toBe('contigX');
  });

  it('computes correct positions for genome with gap before SNP', () => {
    // Genome 0: A-GT → non-gap positions at genome: 1,2,3
    // Genome 1: ACGT → non-gap positions at genome: 1,2,3,4
    // Col 0: A vs A → same
    // Col 1: - vs C → skip (gap in one, single non-gap base)
    // Col 2: G vs G → same
    // Col 3: T vs T → same
    const alignment = makeAlignment([['A-GT', 'ACGT']]);
    const snps = extractSnps(alignment);
    expect(snps).toHaveLength(0);
  });

  it('handles case-insensitive comparison', () => {
    const alignment = makeAlignment([['acgt', 'ACGT']]);
    const snps = extractSnps(alignment);
    expect(snps).toHaveLength(0);
  });

  it('positions are 0 for genomes with gap at SNP column', () => {
    // Col 0: A vs T → SNP
    // Col 1: - vs C → gap in genome 0
    const alignment = makeAlignment([['A-', 'TC']]);
    const snps = extractSnps(alignment);
    // Col 0: A vs T → polymorphic
    expect(snps.length).toBeGreaterThanOrEqual(1);
    expect(snps[0]!.genomePositions[0]!.genomeWidePosition).toBe(1);
    expect(snps[0]!.genomePositions[1]!.genomeWidePosition).toBe(1);
  });

  it('treats ambiguity code as first non-gap base as polymorphic', () => {
    // R comes first, then A → polymorphic
    const alignment = makeAlignment([['R', 'A']]);
    const snps = extractSnps(alignment);
    expect(snps).toHaveLength(1);
  });

  it('does not treat lone ambiguity code as polymorphic', () => {
    // R is the only non-gap base → not polymorphic
    const alignment = makeAlignment([['R', '-']]);
    const snps = extractSnps(alignment);
    expect(snps).toHaveLength(0);
  });

  it('does not treat identical ambiguity codes as polymorphic', () => {
    const alignment = makeAlignment([['R', 'R']]);
    const snps = extractSnps(alignment);
    expect(snps).toHaveLength(0);
  });

  it('handles reverse strand segments', () => {
    const alignment: XmfaAlignment = {
      header: { formatVersion: '1', sequenceCount: 2, sequenceEntries: [] },
      blocks: [{
        segments: [
          { sequenceIndex: 1, start: 100, end: 103, strand: '+', sourceFile: 'g0.fa', sequenceData: 'ACGT' },
          { sequenceIndex: 2, start: 200, end: 203, strand: '-', sourceFile: 'g1.fa', sequenceData: 'TGCA' },
        ],
      }],
      lcbs: [],
      genomes: [
        { index: 1, name: 'g0', length: 1000, format: 'fasta' },
        { index: 2, name: 'g1', length: 1000, format: 'fasta' },
      ],
    };
    const snps = extractSnps(alignment);
    expect(snps).toHaveLength(4);
    // Reverse strand: positions count down from end
    expect(snps[0]!.genomePositions[1]!.genomeWidePosition).toBe(203);
    expect(snps[1]!.genomePositions[1]!.genomeWidePosition).toBe(202);
  });

  it('reports position 0 for genome absent from block', () => {
    // 3 genomes, but block has only 2 segments
    const alignment: XmfaAlignment = {
      header: { formatVersion: '1', sequenceCount: 3, sequenceEntries: [] },
      blocks: [{
        segments: [
          { sequenceIndex: 1, start: 1, end: 2, strand: '+', sourceFile: 'g0.fa', sequenceData: 'AC' },
          { sequenceIndex: 2, start: 1, end: 2, strand: '+', sourceFile: 'g1.fa', sequenceData: 'AG' },
        ],
      }],
      lcbs: [],
      genomes: [
        { index: 1, name: 'g0', length: 100, format: 'fasta' },
        { index: 2, name: 'g1', length: 100, format: 'fasta' },
        { index: 3, name: 'g2', length: 100, format: 'fasta' },
      ],
    };
    const snps = extractSnps(alignment);
    expect(snps).toHaveLength(1);
    expect(snps[0]!.genomePositions[2]!.genomeWidePosition).toBe(0);
    expect(snps[0]!.pattern).toBe('CG-');
  });
});

describe('formatSnpTable', () => {
  it('produces correct header', () => {
    const genomes: Genome[] = [
      { index: 1, name: 'g0', length: 100, format: 'fasta' },
      { index: 2, name: 'g1', length: 100, format: 'fasta' },
    ];
    const result = formatSnpTable([], genomes);
    const header = result.split('\n')[0]!;
    expect(header).toContain('SNP pattern');
    expect(header).toContain('sequence_1_Contig');
    expect(header).toContain('sequence_1_PosInContg');
    expect(header).toContain('sequence_1_GenWidePos');
    expect(header).toContain('sequence_2_Contig');
  });

  it('formats SNP rows correctly', () => {
    const genomes: Genome[] = [
      { index: 1, name: 'g0', length: 100, format: 'fasta' },
      { index: 2, name: 'g1', length: 100, format: 'fasta' },
    ];
    const snps = [{
      pattern: 'AC',
      genomePositions: [
        { contigName: 'chr1', positionInContig: 50, genomeWidePosition: 150 },
        { contigName: 'scaff1', positionInContig: 20, genomeWidePosition: 220 },
      ],
    }];
    const result = formatSnpTable(snps, genomes);
    const lines = result.split('\n');
    expect(lines[1]).toBe('AC\tchr1\t50\t150\tscaff1\t20\t220');
  });

  it('ends with newline', () => {
    const result = formatSnpTable([], [{ index: 1, name: 'g', length: 1, format: 'f' }]);
    expect(result.endsWith('\n')).toBe(true);
  });
});

describe('exportSnps', () => {
  it('produces a complete tab-delimited file', () => {
    const alignment = makeAlignment([['ACGT', 'AGGT']]);
    const result = exportSnps(alignment);
    const lines = result.split('\n').filter((l) => l.length > 0);
    expect(lines.length).toBe(2); // header + 1 SNP
    expect(lines[0]).toContain('SNP pattern');
    expect(lines[1]).toContain('CG');
  });

  it('returns only header for identical sequences', () => {
    const alignment = makeAlignment([['ACGT', 'ACGT']]);
    const result = exportSnps(alignment);
    const lines = result.split('\n').filter((l) => l.length > 0);
    expect(lines.length).toBe(1); // header only
  });
});
