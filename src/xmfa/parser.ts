import type {
  XmfaAlignment,
  XmfaHeader,
  SequenceEntry,
  AlignmentBlock,
  AlignedSegment,
  Lcb,
  Genome,
} from './types.ts';

const DEFLINE_PATTERN = /^>\s*(\d+):(\d+)-(\d+)\s+([+-])\s+(.+)$/;

type MutableSequenceEntry = {
  index?: number;
  file?: string;
  format?: string;
  annotationFile?: string;
  annotationFormat?: string;
};

function parseHeader(lines: readonly string[]): XmfaHeader {
  const entries = new Map<number, MutableSequenceEntry>();
  let formatVersion = '';

  for (const line of lines) {
    if (!line.startsWith('#')) continue;

    const content = line.slice(1);
    const formatMatch = content.match(/^FormatVersion\s+(.+)$/);
    if (formatMatch) {
      formatVersion = formatMatch[1]!.trim();
      continue;
    }

    const seqFileMatch = content.match(/^Sequence(\d+)File\t(.+)$/);
    if (seqFileMatch) {
      const idx = parseInt(seqFileMatch[1]!, 10);
      const prev = entries.get(idx) ?? {};
      entries.set(idx, { ...prev, index: idx, file: seqFileMatch[2]!.trim() });
      continue;
    }

    const seqFormatMatch = content.match(/^Sequence(\d+)Format\t(.+)$/);
    if (seqFormatMatch) {
      const idx = parseInt(seqFormatMatch[1]!, 10);
      const prev = entries.get(idx) ?? {};
      entries.set(idx, { ...prev, index: idx, format: seqFormatMatch[2]!.trim() });
      continue;
    }

    const annotFileMatch = content.match(/^Annotation(\d+)File\t(.+)$/);
    if (annotFileMatch) {
      const idx = parseInt(annotFileMatch[1]!, 10);
      const prev = entries.get(idx) ?? {};
      entries.set(idx, { ...prev, index: idx, annotationFile: annotFileMatch[2]!.trim() });
      continue;
    }

    const annotFormatMatch = content.match(/^Annotation(\d+)Format\t(.+)$/);
    if (annotFormatMatch) {
      const idx = parseInt(annotFormatMatch[1]!, 10);
      const prev = entries.get(idx) ?? {};
      entries.set(idx, { ...prev, index: idx, annotationFormat: annotFormatMatch[2]!.trim() });
      continue;
    }
  }

  const sequenceEntries: SequenceEntry[] = [...entries.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, entry]) => {
      if (entry.index === undefined || !entry.file || !entry.format) {
        throw new Error(`Incomplete sequence entry: missing required fields`);
      }
      const base: SequenceEntry = {
        index: entry.index,
        file: entry.file,
        format: entry.format,
      };
      if (entry.annotationFile !== undefined) {
        return {
          ...base,
          annotationFile: entry.annotationFile,
          annotationFormat: entry.annotationFormat,
        };
      }
      return base;
    });

  return {
    formatVersion,
    sequenceCount: sequenceEntries.length,
    sequenceEntries,
  };
}

function parseDefline(line: string): Omit<AlignedSegment, 'sequenceData'> {
  const match = line.match(DEFLINE_PATTERN);
  if (!match) {
    const preview = line.length > 80 ? line.slice(0, 80) + '...' : line;
    throw new Error(`Malformed defline: ${preview}`);
  }
  return {
    sequenceIndex: parseInt(match[1]!, 10),
    start: parseInt(match[2]!, 10),
    end: parseInt(match[3]!, 10),
    strand: match[4] as '+' | '-',
    sourceFile: match[5]!.trim(),
  };
}

const MAX_BLOCKS = 100_000;
const MAX_SEQUENCE_LENGTH = 100_000_000;

