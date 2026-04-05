import * as d3 from 'd3';
import type { XmfaAlignment, Lcb } from '../xmfa/types.ts';
import {
  createViewerState,
  applyZoomTransform,
  getZoomedScale,
  findHomologousPositions,
  positionToPixel,
  getVisibleGenomeOrder,
  moveGenomeUp,
  moveGenomeDown,
  setReferenceGenome,
  hideGenome,
  showGenome,
  isVisuallyReverse,
  computePanelY,
  HIDDEN_PANEL_HEIGHT,
} from './viewer-state.ts';
import type { ViewerState } from './viewer-state.ts';
import { setupZoom } from './zoom.ts';
import type { ZoomHandle } from './zoom.ts';
import { setupCursor } from './cursor.ts';
import type { CursorHandle } from './cursor.ts';
import { createNavigationToolbar } from './navigation-toolbar.ts';
import type { NavigationToolbarHandle } from './navigation-toolbar.ts';
import { createTrackControls } from './track-controls.ts';
import type { TrackControlsHandle, TrackControlLayout } from './track-controls.ts';

export interface ViewerConfig {
  readonly width: number;
  readonly panelHeight: number;
  readonly panelGap: number;
  readonly margin: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
}

const DEFAULT_CONFIG: ViewerConfig = {
  width: 960,
  panelHeight: 120,
  panelGap: 40,
  margin: { top: 20, right: 20, bottom: 20, left: 120 },
};

function assignLcbColors(lcbs: readonly Lcb[]): readonly string[] {
  return lcbs.map((_, i) => {
    const hue = (i * 60 + (i % 6) * 30) % 360;
    return d3.hsl(hue, 0.7, 0.5).formatHex();
  });
}

/** Active viewer handle for cleanup and interaction */
export interface ViewerHandle {
  readonly svg: SVGSVGElement;
  readonly zoomHandle: ZoomHandle;
  readonly cursorHandle: CursorHandle;
  readonly toolbarHandle: NavigationToolbarHandle;
  readonly trackControlsHandle: TrackControlsHandle;
  readonly getState: () => ViewerState;
  readonly destroy: () => void;
}

/** Compute total SVG height accounting for hidden genomes */
function computeTotalHeight(
  state: ViewerState,
  config: ViewerConfig,
): number {
  const { panelHeight, panelGap, margin } = config;
  const genomeCount = state.alignment.genomes.length;
  let height = margin.top + margin.bottom;
  for (let di = 0; di < genomeCount; di++) {
    const dataIndex = state.genomeOrder[di]!;
    const isHidden = state.hiddenGenomes.has(dataIndex);
    height += isHidden ? HIDDEN_PANEL_HEIGHT : panelHeight;
    if (di < genomeCount - 1) height += panelGap;
  }
  return height;
}

