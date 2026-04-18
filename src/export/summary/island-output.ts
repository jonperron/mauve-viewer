import type { Genome } from '../../import/xmfa/types.ts';
import type { GenomeAnnotations, ContigBoundary } from '../../annotations/types.ts';
import type { SummarySegment, SummaryOptions } from './types.ts';
import { allGenomesMask, multiplicityLabel } from './segment-processor.ts';
import { percentContained } from './utils.ts';

// ── Contig resolution ────────────────────────────────────────────────────────

function resolveContigName(
  position: number,
  contigs: readonly ContigBoundary[],
  genomeName: string,
): string {
  if (contigs.length === 0) return genomeName;
  let name = genomeName;
  for (const c of contigs) {
    if (c.position <= position) name = c.name;
    else break;
  }
  return name;
}

// ── Island Coordinates ───────────────────────────────────────────────────────

/**
 * Format island coordinate file.
 * Lists all non-backbone segments with coordinates across all genomes.
 */
export function formatIslandCoordinates(
  chains: readonly (readonly SummarySegment[])[],
  genomes: readonly Genome[],
  options: SummaryOptions,
  referenceGenome: number,
): string {
  const genomeCount = genomes.length;
  const allMask = allGenomesMask(genomeCount);
  const lines: string[] = [];

  // Header
  lines.push(`Sequence ${referenceGenome} is the reference sequence.`);
  lines.push('For each island, the left and right coordinate are shown for each sequence');
  lines.push('If the island is complementary in direction to the reference sequence, a negative sign is shown before the coordinates for that sequence');
  lines.push(`Ignores islands segments under ${options.islandMinLength} bp and backbone segments under ${options.backboneMinLength} bp.`);

  // Column headers
  const cols: string[] = [];
  for (let gi = 0; gi < genomeCount; gi++) {
    cols.push(`seq${gi}_left`, `seq${gi}_right`);
  }
  cols.push('label');
  lines.push(cols.join('\t'));

  // Collect all non-backbone segments (islands and partial-multiplicity)
  const seen = new Set<string>();
  for (const chain of chains) {
    for (const seg of chain) {
      if (seg.multiplicityMask === allMask) continue; // skip full backbone
      if (seen.has(seg.typedId)) continue;
      seen.add(seg.typedId);

      const avgLen = computeAvgLength(seg, genomeCount);
      if (avgLen <= options.islandMinLength) continue;

      const row: string[] = [];
      for (let gi = 0; gi < genomeCount; gi++) {
        const iv = seg.intervals[gi];
        if (iv === undefined) {
          row.push('0', '0');
          continue;
        }
        const left = iv.reverse ? -iv.leftEnd : iv.leftEnd;
        const right = iv.reverse ? -iv.rightEnd : iv.rightEnd;
        row.push(String(left), String(right));
      }
      row.push(seg.typedId);
      lines.push(row.join('\t'));
    }
  }

  return lines.join('\n') + '\n';
}

// ── Island Features (per genome) ─────────────────────────────────────────────

/**
 * Format island features for a single genome.
 * Output is importable into Mauve as a feature file.
 */
export function formatIslandFeatures(
  chain: readonly SummarySegment[],
  genomeIndex: number,
  genomes: readonly Genome[],
  contigs: readonly ContigBoundary[],
  options: SummaryOptions,
): string {
  const genomeCount = genomes.length;
  const allMask = allGenomesMask(genomeCount);
  const genomeName = genomes[genomeIndex]?.name ?? `Genome ${genomeIndex}`;
  const lines: string[] = [];

  // Column headers
  lines.push(['type', 'label', 'contig', 'strand', 'left', 'right', 'multiplicity'].join('\t'));

  for (const seg of chain) {
    const iv = seg.intervals[genomeIndex];
    if (iv === undefined || iv.leftEnd === 0) continue;
    // Skip full-backbone segments
    if (seg.multiplicityMask === allMask) continue;
    // Must contain the current genome
    const len = iv.rightEnd - iv.leftEnd + 1;
    if (len <= options.islandMinLength) continue;

    const contigName = resolveContigName(iv.leftEnd, contigs, genomeName);
    const strand = iv.reverse ? '-' : '+';
    const multLabel = multiplicityLabel(seg.multiplicityMask, genomeCount);

    lines.push(
      ['island', seg.typedId, contigName, strand, String(iv.leftEnd), String(iv.rightEnd), multLabel].join('\t'),
    );
  }

  return lines.join('\n') + '\n';
}

