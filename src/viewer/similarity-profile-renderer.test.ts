import { describe, it, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { renderSimilarityProfiles, updateSimilarityProfilesOnZoom } from './similarity-profile-renderer.ts';
import type { SimilarityProfileData } from './similarity-profile-renderer.ts';
import { createViewerState, applyZoomTransform } from './viewer-state.ts';
import type { ViewerConfig } from './alignment-viewer.ts';
import type { XmfaAlignment } from '../import/xmfa/types.ts';
import type { MultiLevelProfile, SimilarityProfile } from '../analysis/similarity/types.ts';

const TEST_CONFIG: ViewerConfig = {
  width: 1000,
  panelHeight: 100,
  panelGap: 30,
  margin: { top: 10, right: 10, bottom: 10, left: 100 },
};

function makeAlignment(): XmfaAlignment {
  return {
    header: {
      formatVersion: 'Mauve1',
      sequenceCount: 2,
      sequenceEntries: [
        { index: 1, file: 'g1.fa', format: 'FastA' },
        { index: 2, file: 'g2.fa', format: 'FastA' },
      ],
    },
    blocks: [],
    lcbs: [
      { id: 0, left: [100, 200], right: [400, 500], reverse: [false, false], weight: 301 },
      { id: 1, left: [500, 600], right: [800, 900], reverse: [false, true], weight: 301 },
    ],
    genomes: [
      { index: 1, name: 'g1.fa', length: 1000, format: 'FastA' },
      { index: 2, name: 'g2.fa', length: 1200, format: 'FastA' },
    ],
  };
}

function makeProfileData(): SimilarityProfileData {
  const makeProfile = (genomeIndex: number, length: number): SimilarityProfile => {
    const values = new Array(length);
    for (let i = 0; i < length; i++) {
      values[i] = Math.random() * 0.8 + 0.1;
    }
    return { genomeIndex, resolution: 1, values };
  };

  const makeLowRes = (genomeIndex: number, length: number): SimilarityProfile => {
    const values = new Array(Math.ceil(length / 10));
    for (let i = 0; i < values.length; i++) {
      values[i] = Math.random() * 0.8 + 0.1;
    }
    return { genomeIndex, resolution: 10, values };
  };

  const profiles = new Map<number, MultiLevelProfile>();
  profiles.set(0, {
    genomeIndex: 0,
    levels: [makeProfile(0, 1000), makeLowRes(0, 1000)],
  });
  profiles.set(1, {
    genomeIndex: 1,
    levels: [makeProfile(1, 1200), makeLowRes(1, 1200)],
  });

  return { profiles };
}

describe('similarity-profile-renderer', () => {
  let svg: SVGSVGElement;
  let root: d3.Selection<SVGGElement, unknown, null, undefined>;

  beforeEach(() => {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.appendChild(svg);
    root = d3.select(svg).append('g').attr('class', 'alignment-root');
  });

  function renderLabel(
    panel: d3.Selection<SVGGElement, unknown, null, undefined>,
    genome: { readonly name: string; readonly label?: string },
  ): void {
    panel.append('text').attr('class', 'genome-label').text(genome.name);
  }

  function renderRuler(
    panel: d3.Selection<SVGGElement, unknown, null, undefined>,
    xScale: d3.ScaleLinear<number, number>,
  ): void {
    panel.append('g').attr('class', 'ruler').call(d3.axisBottom(xScale).ticks(5));
  }

  it('should render similarity area charts for each genome', () => {
    const alignment = makeAlignment();
    const state = createViewerState(alignment, TEST_CONFIG, 'similarity-profile');
    const colors = ['#ff0000', '#00ff00'];
    const profileData = makeProfileData();

    renderSimilarityProfiles(root, state, alignment.lcbs, colors, TEST_CONFIG, profileData, true, renderLabel, renderRuler);

    const areas = root.selectAll('.similarity-area');
    expect(areas.size()).toBeGreaterThan(0);
  });

  it('should render panels with correct CSS class', () => {
    const alignment = makeAlignment();
    const state = createViewerState(alignment, TEST_CONFIG, 'similarity-profile');
    const colors = ['#ff0000', '#00ff00'];
    const profileData = makeProfileData();

    renderSimilarityProfiles(root, state, alignment.lcbs, colors, TEST_CONFIG, profileData, true, renderLabel, renderRuler);

    const panels = root.selectAll('.similarity-profile-panel');
    expect(panels.size()).toBe(2);
  });

  it('should skip hidden genomes', () => {
    const alignment = makeAlignment();
    let state = createViewerState(alignment, TEST_CONFIG, 'similarity-profile');
    state = { ...state, hiddenGenomes: new Set([0]) };
    const colors = ['#ff0000', '#00ff00'];
    const profileData = makeProfileData();

    renderSimilarityProfiles(root, state, alignment.lcbs, colors, TEST_CONFIG, profileData, true, renderLabel, renderRuler);

    const panels = root.selectAll('.similarity-profile-panel');
    expect(panels.size()).toBe(1);
  });

  it('should render similarity-profiles group per LCB', () => {
    const alignment = makeAlignment();
    const state = createViewerState(alignment, TEST_CONFIG, 'similarity-profile');
    const colors = ['#ff0000', '#00ff00'];
    const profileData = makeProfileData();

    renderSimilarityProfiles(root, state, alignment.lcbs, colors, TEST_CONFIG, profileData, true, renderLabel, renderRuler);

    const groups = root.selectAll('.similarity-profiles');
    expect(groups.size()).toBeGreaterThan(0);
  });

  it('should handle missing profile data for a genome', () => {
    const alignment = makeAlignment();
    const state = createViewerState(alignment, TEST_CONFIG, 'similarity-profile');
    const colors = ['#ff0000', '#00ff00'];
    // Only provide profile for genome 0
    const profileData: SimilarityProfileData = {
      profiles: new Map([[0, makeProfileData().profiles.get(0)!]]),
    };

    renderSimilarityProfiles(root, state, alignment.lcbs, colors, TEST_CONFIG, profileData, true, renderLabel, renderRuler);

    // Should not throw, and genome 1 should have no similarity areas
    const panels = root.selectAll('.similarity-profile-panel');
    expect(panels.size()).toBe(2);
  });

  describe('updateSimilarityProfilesOnZoom', () => {
    it('should update profiles on zoom', () => {
      const alignment = makeAlignment();
      const state = createViewerState(alignment, TEST_CONFIG, 'similarity-profile');
      const colors = ['#ff0000', '#00ff00'];
      const profileData = makeProfileData();

      renderSimilarityProfiles(root, state, alignment.lcbs, colors, TEST_CONFIG, profileData, true, renderLabel, renderRuler);

      const areasBefore = root.selectAll('.similarity-area').size();
      expect(areasBefore).toBeGreaterThan(0);

      const zoomedState = applyZoomTransform(state, d3.zoomIdentity.scale(2));
      updateSimilarityProfilesOnZoom(root, zoomedState, alignment.lcbs, colors, TEST_CONFIG, profileData);

      // After zoom update, profiles should still exist (re-rendered)
      const areasAfter = root.selectAll('.similarity-area').size();
      expect(areasAfter).toBeGreaterThan(0);
    });

    it('should skip hidden genomes during zoom', () => {
      const alignment = makeAlignment();
      let state = createViewerState(alignment, TEST_CONFIG, 'similarity-profile');
      const colors = ['#ff0000', '#00ff00'];
      const profileData = makeProfileData();

      renderSimilarityProfiles(root, state, alignment.lcbs, colors, TEST_CONFIG, profileData, true, renderLabel, renderRuler);

      state = { ...state, hiddenGenomes: new Set([1]) };
      const zoomedState = applyZoomTransform(state, d3.zoomIdentity.scale(2));

      // Should not throw
      updateSimilarityProfilesOnZoom(root, zoomedState, alignment.lcbs, colors, TEST_CONFIG, profileData);
    });

    it('should handle missing profile data during zoom', () => {
      const alignment = makeAlignment();
      const state = createViewerState(alignment, TEST_CONFIG, 'similarity-profile');
      const colors = ['#ff0000', '#00ff00'];
      const emptyProfileData: SimilarityProfileData = { profiles: new Map() };

      renderSimilarityProfiles(root, state, alignment.lcbs, colors, TEST_CONFIG, emptyProfileData, true, renderLabel, renderRuler);

      const zoomedState = applyZoomTransform(state, d3.zoomIdentity.scale(2));
      // Should not throw
      updateSimilarityProfilesOnZoom(root, zoomedState, alignment.lcbs, colors, TEST_CONFIG, emptyProfileData);
    });
  });

  it('should render areas with correct fill color', () => {
    const alignment = makeAlignment();
    const state = createViewerState(alignment, TEST_CONFIG, 'similarity-profile');
    const colors = ['#ff0000', '#00ff00'];
    const profileData = makeProfileData();

    renderSimilarityProfiles(root, state, alignment.lcbs, colors, TEST_CONFIG, profileData, true, renderLabel, renderRuler);

    const area = root.select('.similarity-area');
    const fill = area.attr('fill');
    expect(colors).toContain(fill);
  });
});