export function renderAlignment(
  container: HTMLElement,
  alignment: XmfaAlignment,
  config: ViewerConfig = DEFAULT_CONFIG,
): ViewerHandle {
  const { lcbs } = alignment;
  const { width, margin } = config;
  const colors = assignLcbColors(lcbs);

  // Clean up previous viewer
  d3.select(container).select('.alignment-wrapper').remove();
  d3.select(container).select('svg').remove();

  // Mutable state — held in closure for D3 callbacks (intentional exception to immutability rule)
  let viewerState = createViewerState(alignment, config);

  const totalHeight = computeTotalHeight(viewerState, config);

  // Wrapper for SVG + track controls (position reference for absolute controls)
  const wrapper = document.createElement('div');
  wrapper.className = 'alignment-wrapper';
  wrapper.style.position = 'relative';
  container.appendChild(wrapper);

  const svg = d3
    .select(wrapper)
    .append('svg')
    .attr('width', width)
    .attr('height', totalHeight)
    .attr('viewBox', `0 0 ${width} ${totalHeight}`);

  const root = svg
    .append('g')
    .attr('class', 'alignment-root')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  renderAllPanels(root, viewerState, lcbs, colors, config);
  renderConnectingLines(root, viewerState, lcbs, colors, config);

  const svgNode = svg.node()!;

  const zoomHandle = setupZoom(svgNode, viewerState, (transform) => {
    viewerState = applyZoomTransform(viewerState, transform);
    updatePanelsOnZoom(root, viewerState, lcbs, colors, config);
    cursorHandle.update(viewerState);
  });

  const cursorHandle = setupCursor(svgNode, viewerState, config, (sourceGenomeIndex, position) => {
    alignOnPosition(svgNode, zoomHandle, viewerState, config, sourceGenomeIndex, position);
  });

  const toolbarHandle = createNavigationToolbar(container, {
    onZoomIn: () => zoomHandle.zoomIn(),
    onZoomOut: () => zoomHandle.zoomOut(),
    onPanLeft: () => zoomHandle.panLeft(),
    onPanRight: () => zoomHandle.panRight(),
    onReset: () => zoomHandle.reset(),
  });

  function buildTrackControlLayout(): TrackControlLayout {
    const genomeCount = viewerState.alignment.genomes.length;
    const panelYPositions: number[] = [];
    const panelHeights: number[] = [];
    for (let di = 0; di < genomeCount; di++) {
      panelYPositions.push(computePanelY(viewerState, config, di));
      const dataIndex = viewerState.genomeOrder[di]!;
      const isHidden = viewerState.hiddenGenomes.has(dataIndex);
      panelHeights.push(isHidden ? HIDDEN_PANEL_HEIGHT : config.panelHeight);
    }
    return { panelYPositions, panelHeights, marginTop: config.margin.top, marginLeft: config.margin.left };
  }

  function rerenderPanels(): void {
    root.selectAll('*').remove();
    const newHeight = computeTotalHeight(viewerState, config);
    svg.attr('height', newHeight).attr('viewBox', `0 0 ${width} ${newHeight}`);
    renderAllPanels(root, viewerState, lcbs, colors, config);
    renderConnectingLines(root, viewerState, lcbs, colors, config);
    cursorHandle.rebuildOverlays(viewerState);
  }

  function findReferenceDisplayIndex(): number {
    return viewerState.genomeOrder.indexOf(viewerState.referenceGenomeIndex);
  }

  function buildHiddenDisplayIndices(): ReadonlySet<number> {
    const hidden = new Set<number>();
    for (let di = 0; di < viewerState.genomeOrder.length; di++) {
      if (viewerState.hiddenGenomes.has(viewerState.genomeOrder[di]!)) {
        hidden.add(di);
      }
    }
    return hidden;
  }

  const trackCallbacks = {
    onMoveUp: (displayIndex: number) => {
      viewerState = moveGenomeUp(viewerState, displayIndex);
      rebuildTrackControls();
      zoomHandle.reset();
      rerenderPanels();
    },
    onMoveDown: (displayIndex: number) => {
      viewerState = moveGenomeDown(viewerState, displayIndex);
      rebuildTrackControls();
      zoomHandle.reset();
      rerenderPanels();
    },
    onSetReference: (displayIndex: number) => {
      const dataIndex = viewerState.genomeOrder[displayIndex]!;
      viewerState = setReferenceGenome(viewerState, dataIndex);
      rebuildTrackControls();
      rerenderPanels();
    },
    onToggleVisibility: (displayIndex: number) => {
      const dataIndex = viewerState.genomeOrder[displayIndex]!;
      if (viewerState.hiddenGenomes.has(dataIndex)) {
        viewerState = showGenome(viewerState, dataIndex);
      } else {
        viewerState = hideGenome(viewerState, dataIndex);
      }
      rebuildTrackControls();
      rerenderPanels();
    },
  };

  let trackControlsHandle = createTrackControls(
    wrapper,
    alignment.genomes.length,
    findReferenceDisplayIndex(),
    buildHiddenDisplayIndices(),
    trackCallbacks,
    buildTrackControlLayout(),
  );

  function rebuildTrackControls(): void {
    trackControlsHandle.destroy();
    trackControlsHandle = createTrackControls(
      wrapper,
      alignment.genomes.length,
      findReferenceDisplayIndex(),
      buildHiddenDisplayIndices(),
      trackCallbacks,
      buildTrackControlLayout(),
    );
  }

  return {
    svg: svgNode,
    zoomHandle,
    cursorHandle,
    toolbarHandle,
    trackControlsHandle,
    getState: () => viewerState,
    destroy: () => {
      trackControlsHandle.destroy();
      toolbarHandle.destroy();
      zoomHandle.destroy();
      cursorHandle.destroy();
      wrapper.remove();
    },
  };
}

