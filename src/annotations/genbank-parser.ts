import type {
  FeatureType,
  GenomicFeature,
  ContigBoundary,
  GenomeAnnotations,
} from './types.ts';

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
  const isComplement = location.startsWith('complement(');
  const stripped = isComplement
    ? location.slice('complement('.length, -1)
    : location;

  // Handle join() — take the full span
  const joinMatch = stripped.match(/^join\((.+)\)$/);
  const coordStr = joinMatch ? joinMatch[1]! : stripped;

  // Extract all coordinate pairs and take the full span
  const ranges = coordStr.split(',').map((part) => {
    const rangeMatch = part.trim().match(/<?(\d+)\.\.>?(\d+)/);
    if (!rangeMatch) {
      throw new Error(`Cannot parse location: ${location}`);
    }
    return {
      start: parseInt(rangeMatch[1]!, 10),
      end: parseInt(rangeMatch[2]!, 10),
    };
  });

  const start = Math.min(...ranges.map((r) => r.start));
  const end = Math.max(...ranges.map((r) => r.end));

  return { start, end, strand: isComplement ? '-' : '+' };
}

function parseQualifiers(lines: readonly string[]): Record<string, string> {
  const qualifiers: Record<string, string> = {};
  let currentKey: string | null = null;
  let currentValue = '';

  for (const line of lines) {
    const qualMatch = line.match(/^\s*\/(\w+)=(.*)$/);
    if (qualMatch) {
      if (currentKey !== null) {
        qualifiers[currentKey] = currentValue.replace(/^"|"$/g, '');
      }
      currentKey = qualMatch[1]!;
      currentValue = qualMatch[2]!;
      continue;
    }

    const flagMatch = line.match(/^\s*\/(\w+)\s*$/);
    if (flagMatch) {
      if (currentKey !== null) {
        qualifiers[currentKey] = currentValue.replace(/^"|"$/g, '');
      }
      currentKey = flagMatch[1]!;
      currentValue = 'true';
      continue;
    }

    // Continuation line for multi-line qualifier values
    if (currentKey !== null) {
      currentValue += ' ' + line.trim();
    }
  }

  if (currentKey !== null) {
    qualifiers[currentKey] = currentValue.replace(/^"|"$/g, '');
  }

  return qualifiers;
}

interface RawFeature {
  readonly type: string;
  readonly location: string;
  readonly qualifierLines: readonly string[];
}

function extractFeatureBlocks(featuresSection: string): readonly RawFeature[] {
  const lines = featuresSection.split('\n');
  const features: RawFeature[] = [];
  let currentType: string | null = null;
  let currentLocation = '';
  let qualifierLines: string[] = [];

  for (const line of lines) {
    // Feature key line: 5 spaces + key + spaces + location
    const featureMatch = line.match(/^ {5}(\S+)\s+(.+)$/);
    if (featureMatch && !line.startsWith('                     ')) {
      // Save previous feature
      if (currentType !== null) {
        features.push({
          type: currentType,
          location: currentLocation,
          qualifierLines,
        });
      }
      currentType = featureMatch[1]!;
      currentLocation = featureMatch[2]!;
      qualifierLines = [];
      continue;
    }

    // Qualifier line or location continuation (21 spaces)
    if (line.startsWith('                     ') && currentType !== null) {
      const trimmed = line.trim();
      if (trimmed.startsWith('/')) {
        qualifierLines.push(trimmed);
      } else if (qualifierLines.length === 0) {
        // Location continuation
        currentLocation += trimmed;
      } else {
        // Qualifier value continuation
        qualifierLines.push(trimmed);
      }
    }
  }

  // Save last feature
  if (currentType !== null) {
    features.push({
      type: currentType,
      location: currentLocation,
      qualifierLines,
    });
  }

  return features;
}

/** Parse a GenBank flat file and extract genomic features and contig boundaries */
export function parseGenBank(content: string): GenomeAnnotations {
  const features: GenomicFeature[] = [];
  const contigs: ContigBoundary[] = [];

  // Find FEATURES section
  const featuresStart = content.indexOf('FEATURES');
  const originStart = content.indexOf('ORIGIN');

  if (featuresStart === -1 || originStart === -1) {
    return { genomeIndex: 0, features: [], contigs: [] };
  }

  const featuresSection = content.slice(featuresStart, originStart);
  const rawFeatures = extractFeatureBlocks(featuresSection);

  for (const raw of rawFeatures) {
    if (!isFeatureType(raw.type)) continue;

    try {
      const location = parseLocation(raw.location);
      const qualifiers = parseQualifiers(raw.qualifierLines);

      features.push({
        type: raw.type,
        start: location.start,
        end: location.end,
        strand: location.strand,
        qualifiers,
      });
    } catch {
      // Skip features with unparseable locations
    }
  }

  return { genomeIndex: 0, features, contigs };
}

/** Parse multiple GenBank records from a single file (multi-locus) */
export function parseGenBankMulti(content: string): readonly GenomeAnnotations[] {
  const records = content.split(/^\/\/\s*$/m);
  const results: GenomeAnnotations[] = [];
  let contigPosition = 0;

  for (const record of records) {
    if (!record.trim()) continue;

    const parsed = parseGenBank(record);

    // Extract locus length for contig boundaries
    const locusMatch = record.match(/^LOCUS\s+\S+\s+(\d+)\s+bp/m);
    const locusLength = locusMatch ? parseInt(locusMatch[1]!, 10) : 0;
    const locusName = record.match(/^LOCUS\s+(\S+)/m)?.[1] ?? '';

    // Offset features to global coordinates for multi-record files
    const offsetFeatures = contigPosition > 0
      ? parsed.features.map((f) => ({
        ...f,
        start: f.start + contigPosition,
        end: f.end + contigPosition,
      }))
      : parsed.features;

    // Add contig boundary at the end of each record (except the last)
    const contigEnd = contigPosition + locusLength;

    results.push({
      genomeIndex: 0,
      features: offsetFeatures,
      contigs: contigPosition > 0
        ? [{ position: contigPosition, name: locusName }]
        : [],
    });

    contigPosition = contigEnd;
  }

  // Merge all records into a single GenomeAnnotations
  const allFeatures = results.flatMap((r) => r.features);
  const allContigs = results.flatMap((r) => r.contigs);

  return [{ genomeIndex: 0, features: allFeatures, contigs: allContigs }];
}
