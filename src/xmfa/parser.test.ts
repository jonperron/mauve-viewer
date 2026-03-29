import { describe, it, expect } from 'vitest';
import { parseXmfa } from './parser.ts';

const MINIMAL_XMFA = `#FormatVersion Mauve1
#Sequence1File	genome1.fasta
#Sequence1Format	FastA
#Sequence2File	genome2.gbk
#Sequence2Format	GenBank
> 1:100-200 + genome1.fasta
ACGTACGTACGT
> 2:50-150 + genome2.gbk
ACGTACGT--GT
=
`;

const TWO_BLOCK_XMFA = `#FormatVersion Mauve1
#Sequence1File	genome1.fasta
#Sequence1Format	FastA
#Sequence2File	genome2.gbk
#Sequence2Format	GenBank
> 1:100-200 + genome1.fasta
ACGTACGTACGT
> 2:50-150 + genome2.gbk
ACGTACGT--GT
=
> 1:300-400 + genome1.fasta
TTTTAAAA
> 2:200-300 - genome2.gbk
AAAATTTT
=
`;

const SINGLE_SEQUENCE_BLOCK = `#FormatVersion Mauve1
#Sequence1File	genome1.fasta
#Sequence1Format	FastA
#Sequence2File	genome2.gbk
#Sequence2Format	GenBank
> 1:1-50 + genome1.fasta
ACGTACGT
=
> 2:1-80 + genome2.gbk
TTTTAAAA
=
`;

const WITH_ANNOTATION = `#FormatVersion Mauve1
#Sequence1File	genome1.fasta
#Sequence1Format	FastA
#Sequence2File	genome2.gbk
#Sequence2Format	GenBank
#Annotation2File	genome2.gbk
#Annotation2Format	GenBank
> 1:100-200 + genome1.fasta
ACGT
> 2:50-150 + genome2.gbk
ACGT
=
`;

