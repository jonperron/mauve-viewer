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
import { setupAnnotations } from './annotations.ts';
import type { AnnotationsHandle, AnnotationMap } from './annotations.ts';
import { createFeatureTooltip } from './feature-tooltip.ts';
import type { FeatureTooltipHandle } from './feature-tooltip.ts';
import { createOptionsPanel } from './options-panel.ts';
import type { OptionsPanelHandle, OptionsState } from './options-panel.ts';
import { applyColorScheme, getAvailableSchemes, DEFAULT_COLOR_SCHEME_ID } from './color-schemes.ts';
import type { ColorSchemeId } from './color-schemes.ts';
import { createColorSchemeMenu } from './color-scheme-menu.ts';
import type { ColorSchemeMenuHandle } from './color-scheme-menu.ts';
import { setupRegionSelection } from './region-selection.ts';
import type { RegionSelectionHandle } from './region-selection.ts';
import { setupExportShortcut, createImageExportDialog } from './image-export.ts';
import { setupPrintSupport, printAlignment } from './print-support.ts';
import { setupNavigatorShortcut } from './sequence-navigator.ts';

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

/** Legacy layout constants matching the original JavaScript Mauve viewer */
export const Y_POS_OFFSET = 30;
export const LCB_HEIGHT = 22;

const DEFAULT_CONFIG: ViewerConfig = {
  width: 1000,
  panelHeight: Y_POS_OFFSET + 2 * LCB_HEIGHT,
  panelGap: 140 - (Y_POS_OFFSET + 2 * LCB_HEIGHT),
  margin: { top: 20, right: 20, bottom: 20, left: 120 },
};

