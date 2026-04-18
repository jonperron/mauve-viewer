import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupPrintSupport } from './print-support.ts';

describe('setupPrintSupport', () => {
  let svg: SVGSVGElement;

  beforeEach(() => {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '500');
    svg.setAttribute('height', '300');
    svg.setAttribute('viewBox', '0 0 500 300');
    document.body.appendChild(svg);
  });

  afterEach(() => {
    svg.remove();
    // Clean up any print styles left behind
    document.querySelectorAll('.mauve-print-style').forEach((el) => el.remove());
  });

  it('should return a cleanup function', () => {
    const cleanup = setupPrintSupport(svg);
    expect(cleanup).toBeInstanceOf(Function);
    cleanup();
  });

  it('should add a print stylesheet to the document', () => {
    const cleanup = setupPrintSupport(svg);
    const styles = document.querySelectorAll('.mauve-print-style');
    expect(styles).toHaveLength(1);
    expect((styles[0] as HTMLStyleElement).media).toBe('print');
    cleanup();
  });

  it('should remove print stylesheet on cleanup', () => {
    const cleanup = setupPrintSupport(svg);
    cleanup();
    const styles = document.querySelectorAll('.mauve-print-style');
    expect(styles).toHaveLength(0);
  });

  it('should call window.print on Ctrl+P', () => {
    const cleanup = setupPrintSupport(svg);
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    const event = new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, bubbles: true });
    document.dispatchEvent(event);

    expect(printSpy).toHaveBeenCalledOnce();

    printSpy.mockRestore();
    cleanup();
  });

  it('should create and remove print wrapper on print', () => {
    const cleanup = setupPrintSupport(svg);
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {
      // During print, wrapper should exist
      const wrapper = document.querySelector('.alignment-print-wrapper');
      expect(wrapper).not.toBeNull();
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, bubbles: true }));

    // After print, wrapper should be removed
    const wrapper = document.querySelector('.alignment-print-wrapper');
    expect(wrapper).toBeNull();

    printSpy.mockRestore();
    cleanup();
  });
});
