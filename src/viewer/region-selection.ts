import * as d3 from 'd3';
import type { ViewerConfig } from './alignment-viewer.ts';
import type { ViewerState } from './viewer-state.ts';
import {
  pixelToPosition,
  getVisibleGenomeOrder,
  computePanelY,
} from './viewer-state.ts';

/** Selected region in a genome panel */
export interface SelectedRegion {
  readonly genomeIndex: number;
  readonly start: number;
  readonly end: number;
}

/** Callback invoked when a region is selected */
export type RegionSelectCallback = (region: SelectedRegion) => void;

/** Handle for region selection lifecycle */
export interface RegionSelectionHandle {
  readonly update: (state: ViewerState) => void;
  readonly rebuildOverlays: (state: ViewerState) => void;
  readonly clearSelection: () => void;
  readonly getSelection: () => SelectedRegion | undefined;
  readonly destroy: () => void;
}

const SELECTION_FILL = 'rgba(173, 216, 230, 0.35)';
const SELECTION_STROKE = '#4a90d9';
const SELECTION_STROKE_WIDTH = 1;

/**
 * Set up Shift+click+drag region selection on the alignment SVG.
 * Renders a highlighted rectangle on the source panel and matching
 * highlights on all other visible panels at homologous positions.
 */
export function setupRegionSelection(
  svg: SVGSVGElement,
  state: ViewerState,
  config: ViewerConfig,
  onSelect?: RegionSelectCallback,
): RegionSelectionHandle {
  const svgSelection = d3.select(svg);

  // Mutable closure — held for D3 event callbacks (intentional exception to immutability rule)
  let currentState = state;
  let currentSelection: SelectedRegion | undefined;

  // Selection highlight group
  const selectionGroup = svgSelection
    .append('g')
    .attr('class', 'region-selection-group')
    .attr('transform', `translate(${config.margin.left},${config.margin.top})`)
    .style('pointer-events', 'none');

  // Drag state
  let isDragging = false;
  let dragGenomeIndex = -1;
  let dragStartX = 0;
  let dragCurrentX = 0;

  // Selection overlay for capturing Shift+drag events — sits above the cursor overlays
  const dragOverlay = svgSelection
    .append('rect')
    .attr('class', 'region-drag-overlay')
    .attr('x', config.margin.left)
    .attr('y', config.margin.top)
    .attr('width', currentState.innerWidth)
    .attr('height', computeOverlayHeight())
    .attr('fill', 'transparent')
    .style('pointer-events', 'none');

  function computeOverlayHeight(): number {
    const genomeCount = currentState.alignment.genomes.length;
    if (genomeCount === 0) return 0;
    const lastDi = genomeCount - 1;
    const lastY = computePanelY(currentState, config, lastDi);
    const lastDataIndex = currentState.genomeOrder[lastDi] ?? 0;
    const lastHeight = currentState.hiddenGenomes.has(lastDataIndex) ? 35 : config.panelHeight;
    return lastY + lastHeight;
  }

  function findGenomeAtY(mouseY: number): number {
    const adjustedY = mouseY - config.margin.top;
    const genomeCount = currentState.alignment.genomes.length;
    for (let di = 0; di < genomeCount; di++) {
      const dataIndex = currentState.genomeOrder[di]!;
      if (currentState.hiddenGenomes.has(dataIndex)) continue;
      const panelY = computePanelY(currentState, config, di);
      if (adjustedY >= panelY && adjustedY < panelY + config.panelHeight) {
        return dataIndex;
      }
    }
    return -1;
  }

  // Listen for shift+mousedown on the SVG
  function onMouseDown(event: MouseEvent): void {
    if (!event.shiftKey) return;

    const genomeIndex = findGenomeAtY(event.offsetY);
    if (genomeIndex < 0) return;

    event.preventDefault();
    event.stopPropagation();

    isDragging = true;
    dragGenomeIndex = genomeIndex;
    const [mouseX] = d3.pointer(event, svgSelection.node());
    dragStartX = mouseX - config.margin.left;
    dragCurrentX = dragStartX;

    // Enable pointer events on drag overlay to capture mouse
    dragOverlay.style('pointer-events', 'all').style('cursor', 'crosshair');

    clearSelectionRects();
  }

  function onMouseMove(event: MouseEvent): void {
    if (!isDragging) return;

    event.preventDefault();
    const [mouseX] = d3.pointer(event, svgSelection.node());
    dragCurrentX = Math.max(0, Math.min(mouseX - config.margin.left, currentState.innerWidth));

    renderDragRect();
  }

  function onMouseUp(event: MouseEvent): void {
    if (!isDragging) return;

    event.preventDefault();
    isDragging = false;
    dragOverlay.style('pointer-events', 'none').style('cursor', 'default');

    const x1 = Math.min(dragStartX, dragCurrentX);
    const x2 = Math.max(dragStartX, dragCurrentX);

    // Minimum drag distance (5px) to avoid accidental selections
    if (x2 - x1 < 5) {
      clearSelectionRects();
      currentSelection = undefined;
      return;
    }

    const startPos = pixelToPosition(currentState, dragGenomeIndex, x1);
    const endPos = pixelToPosition(currentState, dragGenomeIndex, x2);

    currentSelection = {
      genomeIndex: dragGenomeIndex,
      start: Math.max(0, startPos),
      end: endPos,
    };

    renderSelectionHighlights();
    onSelect?.(currentSelection);
  }

  function renderDragRect(): void {
    clearSelectionRects();

    const x = Math.min(dragStartX, dragCurrentX);
    const width = Math.abs(dragCurrentX - dragStartX);

    const displayIndex = currentState.genomeOrder.indexOf(dragGenomeIndex);
    const panelY = computePanelY(currentState, config, displayIndex);

    selectionGroup
      .append('rect')
      .attr('class', 'region-selection-rect')
      .attr('x', x)
      .attr('y', panelY)
      .attr('width', width)
      .attr('height', config.panelHeight)
      .attr('fill', SELECTION_FILL)
      .attr('stroke', SELECTION_STROKE)
      .attr('stroke-width', SELECTION_STROKE_WIDTH);
  }

  function renderSelectionHighlights(): void {
    clearSelectionRects();

    if (!currentSelection) return;

    const visibleOrder = getVisibleGenomeOrder(currentState);

    for (const dataIndex of visibleOrder) {
      const displayIndex = currentState.genomeOrder.indexOf(dataIndex);
      const panelY = computePanelY(currentState, config, displayIndex);

      // For the source genome, use the exact selected positions
      // For other genomes, show the same pixel range (visual alignment)
      const genomeLength = currentState.alignment.genomes[dataIndex]?.length ?? 0;
      const scale = d3.scaleLinear()
        .domain([0, genomeLength])
        .range([1, currentState.innerWidth + 1]);

      let x: number;
      let width: number;

      if (dataIndex === currentSelection.genomeIndex) {
        const zoomedScale = currentState.zoomTransform.rescaleX(scale);
        x = zoomedScale(currentSelection.start);
        width = zoomedScale(currentSelection.end) - x;
      } else {
        // For other genomes, show a visual indicator at the same pixel range
        const sourceLength = currentState.alignment.genomes[currentSelection.genomeIndex]?.length ?? 0;
        const sourceScale = d3.scaleLinear()
          .domain([0, sourceLength])
          .range([1, currentState.innerWidth + 1]);
        const zoomedSource = currentState.zoomTransform.rescaleX(sourceScale);
        x = zoomedSource(currentSelection.start);
        width = zoomedSource(currentSelection.end) - x;
      }

      selectionGroup
        .append('rect')
        .attr('class', 'region-selection-rect')
        .attr('x', x)
        .attr('y', panelY)
        .attr('width', Math.max(width, 1))
        .attr('height', config.panelHeight)
        .attr('fill', SELECTION_FILL)
        .attr('stroke', dataIndex === currentSelection.genomeIndex ? SELECTION_STROKE : '#7ab3e0')
        .attr('stroke-width', SELECTION_STROKE_WIDTH)
        .attr('stroke-dasharray', dataIndex === currentSelection.genomeIndex ? 'none' : '4,2');
    }
  }

  function clearSelectionRects(): void {
    selectionGroup.selectAll('.region-selection-rect').remove();
  }

  // Attach event listeners
  svg.addEventListener('mousedown', onMouseDown, true);
  svg.addEventListener('mousemove', onMouseMove, true);
  svg.addEventListener('mouseup', onMouseUp, true);

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && currentSelection) {
      clearSelection();
    }
  }
  document.addEventListener('keydown', onKeyDown);

  function update(newState: ViewerState): void {
    currentState = newState;
    if (currentSelection) {
      renderSelectionHighlights();
    }
    dragOverlay
      .attr('width', currentState.innerWidth)
      .attr('height', computeOverlayHeight());
  }

  function rebuildOverlays(newState: ViewerState): void {
    currentState = newState;
    dragOverlay
      .attr('width', currentState.innerWidth)
      .attr('height', computeOverlayHeight());
    if (currentSelection) {
      renderSelectionHighlights();
    }
  }

  function clearSelection(): void {
    currentSelection = undefined;
    clearSelectionRects();
  }

  function getSelection(): SelectedRegion | undefined {
    return currentSelection;
  }

  function destroy(): void {
    svg.removeEventListener('mousedown', onMouseDown, true);
    svg.removeEventListener('mousemove', onMouseMove, true);
    svg.removeEventListener('mouseup', onMouseUp, true);
    document.removeEventListener('keydown', onKeyDown);
    selectionGroup.remove();
    dragOverlay.remove();
  }

  return { update, rebuildOverlays, clearSelection, getSelection, destroy };
}
