/** Image export quality presets for JPEG format */
export type JpegQuality = 'low' | 'medium' | 'high';

/** Export format configuration */
export interface ExportConfig {
  readonly format: 'png' | 'jpeg';
  readonly width: number;
  readonly height: number;
  readonly jpegQuality?: JpegQuality;
}

/** Handle for image export dialog lifecycle */
export interface ImageExportHandle {
  readonly element: HTMLElement;
  readonly destroy: () => void;
}

const JPEG_QUALITY_MAP: Readonly<Record<JpegQuality, number>> = {
  low: 0.5,
  medium: 0.75,
  high: 0.95,
};

/**
 * Export an SVG element as a raster image (PNG or JPEG).
 * Renders the SVG to a Canvas, then triggers a file download.
 */
export function exportSvgAsImage(
  svg: SVGSVGElement,
  config: ExportConfig,
): void {
  const serializer = new XMLSerializer();
  const svgClone = svg.cloneNode(true) as SVGSVGElement;

  // Set explicit dimensions on the clone for export
  svgClone.setAttribute('width', String(config.width));
  svgClone.setAttribute('height', String(config.height));
  svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  // Inline computed styles to ensure accurate rendering
  inlineStyles(svgClone);

  const svgString = serializer.serializeToString(svgClone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onerror = () => {
    URL.revokeObjectURL(url);
  };
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(url);
      return;
    }

    // White background for JPEG (no transparency)
    if (config.format === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, config.width, config.height);
    }

    ctx.drawImage(img, 0, 0, config.width, config.height);
    URL.revokeObjectURL(url);

    const mimeType = config.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = config.format === 'jpeg'
      ? JPEG_QUALITY_MAP[config.jpegQuality ?? 'high']
      : undefined;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        downloadBlob(blob, `alignment.${config.format}`);
      },
      mimeType,
      quality,
    );
  };
  img.src = url;
}

/** Inline computed styles into SVG elements for export accuracy */
function inlineStyles(element: Element): void {
  if (!(element instanceof SVGElement || element instanceof HTMLElement)) return;

  const computed = window.getComputedStyle(element);
  const important = ['fill', 'stroke', 'stroke-width', 'font-family', 'font-size', 'opacity', 'fill-opacity', 'stroke-opacity'];

  for (const prop of important) {
    const value = computed.getPropertyValue(prop);
    if (value) {
      (element as SVGElement).style.setProperty(prop, value);
    }
  }

  for (const child of element.children) {
    inlineStyles(child);
  }
}

/** Trigger a blob download in the browser */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Create image export dialog UI.
 * Shows format selection (PNG/JPEG), quality options for JPEG,
 * and custom width/height inputs.
 */
export function createImageExportDialog(
  container: HTMLElement,
  svg: SVGSVGElement,
): ImageExportHandle {
  const dialog = document.createElement('div');
  dialog.className = 'image-export-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-label', 'Export image');

  const backdrop = document.createElement('div');
  backdrop.className = 'image-export-backdrop';

  // Read current SVG dimensions
  const currentWidth = parseInt(svg.getAttribute('width') ?? '1000', 10);
  const currentHeight = parseInt(svg.getAttribute('height') ?? '600', 10);

  dialog.innerHTML = `
    <div class="export-dialog-content">
      <h3>Export Image</h3>
      <div class="export-field">
        <label for="export-format">Format:</label>
        <select id="export-format">
          <option value="png">PNG</option>
          <option value="jpeg">JPEG</option>
        </select>
      </div>
      <div class="export-field export-quality-field" style="display:none">
        <label for="export-quality">Quality:</label>
        <select id="export-quality">
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <div class="export-field">
        <label for="export-width">Width (px):</label>
        <input type="number" id="export-width" value="${currentWidth}" min="100" max="10000" />
      </div>
      <div class="export-field">
        <label for="export-height">Height (px):</label>
        <input type="number" id="export-height" value="${currentHeight}" min="100" max="10000" />
      </div>
      <div class="export-actions">
        <button type="button" class="export-cancel-btn">Cancel</button>
        <button type="button" class="export-confirm-btn">Export</button>
      </div>
    </div>
  `;

  container.appendChild(backdrop);
  container.appendChild(dialog);

  const formatSelect = dialog.querySelector('#export-format') as HTMLSelectElement;
  const qualityField = dialog.querySelector('.export-quality-field') as HTMLElement;
  const qualitySelect = dialog.querySelector('#export-quality') as HTMLSelectElement;
  const widthInput = dialog.querySelector('#export-width') as HTMLInputElement;
  const heightInput = dialog.querySelector('#export-height') as HTMLInputElement;
  const cancelBtn = dialog.querySelector('.export-cancel-btn') as HTMLButtonElement;
  const confirmBtn = dialog.querySelector('.export-confirm-btn') as HTMLButtonElement;

  formatSelect.addEventListener('change', () => {
    qualityField.style.display = formatSelect.value === 'jpeg' ? '' : 'none';
  });

  function handleCancel(): void {
    destroy();
  }

  function handleConfirm(): void {
    const formatValue = formatSelect.value;
    const format = formatValue === 'jpeg' ? 'jpeg' : 'png';
    const width = Math.max(100, Math.min(10000, parseInt(widthInput.value, 10) || currentWidth));
    const height = Math.max(100, Math.min(10000, parseInt(heightInput.value, 10) || currentHeight));
    const qualityValue = qualitySelect.value;
    const jpegQuality: JpegQuality = qualityValue === 'low' ? 'low' : qualityValue === 'medium' ? 'medium' : 'high';

    exportSvgAsImage(svg, { format, width, height, jpegQuality });
    destroy();
  }

  cancelBtn.addEventListener('click', handleCancel);
  confirmBtn.addEventListener('click', handleConfirm);
  backdrop.addEventListener('click', handleCancel);

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      handleCancel();
    }
  }
  document.addEventListener('keydown', onKeyDown);

  function destroy(): void {
    document.removeEventListener('keydown', onKeyDown);
    backdrop.remove();
    dialog.remove();
  }

  return { element: dialog, destroy };
}

/**
 * Set up Ctrl+E keyboard shortcut for image export.
 * Returns a cleanup function to remove the listener.
 */
export function setupExportShortcut(
  svg: SVGSVGElement,
  getContainer: () => HTMLElement,
): () => void {
  let dialogHandle: ImageExportHandle | undefined;

  function onKeyDown(e: KeyboardEvent): void {
    if (e.ctrlKey && e.key === 'e') {
      e.preventDefault();
      if (dialogHandle) {
        dialogHandle.destroy();
      }
      dialogHandle = createImageExportDialog(getContainer(), svg);
    }
  }

  document.addEventListener('keydown', onKeyDown);

  return () => {
    document.removeEventListener('keydown', onKeyDown);
    dialogHandle?.destroy();
  };
}
