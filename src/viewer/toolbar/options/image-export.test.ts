import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exportSvgAsImage, setupExportShortcut } from './image-export.ts';
import type { ExportConfig } from './image-export.ts';

describe('exportSvgAsImage', () => {
  let svg: SVGSVGElement;

  beforeEach(() => {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100');
    svg.setAttribute('height', '100');
    svg.setAttribute('viewBox', '0 0 100 100');
    document.body.appendChild(svg);
  });

  afterEach(() => {
    svg.remove();
  });

  it('should accept PNG config without error', () => {
    const config: ExportConfig = { format: 'png', width: 200, height: 150 };
    // exportSvgAsImage is async under the hood (Image.onload), but shouldn't throw synchronously
    expect(() => exportSvgAsImage(svg, config)).not.toThrow();
  });

  it('should accept JPEG config with quality', () => {
    const config: ExportConfig = { format: 'jpeg', width: 200, height: 150, jpegQuality: 'high' };
    expect(() => exportSvgAsImage(svg, config)).not.toThrow();
  });

  it('should accept JPEG config with low quality', () => {
    const config: ExportConfig = { format: 'jpeg', width: 200, height: 150, jpegQuality: 'low' };
    expect(() => exportSvgAsImage(svg, config)).not.toThrow();
  });

  it('should accept JPEG config with medium quality', () => {
    const config: ExportConfig = { format: 'jpeg', width: 200, height: 150, jpegQuality: 'medium' };
    expect(() => exportSvgAsImage(svg, config)).not.toThrow();
  });
});

describe('setupExportShortcut', () => {
  let svg: SVGSVGElement;
  let container: HTMLDivElement;

  beforeEach(() => {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100');
    svg.setAttribute('height', '100');
    document.body.appendChild(svg);

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    svg.remove();
    container.remove();
  });

  it('should return a cleanup function', () => {
    const cleanup = setupExportShortcut(svg, () => container);
    expect(cleanup).toBeInstanceOf(Function);
    cleanup();
  });

  it('should open export dialog on Ctrl+E', () => {
    const cleanup = setupExportShortcut(svg, () => container);

    const event = new KeyboardEvent('keydown', { key: 'e', ctrlKey: true, bubbles: true });
    document.dispatchEvent(event);

    const dialog = container.querySelector('.image-export-dialog');
    expect(dialog).not.toBeNull();

    cleanup();
  });

  it('should close export dialog on Escape', () => {
    const cleanup = setupExportShortcut(svg, () => container);

    // Open
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', ctrlKey: true, bubbles: true }));
    expect(container.querySelector('.image-export-dialog')).not.toBeNull();

    // Close
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(container.querySelector('.image-export-dialog')).toBeNull();

    cleanup();
  });

  it('should show quality options only for JPEG', () => {
    const cleanup = setupExportShortcut(svg, () => container);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', ctrlKey: true, bubbles: true }));

    const qualityField = container.querySelector('.export-quality-field') as HTMLElement;
    expect(qualityField?.style.display).toBe('none');

    const formatSelect = container.querySelector('#export-format') as HTMLSelectElement;
    formatSelect.value = 'jpeg';
    formatSelect.dispatchEvent(new Event('change'));

    expect(qualityField?.style.display).toBe('');

    cleanup();
  });
});
