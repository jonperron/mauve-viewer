import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createResultsViewer } from './results-viewer.ts';
import type { ReorderResult } from './types.ts';

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  // jsdom does not implement showModal/close — stub them
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

afterEach(() => {
  container.remove();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePreamble(): string {
  return (
    'Contigs in Reversed Category are those reversed from the order immediately preceding.\n'
  );
}

function makeResult(overrides?: Partial<ReorderResult>): ReorderResult {
  const contigsTab =
    makePreamble() +
    '\n' +
    'Ordered Contigs\n' +
    'type\tlabel\tcontig\tstrand\tleft\tright\n' +
    'contig\tc1\tchromosome\tforward\t1\t1000\n' +
    'contig\tc2\tchromosome\tforward\t1001\t2000\n' +
    '\n' +
    'Contigs to reverse\n' +
    'type\tlabel\tcontig\tstrand\tleft\tright\n' +
    'contig\tc2\tchromosome\tcomplement\t1001\t2000\n' +
    '\n';

  return {
    sequence: '>c1\nATCG\n>c2\nGCTA',
    contigsTab,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createResultsViewer — rendering', () => {
  it('opens a dialog', () => {
    const handle = createResultsViewer(container, makeResult(), 3, {});
    expect(handle.element).toBeInstanceOf(HTMLDialogElement);
    expect(handle.element.open).toBe(true);
    handle.destroy();
  });

  it('displays the iteration count in the summary', () => {
    const handle = createResultsViewer(container, makeResult(), 5, {});
    const summary = handle.element.querySelector('.reorder-summary');
    expect(summary?.textContent).toContain('5');
    handle.destroy();
  });

  it('shows ordered contigs in a table', () => {
    const handle = createResultsViewer(container, makeResult(), 2, {});
    const rows = handle.element.querySelectorAll('.reorder-contigs-table tbody tr');
    // Two ordered contigs + one section for reversed
    expect(rows.length).toBeGreaterThanOrEqual(2);
    handle.destroy();
  });

  it('displays contig names', () => {
    const handle = createResultsViewer(container, makeResult(), 1, {});
    expect(handle.element.textContent).toContain('c1');
    expect(handle.element.textContent).toContain('c2');
    handle.destroy();
  });

  it('shows a forward strand badge', () => {
    const handle = createResultsViewer(container, makeResult(), 1, {});
    const fwdBadge = handle.element.querySelector('.strand-forward');
    expect(fwdBadge).not.toBeNull();
    handle.destroy();
  });

  it('shows a complement strand badge for reversed contigs', () => {
    const handle = createResultsViewer(container, makeResult(), 1, {});
    const compBadge = handle.element.querySelector('.strand-complement');
    expect(compBadge).not.toBeNull();
    handle.destroy();
  });

  it('shows "None" in an empty section', () => {
    const result = makeResult({
      contigsTab:
        'Ordered Contigs\n' +
        'type\tlabel\tcontig\tstrand\tleft\tright\n' +
        'contig\tc1\tchromosome\tforward\t1\t1000\n',
    });
    const handle = createResultsViewer(container, result, 1, {});
    // Reversed and conflicted sections should show "None"
    const empties = handle.element.querySelectorAll('.reorder-empty');
    expect(empties.length).toBeGreaterThanOrEqual(1);
    handle.destroy();
  });
});

describe('createResultsViewer — Load Alignment button', () => {
  it('shows Load Alignment button when onLoadAlignment is provided', () => {
    const handle = createResultsViewer(container, makeResult(), 3, {
      onLoadAlignment: vi.fn(),
    });
    const loadBtn = handle.element.querySelector('.reorder-load-btn');
    expect(loadBtn).not.toBeNull();
    handle.destroy();
  });

  it('does not show Load Alignment button when onLoadAlignment is absent', () => {
    const handle = createResultsViewer(container, makeResult(), 3, {});
    const loadBtn = handle.element.querySelector('.reorder-load-btn');
    expect(loadBtn).toBeNull();
    handle.destroy();
  });

  it('calls onLoadAlignment with sequence and iteration count when clicked', () => {
    const onLoadAlignment = vi.fn();
    const result = makeResult();
    const handle = createResultsViewer(container, result, 4, { onLoadAlignment });

    const loadBtn = handle.element.querySelector('.reorder-load-btn') as HTMLButtonElement;
    loadBtn.click();

    expect(onLoadAlignment).toHaveBeenCalledWith(result.sequence, 4);
  });

  it('closes dialog after Load Alignment is clicked', () => {
    const handle = createResultsViewer(container, makeResult(), 1, {
      onLoadAlignment: vi.fn(),
    });

    const loadBtn = handle.element.querySelector('.reorder-load-btn') as HTMLButtonElement;
    loadBtn.click();

    expect(handle.element.open).toBe(false);
  });
});

describe('createResultsViewer — Close button', () => {
  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    const handle = createResultsViewer(container, makeResult(), 2, { onClose });

    const closeBtn = handle.element.querySelector('.reorder-close-btn') as HTMLButtonElement;
    closeBtn.click();

    expect(onClose).toHaveBeenCalled();
  });

  it('removes dialog from DOM on close', () => {
    const handle = createResultsViewer(container, makeResult(), 1, {});
    const closeBtn = handle.element.querySelector('.reorder-close-btn') as HTMLButtonElement;
    closeBtn.click();

    expect(container.contains(handle.element)).toBe(false);
  });
});

describe('createResultsViewer — destroy', () => {
  it('closes and removes the dialog', () => {
    const handle = createResultsViewer(container, makeResult(), 1, {});
    handle.destroy();

    expect(handle.element.open).toBe(false);
    expect(container.contains(handle.element)).toBe(false);
  });

  it('escapes HTML in contig names', () => {
    const result = makeResult({
      contigsTab:
        'Ordered Contigs\n' +
        'type\tlabel\tcontig\tstrand\tleft\tright\n' +
        'contig\t<script>alert(1)</script>\tchromosome\tforward\t1\t100\n',
    });

    const handle = createResultsViewer(container, result, 1, {});
    expect(handle.element.innerHTML).not.toContain('<script>');
    expect(handle.element.innerHTML).toContain('&lt;script&gt;');
    handle.destroy();
  });
});