/** Render all genome panels in display order, accounting for hidden genomes */
function renderAllPanels(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  state: ViewerState,
  lcbs: readonly Lcb[],
  colors: readonly string[],
  config: ViewerConfig,
): void {
  const { panelHeight } = config;
  const innerWidth = state.innerWidth;
  const genomeCount = state.alignment.genomes.length;

  for (let di = 0; di < genomeCount; di++) {
    const dataIndex = state.genomeOrder[di]!;
    const genome = state.alignment.genomes[dataIndex]!;
    const panelY = computePanelY(state, config, di);
    const isHidden = state.hiddenGenomes.has(dataIndex);

    if (isHidden) {
      renderHiddenPanel(root, genome, panelY, dataIndex, innerWidth);
    } else {
      renderGenomePanel(root, genome, panelY, dataIndex, lcbs, colors, panelHeight, innerWidth, state.referenceGenomeIndex);
    }
  }
}

function renderGenomePanel(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  genome: { readonly name: string; readonly length: number },
  panelY: number,
  genomeDataIndex: number,
  lcbs: readonly Lcb[],
  colors: readonly string[],
  panelHeight: number,
  innerWidth: number,
  referenceGenomeIndex: number,
): void {
  const xScale = d3
    .scaleLinear()
    .domain([1, genome.length])
    .range([0, innerWidth]);

  const panel = root
    .append('g')
    .attr('class', 'genome-panel')
    .attr('data-genome-data-index', String(genomeDataIndex))
    .attr('transform', `translate(0,${panelY})`);

  panel
    .append('text')
    .attr('x', -10)
    .attr('y', panelHeight / 2)
    .attr('text-anchor', 'end')
    .attr('dominant-baseline', 'middle')
    .attr('class', 'genome-label')
    .text(genome.name);

  panel
    .append('rect')
    .attr('class', 'genome-background')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', innerWidth)
    .attr('height', panelHeight)
    .attr('fill', '#f8f8f8')
    .attr('stroke', '#ccc');

  const centerY = panelHeight / 2;
  panel
    .append('line')
    .attr('class', 'center-line')
    .attr('x1', 0)
    .attr('x2', innerWidth)
    .attr('y1', centerY)
    .attr('y2', centerY)
    .attr('stroke', '#999')
    .attr('stroke-width', 1);

  renderRuler(panel, xScale, panelHeight, innerWidth);
  renderLcbBlocks(panel, genomeDataIndex, lcbs, colors, xScale, panelHeight, centerY, referenceGenomeIndex);
}

/** Render a collapsed bar for a hidden genome */
function renderHiddenPanel(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  genome: { readonly name: string },
  panelY: number,
  genomeDataIndex: number,
  innerWidth: number,
): void {
  const panel = root
    .append('g')
    .attr('class', 'genome-panel genome-panel-hidden')
    .attr('data-genome-data-index', String(genomeDataIndex))
    .attr('transform', `translate(0,${panelY})`);

  panel
    .append('text')
    .attr('x', -10)
    .attr('y', HIDDEN_PANEL_HEIGHT / 2)
    .attr('text-anchor', 'end')
    .attr('dominant-baseline', 'middle')
    .attr('class', 'genome-label genome-label-hidden')
    .attr('font-style', 'italic')
    .attr('fill', '#999')
    .text(genome.name);

  panel
    .append('rect')
    .attr('class', 'genome-background-hidden')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', innerWidth)
    .attr('height', HIDDEN_PANEL_HEIGHT)
    .attr('fill', '#eee')
    .attr('stroke', '#ccc');
}

