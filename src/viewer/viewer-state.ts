import * as d3 from 'd3';
import type { XmfaAlignment, Lcb } from '../xmfa/types.ts';
import type { ViewerConfig } from './alignment-viewer.ts';

/** Immutable viewer state for zoom/pan, genome display order, and reference */
export interface ViewerState {
  readonly alignment: XmfaAlignment;
  readonly config: ViewerConfig;
  readonly innerWidth: number;
  readonly baseScales: readonly d3.ScaleLinear<number, number>[];
  readonly zoomTransform: d3.ZoomTransform;
  /** Display order: genomeOrder[displayIndex] = dataIndex */
  readonly genomeOrder: readonly number[];
  /** Data index of the reference genome */
  readonly referenceGenomeIndex: number;
  /** Set of data indices of hidden genomes */
  readonly hiddenGenomes: ReadonlySet<number>;
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
  const genomeOrder = alignment.genomes.map((_, i) => i);
  return {
    alignment,
    config,
    innerWidth,
    baseScales,
    zoomTransform: d3.zoomIdentity,
    genomeOrder,
    referenceGenomeIndex: 0,
    hiddenGenomes: new Set(),
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

/** Get the visible (non-hidden) genome data indices in display order */
export function getVisibleGenomeOrder(state: ViewerState): readonly number[] {
  return state.genomeOrder.filter((gi) => !state.hiddenGenomes.has(gi));
}

/** Move a genome up in display order. Returns unchanged state if already at top. */
export function moveGenomeUp(state: ViewerState, displayIndex: number): ViewerState {
  if (displayIndex <= 0 || displayIndex >= state.genomeOrder.length) return state;
  const newOrder = [...state.genomeOrder];
  const temp = newOrder[displayIndex - 1]!;
  newOrder[displayIndex - 1] = newOrder[displayIndex]!;
  newOrder[displayIndex] = temp;
  return { ...state, genomeOrder: newOrder };
}

/** Move a genome down in display order. Returns unchanged state if already at bottom. */
export function moveGenomeDown(state: ViewerState, displayIndex: number): ViewerState {
  if (displayIndex < 0 || displayIndex >= state.genomeOrder.length - 1) return state;
  const newOrder = [...state.genomeOrder];
  const temp = newOrder[displayIndex + 1]!;
  newOrder[displayIndex + 1] = newOrder[displayIndex]!;
  newOrder[displayIndex] = temp;
  return { ...state, genomeOrder: newOrder };
}

/** Set the reference genome by data index. Returns unchanged state if already reference. */
export function setReferenceGenome(state: ViewerState, dataIndex: number): ViewerState {
  if (dataIndex === state.referenceGenomeIndex) return state;
  if (dataIndex < 0 || dataIndex >= state.alignment.genomes.length) return state;
  return { ...state, referenceGenomeIndex: dataIndex };
}

/** Hide a genome by data index. Returns unchanged state if already hidden or if it's the last visible genome. */
export function hideGenome(state: ViewerState, dataIndex: number): ViewerState {
  if (state.hiddenGenomes.has(dataIndex)) return state;
  if (dataIndex < 0 || dataIndex >= state.alignment.genomes.length) return state;
  if (state.hiddenGenomes.size >= state.alignment.genomes.length - 1) return state;
  const newHidden = new Set(state.hiddenGenomes);
  newHidden.add(dataIndex);
  return { ...state, hiddenGenomes: newHidden };
}

/** Show a hidden genome by data index. Returns unchanged state if not hidden. */
export function showGenome(state: ViewerState, dataIndex: number): ViewerState {
  if (!state.hiddenGenomes.has(dataIndex)) return state;
  const newHidden = new Set(state.hiddenGenomes);
  newHidden.delete(dataIndex);
  return { ...state, hiddenGenomes: newHidden };
}

/**
 * Compute visual reverse state for an LCB in a given genome, relative to the reference.
 * Uses XOR: if the reference genome is reversed in this LCB, flip all genomes.
 */
export function isVisuallyReverse(
  lcb: Lcb,
  genomeDataIndex: number,
  referenceGenomeIndex: number,
): boolean {
  const refReverse = lcb.reverse[referenceGenomeIndex] ?? false;
  const genomeReverse = lcb.reverse[genomeDataIndex] ?? false;
  return refReverse !== genomeReverse;
}

/** Height of a collapsed hidden genome panel */
export const HIDDEN_PANEL_HEIGHT = 20;

/** Compute Y offset for a panel at a given display index */
export function computePanelY(
  state: ViewerState,
  config: ViewerConfig,
  displayIndex: number,
): number {
  const { panelHeight, panelGap } = config;
  let y = 0;
  for (let di = 0; di < displayIndex; di++) {
    const dataIndex = state.genomeOrder[di]!;
    const isHidden = state.hiddenGenomes.has(dataIndex);
    y += (isHidden ? HIDDEN_PANEL_HEIGHT : panelHeight) + panelGap;
  }
  return y;
}
