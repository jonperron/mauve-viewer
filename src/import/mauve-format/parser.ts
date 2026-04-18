import type { Genome, Lcb, XmfaAlignment } from '../xmfa/types.ts';
import type { MauveAnchor, MauveAnchorSegment, MauveCompactAlignment, MauveParseResult } from './types.ts';

const SEGMENT_TOKEN = /^(\d+):(\d+)-(\d+)([+-])?$/;
const MAX_SEQUENCE_COUNT = 10_000;
const MAX_ANCHOR_LINES = 100_000;

function parseAnchorLine(line: string, fallbackGroupId: number): MauveAnchor {
  const tokens = line.trim().split(/\s+/).filter((token) => token.length > 0);
  if (tokens.length < 2) {
    throw new Error(`Malformed Mauve anchor line: ${line}`);
  }

  const firstIsNumeric = /^\d+$/.test(tokens[0]!);
  const groupId = firstIsNumeric ? parseInt(tokens[0]!, 10) : fallbackGroupId;
  const segmentTokens = firstIsNumeric ? tokens.slice(1) : tokens;

  const segments: MauveAnchorSegment[] = segmentTokens.map((token) => {
    const match = token.match(SEGMENT_TOKEN);
    if (!match) {
      throw new Error(`Malformed Mauve segment token: ${token}`);
    }
    const seqIndex = parseInt(match[1]!, 10);
    if (seqIndex < 1) {
      throw new Error(`Invalid sequence index in Mauve token (must be >= 1): ${token}`);
    }
    const start = parseInt(match[2]!, 10);
    const end = parseInt(match[3]!, 10);
    return {
      sequenceIndex: seqIndex,
      start: Math.min(start, end),
      end: Math.max(start, end),
      strand: match[4] === '-' ? '-' : '+',
    };
  });

  if (segments.length < 2) {
    throw new Error(`Mauve anchor requires at least 2 segments: ${line}`);
  }

  return { groupId, segments };
}

function parseCompact(content: string, format: 'mauve' | 'mln'): MauveCompactAlignment {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  if (lines.length === 0) {
    throw new Error('Empty Mauve alignment content');
  }

  if (lines.length > MAX_ANCHOR_LINES) {
    throw new Error(`Too many Mauve anchor lines (max ${MAX_ANCHOR_LINES})`);
  }

  const anchors = lines.map((line, idx) => parseAnchorLine(line, idx + 1));
  return { format, anchors };
}

function toXmfa(alignment: MauveCompactAlignment): XmfaAlignment {
  let maxSequenceIndex = 0;
  for (const anchor of alignment.anchors) {
    for (const segment of anchor.segments) {
      if (segment.sequenceIndex > maxSequenceIndex) maxSequenceIndex = segment.sequenceIndex;
    }
  }

  if (maxSequenceIndex > MAX_SEQUENCE_COUNT) {
    throw new Error(`Unreasonable sequence count: ${maxSequenceIndex} (max ${MAX_SEQUENCE_COUNT})`);
  }

  const sequenceCount = maxSequenceIndex;
  const maxEndPerGenome = new Map<number, number>();
  for (const anchor of alignment.anchors) {
    for (const segment of anchor.segments) {
      const prev = maxEndPerGenome.get(segment.sequenceIndex) ?? 0;
      if (segment.end > prev) {
        maxEndPerGenome.set(segment.sequenceIndex, segment.end);
      }
    }
  }

  const genomes: Genome[] = Array.from({ length: sequenceCount }, (_, index) => ({
    index: index + 1,
    name: `genome_${index + 1}`,
    length: maxEndPerGenome.get(index + 1) ?? 0,
    format: 'Mauve',
  }));

  const lcbs: Lcb[] = alignment.anchors.map((anchor, id) => {
    const left: number[] = new Array(sequenceCount).fill(0) as number[];
    const right: number[] = new Array(sequenceCount).fill(0) as number[];
    const reverse: boolean[] = new Array(sequenceCount).fill(false) as boolean[];

    for (const segment of anchor.segments) {
      const idx = segment.sequenceIndex - 1;
      left[idx] = segment.start;
      right[idx] = segment.end;
      reverse[idx] = segment.strand === '-';
    }

    const lengths = anchor.segments.map((segment) => segment.end - segment.start + 1);
    const weight = lengths.reduce((sum, value) => sum + value, 0) / lengths.length;

    return { id, left, right, reverse, weight };
  });

  return {
    header: {
      formatVersion: alignment.format === 'mln' ? 'MauveMLN' : 'MauveCompact',
      sequenceCount,
      sequenceEntries: genomes.map((genome) => ({
        index: genome.index,
        file: genome.name,
        format: genome.format,
      })),
    },
    blocks: [],
    lcbs,
    genomes,
  };
}

export function parseMauve(content: string): MauveCompactAlignment {
  return parseCompact(content, 'mauve');
}

export function parseMln(content: string): MauveCompactAlignment {
  return parseCompact(content, 'mln');
}

export function parseMauveAsXmfa(content: string, format: 'mauve' | 'mln'): MauveParseResult {
  const compact = parseCompact(content, format);
  return {
    compact,
    xmfa: toXmfa(compact),
  };
}