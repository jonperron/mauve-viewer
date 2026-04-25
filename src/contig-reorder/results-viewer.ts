/**
 * Results viewer dialog for Mauve Contig Mover (MCM) reordering.
 *
 * Displays the structured content of a *_contigs.tab file after a reordering
 * job completes: ordered contigs with pseudomolecule coordinates, contigs
 * that were reversed, and contigs with conflicting placement.
 *
 * Also provides a "Load Alignment" action so the caller can load the
 * reordered draft genome into the alignment viewer.
 */
import { parseContigsTab } from './tab-parser.ts';
import type { ParsedContigEntry, ParsedContigsTab, ReorderResult } from './types.ts';

/** Callbacks for the results viewer */
export interface ResultsViewerCallbacks {
  /**
   * Called when the user clicks "Load Alignment".
   * Receives the reordered sequence text (FASTA or GenBank) and the job's
   * final iteration count.
   */
  readonly onLoadAlignment?: (sequence: string, iterationCount: number) => void;
  /** Called when the dialog is dismissed without loading the alignment */
  readonly onClose?: () => void;
}

/** Handle for the results viewer lifecycle */
export interface ResultsViewerHandle {
  readonly element: HTMLDialogElement;
  readonly destroy: () => void;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildContigRow(entry: ParsedContigEntry): string {
  const strandBadge =
    entry.strand === 'complement'
      ? '<span class="strand-badge strand-complement">complement</span>'
      : '<span class="strand-badge strand-forward">forward</span>';

  return `
    <tr>
      <td>${escapeHtml(entry.name)}</td>
      <td>${strandBadge}</td>
      <td>${entry.start.toLocaleString()}</td>
      <td>${entry.end.toLocaleString()}</td>
    </tr>
  `;
}

function buildContigTable(entries: readonly ParsedContigEntry[]): string {
  if (entries.length === 0) {
    return '<p class="reorder-empty">None</p>';
  }

  return `
    <table class="reorder-contigs-table">
      <thead>
        <tr>
          <th>Contig</th>
          <th>Strand</th>
          <th>Start</th>
          <th>End</th>
        </tr>
      </thead>
      <tbody>
        ${entries.map(buildContigRow).join('')}
      </tbody>
    </table>
  `;
}

function buildSummaryHtml(parsed: ParsedContigsTab, iterationCount: number): string {
  return `
    <p class="reorder-summary">
      Completed in <strong>${iterationCount}</strong> iteration(s).
      ${parsed.ordered.length} contigs ordered,
      ${parsed.toReverse.length} reversed,
      ${parsed.conflicted.length} with conflicting placement.
    </p>
  `;
}

function buildDialogHtml(
  parsed: ParsedContigsTab,
  iterationCount: number,
  hasLoadAlignment: boolean,
): string {
  const orderedSection = `
    <section class="reorder-section">
      <h4>Ordered Contigs</h4>
      ${buildContigTable(parsed.ordered)}
    </section>
  `;

  const reversedSection = `
    <section class="reorder-section">
      <h4>Contigs to Reverse</h4>
      ${buildContigTable(parsed.toReverse)}
    </section>
  `;

  const conflictedSection = `
    <section class="reorder-section">
      <h4>Contigs with Conflicting Order</h4>
      ${buildContigTable(parsed.conflicted)}
    </section>
  `;

  const loadBtn = hasLoadAlignment
    ? '<button type="button" class="reorder-load-btn export-confirm-btn">Load Alignment</button>'
    : '';

  return `
    <div class="reorder-results-content">
      <h3>Contig Reordering Results</h3>
      ${buildSummaryHtml(parsed, iterationCount)}
      ${orderedSection}
      ${reversedSection}
      ${conflictedSection}
      <div class="reorder-results-actions export-actions">
        <button type="button" class="reorder-close-btn export-cancel-btn">Close</button>
        ${loadBtn}
      </div>
    </div>
  `;
}

/**
 * Create a modal dialog displaying the results of a completed MCM reorder job.
 *
 * @param container      Host element for the dialog
 * @param result         ReorderResult from the server (sequence + contigsTab)
 * @param iterationCount Number of iterations the job ran
 * @param callbacks      Lifecycle callbacks
 */
export function createResultsViewer(
  container: HTMLElement,
  result: ReorderResult,
  iterationCount: number,
  callbacks: ResultsViewerCallbacks,
): ResultsViewerHandle {
  const parsed = parseContigsTab(result.contigsTab);

  const dialog = document.createElement('dialog');
  dialog.className = 'reorder-results-dialog';
  dialog.setAttribute('aria-label', 'Contig Reordering Results');

  const hasLoadAlignment = typeof callbacks.onLoadAlignment === 'function';
  dialog.innerHTML = buildDialogHtml(parsed, iterationCount, hasLoadAlignment);

  container.appendChild(dialog);
  dialog.showModal();

  const closeBtn = dialog.querySelector('.reorder-close-btn') as HTMLButtonElement;
  const loadBtn = dialog.querySelector('.reorder-load-btn') as HTMLButtonElement | null;

  closeBtn.addEventListener('click', () => {
    callbacks.onClose?.();
    destroy();
  });

  loadBtn?.addEventListener('click', () => {
    callbacks.onLoadAlignment?.(result.sequence, iterationCount);
    destroy();
  });

  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
  });

  function destroy(): void {
    if (dialog.open) {
      dialog.close();
    }
    dialog.remove();
  }

  return { element: dialog, destroy };
}
