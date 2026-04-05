import { describe, it, expect } from 'vitest';
import { parseGenBank, parseGenBankMulti } from './genbank-parser.ts';

const SIMPLE_GBK = `LOCUS       TEST_SEQ                5000 bp    DNA     linear   BCT 01-JAN-2024
DEFINITION  Test sequence.
ACCESSION   TEST001
FEATURES             Location/Qualifiers
     source          1..5000
                     /organism="Test organism"
                     /mol_type="genomic DNA"
     gene            100..500
                     /gene="testA"
                     /locus_tag="TEST_0001"
     CDS             100..500
                     /gene="testA"
                     /locus_tag="TEST_0001"
                     /product="Test protein A"
                     /protein_id="AAA00001.1"
                     /db_xref="GeneID:12345"
     gene            complement(600..900)
                     /gene="testB"
                     /locus_tag="TEST_0002"
     CDS             complement(600..900)
                     /gene="testB"
                     /locus_tag="TEST_0002"
                     /product="Test protein B"
     tRNA            1000..1070
                     /gene="trnA"
                     /product="tRNA-Ala"
     rRNA            2000..3500
                     /product="16S ribosomal RNA"
     misc_RNA        4000..4200
                     /product="small regulatory RNA"
ORIGIN
        1 atgcatgcat gcatgcatgc atgcatgcat gcatgcatgc atgcatgcat gcatgcatgc
//
`;

describe('parseGenBank', () => {
  it('parses CDS features with qualifiers', () => {
    const result = parseGenBank(SIMPLE_GBK);

    const cdsFeatures = result.features.filter((f) => f.type === 'CDS');
    expect(cdsFeatures).toHaveLength(2);

    const forward = cdsFeatures.find((f) => f.strand === '+')!;
    expect(forward.start).toBe(100);
    expect(forward.end).toBe(500);
    expect(forward.qualifiers['gene']).toBe('testA');
    expect(forward.qualifiers['locus_tag']).toBe('TEST_0001');
    expect(forward.qualifiers['product']).toBe('Test protein A');
    expect(forward.qualifiers['protein_id']).toBe('AAA00001.1');

    const reverse = cdsFeatures.find((f) => f.strand === '-')!;
    expect(reverse.start).toBe(600);
    expect(reverse.end).toBe(900);
    expect(reverse.qualifiers['gene']).toBe('testB');
  });

  it('parses gene features', () => {
    const result = parseGenBank(SIMPLE_GBK);
    const genes = result.features.filter((f) => f.type === 'gene');
    expect(genes).toHaveLength(2);
  });

  it('parses tRNA features', () => {
    const result = parseGenBank(SIMPLE_GBK);
    const trnas = result.features.filter((f) => f.type === 'tRNA');
    expect(trnas).toHaveLength(1);
    expect(trnas[0]!.start).toBe(1000);
    expect(trnas[0]!.end).toBe(1070);
    expect(trnas[0]!.qualifiers['product']).toBe('tRNA-Ala');
  });

  it('parses rRNA features', () => {
    const result = parseGenBank(SIMPLE_GBK);
    const rrnas = result.features.filter((f) => f.type === 'rRNA');
    expect(rrnas).toHaveLength(1);
    expect(rrnas[0]!.start).toBe(2000);
    expect(rrnas[0]!.end).toBe(3500);
  });

  it('parses misc_RNA features', () => {
    const result = parseGenBank(SIMPLE_GBK);
    const misc = result.features.filter((f) => f.type === 'misc_RNA');
    expect(misc).toHaveLength(1);
    expect(misc[0]!.start).toBe(4000);
    expect(misc[0]!.end).toBe(4200);
  });

  it('skips unsupported feature types', () => {
    const result = parseGenBank(SIMPLE_GBK);
    // source and trnA gene are not in SUPPORTED_FEATURE_TYPES but gene is
    // source should be skipped, gene included
    const types = new Set(result.features.map((f) => f.type));
    expect(types.has('CDS')).toBe(true);
    expect(types.has('gene')).toBe(true);
    expect(types.has('tRNA')).toBe(true);
    expect(types.has('rRNA')).toBe(true);
    expect(types.has('misc_RNA')).toBe(true);
  });

  it('handles complement locations', () => {
    const result = parseGenBank(SIMPLE_GBK);
    const revCds = result.features.find(
      (f) => f.type === 'CDS' && f.strand === '-',
    );
    expect(revCds).toBeDefined();
    expect(revCds!.start).toBe(600);
    expect(revCds!.end).toBe(900);
  });

  it('returns empty for content without FEATURES section', () => {
    const result = parseGenBank('LOCUS test\nORIGIN\n//');
    expect(result.features).toHaveLength(0);
  });

  it('handles join locations', () => {
    const gbk = `LOCUS       TEST                    1000 bp    DNA     linear
FEATURES             Location/Qualifiers
     CDS             join(100..200,300..400)
                     /gene="joinTest"
ORIGIN
        1 atgc
//
`;
    const result = parseGenBank(gbk);
    const cds = result.features.find((f) => f.type === 'CDS');
    expect(cds).toBeDefined();
    expect(cds!.start).toBe(100);
    expect(cds!.end).toBe(400);
    expect(cds!.strand).toBe('+');
  });

  it('handles complement(join(...)) locations', () => {
    const gbk = `LOCUS       TEST                    1000 bp    DNA     linear
FEATURES             Location/Qualifiers
     CDS             complement(join(100..200,300..400))
                     /gene="compJoin"
ORIGIN
        1 atgc
//
`;
    const result = parseGenBank(gbk);
    const cds = result.features.find((f) => f.type === 'CDS');
    expect(cds).toBeDefined();
    expect(cds!.start).toBe(100);
    expect(cds!.end).toBe(400);
    expect(cds!.strand).toBe('-');
  });

  it('handles multi-line qualifier values', () => {
    const gbk = `LOCUS       TEST                    1000 bp    DNA     linear
FEATURES             Location/Qualifiers
     CDS             100..500
                     /product="Long product name that spans
                     multiple lines in the GenBank file"
                     /gene="multi"
ORIGIN
        1 atgc
//
`;
    const result = parseGenBank(gbk);
    const cds = result.features.find((f) => f.type === 'CDS');
    expect(cds!.qualifiers['product']).toContain('Long product name');
    expect(cds!.qualifiers['product']).toContain('multiple lines');
  });
});

