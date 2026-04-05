import * as d3 from 'd3';
import type { ViewerState } from './viewer-state.ts';

/** Zoom behavior configuration */
export interface ZoomConfig {
  readonly minScale: number;
  readonly maxScale: number;
  readonly zoomFactor: number;
  readonly scrollPercent: number;
  readonly acceleratedScrollPercent: number;
}

const DEFAULT_ZOOM_CONFIG: ZoomConfig = {
  minScale: 1,
  maxScale: 100_000,
  zoomFactor: 2,
  scrollPercent: 0.1,
  acceleratedScrollPercent: 0.2,
};

/** Callback type for zoom transform changes */
export type ZoomChangeCallback = (transform: d3.ZoomTransform) => void;

/** Active zoom behavior handle, returned by setupZoom for cleanup */
export interface ZoomHandle {
  readonly zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>;
  readonly destroy: () => void;
  readonly zoomIn: () => void;
  readonly zoomOut: () => void;
  readonly panLeft: () => void;
  readonly panRight: () => void;
  readonly reset: () => void;
}

/**
 * Set up D3 zoom behavior on an SVG element.
 * Supports Ctrl+scroll zoom, drag-to-pan, keyboard shortcuts.
 */
export function setupZoom(
  svg: SVGSVGElement,
  state: ViewerState,
  onChange: ZoomChangeCallback,
  zoomConfig: ZoomConfig = DEFAULT_ZOOM_CONFIG,
): ZoomHandle {
  const svgSelection = d3.select<SVGSVGElement, unknown>(svg);
  const width = state.config.width;

  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([zoomConfig.minScale, zoomConfig.maxScale])
    .translateExtent([[-width, 0], [width * 2, 0]])
    .extent([[0, 0], [width, state.config.panelHeight]])
    .filter((event: Event) => {
      // Allow Ctrl+wheel for zoom, mousedown for pan, dblclick disabled
      if (event instanceof WheelEvent) return event.ctrlKey;
      if (event instanceof MouseEvent) return event.type === 'mousedown';
      return false;
    })
    .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      onChange(event.transform);
    });

  svgSelection.call(zoom);
  // Disable double-click zoom
  svgSelection.on('dblclick.zoom', null);

  function applyTransform(transform: d3.ZoomTransform): void {
    svgSelection.call(zoom.transform, transform);
  }

  function getCurrentTransform(): d3.ZoomTransform {
    return d3.zoomTransform(svg);
  }

  function zoomIn(): void {
    const current = getCurrentTransform();
    const center = width / 2;
    const targetScale = Math.min(
      current.k * zoomConfig.zoomFactor,
      zoomConfig.maxScale,
    );
    const factor = targetScale / current.k;
    const newX = (current.x - center) * factor + center;
    applyTransform(d3.zoomIdentity.translate(newX, 0).scale(targetScale));
  }

  function zoomOut(): void {
    const current = getCurrentTransform();
    const center = width / 2;
    const targetScale = Math.max(
      current.k / zoomConfig.zoomFactor,
      zoomConfig.minScale,
    );
    const factor = targetScale / current.k;
    const newX = (current.x - center) * factor + center;
    applyTransform(d3.zoomIdentity.translate(newX, 0).scale(targetScale));
  }

  function panLeft(): void {
    const current = getCurrentTransform();
    const shiftAmount = width * zoomConfig.scrollPercent;
    applyTransform(d3.zoomIdentity.translate(current.x + shiftAmount, 0).scale(current.k));
  }

  function panRight(): void {
    const current = getCurrentTransform();
    const shiftAmount = width * zoomConfig.scrollPercent;
    applyTransform(d3.zoomIdentity.translate(current.x - shiftAmount, 0).scale(current.k));
  }

  function reset(): void {
    applyTransform(d3.zoomIdentity);
  }

  // Keyboard shortcuts
  function handleKeyDown(event: KeyboardEvent): void {
    if (!event.ctrlKey) return;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        zoomIn();
        break;
      case 'ArrowDown':
        event.preventDefault();
        zoomOut();
        break;
      case 'ArrowLeft': {
        event.preventDefault();
        const current = getCurrentTransform();
        const percent = event.shiftKey
          ? zoomConfig.acceleratedScrollPercent
          : zoomConfig.scrollPercent;
        const shift = width * percent;
        applyTransform(d3.zoomIdentity.translate(current.x + shift, 0).scale(current.k));
        break;
      }
      case 'ArrowRight': {
        event.preventDefault();
        const current = getCurrentTransform();
        const percent = event.shiftKey
          ? zoomConfig.acceleratedScrollPercent
          : zoomConfig.scrollPercent;
        const shift = width * percent;
        applyTransform(d3.zoomIdentity.translate(current.x - shift, 0).scale(current.k));
        break;
      }
    }
  }

  document.addEventListener('keydown', handleKeyDown);

  function destroy(): void {
    document.removeEventListener('keydown', handleKeyDown);
    svgSelection.on('.zoom', null);
  }

  return {
    zoomBehavior: zoom,
    destroy,
    zoomIn,
    zoomOut,
    panLeft,
    panRight,
    reset,
  };
}
