import type {
  XmfaAlignment,
  XmfaHeader,
  Lcb,
  Genome,
} from '../xmfa/types.ts';

/** A region entry in the legacy JSON LCB format */
interface JsonLcbRegion {
  readonly name: string;
  readonly start: number;
  readonly end: number;
  readonly strand: '+' | '-';
  readonly lcb_idx: number;
}

/** A single LCB group: array of regions across genomes */
type JsonLcbGroup = readonly JsonLcbRegion[];

/** Top-level JSON LCB format: array of LCB groups */
type JsonLcbData = readonly JsonLcbGroup[];

function extractFilename(filepath: string): string {
  const parts = filepath.split(/[/\\]/);
  return parts[parts.length - 1] ?? filepath;
}

/**
 * Parse a JSON LCB file (legacy mauve-viewer format) into an XmfaAlignment.
 *
 * The format is an array of LCB groups, each containing region entries with
 * name, start, end, strand, and lcb_idx fields. The lcb_idx field is 1-based
 * and identifies which genome the region belongs to.
 */
export function parseJsonLcbs(content: string): XmfaAlignment {
  let data: unknown;
  try {
    data = JSON.parse(content) as unknown;
  } catch {
    throw new Error('Invalid JSON content');
  }

  if (!Array.isArray(data)) {
    throw new Error('JSON LCB data must be an array of LCB groups');
  }

  const lcbGroups = data as JsonLcbData;

  // Discover genomes from all regions
  const genomeMap = new Map<number, { name: string; maxEnd: number }>();

  for (const group of lcbGroups) {
    if (!Array.isArray(group)) {
      throw new Error('Each LCB group must be an array of regions');
    }
    for (const region of group) {
      validateRegion(region);
      const idx = region.lcb_idx;
      const existing = genomeMap.get(idx);
      if (!existing || region.end > existing.maxEnd) {
        genomeMap.set(idx, {
          name: region.name,
          maxEnd: region.end,
        });
      }
    }
  }

  if (genomeMap.size === 0) {
    throw new Error('No genomes found in JSON LCB data');
  }

  // Build sorted genome list (lcb_idx is 1-based)
  const sortedIndices = [...genomeMap.keys()].sort((a, b) => a - b);
  const sequenceCount = sortedIndices.length;

  const genomes: Genome[] = sortedIndices.map((idx, i) => {
    const info = genomeMap.get(idx)!;
    return {
      index: i + 1,
      name: extractFilename(info.name),
      length: info.maxEnd,
      format: 'FASTA',
    };
  });

  // Map from lcb_idx to 0-based array index
  const idxToArrayIndex = new Map<number, number>();
  sortedIndices.forEach((idx, i) => {
    idxToArrayIndex.set(idx, i);
  });

  // Build LCBs from groups (skip single-region groups)
  const lcbs: Lcb[] = [];
  let nextId = 0;

  for (const group of lcbGroups) {
    if (group.length < 2) continue;

    const left: number[] = new Array(sequenceCount).fill(0) as number[];
    const right: number[] = new Array(sequenceCount).fill(0) as number[];
    const reverse: boolean[] = new Array(sequenceCount).fill(false) as boolean[];

    for (const region of group) {
      const arrayIdx = idxToArrayIndex.get(region.lcb_idx)!;
      left[arrayIdx] = region.start;
      right[arrayIdx] = region.end;
      reverse[arrayIdx] = region.strand === '-';
    }

    const lengths = group.map((r) => r.end - r.start + 1);
    const weight = lengths.reduce((a, b) => a + b, 0) / lengths.length;

    lcbs.push({
      id: nextId++,
      left,
      right,
      reverse,
      weight,
    });
  }

  // Build minimal header
  const header: XmfaHeader = {
    formatVersion: 'JSON',
    sequenceCount,
    sequenceEntries: genomes.map((g) => ({
      index: g.index,
      file: g.name,
      format: g.format,
    })),
  };

  return {
    header,
    blocks: [],
    lcbs,
    genomes,
  };
}

function validateRegion(region: unknown): asserts region is JsonLcbRegion {
  const r = region as Record<string, unknown>;
  if (
    typeof region !== 'object' ||
    region === null ||
    typeof r.name !== 'string' ||
    typeof r.start !== 'number' ||
    typeof r.end !== 'number' ||
    typeof r.strand !== 'string' ||
    (r.strand !== '+' && r.strand !== '-') ||
    typeof r.lcb_idx !== 'number'
  ) {
    throw new Error(
      'Invalid region: must have name (string), start (number), end (number), strand (string), lcb_idx (number)',
    );
  }
}
