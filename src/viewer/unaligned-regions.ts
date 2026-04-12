import * as d3 from 'd3';
import type { Lcb } from '../xmfa/types.ts';
import type { ViewerState } from './viewer-state.ts';
import { getZoomedScale } from './viewer-state.ts';
import { Y_POS_OFFSET, LCB_HEIGHT } from './layout-constants.ts';

/** Height of the unaligned region indicator */
const UNALIGNED_HEIGHT = LCB_HEIGHT * 2;

/** Gap threshold: minimum gap size (in bp) to render as unaligned */
const MIN_GAP_SIZE = 1;

/** Interval representing a covered region */
interface CoveredInterval {
  readonly start: number;
  readonly end: number;
}

/**
 * Compute unaligned (gap) regions for a genome.
 * These are regions not covered by any LCB.
 */
export function computeUnalignedRegions(
  lcbs: readonly Lcb[],
  genomeIndex: number,
  genomeLength: number,
): readonly CoveredInterval[] {
  // Collect all LCB intervals covering this genome
  const covered: CoveredInterval[] = [];
  for (const lcb of lcbs) {
    const left = lcb.left[genomeIndex];
    const right = lcb.right[genomeIndex];
    if (left !== undefined && right !== undefined && left > 0) {
      covered.push({ start: left, end: right });
    }
  }

  // Sort by start position
  const sorted = [...covered].sort((a, b) => a.start - b.start);

  // Merge overlapping intervals
  const merged: CoveredInterval[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      merged[merged.length - 1] = { start: last.start, end: Math.max(last.end, interval.end) };
    } else {
      merged.push(interval);
    }
  }

  // Compute gaps between merged intervals
  const gaps: CoveredInterval[] = [];

  // Gap before first interval
  if (merged.length === 0) {
    if (genomeLength > MIN_GAP_SIZE) {
      gaps.push({ start: 1, end: genomeLength });
    }
    return gaps;
  }

  const first = merged[0]!;
  if (first.start - 1 >= MIN_GAP_SIZE) {
    gaps.push({ start: 1, end: first.start - 1 });
  }

  // Gaps between intervals
  for (let i = 0; i < merged.length - 1; i++) {
    const current = merged[i]!;
    const next = merged[i + 1]!;
    const gapStart = current.end + 1;
    const gapEnd = next.start - 1;
    if (gapEnd - gapStart + 1 >= MIN_GAP_SIZE) {
      gaps.push({ start: gapStart, end: gapEnd });
    }
  }

  // Gap after last interval
  const last = merged[merged.length - 1]!;
  if (genomeLength - last.end >= MIN_GAP_SIZE) {
    gaps.push({ start: last.end + 1, end: genomeLength });
  }

  return gaps;
}

/** Render gap rectangles into a parent group */
function renderGapRects(
  parent: d3.Selection<SVGGElement, unknown, null, undefined>,
  gaps: readonly CoveredInterval[],
  genomeDataIndex: number,
  xScale: d3.ScaleLinear<number, number>,
): void {
  const unalignedGroup = parent
    .append('g')
    .attr('class', 'unaligned-regions');

  for (const gap of gaps) {
    const x = xScale(gap.start);
    const width = xScale(gap.end) - xScale(gap.start);

    unalignedGroup
      .append('rect')
      .attr('class', 'unaligned-block')
      .attr('data-genome-index', String(genomeDataIndex))
      .attr('x', x)
      .attr('y', Y_POS_OFFSET)
      .attr('width', Math.max(width, 1))
      .attr('height', UNALIGNED_HEIGHT)
      .attr('fill', '#ffffff')
      .attr('fill-opacity', 0.85)
      .attr('stroke', '#ddd')
      .attr('stroke-width', 0.5);
  }
}

/**
 * Render unaligned region indicators as white blocks for a genome panel.
 * These appear as semi-transparent white rectangles spanning the full profile height.
 */
export function renderUnalignedRegions(
  panel: d3.Selection<SVGGElement, unknown, null, undefined>,
  genomeDataIndex: number,
  lcbs: readonly Lcb[],
  genomeLength: number,
  xScale: d3.ScaleLinear<number, number>,
): void {
  const gaps = computeUnalignedRegions(lcbs, genomeDataIndex, genomeLength);

  if (gaps.length === 0) return;

  const regionGroup = panel.select<SVGGElement>('.regions');
  renderGapRects(regionGroup, gaps, genomeDataIndex, xScale);
}

/** Update unaligned region positions on zoom */
export function updateUnalignedRegionsOnZoom(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  state: ViewerState,
  lcbs: readonly Lcb[],
): void {
  const genomeCount = state.alignment.genomes.length;
  for (let di = 0; di < genomeCount; di++) {
    const dataIndex = state.genomeOrder[di]!;
    if (state.hiddenGenomes.has(dataIndex)) continue;

    const scale = getZoomedScale(state, dataIndex);
    const genome = state.alignment.genomes[dataIndex]!;
    const gaps = computeUnalignedRegions(lcbs, dataIndex, genome.length);

    const panel = root.select(`.genome-panel[data-genome-data-index="${dataIndex}"]`);
    panel.selectAll('.unaligned-regions').remove();

    if (gaps.length === 0) continue;

    const regionGroup = panel.select<SVGGElement>('.regions');
    renderGapRects(regionGroup, gaps, dataIndex, scale);
  }
}