function renderLcbBlocks(
  panel: d3.Selection<SVGGElement, unknown, null, undefined>,
  genomeDataIndex: number,
  lcbs: readonly Lcb[],
  colors: readonly string[],
  xScale: d3.ScaleLinear<number, number>,
  panelHeight: number,
  centerY: number,
  referenceGenomeIndex: number,
): void {
  for (let li = 0; li < lcbs.length; li++) {
    const lcb = lcbs[li]!;
    const left = lcb.left[genomeDataIndex];
    const right = lcb.right[genomeDataIndex];
    if (left === undefined || right === undefined || left === 0) continue;

    const reverse = isVisuallyReverse(lcb, genomeDataIndex, referenceGenomeIndex);
    const x = xScale(left);
    const blockWidth = xScale(right) - xScale(left);
    const blockHeight = panelHeight / 2 - 4;
    const y = reverse ? centerY + 2 : centerY - blockHeight - 2;

    panel
      .append('rect')
      .attr('class', 'lcb-block')
      .attr('data-lcb-index', String(li))
      .attr('data-genome-index', String(genomeDataIndex))
      .attr('x', x)
      .attr('y', y)
      .attr('width', Math.max(blockWidth, 2))
      .attr('height', blockHeight)
      .attr('fill', colors[li]!)
      .attr('fill-opacity', 0.6)
      .attr('stroke', colors[li]!)
      .attr('stroke-width', 1);
  }
}

function renderRuler(
  panel: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: d3.ScaleLinear<number, number>,
  panelHeight: number,
  innerWidth: number,
): void {
  const tickCount = Math.min(10, Math.floor(innerWidth / 80));
  const axis = d3.axisBottom(xScale).ticks(tickCount).tickFormat(d3.format('~s'));

  panel
    .append('g')
    .attr('class', 'ruler')
    .attr('transform', `translate(0,${panelHeight})`)
    .call(axis);
}

function renderConnectingLines(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  state: ViewerState,
  lcbs: readonly Lcb[],
  colors: readonly string[],
  config: ViewerConfig,
): void {
  const innerWidth = state.innerWidth;
  const visibleOrder = getVisibleGenomeOrder(state);

  for (let vi = 0; vi < visibleOrder.length - 1; vi++) {
    const topDataIndex = visibleOrder[vi]!;
    const bottomDataIndex = visibleOrder[vi + 1]!;
    const topGenome = state.alignment.genomes[topDataIndex]!;
    const bottomGenome = state.alignment.genomes[bottomDataIndex]!;

    // Find display indices for Y computation
    const topDisplayIndex = state.genomeOrder.indexOf(topDataIndex);
    const bottomDisplayIndex = state.genomeOrder.indexOf(bottomDataIndex);
    const topPanelY = computePanelY(state, config, topDisplayIndex);
    const bottomPanelY = computePanelY(state, config, bottomDisplayIndex);
    const topY = topPanelY + config.panelHeight;
    const bottomY = bottomPanelY;

    const topScale = d3
      .scaleLinear()
      .domain([1, topGenome.length])
      .range([0, innerWidth]);
    const bottomScale = d3
      .scaleLinear()
      .domain([1, bottomGenome.length])
      .range([0, innerWidth]);

    for (let li = 0; li < lcbs.length; li++) {
      const lcb = lcbs[li]!;
      const topLeft = lcb.left[topDataIndex];
      const topRight = lcb.right[topDataIndex];
      const bottomLeft = lcb.left[bottomDataIndex];
      const bottomRight = lcb.right[bottomDataIndex];

      if (
        !topLeft || !topRight || !bottomLeft || !bottomRight
      ) {
        continue;
      }

      const tl = topScale(topLeft);
      const tr = topScale(topRight);
      const bl = bottomScale(bottomLeft);
      const br = bottomScale(bottomRight);

      const path = `M${tl},${topY} L${bl},${bottomY} L${br},${bottomY} L${tr},${topY} Z`;

      root
        .append('path')
        .attr('class', 'lcb-connector')
        .attr('data-lcb-index', String(li))
        .attr('data-genome-top-data', String(topDataIndex))
        .attr('data-genome-bottom-data', String(bottomDataIndex))
        .attr('d', path)
        .attr('fill', colors[li]!)
        .attr('fill-opacity', 0.2)
        .attr('stroke', colors[li]!)
        .attr('stroke-width', 0.5);
    }
  }
}

/**
 * Update all panels when the zoom transform changes.
 * Rescales LCB blocks, rulers, and connecting lines.
 */
