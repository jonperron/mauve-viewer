import type { ContigBoundary, FeatureType, GenomeAnnotations, GenomicFeature } from '../annotations/types.ts';
import type { EmblRecord } from './types.ts';

const SUPPORTED_FEATURE_TYPES: ReadonlySet<string> = new Set([
  'CDS', 'gene', 'tRNA', 'rRNA', 'misc_RNA',
]);

function isFeatureType(type: string): type is FeatureType {
  return SUPPORTED_FEATURE_TYPES.has(type);
}

interface ParsedLocation {
  readonly start: number;
  readonly end: number;
  readonly strand: '+' | '-';
}

function parseLocation(location: string): ParsedLocation {
  const normalized = location.replace(/\s+/g, '');
  const isComplement = normalized.startsWith('complement(');
  const stripped = isComplement
    ? normalized.slice('complement('.length, -1)
    : normalized;

  const joinMatch = stripped.match(/^join\((.+)\)$/);
  const coordStr = joinMatch ? joinMatch[1]! : stripped;
  const ranges = coordStr.split(',').map((part) => {
    const rangeMatch = part.trim().match(/[<>]?(\d+)\.\.[<>]?(\d+)/);
    if (!rangeMatch) {
      throw new Error(`Cannot parse location: ${location}`);
    }
    return {
      start: parseInt(rangeMatch[1]!, 10),
      end: parseInt(rangeMatch[2]!, 10),
    };
  });

  return {
    start: Math.min(...ranges.map((r) => r.start)),
    end: Math.max(...ranges.map((r) => r.end)),
    strand: isComplement ? '-' : '+',
  };
}

interface RawFeature {
  readonly type: string;
  readonly location: string;
  readonly qualifierLines: readonly string[];
}

function extractFeatureBlocks(lines: readonly string[]): readonly RawFeature[] {
  const features: RawFeature[] = [];
  let currentType: string | null = null;
  let currentLocation = '';
  let qualifierLines: string[] = [];

  for (const line of lines) {
    const featureMatch = line.match(/^FT\s{3}(\S+)\s+(.+)$/);
    if (featureMatch) {
      if (currentType !== null) {
        features.push({ type: currentType, location: currentLocation, qualifierLines });
      }
      currentType = featureMatch[1]!;
      currentLocation = featureMatch[2]!.trim();
      qualifierLines = [];
      continue;
    }

    const contMatch = line.match(/^FT\s{19}(.+)$/);
    if (!contMatch || currentType === null) continue;

    const trimmed = contMatch[1]!.trim();
    if (trimmed.startsWith('/')) {
      qualifierLines.push(trimmed);
    } else if (qualifierLines.length === 0) {
      currentLocation += trimmed;
    } else {
      qualifierLines.push(trimmed);
    }
  }

  if (currentType !== null) {
    features.push({ type: currentType, location: currentLocation, qualifierLines });
  }

  return features;
}

const QUALIFIER_KEY_RE = /^\/([A-Za-z_]{1,64})=(.*)$/;
const QUALIFIER_FLAG_RE = /^\/([A-Za-z_]{1,64})$/;

function parseQualifiers(lines: readonly string[]): Record<string, string> {
  const qualifiers = Object.create(null) as Record<string, string>;
  let currentKey: string | null = null;
  let valueParts: string[] = [];

  const flush = () => {
    if (currentKey !== null) {
      qualifiers[currentKey] = valueParts.join(' ').replace(/^"|"$/g, '');
      currentKey = null;
      valueParts = [];
    }
  };

  for (const line of lines) {
    const withValue = line.match(QUALIFIER_KEY_RE);
    if (withValue) {
      flush();
      currentKey = withValue[1]!;
      valueParts = [withValue[2]!];
      continue;
    }

    const flag = line.match(QUALIFIER_FLAG_RE);
    if (flag) {
      flush();
      currentKey = flag[1]!;
      valueParts = ['true'];
      continue;
    }

    if (currentKey !== null) {
      valueParts.push(line.trim());
    }
  }

  flush();
  return qualifiers;
}

function parseSequence(lines: readonly string[]): string {
  const chunks: string[] = [];
  for (const line of lines) {
    if (line.startsWith('//')) break;
    chunks.push(line.replace(/[^A-Za-z]/g, ''));
  }
  return chunks.join('').toUpperCase();
}

function parseEmblRecord(recordContent: string): EmblRecord {
  const lines = recordContent.split(/\r?\n/);
  const id = lines.find((line) => line.startsWith('ID'))?.slice(2).trim() ?? '';
  const accession = lines.find((line) => line.startsWith('AC'))?.slice(2).replace(/;$/, '').trim() ?? '';
  const description = lines.find((line) => line.startsWith('DE'))?.slice(2).trim() ?? '';

  const sqIndex = lines.findIndex((line) => line.startsWith('SQ'));
  const ftIndices = lines
    .map((line, idx) => ({ line, idx }))
    .filter(({ line }) => line.startsWith('FT'))
    .map(({ idx }) => idx);

  const featureLines = ftIndices.length > 0
    ? lines.slice(ftIndices[0]!, sqIndex === -1 ? lines.length : sqIndex)
    : [];

  const rawFeatures = extractFeatureBlocks(featureLines);
  const features: GenomicFeature[] = [];

  for (const raw of rawFeatures) {
    if (!isFeatureType(raw.type)) continue;
    try {
      const parsedLocation = parseLocation(raw.location);
      features.push({
        type: raw.type,
        start: parsedLocation.start,
        end: parsedLocation.end,
        strand: parsedLocation.strand,
        qualifiers: parseQualifiers(raw.qualifierLines),
      });
    } catch {
      // Skip unparseable locations by design.
    }
  }

  const sequence = sqIndex === -1 ? '' : parseSequence(lines.slice(sqIndex + 1));

  return {
    id,
    accession,
    description,
    sequence,
    features,
    contigs: [],
  };
}

/** Parse a single EMBL record into genome annotations. */
export function parseEmbl(content: string): GenomeAnnotations {
  const record = parseEmblRecord(content);
  return {
    genomeIndex: 0,
    features: record.features,
    contigs: record.contigs,
  };
}

/** Parse multi-record EMBL content and merge records into a single annotation set. */
export function parseEmblMulti(content: string): readonly GenomeAnnotations[] {
  const records = content
    .split(/^\/\/\s*$/m)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => parseEmblRecord(chunk));

  if (records.length === 0) {
    return [{ genomeIndex: 0, features: [], contigs: [] }];
  }

  let offset = 0;
  const mergedFeatures: GenomicFeature[] = [];
  const mergedContigs: ContigBoundary[] = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i]!;
    if (i > 0) {
      mergedContigs.push({
        position: offset,
        name: record.id || `contig_${i + 1}`,
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

  return [{
    genomeIndex: 0,
    features: mergedFeatures,
    contigs: mergedContigs,
  }];
}