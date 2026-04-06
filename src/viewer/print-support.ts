/** Print the SVG alignment using the browser's native print dialog */
export function printAlignment(svg: SVGSVGElement): void {
  // Create a temporary wrapper for print isolation
  const printWrapper = document.createElement('div');
  printWrapper.className = 'alignment-print-wrapper';

  const svgClone = svg.cloneNode(true) as SVGSVGElement;
  svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  // Set viewBox for proper scaling in print
  const width = svg.getAttribute('width') ?? '1000';
  const height = svg.getAttribute('height') ?? '600';
  svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svgClone.removeAttribute('width');
  svgClone.removeAttribute('height');
  svgClone.style.width = '100%';
  svgClone.style.height = 'auto';

  printWrapper.appendChild(svgClone);
  document.body.appendChild(printWrapper);

  window.print();

  // Cleanup after print dialog closes
  printWrapper.remove();
}

/**
 * Set up Ctrl+P print support for the alignment viewer.
 * Uses the browser's native print dialog with a print-optimized stylesheet
 * that isolates the SVG for high-quality output.
 */
export function setupPrintSupport(
  svg: SVGSVGElement,
): () => void {
  // Create a print-only stylesheet
  const printStyle = document.createElement('style');
  printStyle.className = 'mauve-print-style';
  printStyle.media = 'print';
  printStyle.textContent = `
    @media print {
      body > *:not(.alignment-print-wrapper) {
        display: none !important;
      }
      .alignment-print-wrapper {
        display: block !important;
        position: static !important;
        width: 100% !important;
      }
      .alignment-print-wrapper svg {
        width: 100% !important;
        height: auto !important;
        max-width: 100% !important;
      }
      @page {
        size: landscape;
        margin: 0.5cm;
      }
    }
  `;
  document.head.appendChild(printStyle);

  function onKeyDown(e: KeyboardEvent): void {
    if (e.ctrlKey && e.key === 'p') {
      e.preventDefault();
      printAlignment(svg);
    }
  }

  document.addEventListener('keydown', onKeyDown);

  return () => {
    document.removeEventListener('keydown', onKeyDown);
    printStyle.remove();
  };
}
