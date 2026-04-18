import type { SummarySegment, SummaryOptions } from './types.ts';
import { allGenomesMask } from './segment-processor.ts';

/**
 * Identify backbone segments whose lengths vary widely between genomes.
 * These "problem" backbone segments may indicate assembly or alignment issues.
 */
export function findTroubleBackbone(
  allSegments: readonly SummarySegment[],
  genomeCount: number,
  options: SummaryOptions,
): readonly TroubleRecord[] {
  const allMask = allGenomesMask(genomeCount);
  const records: TroubleRecord[] = [];

  for (const seg of allSegments) {
    if (seg.multiplicityMask !== allMask) continue; // only full-backbone

    const lengths: number[] = [];
    for (let gi = 0; gi < genomeCount; gi++) {
      const iv = seg.intervals[gi];
      if (iv !== undefined && iv.leftEnd > 0 && iv.rightEnd > 0) {
        lengths.push(iv.rightEnd - iv.leftEnd + 1);
      }
    }

    if (lengths.length < 2) continue;

    const sorted = [...lengths].sort((a, b) => a - b);
    const avgLen = lengths.reduce((s, l) => s + l, 0) / lengths.length;
    const difference = sorted[sorted.length - 1]! - sorted[0]!;
    const ratio = avgLen > 0 ? difference / avgLen : 0;

    if (avgLen > options.backboneMinLength && ratio > options.maxLengthRatio) {
      records.push({ segment: seg, avgLength: avgLen, lengthRatio: ratio });
    }
  }

  return records;
}

export interface TroubleRecord {
  readonly segment: SummarySegment;
  readonly avgLength: number;
  readonly lengthRatio: number;
}

/**
 * Format trouble backbone segments as a tab-delimited report.
 */
export function formatTroubleBackbone(
  allSegments: readonly SummarySegment[],
  genomeCount: number,
  options: SummaryOptions,
  referenceGenome: number,
): string {
  const records = findTroubleBackbone(allSegments, genomeCount, options);
  const lines: string[] = [];

  // Header
  lines.push(`Sequence ${referenceGenome} is the reference sequence.`);
  lines.push('Each backbone segment with unclear information will be printed');
  lines.push('If the segment is complementary in direction to the reference sequence, a negative sign is shown before the coordinates for that sequence');

  // Column headers
  const cols: string[] = [];
  for (let gi = 0; gi < genomeCount; gi++) {
    cols.push(`seq${gi}_left`, `seq${gi}_right`);
  }
  cols.push('avg_lngth', 'diff_to_lngth');
  lines.push(cols.join('\t'));

  // Data rows
  for (const rec of records) {
    const row: string[] = [];
    for (let gi = 0; gi < genomeCount; gi++) {
      const iv = rec.segment.intervals[gi];
      if (iv === undefined) {
        row.push('0', '0');
        continue;
      }
      const left = iv.reverse ? -iv.leftEnd : iv.leftEnd;
      const right = iv.reverse ? -iv.rightEnd : iv.rightEnd;
      row.push(String(left), String(right));
    }
    row.push(rec.avgLength.toFixed(1));
    row.push(rec.lengthRatio.toFixed(4));
    lines.push(row.join('\t'));
  }

  return lines.join('\n') + '\n';
}
