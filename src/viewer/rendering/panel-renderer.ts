import * as d3 from 'd3';
import type { Lcb } from '../../import/xmfa/types.ts';
import type { ViewerState } from '../viewer-state.ts';
import {
  computePanelY,
  isVisuallyReverse,
  HIDDEN_PANEL_HEIGHT,
} from '../viewer-state.ts';
import type { ViewerConfig } from '../alignment-viewer.ts';
import { getGenomeLabelWithOrganism } from '../alignment-viewer.ts';
import { Y_POS_OFFSET, LCB_HEIGHT } from '../layout-constants.ts';
import { renderUnalignedRegions } from './unaligned-regions.ts';
import { renderUngappedMatches } from './ungapped-match-renderer.ts';
import { renderSimilarityProfiles } from './similarity-profile-renderer.ts';
import type { SimilarityProfileData } from './similarity-profile-renderer.ts';

/** Render all genome panels in display order, accounting for hidden genomes and display mode */
export function renderAllPanels(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  state: ViewerState,
  lcbs: readonly Lcb[],
  colors: readonly string[],
  config: ViewerConfig,
  showGenomeId: boolean,
  similarityData?: SimilarityProfileData,
): void {
  const { panelHeight } = config;
  const innerWidth = state.innerWidth;
  const genomeCount = state.alignment.genomes.length;

  if (state.displayMode === 'ungapped-match') {
    // Render hidden panels first, then delegate to ungapped renderer
    for (let di = 0; di < genomeCount; di++) {
      const dataIndex = state.genomeOrder[di]!;
      const genome = state.alignment.genomes[dataIndex]!;
      const panelY = computePanelY(state, config, di);
      const isHidden = state.hiddenGenomes.has(dataIndex);
      if (isHidden) {
        renderHiddenPanel(root, genome, panelY, dataIndex, innerWidth, showGenomeId);
      }
    }
    renderUngappedMatches(
      root, state, lcbs, colors, config, showGenomeId,
      renderPanelLabel, renderRuler,
    );
    // Add unaligned regions in ungapped-match mode
    renderUnalignedRegionsForAll(root, state, lcbs);
    return;
  }

  if (state.displayMode === 'similarity-profile' && similarityData) {
    // Render hidden panels first, then delegate to similarity renderer
    for (let di = 0; di < genomeCount; di++) {
      const dataIndex = state.genomeOrder[di]!;
      const genome = state.alignment.genomes[dataIndex]!;
      const panelY = computePanelY(state, config, di);
      const isHidden = state.hiddenGenomes.has(dataIndex);
      if (isHidden) {
        renderHiddenPanel(root, genome, panelY, dataIndex, innerWidth, showGenomeId);
      }
    }
    renderSimilarityProfiles(
      root, state, lcbs, colors, config, similarityData, showGenomeId,
      renderPanelLabel, renderRuler,
    );
    // Add unaligned regions in similarity mode
    renderUnalignedRegionsForAll(root, state, lcbs);
    return;
  }

  // Default LCB mode
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
  // Add unaligned regions in LCB mode
  renderUnalignedRegionsForAll(root, state, lcbs);
}

/** Render unaligned regions for all visible genome panels */
export function renderUnalignedRegionsForAll(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  state: ViewerState,
  lcbs: readonly Lcb[],
): void {
  const genomeCount = state.alignment.genomes.length;
  for (let di = 0; di < genomeCount; di++) {
    const dataIndex = state.genomeOrder[di]!;
    if (state.hiddenGenomes.has(dataIndex)) continue;
    const genome = state.alignment.genomes[dataIndex]!;
    const panel = root.select<SVGGElement>(`.genome-panel[data-genome-data-index="${dataIndex}"]`);
    if (panel.empty()) continue;
    const xScale = d3.scaleLinear()
      .domain([0, genome.length])
      .range([1, state.innerWidth + 1]);
    renderUnalignedRegions(
      panel,
      dataIndex, lcbs, genome.length, xScale,
    );
  }
}

/** Shared label renderer used by all display modes */
export function renderPanelLabel(
  panel: d3.Selection<SVGGElement, unknown, null, undefined>,
  genome: { readonly name: string; readonly label?: string },
  showGenomeId: boolean,
): void {
  panel
    .append('text')
    .attr('x', 0)
    .attr('y', -3)
    .attr('class', 'genome-label')
    .attr('font-family', 'sans-serif')
    .attr('font-size', '10px')
    .attr('fill', '#888')
    .text(getGenomeLabelWithOrganism(genome.name, showGenomeId, genome.label));
}

function renderGenomePanel(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  genome: { readonly name: string; readonly label?: string; readonly length: number },
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
    .text(getGenomeLabelWithOrganism(genome.name, showGenomeId, genome.label));

  panel.append('g').attr('class', 'regions');

  renderRuler(panel, xScale);
  renderLcbBlocks(panel, genomeDataIndex, lcbs, colors, xScale, referenceGenomeIndex);
}

/** Render a collapsed bar for a hidden genome */
function renderHiddenPanel(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  genome: { readonly name: string; readonly label?: string },
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
    .text(getGenomeLabelWithOrganism(genome.name, showGenomeId, genome.label));

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

export function renderRuler(
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