// ── Island Gene Features (per genome) ────────────────────────────────────────

/** Feature types considered as "genes" for the summary */
const GENE_FEATURE_TYPES = new Set(['CDS', 'gene', 'tRNA', 'rRNA', 'misc_RNA']);

/**
 * Format island gene features for a single genome.
 * Lists genes that fall within island (non-backbone) segments.
 */
export function formatIslandGeneFeatures(
  chain: readonly SummarySegment[],
  genomeIndex: number,
  genomes: readonly Genome[],
  annotations: GenomeAnnotations,
  contigs: readonly ContigBoundary[],
  options: SummaryOptions,
  isBackbone: boolean,
): string {
  const genomeCount = genomes.length;
  const allMask = allGenomesMask(genomeCount);
  const genomeName = genomes[genomeIndex]?.name ?? `Genome ${genomeIndex}`;
  const lines: string[] = [];

  // Column headers
  lines.push(
    ['island', 'prct_on_is', 'type', 'label', 'contig', 'strand', 'left', 'right', 'multiplicity'].join('\t'),
  );

  // Sort features by left coordinate
  const features = [...annotations.features]
    .filter((f) => GENE_FEATURE_TYPES.has(f.type))
    .sort((a, b) => Math.min(a.start, a.end) - Math.min(b.start, b.end));

  let segIdx = 0;

  for (const feat of features) {
    const fLeft = Math.min(feat.start, feat.end);
    const fRight = Math.max(feat.start, feat.end);

    // Advance segment index past features already processed
    while (segIdx < chain.length) {
      const seg = chain[segIdx]!;
      const iv = seg.intervals[genomeIndex];
      if (iv !== undefined && iv.leftEnd > 0 && iv.rightEnd >= fLeft) break;
      segIdx++;
    }

    // Search through segments for best overlap
    for (let si = Math.max(0, segIdx - 1); si < chain.length; si++) {
      const seg = chain[si]!;
      const iv = seg.intervals[genomeIndex];
      if (iv === undefined || iv.leftEnd === 0) continue;
      if (iv.leftEnd > fRight) break;

      // Filter: backbone-mode only shows backbone segments, island-mode shows non-backbone
      const isAllGenomes = seg.multiplicityMask === allMask;
      if (isBackbone && !isAllGenomes) continue;
      if (!isBackbone && isAllGenomes) continue;

      const pct = percentContained(fLeft, fRight, iv.leftEnd, iv.rightEnd);
      if (pct < options.minimumPercentContained) continue;

      const contigName = resolveContigName(fLeft, contigs, genomeName);
      const locusTag = feat.qualifiers.locus_tag ?? feat.qualifiers.gene ?? '';
      const strand = feat.strand;
      const multLabel = multiplicityLabel(seg.multiplicityMask, genomeCount);

      lines.push(
        [
          seg.typedId,
          (pct * 100).toFixed(2),
          'island_gene',
          locusTag,
          contigName,
          strand,
          String(fLeft),
          String(fRight),
          multLabel,
        ].join('\t'),
      );
      break; // Only report first matching segment
    }
  }

  return lines.join('\n') + '\n';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeAvgLength(seg: SummarySegment, genomeCount: number): number {
  let total = 0;
  let count = 0;
  for (let gi = 0; gi < genomeCount; gi++) {
    const iv = seg.intervals[gi];
    if (iv !== undefined && iv.leftEnd > 0 && iv.rightEnd > 0) {
      total += iv.rightEnd - iv.leftEnd + 1;
      count++;
    }
  }
  return count > 0 ? total / count : 0;
}