/** Active viewer handle for cleanup and interaction */
export interface ViewerHandle {
  readonly svg: SVGSVGElement;
  readonly zoomHandle: ZoomHandle;
  readonly cursorHandle: CursorHandle;
  readonly toolbarHandle: NavigationToolbarHandle;
  readonly trackControlsHandle: TrackControlsHandle;
  readonly annotationsHandle: AnnotationsHandle | undefined;
  readonly optionsPanelHandle: OptionsPanelHandle;
  readonly colorSchemeMenuHandle: ColorSchemeMenuHandle;
  readonly regionSelectionHandle: RegionSelectionHandle;
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

/** Get a genome display label. With genome ID, shows the full filename; without, strips the extension. */
export function getGenomeLabel(name: string, showGenomeId: boolean): string {
  if (showGenomeId) return name;
  const dotIndex = name.lastIndexOf('.');
  return dotIndex > 0 ? name.slice(0, dotIndex) : name;
}

export function renderAlignment(
  container: HTMLElement,
  alignment: XmfaAlignment,
  config: ViewerConfig = DEFAULT_CONFIG,
  annotations?: AnnotationMap,
): ViewerHandle {
  const { lcbs } = alignment;
  const { width, margin } = config;
  // Mutable color state — held in closure for color scheme callbacks (intentional exception to immutability rule)
  let currentSchemeId: ColorSchemeId = DEFAULT_COLOR_SCHEME_ID;
  let colors = applyColorScheme(currentSchemeId, alignment);

  // Clean up previous viewer
  d3.select(container).select('.alignment-wrapper').remove();
  d3.select(container).select('svg').remove();

  // Mutable state — held in closure for D3 callbacks (intentional exception to immutability rule)
  let viewerState = createViewerState(alignment, config);
  // Mutable options state — held in closure for options callbacks (intentional exception to immutability rule)
  let optionsState: OptionsState = { showGenomeId: true, showConnectingLines: true, showFeatures: true, showContigs: true };

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
    .attr('viewBox', `0 0 ${width} ${totalHeight}`)
    .style('overflow', 'hidden')
    .style('display', 'block');

  const root = svg
    .append('g')
    .attr('class', 'alignment-root')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  renderAllPanels(root, viewerState, lcbs, colors, config, optionsState.showGenomeId);
  renderConnectingLines(root, viewerState, lcbs, colors, config);

  const svgNode = svg.node()!;

  // Feature tooltip (shared across all panels)
  const tooltipHandle: FeatureTooltipHandle | undefined = annotations?.size
    ? createFeatureTooltip()
    : undefined;

  // Annotations
  let annotationsHandle: AnnotationsHandle | undefined;
  if (annotations?.size) {
    annotationsHandle = setupAnnotations(
      root,
      viewerState,
      config,
      annotations,
      (feature, event) => tooltipHandle?.show(feature, event),
      () => tooltipHandle?.hide(),
      (feature, event) => tooltipHandle?.showDetails(feature, event),
    );
  }

  const zoomHandle = setupZoom(svgNode, viewerState, (transform) => {
    viewerState = applyZoomTransform(viewerState, transform);
    updatePanelsOnZoom(root, viewerState, lcbs, colors, config, optionsState.showConnectingLines);
    annotationsHandle?.update(viewerState, {
      showFeatures: optionsState.showFeatures,
      showContigs: optionsState.showContigs,
    });
    cursorHandle.update(viewerState);
    regionSelectionHandle.update(viewerState);
  });

  const cursorHandle = setupCursor(svgNode, viewerState, config, (sourceGenomeIndex, position) => {
    alignOnPosition(svgNode, zoomHandle, viewerState, config, sourceGenomeIndex, position);
  });

  const regionSelectionHandle = setupRegionSelection(svgNode, viewerState, config);

  // Controls bar: groups navigation toolbar and options panel on one line
  const controlsBar = document.createElement('div');
  controlsBar.className = 'viewer-controls-bar';
  container.insertBefore(controlsBar, container.firstChild);

  const toolbarHandle = createNavigationToolbar(controlsBar, {
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
    renderAllPanels(root, viewerState, lcbs, colors, config, optionsState.showGenomeId);
    if (optionsState.showConnectingLines) {
      renderConnectingLines(root, viewerState, lcbs, colors, config);
    }
    annotationsHandle?.update(viewerState, {
      showFeatures: optionsState.showFeatures,
      showContigs: optionsState.showContigs,
    });
    cursorHandle.rebuildOverlays(viewerState);
    regionSelectionHandle.rebuildOverlays(viewerState);
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

  /** Update all genome labels to reflect the current showGenomeId option */
  function updateGenomeLabels(): void {
    for (let di = 0; di < viewerState.alignment.genomes.length; di++) {
      const dataIndex = viewerState.genomeOrder[di]!;
      const genome = viewerState.alignment.genomes[dataIndex]!;
      const label = getGenomeLabel(genome.name, optionsState.showGenomeId);
      root.select(`.genome-panel[data-genome-data-index="${dataIndex}"] .genome-label`)
        .text(label);
    }
  }

  const optionsPanelHandle = createOptionsPanel(controlsBar, {
    onToggleGenomeId: (enabled) => {
      optionsState = { ...optionsState, showGenomeId: enabled };
      updateGenomeLabels();
    },
    onToggleConnectingLines: (enabled) => {
      optionsState = { ...optionsState, showConnectingLines: enabled };
      if (enabled) {
        renderConnectingLines(root, viewerState, lcbs, colors, config);
        updateConnectingLinesOnZoom(root, viewerState, lcbs, config);
      } else {
        root.selectAll('.lcb-lines').remove();
      }
    },
    onToggleFeatures: (enabled) => {
      optionsState = { ...optionsState, showFeatures: enabled };
      annotationsHandle?.update(viewerState, {
        showFeatures: enabled,
        showContigs: optionsState.showContigs,
      });
    },
    onToggleContigs: (enabled) => {
      optionsState = { ...optionsState, showContigs: enabled };
      annotationsHandle?.update(viewerState, {
        showFeatures: optionsState.showFeatures,
        showContigs: enabled,
      });
    },
    onExportImage: () => {
      createImageExportDialog(container, svgNode);
    },
    onPrint: () => {
      printAlignment(svgNode);
    },
  });

  const availableSchemes = getAvailableSchemes(alignment);
  const colorSchemeMenuHandle = createColorSchemeMenu(
    controlsBar,
    availableSchemes,
    currentSchemeId,
    {
      onSchemeChange: (schemeId) => {
        currentSchemeId = schemeId;
        colors = applyColorScheme(schemeId, alignment);
        rerenderPanels();
      },
    },
  );

  // Image export shortcut (Ctrl+E)
  const cleanupExport = setupExportShortcut(svgNode, () => container);

  // Print support (Ctrl+P)
  const cleanupPrint = setupPrintSupport(svgNode);

  // Sequence navigator shortcut (Ctrl+I) — only if annotations are available
  const genomeNames = alignment.genomes.map((g) => g.name);
  const cleanupNavigator = annotations?.size
    ? setupNavigatorShortcut(
        () => container,
        annotations,
        genomeNames,
        (genomeIndex, start, end) => {
          // Navigate to the midpoint of the feature
          const midpoint = Math.round((start + end) / 2);
          alignOnPosition(svgNode, zoomHandle, viewerState, config, genomeIndex, midpoint);
        },
        (genomeIndex, position) => {
          alignOnPosition(svgNode, zoomHandle, viewerState, config, genomeIndex, position);
        },
      )
    : undefined;

  return {
    svg: svgNode,
    zoomHandle,
    cursorHandle,
    toolbarHandle,
    trackControlsHandle,
    annotationsHandle,
    optionsPanelHandle,
    colorSchemeMenuHandle,
    regionSelectionHandle,
    getState: () => viewerState,
    destroy: () => {
      cleanupNavigator?.();
      cleanupPrint();
      cleanupExport();
      regionSelectionHandle.destroy();
      annotationsHandle?.destroy();
      tooltipHandle?.destroy();
      colorSchemeMenuHandle.destroy();
      optionsPanelHandle.destroy();
      trackControlsHandle.destroy();
      toolbarHandle.destroy();
      controlsBar.remove();
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
  showGenomeId: boolean,
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
      renderHiddenPanel(root, genome, panelY, dataIndex, innerWidth, showGenomeId);
    } else {
      renderGenomePanel(root, genome, panelY, dataIndex, lcbs, colors, panelHeight, innerWidth, state.referenceGenomeIndex, showGenomeId);
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
  _panelHeight: number,
  innerWidth: number,
  referenceGenomeIndex: number,
  showGenomeId: boolean,
): void {
  const xScale = d3
    .scaleLinear()
    .domain([0, genome.length])
    .range([1, innerWidth + 1]);

  const panel = root
    .append('g')
    .attr('class', 'genome-panel')
    .attr('data-genome-data-index', String(genomeDataIndex))
    .attr('transform', `translate(0,${panelY})`);

  panel
    .append('text')
    .attr('x', 0)
    .attr('y', -3)
    .attr('class', 'genome-label')
    .attr('font-family', 'sans-serif')
    .attr('font-size', '10px')
    .attr('fill', '#888')
    .text(getGenomeLabel(genome.name, showGenomeId));

  panel.append('g').attr('class', 'regions');

  renderRuler(panel, xScale);
  renderLcbBlocks(panel, genomeDataIndex, lcbs, colors, xScale, referenceGenomeIndex);
}

/** Render a collapsed bar for a hidden genome */
function renderHiddenPanel(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  genome: { readonly name: string },
  panelY: number,
  genomeDataIndex: number,
  innerWidth: number,
  showGenomeId: boolean,
): void {
  const panel = root
    .append('g')
    .attr('class', 'genome-panel genome-panel-hidden')
    .attr('data-genome-data-index', String(genomeDataIndex))
    .attr('transform', `translate(0,${panelY})`);

  panel
    .append('text')
    .attr('x', 10)
    .attr('y', HIDDEN_PANEL_HEIGHT / 2 - 2)
    .attr('class', 'genome-label genome-label-hidden')
    .attr('font-family', 'sans-serif')
    .attr('font-size', '10px')
    .attr('fill', '#222')
    .text(getGenomeLabel(genome.name, showGenomeId));

  panel
    .append('rect')
    .attr('class', 'genome-background-hidden')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', innerWidth)
    .attr('height', 20)
    .attr('fill', '#aaa');
}

function renderLcbBlocks(
  panel: d3.Selection<SVGGElement, unknown, null, undefined>,
  genomeDataIndex: number,
  lcbs: readonly Lcb[],
  colors: readonly string[],
  xScale: d3.ScaleLinear<number, number>,
  referenceGenomeIndex: number,
): void {
  const regionGroup = panel.select<SVGGElement>('.regions');

  for (let li = 0; li < lcbs.length; li++) {
    const lcb = lcbs[li]!;
    const left = lcb.left[genomeDataIndex];
    const right = lcb.right[genomeDataIndex];
    if (left === undefined || right === undefined || left === 0) continue;

    const reverse = isVisuallyReverse(lcb, genomeDataIndex, referenceGenomeIndex);
    const x = xScale(left);
    const blockWidth = xScale(right) - xScale(left);
    const y = reverse ? Y_POS_OFFSET + LCB_HEIGHT : Y_POS_OFFSET;

    regionGroup
      .append('rect')
      .attr('class', 'lcb-block')
      .attr('data-lcb-index', String(li))
      .attr('data-genome-index', String(genomeDataIndex))
      .attr('x', x)
      .attr('y', y)
      .attr('width', Math.max(blockWidth, 2))
      .attr('height', LCB_HEIGHT)
      .attr('fill', colors[li]!);
  }
}

function renderRuler(
  panel: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: d3.ScaleLinear<number, number>,
): void {
  const axis = d3.axisBottom(xScale)
    .ticks(5)
    .tickSize(10)
    .tickFormat(d3.format('d'));

  panel
    .append('g')
    .attr('class', 'ruler')
    .call(axis);
}

/** Compute midpoint line path for an LCB across visible genomes (legacy backbone style) */
function computeConnectorPath(
  lcb: Lcb,
  visibleOrder: readonly number[],
  state: ViewerState,
  config: ViewerConfig,
  getScale: (dataIndex: number) => d3.ScaleLinear<number, number>,
): string | undefined {
  const lineGen = d3.line<[number, number]>()
    .x(d => d[0])
    .y(d => d[1]);

  const points: [number, number][] = [];

  for (const dataIndex of visibleOrder) {
    const left = lcb.left[dataIndex];
    const right = lcb.right[dataIndex];
    if (!left || !right) continue;

    const scale = getScale(dataIndex);
    const midX = scale(left) + (scale(right) - scale(left)) / 2;
    const displayIndex = state.genomeOrder.indexOf(dataIndex);
    const panelY = computePanelY(state, config, displayIndex);
    const reverse = isVisuallyReverse(lcb, dataIndex, state.referenceGenomeIndex);
    const blockY = reverse ? Y_POS_OFFSET + LCB_HEIGHT : Y_POS_OFFSET;
    const midY = panelY + blockY + LCB_HEIGHT / 2;

    points.push([midX, midY]);
  }

  if (points.length < 2) return undefined;
  return lineGen(points) ?? undefined;
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

  const linesGroup = root.insert('g', ':first-child')
    .attr('class', 'lcb-lines');

  const makeScale = (dataIndex: number): d3.ScaleLinear<number, number> => {
    const genome = state.alignment.genomes[dataIndex]!;
    return d3.scaleLinear()
      .domain([0, genome.length])
      .range([1, innerWidth + 1]);
  };

  for (let li = 0; li < lcbs.length; li++) {
    const lcb = lcbs[li]!;
    const pathD = computeConnectorPath(lcb, visibleOrder, state, config, makeScale);
    if (!pathD) continue;

    linesGroup
      .append('path')
      .attr('class', 'lcb-connector')
      .attr('data-lcb-index', String(li))
      .attr('d', pathD)
      .attr('stroke', colors[li]!)
      .attr('stroke-width', 1)
      .attr('fill', 'none');
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
  showConnectingLines: boolean,
): void {
  const genomeCount = state.alignment.genomes.length;
  for (let di = 0; di < genomeCount; di++) {
    const dataIndex = state.genomeOrder[di]!;
    if (state.hiddenGenomes.has(dataIndex)) continue;

    const scale = getZoomedScale(state, dataIndex);
    const axis = d3.axisBottom(scale).ticks(5).tickSize(10).tickFormat(d3.format('d'));

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

  // Update connecting lines only if visible
  if (showConnectingLines) {
    updateConnectingLinesOnZoom(root, state, lcbs, config);
  }
}

/** Update connecting midpoint lines when zoom changes */
function updateConnectingLinesOnZoom(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  state: ViewerState,
  lcbs: readonly Lcb[],
  config: ViewerConfig,
): void {
  const visibleOrder = getVisibleGenomeOrder(state);
  const getScale = (dataIndex: number) => getZoomedScale(state, dataIndex);

  root.selectAll('.lcb-connector').each(function () {
    const el = d3.select(this);
    const li = Number(el.attr('data-lcb-index'));
    const lcb = lcbs[li];
    if (!lcb) return;

    const pathD = computeConnectorPath(lcb, visibleOrder, state, config, getScale);
    if (pathD) {
      el.attr('d', pathD);
    }
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
