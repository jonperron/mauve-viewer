import * as d3 from 'd3';
import type { Lcb } from '../../import/xmfa/types.ts';
import type { ViewerState } from '../viewer-state.ts';
import { getZoomedScale } from '../viewer-state.ts';
import type { ViewerConfig } from '../alignment-viewer.ts';
import { updateConnectingLinesOnZoom } from './connecting-lines.ts';
import { updateUngappedMatchesOnZoom } from './ungapped-match-renderer.ts';
import { updateSimilarityProfilesOnZoom } from './similarity-profile-renderer.ts';
import type { SimilarityProfileData } from './similarity-profile-renderer.ts';
import { updateUnalignedRegionsOnZoom } from './unaligned-regions.ts';

/**
 * Update all panels when the zoom transform changes.
 * Rescales blocks/profiles, rulers, connecting lines, and unaligned regions.
 */
export function updatePanelsOnZoom(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  state: ViewerState,
  lcbs: readonly Lcb[],
  colors: readonly string[],
  config: ViewerConfig,
  showConnectingLines: boolean,
  similarityData?: SimilarityProfileData,
): void {
  if (state.displayMode === 'ungapped-match') {
    updateUngappedMatchesOnZoom(root, state, lcbs);
    updateUnalignedRegionsOnZoom(root, state, lcbs);
    return;
  }

  if (state.displayMode === 'similarity-profile' && similarityData) {
    updateSimilarityProfilesOnZoom(root, state, lcbs, colors, config, similarityData);
    updateUnalignedRegionsOnZoom(root, state, lcbs);
    return;
  }

  // Default LCB mode
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

  // Update connecting lines only if visible (LCB mode only)
  if (showConnectingLines) {
    updateConnectingLinesOnZoom(root, state, lcbs, config);
  }

  // Update unaligned regions
  updateUnalignedRegionsOnZoom(root, state, lcbs);
}
