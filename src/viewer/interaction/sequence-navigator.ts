import type { GenomicFeature } from '../../annotations/types.ts';
import type { AnnotationMap } from '../rendering/annotations.ts';
import { escapeHtml } from '../rendering/feature-tooltip.ts';

/** Search mode for feature queries */
export type SearchMode = 'exact' | 'contains';

/** A single search result matching a query */
export interface SearchResult {
  readonly genomeIndex: number;
  readonly genomeName: string;
  readonly feature: GenomicFeature;
  readonly matchedField: string;
  readonly matchedValue: string;
}

/** Callback when user selects a search result to navigate to */
export type NavigateToFeatureCallback = (genomeIndex: number, start: number, end: number) => void;

/** Callback when user navigates to a coordinate */
export type NavigateToPositionCallback = (genomeIndex: number, position: number) => void;

/** Handle for sequence navigator lifecycle */
export interface SequenceNavigatorHandle {
  readonly element: HTMLElement;
  readonly destroy: () => void;
}

/** Searchable qualifier fields per spec */
const SEARCHABLE_FIELDS: readonly string[] = [
  'locus_tag', 'gene', 'product', 'protein_id', 'note', 'db_xref',
];

/**
 * Search features across genomes by qualifier values.
 * Supports exact match and "contains" modes.
 */
export function searchFeatures(
  annotations: AnnotationMap,
  genomeNames: readonly string[],
  query: string,
  mode: SearchMode,
  scopeGenomeIndex?: number,
): readonly SearchResult[] {
  if (query.trim().length === 0) return [];

  const normalizedQuery = query.trim().toLowerCase();
  const results: SearchResult[] = [];

  for (const [genomeIndex, genomeAnnotations] of annotations) {
    if (scopeGenomeIndex !== undefined && genomeIndex !== scopeGenomeIndex) continue;

    const genomeName = genomeNames[genomeIndex - 1] ?? `Genome ${genomeIndex}`;

    for (const feature of genomeAnnotations.features) {
      for (const field of SEARCHABLE_FIELDS) {
        const value = feature.qualifiers[field];
        if (value === undefined) continue;

        const normalizedValue = value.toLowerCase();
        const matches = mode === 'exact'
          ? normalizedValue === normalizedQuery
          : normalizedValue.includes(normalizedQuery);

        if (matches) {
          results.push({
            genomeIndex,
            genomeName,
            feature,
            matchedField: field,
            matchedValue: value,
          });
          break; // One match per feature is enough
        }
      }
    }
  }

  return results;
}

/**
 * Create the sequence navigator UI panel.
 * Provides feature search with exact/contains modes,
 * per-genome scope filtering, and direct coordinate navigation.
 */
