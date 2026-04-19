import * as d3 from 'd3';
import type { XmfaAlignment } from '../import/xmfa/types.ts';
import {
  createViewerState,
  applyZoomTransform,
  findHomologousPositions,
  positionToPixel,
  moveGenomeUp,
  moveGenomeDown,
  setReferenceGenome,
  hideGenome,
  showGenome,
  computePanelY,
  setDisplayMode,
  HIDDEN_PANEL_HEIGHT,
} from './viewer-state.ts';
import type { ViewerState, DisplayMode } from './viewer-state.ts';
import { setupZoom } from './zoom.ts';
import type { ZoomHandle } from './zoom.ts';
import { setupCursor } from './interaction/cursor.ts';
import type { CursorHandle } from './interaction/cursor.ts';
import { createNavigationToolbar } from './toolbar/navigation-toolbar.ts';
import type { NavigationToolbarHandle } from './toolbar/navigation-toolbar.ts';
import { createTrackControls } from './interaction/track-controls.ts';
import type { TrackControlsHandle, TrackControlLayout } from './interaction/track-controls.ts';
import { setupAnnotations } from './rendering/annotations.ts';
import type { AnnotationsHandle, AnnotationMap } from './rendering/annotations.ts';
import { createFeatureTooltip } from './rendering/feature-tooltip.ts';
import type { FeatureTooltipHandle } from './rendering/feature-tooltip.ts';
import { createOptionsPanel } from './toolbar/options/options-panel.ts';
import type { OptionsPanelHandle, OptionsState } from './toolbar/options/options-panel.ts';
import { createExportMenu } from './toolbar/options/export-menu.ts';
import type { ExportMenuHandle } from './toolbar/options/export-menu.ts';
import { applyColorScheme, getAvailableSchemes, DEFAULT_COLOR_SCHEME_ID } from './toolbar/color-scheme/color-schemes.ts';
import type { ColorSchemeId } from './toolbar/color-scheme/color-schemes.ts';
import { createColorSchemeMenu } from './toolbar/color-scheme/color-scheme-menu.ts';
import type { ColorSchemeMenuHandle } from './toolbar/color-scheme/color-scheme-menu.ts';
import { setupRegionSelection } from './interaction/region-selection.ts';
import type { RegionSelectionHandle } from './interaction/region-selection.ts';
import { setupExportShortcut, createImageExportDialog } from './toolbar/options/image-export.ts';
import { setupPrintSupport, printAlignment } from './toolbar/options/print-support.ts';
import { setupNavigatorShortcut } from './interaction/sequence-navigator.ts';
import { createShortcutsHelp } from './interaction/shortcuts-help.ts';
import type { SimilarityProfileData } from './rendering/similarity-profile-renderer.ts';
import { renderAllPanels } from './rendering/panel-renderer.ts';
import { renderConnectingLines, updateConnectingLinesOnZoom } from './rendering/connecting-lines.ts';
import { updatePanelsOnZoom } from './rendering/panel-update.ts';
import { computeMultiLevelProfile } from '../analysis/similarity/compute.ts';
import type { MultiLevelProfile } from '../analysis/similarity/types.ts';
import { computeBackbone } from '../analysis/backbone/index.ts';
import type { BackboneSegment } from '../import/backbone/types.ts';
import { exportSnps, downloadTextFile, exportGaps, exportPermutations, exportHomologs, exportIdentityMatrix, exportCdsErrors, runSummaryPipeline, buildSummaryBlobUrl } from '../export/index.ts';
import type { ContigMap } from '../export/index.ts';
import type { ContigBoundary } from '../annotations/types.ts';
import { createHomologExportDialog } from './toolbar/options/homolog-export-dialog.ts';
import { createSummaryExportDialog } from './toolbar/options/summary-export-dialog.ts';

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

export { Y_POS_OFFSET, LCB_HEIGHT } from './layout-constants.ts';
import { Y_POS_OFFSET, LCB_HEIGHT } from './layout-constants.ts';

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
  readonly exportMenuHandle: ExportMenuHandle;
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

  // Legacy-compatible enriched label format: "Organism Name [genome_id]"
  const enrichedMatch = name.match(/^(.*)\s\[(\d+\.\d+)\]$/);
  if (enrichedMatch && enrichedMatch[1]) {
    return enrichedMatch[1];
  }

  const dotIndex = name.lastIndexOf('.');
  return dotIndex > 0 ? name.slice(0, dotIndex) : name;
}

