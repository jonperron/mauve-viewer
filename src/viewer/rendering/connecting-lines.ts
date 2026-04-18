import * as d3 from 'd3';
import type { Lcb } from '../../import/xmfa/types.ts';
import type { ViewerState } from '../viewer-state.ts';
import {
  getVisibleGenomeOrder,
  computePanelY,
  isVisuallyReverse,
  getZoomedScale,
} from '../viewer-state.ts';
import type { ViewerConfig } from '../alignment-viewer.ts';
import { Y_POS_OFFSET, LCB_HEIGHT } from '../layout-constants.ts';

/** Compute midpoint line path for an LCB across visible genomes (legacy backbone style) */
export function computeConnectorPath(
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

export function renderConnectingLines(
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

/** Update connecting midpoint lines when zoom changes */
export function updateConnectingLinesOnZoom(
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
