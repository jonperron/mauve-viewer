import * as d3 from 'd3';
import type { Lcb } from '../xmfa/types.ts';
import type { ViewerState } from './viewer-state.ts';
import type { ViewerConfig } from './alignment-viewer.ts';
import {
  getZoomedScale,
  isVisuallyReverse,
  computePanelY,
} from './viewer-state.ts';
import { Y_POS_OFFSET, LCB_HEIGHT } from './layout-constants.ts';

/** Height of individual match rectangles (thinner than LCB blocks) */
const MATCH_HEIGHT = 8;

/** Vertical offset within the LCB zone for matches */
const MATCH_Y_FORWARD = Y_POS_OFFSET + (LCB_HEIGHT - MATCH_HEIGHT) / 2;
const MATCH_Y_REVERSE = Y_POS_OFFSET + LCB_HEIGHT + (LCB_HEIGHT - MATCH_HEIGHT) / 2;

/**
 * Render ungapped match blocks for all genome panels.
 * Each LCB is rendered as a thin colored rectangle (no connecting lines).
 * Color is by source LCB color.
 */
export function renderUngappedMatches(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  state: ViewerState,
  lcbs: readonly Lcb[],
  colors: readonly string[],
  config: ViewerConfig,
  showGenomeId: boolean,
  renderLabel: (
    panel: d3.Selection<SVGGElement, unknown, null, undefined>,
    genome: { readonly name: string; readonly label?: string },
    showGenomeId: boolean,
  ) => void,
  renderRuler: (
    panel: d3.Selection<SVGGElement, unknown, null, undefined>,
    xScale: d3.ScaleLinear<number, number>,
  ) => void,
): void {
  const genomeCount = state.alignment.genomes.length;

  for (let di = 0; di < genomeCount; di++) {
    const dataIndex = state.genomeOrder[di]!;
    const genome = state.alignment.genomes[dataIndex]!;
    const panelY = computePanelY(state, config, di);
    const isHidden = state.hiddenGenomes.has(dataIndex);

    if (isHidden) continue;

    const xScale = d3
      .scaleLinear()
      .domain([0, genome.length])
      .range([1, state.innerWidth + 1]);

    const panel = root
      .append('g')
      .attr('class', 'genome-panel ungapped-match-panel')
      .attr('data-genome-data-index', String(dataIndex))
      .attr('transform', `translate(0,${panelY})`);

    renderLabel(panel, genome, showGenomeId);
    panel.append('g').attr('class', 'regions');
    renderRuler(panel, xScale);
    renderMatchBlocks(panel, dataIndex, lcbs, colors, xScale, state.referenceGenomeIndex);
  }
}

/** Render individual match rectangles within a genome panel */
function renderMatchBlocks(
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
    const y = reverse ? MATCH_Y_REVERSE : MATCH_Y_FORWARD;

    regionGroup
      .append('rect')
      .attr('class', 'match-block')
      .attr('data-lcb-index', String(li))
      .attr('data-genome-index', String(genomeDataIndex))
      .attr('x', x)
      .attr('y', y)
      .attr('width', Math.max(blockWidth, 2))
      .attr('height', MATCH_HEIGHT)
      .attr('fill', colors[li]!)
      .attr('opacity', 0.7);
  }
}

/** Update match block positions on zoom */
export function updateUngappedMatchesOnZoom(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  state: ViewerState,
  lcbs: readonly Lcb[],
): void {
  const genomeCount = state.alignment.genomes.length;
  for (let di = 0; di < genomeCount; di++) {
    const dataIndex = state.genomeOrder[di]!;
    if (state.hiddenGenomes.has(dataIndex)) continue;

    const scale = getZoomedScale(state, dataIndex);
    const axis = d3.axisBottom(scale).ticks(5).tickSize(10).tickFormat(d3.format('d'));

    root.select(`.genome-panel[data-genome-data-index="${dataIndex}"] .ruler`).call(axis as never);

    root
      .selectAll(`.match-block[data-genome-index="${dataIndex}"]`)
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
}
