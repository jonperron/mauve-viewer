import { describe, expect, it } from 'vitest';
import { parseInsdseqMulti } from './parser.ts';

describe('parseInsdseqMulti', () => {
  it('parses features and qualifiers from INSDSeq XML', () => {
    const xml = `<?xml version="1.0"?>
<INSDSet>
  <INSDSeq>
    <INSDSeq_accession-version>ABC123.1</INSDSeq_accession-version>
    <INSDSeq_sequence>atgcgcatgc</INSDSeq_sequence>
    <INSDSeq_feature-table>
      <INSDFeature>
        <INSDFeature_key>CDS</INSDFeature_key>
        <INSDFeature_intervals>
          <INSDInterval>
            <INSDInterval_from>2</INSDInterval_from>
            <INSDInterval_to>8</INSDInterval_to>
          </INSDInterval>
        </INSDFeature_intervals>
        <INSDFeature_quals>
          <INSDQualifier>
            <INSDQualifier_name>gene</INSDQualifier_name>
            <INSDQualifier_value>abcA</INSDQualifier_value>
          </INSDQualifier>
        </INSDFeature_quals>
      </INSDFeature>
    </INSDSeq_feature-table>
  </INSDSeq>
</INSDSet>`;

    const result = parseInsdseqMulti(xml);
    expect(result).toHaveLength(1);
    expect(result[0]!.features).toHaveLength(1);
    expect(result[0]!.features[0]!.type).toBe('CDS');
    expect(result[0]!.features[0]!.qualifiers['gene']).toBe('abcA');
  });

  it('handles INSDSet with multiple sequences and creates contig boundary', () => {
    const xml = `<?xml version="1.0"?>
<INSDSet>
  <INSDSeq>
    <INSDSeq_accession-version>REC1</INSDSeq_accession-version>
    <INSDSeq_sequence>AAAA</INSDSeq_sequence>
  </INSDSeq>
  <INSDSeq>
    <INSDSeq_accession-version>REC2</INSDSeq_accession-version>
    <INSDSeq_sequence>TTTT</INSDSeq_sequence>
  </INSDSeq>
</INSDSet>`;

    const result = parseInsdseqMulti(xml);
    expect(result[0]!.contigs).toHaveLength(1);
    expect(result[0]!.contigs[0]!.position).toBe(4);
    expect(result[0]!.contigs[0]!.name).toBe('REC2');
  });

  it('throws on malformed XML', () => {
    expect(() => parseInsdseqMulti('<INSDSet><INSDSeq></INSDSet>')).toThrow(
      'Invalid INSDseq XML content',
    );
  });
});