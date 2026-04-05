import * as d3 from 'd3';
import type { GenomicFeature, GenomeAnnotations } from '../annotations/types.ts';
import { FEATURE_COLORS, FEATURE_ZOOM_THRESHOLD } from '../annotations/types.ts';
import type { ViewerState } from './viewer-state.ts';
import { getZoomedScale, getVisibleRangeSize } from './viewer-state.ts';
import type { ViewerConfig } from './alignment-viewer.ts';
import { Y_POS_OFFSET, LCB_HEIGHT } from './alignment-viewer.ts';

/** Display options for annotation rendering */
export interface AnnotationDisplayOptions {
  readonly showFeatures: boolean;
  readonly showContigs: boolean;
}

/** Handle returned by setupAnnotations for lifecycle management */
export interface AnnotationsHandle {
  readonly update: (state: ViewerState, displayOptions?: AnnotationDisplayOptions) => void;
  readonly destroy: () => void;
}

/** Annotation data keyed by genome data index */
export type AnnotationMap = ReadonlyMap<number, GenomeAnnotations>;

const FEATURE_HEIGHT = 10;
const FEATURE_OFFSET = 5;

/**
 * Set up annotation rendering on genome panels.
 * Features are shown/hidden based on zoom level (< 1 Mbp threshold).
 * Contig boundaries are always visible when present.
 */
const DEFAULT_DISPLAY_OPTIONS: AnnotationDisplayOptions = { showFeatures: true, showContigs: true };

export function setupAnnotations(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  state: ViewerState,
  config: ViewerConfig,
  annotations: AnnotationMap,
  onFeatureHover: (feature: GenomicFeature, event: MouseEvent) => void,
  onFeatureLeave: () => void,
  onFeatureClick: (feature: GenomicFeature, event: MouseEvent) => void,
): AnnotationsHandle {
  let currentState = state;
  let currentDisplayOptions = DEFAULT_DISPLAY_OPTIONS;

  // Create annotation groups for each genome panel
  renderAnnotations(root, currentState, config, annotations, currentDisplayOptions, onFeatureHover, onFeatureLeave, onFeatureClick);

  function update(newState: ViewerState, displayOptions?: AnnotationDisplayOptions): void {
    currentState = newState;
    if (displayOptions) {
      currentDisplayOptions = displayOptions;
    }
    renderAnnotations(root, currentState, config, annotations, currentDisplayOptions, onFeatureHover, onFeatureLeave, onFeatureClick);
  }

  function destroy(): void {
    root.selectAll('.annotation-group').remove();
    root.selectAll('.contig-group').remove();
  }

  return { update, destroy };
}

function renderAnnotations(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  state: ViewerState,
  config: ViewerConfig,
  annotations: AnnotationMap,
  displayOptions: AnnotationDisplayOptions,
  onFeatureHover: (feature: GenomicFeature, event: MouseEvent) => void,
  onFeatureLeave: () => void,
  onFeatureClick: (feature: GenomicFeature, event: MouseEvent) => void,
): void {
  // Remove existing annotations
  root.selectAll('.annotation-group').remove();
  root.selectAll('.contig-group').remove();

  for (let di = 0; di < state.alignment.genomes.length; di++) {
    const dataIndex = state.genomeOrder[di]!;
    if (state.hiddenGenomes.has(dataIndex)) continue;

    const genomeAnnotations = annotations.get(dataIndex);
    if (!genomeAnnotations) continue;

    const panel = root.select(
      `.genome-panel[data-genome-data-index="${dataIndex}"]`,
    );
    if (panel.empty()) continue;

    renderGenomeAnnotations(
      panel, state, config, dataIndex, genomeAnnotations, displayOptions,
      onFeatureHover, onFeatureLeave, onFeatureClick,
    );
  }
}

function renderGenomeAnnotations(
  panel: d3.Selection<d3.BaseType, unknown, null, undefined>,
  state: ViewerState,
  config: ViewerConfig,
  dataIndex: number,
  genomeAnnotations: GenomeAnnotations,
  displayOptions: AnnotationDisplayOptions,
  onFeatureHover: (feature: GenomicFeature, event: MouseEvent) => void,
  onFeatureLeave: () => void,
  onFeatureClick: (feature: GenomicFeature, event: MouseEvent) => void,
): void {
  const scale = getZoomedScale(state, dataIndex);
  const visibleRange = getVisibleRangeSize(state, dataIndex);

  if (displayOptions.showContigs && genomeAnnotations.contigs.length > 0) {
    renderContigBoundaries(panel, genomeAnnotations.contigs, scale, config.panelHeight);
  }

  if (displayOptions.showFeatures && visibleRange < FEATURE_ZOOM_THRESHOLD) {
    const domain = scale.domain();
    const domainStart = domain[0] ?? 0;
    const domainEnd = domain[1] ?? 0;
    const visibleFeatures = genomeAnnotations.features.filter(
      (f) => f.end >= domainStart && f.start <= domainEnd,
    );

    if (visibleFeatures.length > 0) {
      renderFeatures(
        panel, visibleFeatures, scale, 0,
        onFeatureHover, onFeatureLeave, onFeatureClick,
      );
    }
  }
}

function renderFeatures(
  panel: d3.Selection<d3.BaseType, unknown, null, undefined>,
  features: readonly GenomicFeature[],
  scale: d3.ScaleLinear<number, number>,
  _centerY: number,
  onFeatureHover: (feature: GenomicFeature, event: MouseEvent) => void,
  onFeatureLeave: () => void,
  onFeatureClick: (feature: GenomicFeature, event: MouseEvent) => void,
): void {
  const group = panel
    .append('g')
    .attr('class', 'annotation-group');

  for (const feature of features) {
    const x = scale(feature.start);
    const width = Math.max(scale(feature.end) - scale(feature.start), 2);
    const color = FEATURE_COLORS[feature.type];

    // Position features below LCB blocks (legacy layout)
    const y = feature.strand === '-'
      ? Y_POS_OFFSET + LCB_HEIGHT * 2 + FEATURE_OFFSET + FEATURE_HEIGHT + FEATURE_OFFSET
      : Y_POS_OFFSET + LCB_HEIGHT * 2 + FEATURE_OFFSET;

    group
      .append('rect')
      .attr('class', 'feature-annotation')
      .attr('x', x)
      .attr('y', y)
      .attr('width', width)
      .attr('height', FEATURE_HEIGHT)
      .attr('fill', color)
      .attr('stroke', '#000')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.7)
      .style('cursor', 'pointer')
      .on('mouseover', function (event: MouseEvent) {
        d3.select(this).attr('opacity', 1);
        onFeatureHover(feature, event);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 0.7);
        onFeatureLeave();
      })
      .on('click', (event: MouseEvent) => {
        onFeatureClick(feature, event);
      });
  }
}

function renderContigBoundaries(
  panel: d3.Selection<d3.BaseType, unknown, null, undefined>,
  contigs: readonly { readonly position: number; readonly name: string }[],
  scale: d3.ScaleLinear<number, number>,
  panelHeight: number,
): void {
  const group = panel
    .append('g')
    .attr('class', 'contig-group');

  for (const contig of contigs) {
    const x = scale(contig.position);

    group
      .append('line')
      .attr('class', 'contig-boundary')
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', 0)
      .attr('y2', panelHeight)
      .attr('stroke', '#b50707')
      .attr('stroke-width', 2)
      .attr('opacity', 0.65);
  }
}