function updatePanelsOnZoom(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  state: ViewerState,
  lcbs: readonly Lcb[],
  colors: readonly string[],
  config: ViewerConfig,
): void {
  const genomeCount = state.alignment.genomes.length;
  for (let di = 0; di < genomeCount; di++) {
    const dataIndex = state.genomeOrder[di]!;
    if (state.hiddenGenomes.has(dataIndex)) continue;

    const scale = getZoomedScale(state, dataIndex);
    const tickCount = Math.min(10, Math.floor(state.innerWidth / 80));
    const axis = d3.axisBottom(scale).ticks(tickCount).tickFormat(d3.format('~s'));

    // Update ruler
    root.select(`.genome-panel[data-genome-data-index="${dataIndex}"] .ruler`).call(axis as never);

    // Update LCB blocks for this genome
    root
      .selectAll(`.lcb-block[data-genome-index="${dataIndex}"]`)
      .each(function () {
        const el = d3.select(this);
        const li = Number(el.attr('data-lcb-index'));
        const lcb = lcbs[li];
        if (!lcb) return;

        const left = lcb.left[dataIndex];
        const right = lcb.right[dataIndex];
        if (!left || !right) return;

        el.attr('x', scale(left)).attr('width', Math.max(scale(right) - scale(left), 2));
      });
  }

  // Update connecting lines
  updateConnectingLinesOnZoom(root, state, lcbs, config);
}

/** Update connecting line trapezoids when zoom changes */
function updateConnectingLinesOnZoom(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  state: ViewerState,
  lcbs: readonly Lcb[],
  config: ViewerConfig,
): void {
  root.selectAll('.lcb-connector').each(function () {
    const el = d3.select(this);
    const li = Number(el.attr('data-lcb-index'));
    const topDataIndex = Number(el.attr('data-genome-top-data'));
    const bottomDataIndex = Number(el.attr('data-genome-bottom-data'));
    const lcb = lcbs[li];
    if (!lcb) return;

    const topLeft = lcb.left[topDataIndex];
    const topRight = lcb.right[topDataIndex];
    const bottomLeft = lcb.left[bottomDataIndex];
    const bottomRight = lcb.right[bottomDataIndex];

    if (!topLeft || !topRight || !bottomLeft || !bottomRight) return;

    const topScale = getZoomedScale(state, topDataIndex);
    const bottomScale = getZoomedScale(state, bottomDataIndex);
    const topDisplayIndex = state.genomeOrder.indexOf(topDataIndex);
    const bottomDisplayIndex = state.genomeOrder.indexOf(bottomDataIndex);
    const topY = computePanelY(state, config, topDisplayIndex) + config.panelHeight;
    const bottomY = computePanelY(state, config, bottomDisplayIndex);

    const tl = topScale(topLeft);
    const tr = topScale(topRight);
    const bl = bottomScale(bottomLeft);
    const br = bottomScale(bottomRight);

    el.attr('d', `M${tl},${topY} L${bl},${bottomY} L${br},${bottomY} L${tr},${topY} Z`);
  });
}

/**
 * Click-to-align: center all genome panels on the homologous position.
 * Calculates the position relative to the center of the view and pans.
 */
function alignOnPosition(
  svg: SVGSVGElement,
  zoomHandle: ZoomHandle,
  state: ViewerState,
  config: ViewerConfig,
  sourceGenomeIndex: number,
  position: number,
): void {
  const homologous = findHomologousPositions(
    state.alignment,
    sourceGenomeIndex,
    position,
  );

  if (homologous.length === 0) return;

  // Find the source position in pixels and center the view on it
  const sourcePixel = positionToPixel(state, sourceGenomeIndex, position);
  const centerX = state.innerWidth / 2;
  const offset = centerX - sourcePixel;

  const currentTransform = d3.zoomTransform(svg);
  const newTransform = d3.zoomIdentity
    .translate(currentTransform.x + offset, 0)
    .scale(currentTransform.k);

  d3.select<SVGSVGElement, unknown>(svg)
    .transition()
    .duration(300)
    .call(zoomHandle.zoomBehavior.transform, newTransform);
}
