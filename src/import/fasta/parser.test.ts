import { describe, it, expect } from 'vitest';
import { parseFasta, concatenateFastaEntries } from './parser.ts';

describe('parseFasta', () => {
  it('parses a single FASTA entry', () => {
    const content = '>seq1 description\nATCGATCG\nGCTAGCTA\n';
    const result = parseFasta(content);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]!.header).toBe('seq1 description');
    expect(result.entries[0]!.sequence).toBe('ATCGATCGGCTAGCTA');
  });

  it('parses multiple FASTA entries', () => {
    const content = [
      '>contig_0',
      'ATCGATCG',
      '>contig_1',
      'GCTAGCTA',
      '>contig_2',
      'TTTTAAAA',
    ].join('\n');

    const result = parseFasta(content);

    expect(result.entries).toHaveLength(3);
    expect(result.entries[0]!.header).toBe('contig_0');
    expect(result.entries[0]!.sequence).toBe('ATCGATCG');
    expect(result.entries[1]!.header).toBe('contig_1');
    expect(result.entries[1]!.sequence).toBe('GCTAGCTA');
    expect(result.entries[2]!.header).toBe('contig_2');
    expect(result.entries[2]!.sequence).toBe('TTTTAAAA');
  });

  it('handles multi-line sequences', () => {
    const content = '>seq1\nATCG\nGCTA\nTTTT\n';
    const result = parseFasta(content);

    expect(result.entries[0]!.sequence).toBe('ATCGGCTATTTT');
  });

  it('ignores blank lines', () => {
    const content = '>seq1\nATCG\n\nGCTA\n\n';
    const result = parseFasta(content);

    expect(result.entries[0]!.sequence).toBe('ATCGGCTA');
  });

  it('ignores comment lines starting with ;', () => {
    const content = '; this is a comment\n>seq1\n; another comment\nATCG\n';
    const result = parseFasta(content);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]!.sequence).toBe('ATCG');
  });

  it('handles Windows line endings', () => {
    const content = '>seq1\r\nATCG\r\nGCTA\r\n';
    const result = parseFasta(content);

    expect(result.entries[0]!.sequence).toBe('ATCGGCTA');
  });

  it('trims whitespace from header', () => {
    const content = '>  seq1  \nATCG\n';
    const result = parseFasta(content);

    expect(result.entries[0]!.header).toBe('seq1');
  });

  it('throws on empty content', () => {
    expect(() => parseFasta('')).toThrow('Empty FASTA content');
    expect(() => parseFasta('   ')).toThrow('Empty FASTA content');
  });

  it('throws when sequence data appears before header', () => {
    const content = 'ATCGATCG\n>seq1\nGCTA\n';
    expect(() => parseFasta(content)).toThrow('Sequence data found before header line');
  });

  it('throws when no entries found', () => {
    const content = '; only comments\n; no data\n';
    expect(() => parseFasta(content)).toThrow('No FASTA entries found');
  });

  it('handles entry with empty sequence', () => {
    const content = '>seq1\n>seq2\nATCG\n';
    const result = parseFasta(content);

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]!.header).toBe('seq1');
    expect(result.entries[0]!.sequence).toBe('');
    expect(result.entries[1]!.sequence).toBe('ATCG');
  });

  it('handles header with no description', () => {
    const content = '>seq1\nATCG\n';
    const result = parseFasta(content);

    expect(result.entries[0]!.header).toBe('seq1');
  });
});

describe('concatenateFastaEntries', () => {
  it('concatenates multiple entries into one sequence', () => {
    const entries = [
      { header: 'chr1', sequence: 'ATCG' },
      { header: 'chr2', sequence: 'GCTA' },
      { header: 'chr3', sequence: 'TTTT' },
    ];

    expect(concatenateFastaEntries(entries)).toBe('ATCGGCTATTTT');
  });

  it('returns empty string for no entries', () => {
    expect(concatenateFastaEntries([])).toBe('');
  });

  it('returns single sequence as-is', () => {
    const entries = [{ header: 'seq1', sequence: 'ATCGATCG' }];
    expect(concatenateFastaEntries(entries)).toBe('ATCGATCG');
  });
});