/**
 * Get a genome display label using an optional organism label.
 * When label is provided:
 *   - showGenomeId=true: "Organism Name [genome-id]"
 *   - showGenomeId=false: "Organism Name"
 * When label is absent, falls back to filename display.
 */
export function getGenomeLabelWithOrganism(
  name: string,
  showGenomeId: boolean,
  label: string | undefined,
): string {
  if (label !== undefined) {
    const dotIndex = name.lastIndexOf('.');
    const orgId = dotIndex > 0 ? name.slice(0, dotIndex) : name;
    return showGenomeId ? `${label} [${orgId}]` : label;
  }
  return getGenomeLabel(name, showGenomeId);
}

export function renderAlignment(
  container: HTMLElement,
  alignment: XmfaAlignment,
  config: ViewerConfig = DEFAULT_CONFIG,
  annotations?: AnnotationMap,
  initialDisplayMode?: DisplayMode,
): ViewerHandle {
  const { lcbs } = alignment;
  const { width, margin } = config;
  // Mutable color state — held in closure for color scheme callbacks (intentional exception to immutability rule)
  let currentSchemeId: ColorSchemeId = DEFAULT_COLOR_SCHEME_ID;

  // Compute backbone data from LCBs for backbone-dependent color schemes
  const backbone: readonly BackboneSegment[] = lcbs.length > 0
    ? computeBackbone(lcbs, alignment.genomes.length, { minMultiplicity: 2 })
    : [];

  let colors = applyColorScheme(currentSchemeId, alignment, backbone);

  // Clean up previous viewer
  d3.select(container).select('.alignment-wrapper').remove();
  d3.select(container).select('svg').remove();

  // Determine initial display mode based on data availability
  const hasBlocks = alignment.blocks.length > 0;
  const defaultMode: DisplayMode = initialDisplayMode ?? 'lcb';

  // Determine which display modes are available
  const availableModes: DisplayMode[] = ['lcb'];
  if (lcbs.length > 0) availableModes.push('ungapped-match');
  if (hasBlocks) availableModes.push('similarity-profile');

  // Mutable state — held in closure for D3 callbacks (intentional exception to immutability rule)
  let viewerState = createViewerState(alignment, config, defaultMode);

  // Precompute similarity profile data if blocks are available
  let similarityData: SimilarityProfileData = { profiles: new Map() };
  if (hasBlocks) {
    const profiles = new Map<number, MultiLevelProfile>();
    for (let i = 0; i < alignment.genomes.length; i++) {
      profiles.set(i, computeMultiLevelProfile(alignment, i));
    }
    similarityData = { profiles };
  }

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

  renderAllPanels(root, viewerState, lcbs, colors, config, optionsState.showGenomeId, similarityData);
  if (viewerState.displayMode === 'lcb') {
    renderConnectingLines(root, viewerState, lcbs, colors, config);
  }

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
    updatePanelsOnZoom(root, viewerState, lcbs, colors, config, optionsState.showConnectingLines, similarityData);
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

  const shortcutsHelpHandle = createShortcutsHelp(controlsBar);

  const toolbarHandle = createNavigationToolbar(controlsBar, {
    onZoomIn: () => zoomHandle.zoomIn(),
    onZoomOut: () => zoomHandle.zoomOut(),
    onPanLeft: () => zoomHandle.panLeft(),
    onPanRight: () => zoomHandle.panRight(),
    onReset: () => zoomHandle.reset(),
    onDisplayModeChange: (mode) => {
      viewerState = setDisplayMode(viewerState, mode);
      zoomHandle.reset();
      rerenderPanels();
    },
  }, defaultMode, availableModes);

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
    renderAllPanels(root, viewerState, lcbs, colors, config, optionsState.showGenomeId, similarityData);
    if (optionsState.showConnectingLines && viewerState.displayMode === 'lcb') {
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
      const label = getGenomeLabelWithOrganism(genome.name, optionsState.showGenomeId, genome.label);
      root.select(`.genome-panel[data-genome-data-index="${dataIndex}"] .genome-label`)
        .text(label);
    }
  }

  const availableSchemes = getAvailableSchemes(alignment, backbone);
  const colorSchemeMenuHandle = createColorSchemeMenu(
    controlsBar,
    availableSchemes,
    currentSchemeId,
    {
      onSchemeChange: (schemeId) => {
        currentSchemeId = schemeId;
        colors = applyColorScheme(schemeId, alignment, backbone);
        rerenderPanels();
      },
    },
  );

  // Mutable dialog handle — held in closure for export dialog lifecycle (intentional exception to immutability rule)
  let activeDialogHandle: { destroy: () => void } | undefined;

  const optionsPanelHandle = createOptionsPanel(controlsBar, {
    onToggleGenomeId: (enabled) => {
      optionsState = { ...optionsState, showGenomeId: enabled };
      updateGenomeLabels();
    },
    onToggleConnectingLines: (enabled) => {
      optionsState = { ...optionsState, showConnectingLines: enabled };
      if (viewerState.displayMode !== 'lcb') return;
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
  });

  const exportMenuHandle = createExportMenu(controlsBar, {
    onExportImage: () => {
      createImageExportDialog(container, svgNode);
    },
    onExportSnps: hasBlocks ? () => {
      const contigEntries: [number, readonly ContigBoundary[]][] = [];
      if (annotations) {
        for (const [genomeIndex, genomeAnnotations] of annotations) {
          contigEntries.push([genomeIndex, genomeAnnotations.contigs]);
        }
      }
      const contigMap: ContigMap = new Map(contigEntries);
      const content = exportSnps(alignment, contigMap);
      downloadTextFile(content, 'snps.tsv');
    } : undefined,
    onExportGaps: hasBlocks ? () => {
      const contigEntries: [number, readonly ContigBoundary[]][] = [];
      if (annotations) {
        for (const [genomeIndex, genomeAnnotations] of annotations) {
          contigEntries.push([genomeIndex, genomeAnnotations.contigs]);
        }
      }
      const contigMap: ContigMap = new Map(contigEntries);
      const content = exportGaps(alignment, contigMap);
      downloadTextFile(content, 'gaps.tsv');
    } : undefined,
    onExportPermutations: lcbs.length > 0 ? () => {
      const contigEntries: [number, readonly ContigBoundary[]][] = [];
      if (annotations) {
        for (const [genomeIndex, genomeAnnotations] of annotations) {
          contigEntries.push([genomeIndex, genomeAnnotations.contigs]);
        }
      }
      const contigMap: ContigMap = new Map(contigEntries);
      const content = exportPermutations(alignment, undefined, contigMap);
      downloadTextFile(content, 'permutations.txt');
    } : undefined,
    onExportHomologs: backbone.length > 0 && annotations && annotations.size > 0 ? () => {
      activeDialogHandle?.destroy();
      activeDialogHandle = createHomologExportDialog(container, (params) => {
        activeDialogHandle = undefined;
        const content = exportHomologs(alignment, backbone, annotations!, params);
        if (content.length > 0) {
          downloadTextFile(content, 'positional_orthologs.tsv');
        }
      });
    } : undefined,
    onExportIdentityMatrix: backbone.length > 0 ? () => {
      const content = exportIdentityMatrix(alignment, backbone);
      downloadTextFile(content, 'identity_matrix.tsv');
    } : undefined,
    onExportCdsErrors: hasBlocks && annotations && annotations.size > 0 ? () => {
      const content = exportCdsErrors(alignment, annotations!);
      if (content.length > 0) {
        downloadTextFile(content, 'cds_errors.tsv');
      }
    } : undefined,
    onExportSummary: backbone.length > 0 ? () => {
      activeDialogHandle?.destroy();
      activeDialogHandle = createSummaryExportDialog(container, (options) => {
        activeDialogHandle = undefined;
        const annotationsList = annotations
          ? Array.from(annotations.values())
          : [];
        const result = runSummaryPipeline({
          backboneSegments: backbone,
          lcbs,
          genomes: alignment.genomes,
          annotations: annotationsList.length > 0 ? annotationsList : undefined,
          options,
        });
        return buildSummaryBlobUrl(result);
      });
    } : undefined,
    onPrint: () => {
      printAlignment(svgNode);
    },
  });

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
    exportMenuHandle,
    colorSchemeMenuHandle,
    regionSelectionHandle,
    getState: () => viewerState,
    destroy: () => {
      cleanupNavigator?.();
      cleanupPrint();
      cleanupExport();
      shortcutsHelpHandle.destroy();
      regionSelectionHandle.destroy();
      annotationsHandle?.destroy();
      tooltipHandle?.destroy();
      exportMenuHandle.destroy();
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