function parseBlocks(lines: readonly string[]): AlignmentBlock[] {
  const blocks: AlignmentBlock[] = [];
  let currentSegments: AlignedSegment[] = [];
  let currentDefline: Omit<AlignedSegment, 'sequenceData'> | null = null;
  let sequenceLines: string[] = [];
  let sequenceLength = 0;

  const flushSegment = () => {
    if (currentDefline !== null) {
      currentSegments.push({
        ...currentDefline,
        sequenceData: sequenceLines.join(''),
      });
      currentDefline = null;
      sequenceLines = [];
      sequenceLength = 0;
    }
  };

  for (const line of lines) {
    if (line.startsWith('#')) continue;

    if (line.startsWith('>')) {
      flushSegment();
      currentDefline = parseDefline(line);
      continue;
    }

    if (line.startsWith('=')) {
      flushSegment();
      if (blocks.length >= MAX_BLOCKS) {
        throw new Error(`Too many alignment blocks (max ${MAX_BLOCKS})`);
      }
      const comment = line.length > 1 ? line.slice(1).trim() : undefined;
      blocks.push({ segments: currentSegments, comment });
      currentSegments = [];
      continue;
    }

    if (currentDefline !== null && line.trim().length > 0) {
      const trimmed = line.trim();
      sequenceLength += trimmed.length;
      if (sequenceLength > MAX_SEQUENCE_LENGTH) {
        throw new Error(`Sequence data too large (max ${MAX_SEQUENCE_LENGTH} characters)`);
      }
      sequenceLines.push(trimmed);
    }
  }

  // Handle case where file doesn't end with '='
  flushSegment();
  if (currentSegments.length > 0) {
    blocks.push({ segments: currentSegments });
  }

  return blocks;
}

function buildLcbs(
  blocks: readonly AlignmentBlock[],
  sequenceCount: number,
): Lcb[] {
  const lcbs: Lcb[] = [];
  let nextId = 0;

  for (const block of blocks) {
    if (block.segments.length < 2) continue;

    const left: number[] = new Array(sequenceCount).fill(0) as number[];
    const right: number[] = new Array(sequenceCount).fill(0) as number[];
    const reverse: boolean[] = new Array(sequenceCount).fill(
      false,
    ) as boolean[];

    for (const segment of block.segments) {
      const idx = segment.sequenceIndex - 1;
      left[idx] = segment.start;
      right[idx] = segment.end;
      reverse[idx] = segment.strand === '-';
    }

    const lengths = block.segments.map((s) => s.end - s.start + 1);
    const weight = lengths.reduce((a, b) => a + b, 0) / lengths.length;

    lcbs.push({
      id: nextId++,
      left,
      right,
      reverse,
      weight,
    });
  }

  return lcbs;
}

function extractFilename(filepath: string): string {
  const parts = filepath.split(/[/\\]/);
  return parts[parts.length - 1] ?? filepath;
}

function buildGenomes(
  header: XmfaHeader,
  blocks: readonly AlignmentBlock[],
): Genome[] {
  const maxEnd = new Map<number, number>();

  for (const block of blocks) {
    for (const segment of block.segments) {
      const current = maxEnd.get(segment.sequenceIndex) ?? 0;
      if (segment.end > current) {
        maxEnd.set(segment.sequenceIndex, segment.end);
      }
    }
  }

  return header.sequenceEntries.map((entry) => ({
    index: entry.index,
    name: extractFilename(entry.file),
    length: maxEnd.get(entry.index) ?? 0,
    format: entry.format,
  }));
}

export function parseXmfa(content: string): XmfaAlignment {
  if (!content.trim()) {
    throw new Error('Empty XMFA content');
  }

  const lines = content.split(/\r?\n/);

  const header = parseHeader(lines);
  if (!header.formatVersion) {
    throw new Error('Missing FormatVersion in XMFA header');
  }

  const blocks = parseBlocks(lines);
  const lcbs = buildLcbs(blocks, header.sequenceCount);
  const genomes = buildGenomes(header, blocks);

  return { header, blocks, lcbs, genomes };
}