describe('parseGenBankMulti', () => {
  it('parses multiple records', () => {
    const multi = `LOCUS       REC1                    1000 bp    DNA     linear
FEATURES             Location/Qualifiers
     CDS             100..500
                     /gene="gene1"
ORIGIN
        1 atgc
//
LOCUS       REC2                    2000 bp    DNA     linear
FEATURES             Location/Qualifiers
     CDS             200..600
                     /gene="gene2"
ORIGIN
        1 atgc
//
`;
    const result = parseGenBankMulti(multi);
    expect(result).toHaveLength(1);
    expect(result[0]!.features).toHaveLength(2);
  });

  it('creates contig boundaries for multi-record files', () => {
    const multi = `LOCUS       CHR1                    1000 bp    DNA     linear
FEATURES             Location/Qualifiers
     CDS             100..500
                     /gene="gene1"
ORIGIN
        1 atgc
//
LOCUS       CHR2                    2000 bp    DNA     linear
FEATURES             Location/Qualifiers
     CDS             200..600
                     /gene="gene2"
ORIGIN
        1 atgc
//
`;
    const result = parseGenBankMulti(multi);
    expect(result[0]!.contigs).toHaveLength(1);
    expect(result[0]!.contigs[0]!.position).toBe(1000);
    expect(result[0]!.contigs[0]!.name).toBe('CHR2');
  });

  it('offsets features in second record', () => {
    const multi = `LOCUS       CHR1                    1000 bp    DNA     linear
FEATURES             Location/Qualifiers
     CDS             100..200
                     /gene="g1"
ORIGIN
        1 atgc
//
LOCUS       CHR2                    2000 bp    DNA     linear
FEATURES             Location/Qualifiers
     CDS             100..200
                     /gene="g2"
ORIGIN
        1 atgc
//
`;
    const result = parseGenBankMulti(multi);
    const features = result[0]!.features;
    // First record: no offset
    expect(features[0]!.start).toBe(100);
    // Second record: offset by 1000
    expect(features[1]!.start).toBe(1100);
    expect(features[1]!.end).toBe(1200);
  });
});

describe('parseGenBank with multi-record content', () => {
  const MULTI_RECORD_GBK = `LOCUS       NC_001133               1000 bp    DNA     linear   PLN
FEATURES             Location/Qualifiers
     source          1..1000
                     /organism="Saccharomyces cerevisiae"
     repeat_region   1..801
                     /gene="TEL01L"
ORIGIN
        1 ccacaccaca cccacacacc cacacaccac accacacacc acaccacacc cacacacaca
//
LOCUS       NC_001134               1000 bp    DNA     linear   PLN
FEATURES             Location/Qualifiers
     source          1..1000
                     /organism="Saccharomyces cerevisiae"
     gene            complement(280..1000)
                     /locus_tag="YBL113C"
                     /db_xref="GeneID:852159"
     CDS             complement(280..1000)
                     /locus_tag="YBL113C"
                     /product="Hypothetical ORF"
                     /protein_id="NP_009437.1"
                     /db_xref="GeneID:852159"
ORIGIN
        1 aaatagccct catgtacgtc tcctccaagc
//
`;

  it('parses multi-record GenBank with CDS and gene features', () => {
    const result = parseGenBankMulti(MULTI_RECORD_GBK);

    expect(result).toHaveLength(1);
    const cds = result[0]!.features.filter((f) => f.type === 'CDS');
    expect(cds.length).toBeGreaterThan(0);

    const genes = result[0]!.features.filter((f) => f.type === 'gene');
    expect(genes.length).toBeGreaterThan(0);
  });

  it('extracts complement CDS with qualifiers', () => {
    const result = parseGenBankMulti(MULTI_RECORD_GBK);
    const cds = result[0]!.features.find((f) => f.type === 'CDS');
    expect(cds).toBeDefined();
    expect(cds!.strand).toBe('-');
    expect(cds!.qualifiers['product']).toBe('Hypothetical ORF');
    expect(cds!.qualifiers['protein_id']).toBe('NP_009437.1');
  });

  it('creates contig boundary between records', () => {
    const result = parseGenBankMulti(MULTI_RECORD_GBK);
    expect(result[0]!.contigs).toHaveLength(1);
    expect(result[0]!.contigs[0]!.position).toBe(1000);
  });
});