export function createSequenceNavigator(
  container: HTMLElement,
  annotations: AnnotationMap,
  genomeNames: readonly string[],
  onNavigateToFeature: NavigateToFeatureCallback,
  onNavigateToPosition: NavigateToPositionCallback,
  onClose?: () => void,
): SequenceNavigatorHandle {
  const panel = document.createElement('div');
  panel.className = 'sequence-navigator';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Sequence navigator');

  const genomeOptions = genomeNames
    .map((name, i) => `<option value="${i + 1}">${escapeHtml(name)}</option>`)
    .join('');

  panel.innerHTML = `
    <div class="seq-nav-header">
      <h3>Sequence Navigator</h3>
      <button type="button" class="seq-nav-close" aria-label="Close navigator">\u00D7</button>
    </div>
    <div class="seq-nav-tabs">
      <button type="button" class="seq-nav-tab active" data-tab="search">Find Features</button>
      <button type="button" class="seq-nav-tab" data-tab="goto">Go To Position</button>
    </div>
    <div class="seq-nav-panel seq-nav-search-panel">
      <div class="seq-nav-field">
        <input type="text" class="seq-nav-query" placeholder="Search features..." aria-label="Search query" />
      </div>
      <div class="seq-nav-options">
        <select class="seq-nav-mode" aria-label="Search mode">
          <option value="contains">Contains</option>
          <option value="exact">Exact match</option>
        </select>
        <select class="seq-nav-scope" aria-label="Genome scope">
          <option value="all">All genomes</option>
          ${genomeOptions}
        </select>
      </div>
      <button type="button" class="seq-nav-search-btn">Search</button>
      <div class="seq-nav-results" role="list" aria-label="Search results"></div>
    </div>
    <div class="seq-nav-panel seq-nav-goto-panel" style="display:none">
      <div class="seq-nav-field">
        <select class="seq-nav-goto-genome" aria-label="Target genome">
          ${genomeOptions}
        </select>
      </div>
      <div class="seq-nav-field">
        <input type="number" class="seq-nav-position" placeholder="Position" min="1" aria-label="Coordinate position" />
      </div>
      <button type="button" class="seq-nav-goto-btn">Go</button>
    </div>
  `;

  container.appendChild(panel);

  // Elements
  const closeBtn = panel.querySelector('.seq-nav-close') as HTMLButtonElement;
  const tabs = panel.querySelectorAll('.seq-nav-tab');
  const searchPanel = panel.querySelector('.seq-nav-search-panel') as HTMLElement;
  const gotoPanel = panel.querySelector('.seq-nav-goto-panel') as HTMLElement;
  const queryInput = panel.querySelector('.seq-nav-query') as HTMLInputElement;
  const modeSelect = panel.querySelector('.seq-nav-mode') as HTMLSelectElement;
  const scopeSelect = panel.querySelector('.seq-nav-scope') as HTMLSelectElement;
  const searchBtn = panel.querySelector('.seq-nav-search-btn') as HTMLButtonElement;
  const resultsDiv = panel.querySelector('.seq-nav-results') as HTMLElement;
  const gotoGenome = panel.querySelector('.seq-nav-goto-genome') as HTMLSelectElement;
  const positionInput = panel.querySelector('.seq-nav-position') as HTMLInputElement;
  const gotoBtn = panel.querySelector('.seq-nav-goto-btn') as HTMLButtonElement;

  // Tab switching
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const tabName = (tab as HTMLElement).dataset['tab'];
      searchPanel.style.display = tabName === 'search' ? '' : 'none';
      gotoPanel.style.display = tabName === 'goto' ? '' : 'none';
    });
  });

  // Search
  function performSearch(): void {
    const query = queryInput.value;
    const mode = modeSelect.value as SearchMode;
    const scopeValue = scopeSelect.value;
    const scopeGenomeIndex = scopeValue === 'all' ? undefined : parseInt(scopeValue, 10);

    const results = searchFeatures(annotations, genomeNames, query, mode, scopeGenomeIndex);
    renderResults(results);
  }

  function renderResults(results: readonly SearchResult[]): void {
    if (results.length === 0) {
      resultsDiv.innerHTML = '<div class="seq-nav-no-results">No features found</div>';
      return;
    }

    const html = results.slice(0, 100).map((r) => {
      const locusTag = r.feature.qualifiers['locus_tag'] ?? '';
      const gene = r.feature.qualifiers['gene'] ?? '';
      const product = r.feature.qualifiers['product'] ?? '';
      const coords = `${r.feature.start.toLocaleString()}-${r.feature.end.toLocaleString()}`;

      return `<div class="seq-nav-result" role="listitem" data-genome="${r.genomeIndex}" data-start="${r.feature.start}" data-end="${r.feature.end}">
        <div class="seq-nav-result-header">
          <span class="seq-nav-result-type">${escapeHtml(r.feature.type)}</span>
          <span class="seq-nav-result-genome">${escapeHtml(r.genomeName)}</span>
        </div>
        <div class="seq-nav-result-info">
          ${locusTag ? `<strong>${escapeHtml(locusTag)}</strong>` : ''}
          ${gene ? ` (${escapeHtml(gene)})` : ''}
          ${product ? ` - ${escapeHtml(product)}` : ''}
        </div>
        <div class="seq-nav-result-coords">${coords} (${escapeHtml(String(r.feature.strand))})</div>
      </div>`;
    }).join('');

    resultsDiv.innerHTML = html;

    if (results.length > 100) {
      resultsDiv.insertAdjacentHTML('beforeend', `<div class="seq-nav-more">...and ${results.length - 100} more results</div>`);
    }

    // Click handlers for results
    resultsDiv.querySelectorAll('.seq-nav-result').forEach((el) => {
      el.addEventListener('click', () => {
        const genomeIndex = parseInt((el as HTMLElement).dataset['genome'] ?? '0', 10);
        const start = parseInt((el as HTMLElement).dataset['start'] ?? '0', 10);
        const end = parseInt((el as HTMLElement).dataset['end'] ?? '0', 10);
        onNavigateToFeature(genomeIndex, start, end);
      });
    });
  }

  searchBtn.addEventListener('click', performSearch);
  queryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  });

  // Go to position
  gotoBtn.addEventListener('click', () => {
    const genomeIndex = parseInt(gotoGenome.value, 10);
    const position = parseInt(positionInput.value, 10);
    if (!isNaN(genomeIndex) && !isNaN(position) && position > 0) {
      onNavigateToPosition(genomeIndex, position);
    }
  });

  positionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      gotoBtn.click();
    }
  });

  // Close
  closeBtn.addEventListener('click', () => {
    destroy();
  });

  // Ctrl+I shortcut to open/focus
  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      destroy();
    }
  }
  document.addEventListener('keydown', onKeyDown);

  // Focus search input on open
  queryInput.focus();

  function destroy(): void {
    document.removeEventListener('keydown', onKeyDown);
    panel.remove();
    onClose?.();
  }

  return { element: panel, destroy };
}

/**
 * Set up Ctrl+I keyboard shortcut to open the sequence navigator.
 * Returns a cleanup function.
 */
export function setupNavigatorShortcut(
  getContainer: () => HTMLElement,
  annotations: AnnotationMap,
  genomeNames: readonly string[],
  onNavigateToFeature: NavigateToFeatureCallback,
  onNavigateToPosition: NavigateToPositionCallback,
): () => void {
  let navigatorHandle: SequenceNavigatorHandle | undefined;

  function clearHandle(): void {
    navigatorHandle = undefined;
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.ctrlKey && e.key === 'i') {
      e.preventDefault();
      if (navigatorHandle) {
        navigatorHandle.destroy();
        navigatorHandle = undefined;
      } else {
        navigatorHandle = createSequenceNavigator(
          getContainer(),
          annotations,
          genomeNames,
          onNavigateToFeature,
          onNavigateToPosition,
          clearHandle,
        );
      }
    }
  }

  document.addEventListener('keydown', onKeyDown);

  return () => {
    document.removeEventListener('keydown', onKeyDown);
    navigatorHandle?.destroy();
  };
}