describe('parseXmfa', () => {
  describe('header parsing', () => {
    it('should parse format version', () => {
      const result = parseXmfa(MINIMAL_XMFA);
      expect(result.header.formatVersion).toBe('Mauve1');
    });

    it('should parse sequence count from entries', () => {
      const result = parseXmfa(MINIMAL_XMFA);
      expect(result.header.sequenceCount).toBe(2);
    });

    it('should parse sequence file entries', () => {
      const result = parseXmfa(MINIMAL_XMFA);
      expect(result.header.sequenceEntries).toHaveLength(2);
      expect(result.header.sequenceEntries[0]).toEqual({
        index: 1,
        file: 'genome1.fasta',
        format: 'FastA',
      });
      expect(result.header.sequenceEntries[1]).toEqual({
        index: 2,
        file: 'genome2.gbk',
        format: 'GenBank',
      });
    });

    it('should parse annotation metadata', () => {
      const result = parseXmfa(WITH_ANNOTATION);
      expect(result.header.sequenceEntries[1]).toEqual({
        index: 2,
        file: 'genome2.gbk',
        format: 'GenBank',
        annotationFile: 'genome2.gbk',
        annotationFormat: 'GenBank',
      });
    });
  });

  describe('alignment block parsing', () => {
    it('should parse a single alignment block', () => {
      const result = parseXmfa(MINIMAL_XMFA);
      expect(result.blocks).toHaveLength(1);
    });

    it('should parse segments within a block', () => {
      const result = parseXmfa(MINIMAL_XMFA);
      const block = result.blocks[0]!;
      expect(block.segments).toHaveLength(2);
    });

    it('should parse segment coordinates', () => {
      const result = parseXmfa(MINIMAL_XMFA);
      const segment = result.blocks[0]!.segments[0]!;
      expect(segment.sequenceIndex).toBe(1);
      expect(segment.start).toBe(100);
      expect(segment.end).toBe(200);
      expect(segment.strand).toBe('+');
      expect(segment.sourceFile).toBe('genome1.fasta');
    });

    it('should accumulate sequence data across lines', () => {
      const result = parseXmfa(MINIMAL_XMFA);
      const segment = result.blocks[0]!.segments[0]!;
      expect(segment.sequenceData).toBe('ACGTACGTACGT');
    });

    it('should parse multiple blocks', () => {
      const result = parseXmfa(TWO_BLOCK_XMFA);
      expect(result.blocks).toHaveLength(2);
    });

    it('should parse reverse strand', () => {
      const result = parseXmfa(TWO_BLOCK_XMFA);
      const segment = result.blocks[1]!.segments[1]!;
      expect(segment.strand).toBe('-');
    });

    it('should handle multi-line sequences', () => {
      const multiLine = `#FormatVersion Mauve1
#Sequence1File	g1.fa
#Sequence1Format	FastA
#Sequence2File	g2.fa
#Sequence2Format	FastA
> 1:1-10 + g1.fa
ACGT
ACGT
AA
> 2:1-10 + g2.fa
TTTT
GGGG
CC
=
`;
      const result = parseXmfa(multiLine);
      const seg = result.blocks[0]!.segments[0]!;
      expect(seg.sequenceData).toBe('ACGTACGTAA');
    });
  });

  describe('LCB construction', () => {
    it('should create LCBs from multi-sequence blocks', () => {
      const result = parseXmfa(MINIMAL_XMFA);
      expect(result.lcbs).toHaveLength(1);
    });

    it('should set LCB coordinates from segments', () => {
      const result = parseXmfa(MINIMAL_XMFA);
      const lcb = result.lcbs[0]!;
      expect(lcb.left).toEqual([100, 50]);
      expect(lcb.right).toEqual([200, 150]);
    });

    it('should set LCB reverse flags', () => {
      const result = parseXmfa(TWO_BLOCK_XMFA);
      const lcb0 = result.lcbs[0]!;
      expect(lcb0.reverse).toEqual([false, false]);
      const lcb1 = result.lcbs[1]!;
      expect(lcb1.reverse).toEqual([false, true]);
    });

    it('should assign sequential LCB ids', () => {
      const result = parseXmfa(TWO_BLOCK_XMFA);
      expect(result.lcbs[0]!.id).toBe(0);
      expect(result.lcbs[1]!.id).toBe(1);
    });

    it('should not create LCBs from single-sequence blocks', () => {
      const result = parseXmfa(SINGLE_SEQUENCE_BLOCK);
      expect(result.lcbs).toHaveLength(0);
    });

    it('should compute LCB weight as average length', () => {
      const result = parseXmfa(MINIMAL_XMFA);
      const lcb = result.lcbs[0]!;
      // seq1: 200-100+1=101, seq2: 150-50+1=101, avg=101
      expect(lcb.weight).toBe(101);
    });
  });

  describe('genome extraction', () => {
    it('should extract genomes from header and blocks', () => {
      const result = parseXmfa(MINIMAL_XMFA);
      expect(result.genomes).toHaveLength(2);
    });

    it('should set genome names from file paths', () => {
      const result = parseXmfa(MINIMAL_XMFA);
      expect(result.genomes[0]!.name).toBe('genome1.fasta');
      expect(result.genomes[1]!.name).toBe('genome2.gbk');
    });

    it('should compute genome length from max segment end', () => {
      const result = parseXmfa(TWO_BLOCK_XMFA);
      expect(result.genomes[0]!.length).toBe(400);
      expect(result.genomes[1]!.length).toBe(300);
    });
  });

  describe('error handling', () => {
    it('should throw on empty input', () => {
      expect(() => parseXmfa('')).toThrow();
    });

    it('should throw on missing format version', () => {
      expect(() => parseXmfa('> 1:1-10 + file.fa\nACGT\n=\n')).toThrow();
    });

    it('should throw on malformed defline', () => {
      const bad = `#FormatVersion Mauve1
#Sequence1File	g1.fa
#Sequence1Format	FastA
> BADFORMAT
ACGT
=
`;
      expect(() => parseXmfa(bad)).toThrow();
    });
  });
});
