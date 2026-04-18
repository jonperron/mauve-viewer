import type { Genome } from '../../import/xmfa/types.ts';
import type { GenomeAnnotations, GenomicFeature } from '../../annotations/types.ts';
import type { SummarySegment, SummaryOptions } from './types.ts';
import { allGenomesMask, multiplicityLabel } from './segment-processor.ts';
import { percentContained } from './utils.ts';

// ── Valid gene feature types ─────────────────────────────────────────────────

const VALID_GENE_TYPES = new Set(['CDS', 'gene', 'tRNA', 'rRNA', 'misc_RNA']);

/** Count valid gene features in an annotation set */
export function countValidFeatures(features: readonly GenomicFeature[]): number {
  return features.filter((f) => VALID_GENE_TYPES.has(f.type)).length;
}

// ── Gene counting ────────────────────────────────────────────────────────────

/** Count genes by multiplicity mask for one genome */
export function countGenesByMultiplicity(
  chain: readonly SummarySegment[],
  features: readonly GenomicFeature[],
  genomeIndex: number,
  minimumPercentContained: number,
): ReadonlyMap<number, number> {
  const counts = new Map<number, number>();

  const sorted = [...features]
    .filter((f) => VALID_GENE_TYPES.has(f.type))
    .sort((a, b) => Math.min(a.start, a.end) - Math.min(b.start, b.end));

  let segIdx = 0;

  for (const feat of sorted) {
    const fLeft = Math.min(feat.start, feat.end);
    const fRight = Math.max(feat.start, feat.end);

    // Advance segment index to find overlapping segment
    while (segIdx < chain.length) {
      const seg = chain[segIdx]!;
      const iv = seg.intervals[genomeIndex];
      if (iv === undefined || iv.leftEnd === 0) {
        segIdx++;
        continue;
      }
      if (iv.rightEnd < fLeft) {
        segIdx++;
        continue;
      }
      break;
    }

    // Check current and following segments for overlap
    for (let si = Math.max(0, segIdx - 1); si < chain.length; si++) {
      const seg = chain[si]!;
      const iv = seg.intervals[genomeIndex];
      if (iv === undefined || iv.leftEnd === 0) continue;
      if (iv.leftEnd > fRight) break;

      const pct = percentContained(fLeft, fRight, iv.leftEnd, iv.rightEnd);
      if (pct >= minimumPercentContained) {
        counts.set(seg.multiplicityMask, (counts.get(seg.multiplicityMask) ?? 0) + 1);
        break;
      }
    }
  }

  return counts;
}

// ── Overview formatting ──────────────────────────────────────────────────────

function doubleToString(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

/**
 * Format the overview statistics file.
 * Shows per-genome statistics broken down by multiplicity.
 */
export function formatOverview(
  chains: readonly (readonly SummarySegment[])[],
  genomes: readonly Genome[],
  annotations: readonly GenomeAnnotations[] | undefined,
  options: SummaryOptions,
  referenceGenome: number,
): string {
  const genomeCount = genomes.length;
  const allMask = allGenomesMask(genomeCount);
  const minSize = Math.min(options.islandMinLength, options.backboneMinLength);

  const lines: string[] = [];

  // Header info
  lines.push(`Sequence ${referenceGenome} is the reference sequence.`);
  lines.push(`Island minimum: ${options.islandMinLength}`);
  lines.push(`Backbone minimum: ${options.backboneMinLength}`);
  lines.push(`Minimum length ratio considered a problem: ${options.maxLengthRatio}`);
  lines.push('Ratio represents the difference in length between the longest and shortest pieces over the average length.');
  lines.push(`Minimum percent of gene that must be on island: ${options.minimumPercentContained}`);
  lines.push('File explanations: ');
  lines.push('_islandscoords.tab contains island id and coordinate information for all islands in all sequences');
  lines.push('_problembb.tab contains backbone segments whose lengths vary widely between sequences.');
  lines.push('_islands.tab contains information on all the islands in a particular sequence.');
  lines.push('_island_genes.tab contains gene information by island');
  lines.push('');

  // Per-genome tables
  for (let gi = 0; gi < genomeCount; gi++) {
    const chain = chains[gi] ?? [];
    const genome = genomes[gi]!;

    // Compute segment and bp counts per multiplicity
    const segCounts = new Map<number, number>();
    const bpCounts = new Map<number, number>();
    let totalSegments = 0;

    for (const seg of chain) {
      const iv = seg.intervals[gi];
      if (iv === undefined || iv.leftEnd === 0) continue;
      const len = iv.rightEnd - iv.leftEnd + 1;
      if (len > minSize) {
        segCounts.set(seg.multiplicityMask, (segCounts.get(seg.multiplicityMask) ?? 0) + 1);
        bpCounts.set(seg.multiplicityMask, (bpCounts.get(seg.multiplicityMask) ?? 0) + len);
      }
      totalSegments++;
    }

    // Compute gene counts per multiplicity (use total annotation count as denominator)
    const genomeAnnotations = annotations?.find((a) => a.genomeIndex === gi);
    const geneCounts = genomeAnnotations !== undefined
      ? countGenesByMultiplicity(chain, genomeAnnotations.features, gi, options.minimumPercentContained)
      : new Map<number, number>();
    const totalGenes = genomeAnnotations !== undefined
      ? countValidFeatures(genomeAnnotations.features)
      : 0;

    // Table header
    lines.push(`Genome ${gi}: ${genome.name}`);
    lines.push(
      ['multiplicity', 'num_genes', 'percent', 'num_segments', 'percent', 'num_bp', 'percent'].join('\t'),
    );

    // One row per multiplicity (1 to allMask)
    let geneTotal = 0;
    let segTotal = 0;
    let bpTotal = 0;
    for (let mask = 1; mask <= allMask; mask++) {
      const label = multiplicityLabel(mask, genomeCount);
      const gc = geneCounts.get(mask) ?? 0;
      const sc = segCounts.get(mask) ?? 0;
      const bp = bpCounts.get(mask) ?? 0;
      geneTotal += gc;
      segTotal += sc;
      bpTotal += bp;

      const genePct = totalGenes > 0 ? doubleToString((gc / totalGenes) * 100, 1) : '0.0';
      const segPct = totalSegments > 0 ? doubleToString((sc / totalSegments) * 100, 1) : '0.0';
      const bpPct = genome.length > 0 ? doubleToString((bp / genome.length) * 100, 1) : '0.0';

      lines.push([label, String(gc), genePct, String(sc), segPct, String(bp), bpPct].join('\t'));
    }

    // Totals row
    lines.push(
      ['Totals', String(totalGenes), '100', String(totalSegments), '100', String(genome.length), '100'].join('\t'),
    );

    // Unknown row (genes not assigned to any multiplicity bucket)
    const unknownGenes = totalGenes - geneTotal;
    const unknownSegs = totalSegments - segTotal;
    const unknownBp = genome.length - bpTotal;
    const unknownGenePct = totalGenes > 0 ? doubleToString((unknownGenes / totalGenes) * 100, 1) : '0.0';
    const unknownSegPct = totalSegments > 0 ? doubleToString((unknownSegs / totalSegments) * 100, 1) : '0.0';
    const unknownBpPct = genome.length > 0 ? doubleToString((unknownBp / genome.length) * 100, 1) : '0.0';
    lines.push(
      ['unknown', String(unknownGenes), unknownGenePct, String(unknownSegs), unknownSegPct, String(unknownBp), unknownBpPct].join('\t'),
    );

    lines.push('');
  }

  return lines.join('\n') + '\n';
}
