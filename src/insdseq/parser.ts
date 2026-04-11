import type {
  ContigBoundary,
  FeatureType,
  GenomeAnnotations,
  GenomicFeature,
} from '../annotations/types.ts';
import type { InsdseqRecord } from './types.ts';

const SUPPORTED_FEATURE_TYPES: ReadonlySet<string> = new Set([
  'CDS', 'gene', 'tRNA', 'rRNA', 'misc_RNA',
]);

function isFeatureType(type: string): type is FeatureType {
  return SUPPORTED_FEATURE_TYPES.has(type);
}

function textOrEmpty(element: Element | null): string {
  return element?.textContent?.trim() ?? '';
}

function parseInterval(featureElement: Element): {
  readonly start: number;
  readonly end: number;
  readonly strand: '+' | '-';
} | null {
  const intervalEls = featureElement.querySelectorAll('INSDInterval');
  if (intervalEls.length === 0) {
    return null;
  }

  const intervals = [...intervalEls]
    .map((intervalEl) => {
      const from = parseInt(textOrEmpty(intervalEl.querySelector('INSDInterval_from')), 10);
      const to = parseInt(textOrEmpty(intervalEl.querySelector('INSDInterval_to')), 10);
      const isComp = textOrEmpty(intervalEl.querySelector('INSDInterval_iscomp')) === 'true';
      if (!Number.isFinite(from) || !Number.isFinite(to)) {
        return null;
      }
      return {
        from: Math.min(from, to),
        to: Math.max(from, to),
        isComp,
      };
    })
    .filter((interval): interval is { from: number; to: number; isComp: boolean } => interval !== null);

  if (intervals.length === 0) {
    return null;
  }

  return {
    start: Math.min(...intervals.map((interval) => interval.from)),
    end: Math.max(...intervals.map((interval) => interval.to)),
    strand: intervals.some((interval) => interval.isComp) ? '-' : '+',
  };
}

const SAFE_QUALIFIER_KEY = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;

function parseQualifiers(featureElement: Element): Record<string, string> {
  const qualifiers = Object.create(null) as Record<string, string>;
  for (const qualifierEl of featureElement.querySelectorAll('INSDQualifier')) {
    const key = textOrEmpty(qualifierEl.querySelector('INSDQualifier_name'));
    if (!key || !SAFE_QUALIFIER_KEY.test(key)) continue;
    const value = textOrEmpty(qualifierEl.querySelector('INSDQualifier_value'));
    qualifiers[key] = value;
  }
  return qualifiers;
}

function parseRecord(seqElement: Element): InsdseqRecord {
  const accession = textOrEmpty(seqElement.querySelector('INSDSeq_accession-version'))
    || textOrEmpty(seqElement.querySelector('INSDSeq_locus'));
  const sequence = textOrEmpty(seqElement.querySelector('INSDSeq_sequence')).toUpperCase();

  const features: GenomicFeature[] = [];
  for (const featureEl of seqElement.querySelectorAll('INSDFeature')) {
    const key = textOrEmpty(featureEl.querySelector('INSDFeature_key'));
    if (!isFeatureType(key)) continue;

    const interval = parseInterval(featureEl);
    if (!interval) continue;

    features.push({
      type: key,
      start: interval.start,
      end: interval.end,
      strand: interval.strand,
      qualifiers: parseQualifiers(featureEl),
    });
  }

  return {
    accession,
    sequence,
    features,
    contigs: [],
  };
}

function parseXml(content: string): Document {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(content, 'application/xml');
  if (xmlDoc.querySelector('parsererror')) {
    throw new Error('Invalid INSDseq XML content');
  }
  return xmlDoc;
}

/** Parse a single INSDseq XML payload into merged annotations. */
export function parseInsdseq(content: string): GenomeAnnotations {
  return parseInsdseqMulti(content)[0]!;
}

/** Parse INSDseq XML with one or more INSDSeq records. */
export function parseInsdseqMulti(content: string): readonly GenomeAnnotations[] {
  const xmlDoc = parseXml(content);
  const seqElements = [...xmlDoc.querySelectorAll('INSDSeq')];

  if (seqElements.length === 0) {
    return [{ genomeIndex: 0, features: [], contigs: [] }];
  }

  const records = seqElements.map((seqElement) => parseRecord(seqElement));
  let offset = 0;
  const mergedFeatures: GenomicFeature[] = [];
  const mergedContigs: ContigBoundary[] = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i]!;
    if (i > 0) {
      mergedContigs.push({
        position: offset,
        name: record.accession || `contig_${i + 1}`,
      });
    }

    const offsetFeatures = record.features.map((feature) => ({
      ...feature,
      start: feature.start + offset,
      end: feature.end + offset,
    }));

    mergedFeatures.push(...offsetFeatures);
    offset += record.sequence.length;
  }

  return [{ genomeIndex: 0, features: mergedFeatures, contigs: mergedContigs }];
}