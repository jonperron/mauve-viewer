import { describe, expect, it } from 'vitest';
import { parseEmbl, parseEmblMulti } from './parser.ts';

const SIMPLE_EMBL = `ID   TEST0001; SV 1; linear; genomic DNA; STD; UNC; 120 BP.
AC   TEST0001;
DE   Test sequence 1
FH   Key             Location/Qualifiers
FT   gene            10..50
FT                   /gene="gA"
FT   CDS             complement(join(10..20,30..50))
FT                   /locus_tag="TAG_0001"
FT                   /product="protein A"
SQ   Sequence 120 BP;
     atgcatgcat gcatgcatgc atgcatgcat gcatgcatgc
//`;

describe('parseEmbl', () => {
  it('parses EMBL features and locations', () => {
    const result = parseEmbl(SIMPLE_EMBL);
    expect(result.features).toHaveLength(2);

    const cds = result.features.find((feature) => feature.type === 'CDS');
    expect(cds).toBeDefined();
    expect(cds!.start).toBe(10);
    expect(cds!.end).toBe(50);
    expect(cds!.strand).toBe('-');
    expect(cds!.qualifiers['product']).toBe('protein A');
  });

  it('returns empty annotations when no FT section is present', () => {
    const result = parseEmbl('ID   X\nSQ   Sequence 10 BP;\n//');
    expect(result.features).toHaveLength(0);
  });
});

describe('parseEmblMulti', () => {
  it('merges records and offsets feature coordinates', () => {
    const content = `${SIMPLE_EMBL}
ID   TEST0002; SV 1; linear; genomic DNA; STD; UNC; 80 BP.
AC   TEST0002;
DE   Test sequence 2
FH   Key             Location/Qualifiers
FT   CDS             5..25
FT                   /gene="gB"
SQ   Sequence 80 BP;
     aaaaaaaaaa aaaaaaaaaa aaaaaaaaaa aaaaaaaaaa
//`;
    const result = parseEmblMulti(content);
    expect(result).toHaveLength(1);
    expect(result[0]!.contigs.length).toBeGreaterThan(0);

    const features = result[0]!.features;
    const second = features.find((feature) => feature.qualifiers['gene'] === 'gB');
    expect(second).toBeDefined();
    expect(second!.start).toBeGreaterThan(5);
  });
});