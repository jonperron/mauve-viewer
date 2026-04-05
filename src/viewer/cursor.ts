import * as d3 from 'd3';
import type { ViewerConfig } from './alignment-viewer.ts';
import type { ViewerState } from './viewer-state.ts';
import {
  pixelToPosition,
  positionToPixel,
  findLcbAtPosition,
  findHomologousPositions,
  getVisibleGenomeOrder,
  computePanelY,
} from './viewer-state.ts';

/** Cursor info displayed on hover */
export interface CursorInfo {
  readonly genomeIndex: number;
  readonly position: number;
  readonly lcbIndex: number | undefined;
  readonly lcbStart: number | undefined;
  readonly lcbEnd: number | undefined;
}

/** Click-to-align callback */
export type AlignClickCallback = (
  sourceGenomeIndex: number,
  position: number,
) => void;

/** Active cursor handle for cleanup */
export interface CursorHandle {
  readonly destroy: () => void;
  readonly update: (state: ViewerState) => void;
  readonly rebuildOverlays: (state: ViewerState) => void;
}

/**
 * Set up cursor interaction on the alignment SVG.
 * Draws vertical cursor lines on all genome panels at homologous positions.
 * Highlights LCBs and connecting lines on hover.
 */
export function setupCursor(
  svg: SVGSVGElement,
  state: ViewerState,
  config: ViewerConfig,
  onAlignClick: AlignClickCallback,
): CursorHandle {
  const svgSelection = d3.select(svg);
  const genomeCount = state.alignment.genomes.length;

  // Mutable closure — held for D3 event callbacks (intentional exception to immutability rule)
  let currentState = state;

  // Create cursor group
  const cursorGroup = svgSelection
    .append('g')
    .attr('class', 'cursor-group')
    .attr('transform', `translate(${config.margin.left},${config.margin.top})`)
    .style('pointer-events', 'none');

  // Cursor lines keyed by data index
  let cursorLines = new Map<number, d3.Selection<SVGLineElement, unknown, null, undefined>>();

  // Create info display element
  const infoGroup = svgSelection
    .append('g')
    .attr('class', 'cursor-info-group')
    .attr('opacity', 0);

  const infoBg = infoGroup
    .append('rect')
    .attr('class', 'cursor-info-bg')
    .attr('fill', 'rgba(255,255,255,0.9)')
    .attr('stroke', '#ccc')
    .attr('rx', 3);

  const infoText = infoGroup
    .append('text')
    .attr('class', 'cursor-info-text')
    .attr('font-size', '11px')
    .attr('font-family', 'sans-serif')
    .attr('fill', '#333');

  // Create transparent overlay rects for each panel to capture mouse events
  const overlayGroup = svgSelection
    .append('g')
    .attr('class', 'cursor-overlay-group')
    .attr('transform', `translate(${config.margin.left},${config.margin.top})`);

  function buildCursorElements(): void {
    cursorGroup.selectAll('*').remove();
    overlayGroup.selectAll('*').remove();
    cursorLines = new Map();

    const visibleOrder = getVisibleGenomeOrder(currentState);

    for (const dataIndex of visibleOrder) {
      const displayIndex = currentState.genomeOrder.indexOf(dataIndex);
      const panelY = computePanelY(currentState, config, displayIndex);

      const line = cursorGroup
        .append('line')
        .attr('class', `cursor-line cursor-line-${dataIndex}`)
        .attr('y1', panelY)
        .attr('y2', panelY + config.panelHeight)
        .attr('x1', -10)
        .attr('x2', -10)
        .attr('stroke', '#222')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0);
      cursorLines.set(dataIndex, line);

      overlayGroup
        .append('rect')
        .attr('class', `panel-overlay panel-overlay-${dataIndex}`)
        .attr('x', 0)
        .attr('y', panelY)
        .attr('width', currentState.innerWidth)
        .attr('height', config.panelHeight)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('mousemove', (event: MouseEvent) => {
          handleMouseMove(dataIndex, event);
        })
        .on('mouseout', () => {
          handleMouseOut();
        })
        .on('click', (event: MouseEvent) => {
          handleClick(dataIndex, event);
        });
    }
  }

  // Build initial cursor elements
  buildCursorElements();

  function handleMouseMove(genomeDataIndex: number, event: MouseEvent): void {
    const [mouseX] = d3.pointer(event, overlayGroup.node());
    const position = pixelToPosition(currentState, genomeDataIndex, mouseX);

    // Show cursor line on hovered panel
    showCursorAt(genomeDataIndex, mouseX);

    // Find and show homologous positions
    const homologous = findHomologousPositions(
      currentState.alignment,
      genomeDataIndex,
      position,
    );

    for (let gi = 0; gi < genomeCount; gi++) {
      if (gi === genomeDataIndex) continue;
      if (currentState.hiddenGenomes.has(gi)) continue;

      const match = homologous.find((h) => h.genomeIndex === gi);
      if (match) {
        const px = positionToPixel(currentState, gi, match.position);
        showCursorAt(gi, px);
      } else {
        hideCursor(gi);
      }
    }

    // Highlight LCBs
    highlightLcbs(genomeDataIndex, position);

    // Update info display
    updateInfo(genomeDataIndex, position);
  }

  function handleMouseOut(): void {
    for (const dataIndex of cursorLines.keys()) {
      hideCursor(dataIndex);
    }
    clearHighlight();
    infoGroup.attr('opacity', 0);
  }

  function handleClick(genomeDataIndex: number, event: MouseEvent): void {
    const [mouseX] = d3.pointer(event, overlayGroup.node());
    const position = pixelToPosition(currentState, genomeDataIndex, mouseX);
    onAlignClick(genomeDataIndex, position);
  }

  function showCursorAt(genomeDataIndex: number, pixelX: number): void {
    const line = cursorLines.get(genomeDataIndex);
    if (!line) return;
    line.attr('x1', pixelX).attr('x2', pixelX).attr('opacity', 1);
  }

  function hideCursor(genomeDataIndex: number): void {
    const line = cursorLines.get(genomeDataIndex);
    if (!line) return;
    line.attr('opacity', 0);
  }

  function highlightLcbs(genomeDataIndex: number, position: number): void {
    clearHighlight();

    const result = findLcbAtPosition(
      currentState.alignment,
      genomeDataIndex,
      position,
    );
    if (!result) return;

    const { lcbIndex } = result;

    // Highlight LCB blocks in all panels
    svgSelection
      .selectAll('.lcb-block')
      .filter(function () {
        return d3.select(this).attr('data-lcb-index') === String(lcbIndex);
      })
      .attr('stroke', '#222')
      .attr('stroke-width', 2.5)
      .attr('fill-opacity', 0.85);

    // Highlight connecting lines
    svgSelection
      .selectAll('.lcb-connector')
      .filter(function () {
        return d3.select(this).attr('data-lcb-index') === String(lcbIndex);
      })
      .attr('fill-opacity', 0.45)
      .attr('stroke-width', 1.5);
  }

  function clearHighlight(): void {
    svgSelection
      .selectAll('.lcb-block')
      .attr('stroke-width', 1)
      .attr('fill-opacity', 0.6);

    svgSelection
      .selectAll('.lcb-connector')
      .attr('fill-opacity', 0.2)
      .attr('stroke-width', 0.5);
  }

  function updateInfo(genomeDataIndex: number, position: number): void {
    const genome = currentState.alignment.genomes[genomeDataIndex];
    if (!genome) return;

    const lcbResult = findLcbAtPosition(
      currentState.alignment,
      genomeDataIndex,
      position,
    );

    const lcbLabel = lcbResult
      ? `LCB ${lcbResult.lcbIndex + 1} [${lcbResult.lcb.left[genomeDataIndex]}-${lcbResult.lcb.right[genomeDataIndex]}]`
      : 'No LCB';

    const text = `${genome.name} | pos: ${position.toLocaleString()} | ${lcbLabel}`;

    infoText.text(text);
    const textNode = infoText.node();
    if (textNode && typeof textNode.getBBox === 'function') {
      try {
        const bbox = textNode.getBBox();
        infoBg
          .attr('x', bbox.x - 4)
          .attr('y', bbox.y - 2)
          .attr('width', bbox.width + 8)
          .attr('height', bbox.height + 4);
      } catch {
        // getBBox may not be available in non-browser environments
      }
    }

    infoGroup
      .attr('transform', `translate(${config.margin.left + 10}, ${config.margin.top - 5})`)
      .attr('opacity', 1);
  }

  function update(newState: ViewerState): void {
    currentState = newState;
  }

  function rebuildOverlays(newState: ViewerState): void {
    currentState = newState;
    buildCursorElements();
  }

  function destroy(): void {
    cursorGroup.remove();
    infoGroup.remove();
    overlayGroup.remove();
  }

  return { destroy, update, rebuildOverlays };
}
