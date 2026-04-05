import * as d3 from 'd3';
import type { XmfaAlignment, Lcb } from '../xmfa/types.ts';
import type { ViewerConfig } from './alignment-viewer.ts';

/** Immutable viewer state for zoom/pan and genome scales */
export interface ViewerState {
  readonly alignment: XmfaAlignment;
  readonly config: ViewerConfig;
  readonly innerWidth: number;
  readonly baseScales: readonly d3.ScaleLinear<number, number>[];
  readonly zoomTransform: d3.ZoomTransform;
}

/** A homologous position mapped across genomes */
export interface HomologousPosition {
  readonly genomeIndex: number;
  readonly position: number;
  readonly lcbId: number;
}

/** Create initial viewer state from an alignment and config */
export function createViewerState(
  alignment: XmfaAlignment,
  config: ViewerConfig,
): ViewerState {
  const innerWidth = config.width - config.margin.left - config.margin.right;
  const baseScales = alignment.genomes.map((genome) =>
    d3.scaleLinear().domain([1, genome.length]).range([0, innerWidth]),
  );
  return {
    alignment,
    config,
    innerWidth,
    baseScales,
    zoomTransform: d3.zoomIdentity,
  };
}

/** Apply a new zoom transform, returning an updated state */
export function applyZoomTransform(
  state: ViewerState,
  transform: d3.ZoomTransform,
): ViewerState {
  return { ...state, zoomTransform: transform };
}

/** Get the current (zoomed) scale for a genome panel */
export function getZoomedScale(
  state: ViewerState,
  genomeIndex: number,
): d3.ScaleLinear<number, number> {
  const base = state.baseScales[genomeIndex];
  if (!base) {
    throw new Error(`Invalid genome index: ${genomeIndex}`);
  }
  return state.zoomTransform.rescaleX(base);
}

/** Get the visible nucleotide domain for a genome panel */
export function getVisibleDomain(
  state: ViewerState,
  genomeIndex: number,
): readonly [number, number] {
  const scale = getZoomedScale(state, genomeIndex);
  const domain = scale.domain();
  return [domain[0] ?? 0, domain[1] ?? 0] as const;
}

/** Get the visible range width in base pairs */
export function getVisibleRangeSize(
  state: ViewerState,
  genomeIndex: number,
): number {
  const [start, end] = getVisibleDomain(state, genomeIndex);
  return end - start;
}

/**
 * Find the LCB at a given nucleotide position in a genome.
 * Returns the LCB and its index, or undefined if no LCB covers that position.
 */
export function findLcbAtPosition(
  alignment: XmfaAlignment,
  genomeIndex: number,
  position: number,
): { readonly lcb: Lcb; readonly lcbIndex: number } | undefined {
  for (let i = 0; i < alignment.lcbs.length; i++) {
    const lcb = alignment.lcbs[i]!;
    const left = lcb.left[genomeIndex];
    const right = lcb.right[genomeIndex];
    if (left !== undefined && right !== undefined && left > 0 && position >= left && position <= right) {
      return { lcb, lcbIndex: i };
    }
  }
  return undefined;
}

/**
 * Find homologous positions across all genomes for a given position in one genome.
 * Uses LCB-relative positioning: maps the fractional offset within the source LCB
 * to the corresponding fractional offset in each target genome's LCB region.
 */
export function findHomologousPositions(
  alignment: XmfaAlignment,
  sourceGenomeIndex: number,
  position: number,
): readonly HomologousPosition[] {
  const result = findLcbAtPosition(alignment, sourceGenomeIndex, position);
  if (!result) return [];

  const { lcb } = result;
  const sourceLeft = lcb.left[sourceGenomeIndex]!;
  const sourceRight = lcb.right[sourceGenomeIndex]!;
  const sourceReverse = lcb.reverse[sourceGenomeIndex] ?? false;

  // Compute fractional offset within the source LCB
  const sourceSpan = sourceRight - sourceLeft;
  const fraction = sourceSpan > 0
    ? (sourceReverse
      ? (sourceRight - position) / sourceSpan
      : (position - sourceLeft) / sourceSpan)
    : 0;

  const positions: HomologousPosition[] = [];

  for (let gi = 0; gi < alignment.genomes.length; gi++) {
    const left = lcb.left[gi];
    const right = lcb.right[gi];
    if (left === undefined || right === undefined || left === 0) continue;

    const isReverse = lcb.reverse[gi] ?? false;
    const span = right - left;
    const mappedPosition = isReverse
      ? Math.round(right - fraction * span)
      : Math.round(left + fraction * span);

    positions.push({
      genomeIndex: gi,
      position: mappedPosition,
      lcbId: lcb.id,
    });
  }

  return positions;
}

/** Convert a pixel x-coordinate to a nucleotide position in a genome */
export function pixelToPosition(
  state: ViewerState,
  genomeIndex: number,
  pixelX: number,
): number {
  const scale = getZoomedScale(state, genomeIndex);
  return Math.round(scale.invert(pixelX));
}

/** Convert a nucleotide position to a pixel x-coordinate in a genome */
export function positionToPixel(
  state: ViewerState,
  genomeIndex: number,
  position: number,
): number {
  const scale = getZoomedScale(state, genomeIndex);
  return scale(position);
}
