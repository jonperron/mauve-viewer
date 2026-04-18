import * as d3 from 'd3';
import type { Lcb } from '../../import/xmfa/types.ts';
import type { ViewerState } from '../viewer-state.ts';
import type { ViewerConfig } from '../alignment-viewer.ts';
import type { SimilarityProfile, MultiLevelProfile } from '../../analysis/similarity/types.ts';
import { selectProfileForZoom } from '../../analysis/similarity/compute.ts';
import {
  getZoomedScale,
  isVisuallyReverse,
  computePanelY,
} from '../viewer-state.ts';
import { Y_POS_OFFSET, LCB_HEIGHT } from '../layout-constants.ts';

/** Total height available for the similarity profile area chart */
const PROFILE_HEIGHT = LCB_HEIGHT * 2;

/**
 * Precomputed similarity profile data for all genomes.
 * Stored as multi-level profiles for zoom-adaptive resolution.
 */
export interface SimilarityProfileData {
  readonly profiles: ReadonlyMap<number, MultiLevelProfile>;
}

/**
 * Render similarity profiles as filled area charts within each genome panel.
 * Height represents local sequence conservation (0-100%).
 * Color follows the current LCB color scheme.
 */
export function renderSimilarityProfiles(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  state: ViewerState,
  lcbs: readonly Lcb[],
  colors: readonly string[],
  config: ViewerConfig,
  profileData: SimilarityProfileData,
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
      .attr('class', 'genome-panel similarity-profile-panel')
      .attr('data-genome-data-index', String(dataIndex))
      .attr('transform', `translate(0,${panelY})`);

    renderLabel(panel, genome, showGenomeId);
    panel.append('g').attr('class', 'regions');
    renderRuler(panel, xScale);

    const multiLevel = profileData.profiles.get(dataIndex);
    if (multiLevel) {
      renderProfileForGenome(panel, dataIndex, lcbs, colors, xScale, state, multiLevel);
    }
  }
}

/**
 * Render the similarity profile area chart for a single genome panel.
 * The profile is rendered per-LCB: each LCB region gets its own colored filled area.
 */
function renderProfileForGenome(
  panel: d3.Selection<SVGGElement, unknown, null, undefined>,
  genomeDataIndex: number,
  lcbs: readonly Lcb[],
  colors: readonly string[],
  xScale: d3.ScaleLinear<number, number>,
  state: ViewerState,
  multiLevel: MultiLevelProfile,
): void {
  const regionGroup = panel.select<SVGGElement>('.regions');
  const domain = xScale.domain();
  const range = xScale.range();
  const bpPerPixel = (domain[1]! - domain[0]!) / (range[1]! - range[0]!);
  const profile = selectProfileForZoom(multiLevel, bpPerPixel);

  const profileGroup = regionGroup
    .append('g')
    .attr('class', 'similarity-profiles');

  for (let li = 0; li < lcbs.length; li++) {
    const lcb = lcbs[li]!;
    const left = lcb.left[genomeDataIndex];
    const right = lcb.right[genomeDataIndex];
    if (left === undefined || right === undefined || left === 0) continue;

    const reverse = isVisuallyReverse(lcb, genomeDataIndex, state.referenceGenomeIndex);
    const baseY = reverse ? Y_POS_OFFSET + PROFILE_HEIGHT : Y_POS_OFFSET;

    renderLcbProfile(
      profileGroup,
      li,
      genomeDataIndex,
      left,
      right,
      profile,
      xScale,
      baseY,
      reverse,
      colors[li]!,
    );
  }
}

/** Render the similarity area chart for a single LCB within a genome */
function renderLcbProfile(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  lcbIndex: number,
  genomeDataIndex: number,
  left: number,
  right: number,
  profile: SimilarityProfile,
  xScale: d3.ScaleLinear<number, number>,
  baseY: number,
  reverse: boolean,
  color: string,
): void {
  const resolution = profile.resolution;
  const startIdx = Math.max(0, Math.floor((left - 1) / resolution));
  const endIdx = Math.min(profile.values.length - 1, Math.ceil((right - 1) / resolution));

  if (startIdx >= endIdx) return;

  const points: Array<{ x: number; y: number }> = [];

  for (let i = startIdx; i <= endIdx; i++) {
    const genomePos = i * resolution + 1;
    if (genomePos < left || genomePos > right) continue;

    const x = xScale(genomePos);
    const value = profile.values[i] ?? 0;
    // In forward mode: area grows upward from baseY (baseY - value * PROFILE_HEIGHT)
    // In reverse mode: area grows downward from baseY (baseY + value * PROFILE_HEIGHT)
    const y = reverse
      ? baseY + value * PROFILE_HEIGHT
      : baseY - value * PROFILE_HEIGHT;

    points.push({ x, y });
  }

  if (points.length < 2) return;

  // Create the area path: line along the top, flat baseline at baseY
  const areaGen = d3.area<{ x: number; y: number }>()
    .x(d => d.x)
    .y0(baseY)
    .y1(d => d.y);

  group
    .append('path')
    .attr('class', 'similarity-area')
    .attr('data-lcb-index', String(lcbIndex))
    .attr('data-genome-index', String(genomeDataIndex))
    .attr('d', areaGen(points)!)
    .attr('fill', color)
    .attr('fill-opacity', 0.6)
    .attr('stroke', color)
    .attr('stroke-width', 0.5);
}

/** Update similarity profiles when zoom changes */
export function updateSimilarityProfilesOnZoom(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  state: ViewerState,
  lcbs: readonly Lcb[],
  colors: readonly string[],
  config: ViewerConfig,
  profileData: SimilarityProfileData,
): void {
  const genomeCount = state.alignment.genomes.length;
  for (let di = 0; di < genomeCount; di++) {
    const dataIndex = state.genomeOrder[di]!;
    if (state.hiddenGenomes.has(dataIndex)) continue;

    const scale = getZoomedScale(state, dataIndex);
    const axis = d3.axisBottom(scale).ticks(5).tickSize(10).tickFormat(d3.format('d'));

    const panelSel = root.select(`.genome-panel[data-genome-data-index="${dataIndex}"]`);
    panelSel.select('.ruler').call(axis as never);

    // Remove old profiles and re-render at new zoom level
    panelSel.selectAll('.similarity-profiles').remove();

    const multiLevel = profileData.profiles.get(dataIndex);
    if (!multiLevel) continue;

    const regionGroup = panelSel.select<SVGGElement>('.regions');
    const profileGroup = regionGroup
      .append('g')
      .attr('class', 'similarity-profiles');

    const domain = scale.domain();
    const range = scale.range();
    const bpPerPixel = (domain[1]! - domain[0]!) / (range[1]! - range[0]!);
    const profile = selectProfileForZoom(multiLevel, bpPerPixel);

    for (let li = 0; li < lcbs.length; li++) {
      const lcb = lcbs[li]!;
      const left = lcb.left[dataIndex];
      const right = lcb.right[dataIndex];
      if (left === undefined || right === undefined || left === 0) continue;

      const reverse = isVisuallyReverse(lcb, dataIndex, state.referenceGenomeIndex);
      const baseY = reverse ? Y_POS_OFFSET + PROFILE_HEIGHT : Y_POS_OFFSET;

      renderLcbProfile(
        profileGroup,
        li,
        dataIndex,
        left,
        right,
        profile,
        scale,
        baseY,
        reverse,
        colors[li]!,
      );
    }
  }
}
