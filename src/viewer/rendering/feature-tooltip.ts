import type { GenomicFeature } from '../../annotations/types.ts';
import { parseDbXrefLinks, type DbXrefLink } from './db-xref-links.ts';

/** Handle for the feature tooltip element */
export interface FeatureTooltipHandle {
  readonly show: (feature: GenomicFeature, event: MouseEvent) => void;
  readonly showDetails: (feature: GenomicFeature, event: MouseEvent) => void;
  readonly hide: () => void;
  readonly destroy: () => void;
}

function renderDbXrefLink(link: DbXrefLink): string {
  const safeUrl = link.url;
  return `<div><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a></div>`;
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function buildTooltipContent(feature: GenomicFeature): string {
  const gene = feature.qualifiers['gene'] ?? '';
  const product = feature.qualifiers['product'] ?? '';
  const locusTag = feature.qualifiers['locus_tag'] ?? '';

  const parts: string[] = [];
  if (locusTag) parts.push(`<b>${escapeHtml(locusTag)}</b>`);
  if (gene) parts.push(`<b>${escapeHtml(gene)}</b>`);

  const header = parts.length > 0 ? parts.join(' | ') : escapeHtml(feature.type);
  const productLine = product ? `<div>${escapeHtml(product)}</div>` : '';
  const coordLine = `<div>${escapeHtml(feature.type)} [${feature.start}..${feature.end}] (${feature.strand})</div>`;

  return `<div>${header}</div>${productLine}${coordLine}`;
}

export function buildDetailContent(feature: GenomicFeature): string {
  const lines: string[] = [];
  lines.push(`<div><b>${escapeHtml(feature.type)}</b> ${feature.start}..${feature.end} (${feature.strand})</div>`);

  const locusTag = feature.qualifiers['locus_tag'];
  if (locusTag) {
    lines.push(`<div>Locus tag: ${escapeHtml(locusTag)}</div>`);
  }

  const gene = feature.qualifiers['gene'];
  if (gene) {
    lines.push(`<div>Gene: ${escapeHtml(gene)}</div>`);
  }

  const product = feature.qualifiers['product'];
  if (product) {
    lines.push(`<div>Product: ${escapeHtml(product)}</div>`);
  }

  // Show all other qualifiers (skip db_xref — rendered as links below)
  for (const [key, value] of Object.entries(feature.qualifiers)) {
    if (key === 'gene' || key === 'product' || key === 'locus_tag' || key === 'translation' || key === 'db_xref') continue;
    lines.push(`<div>${escapeHtml(key)}: ${escapeHtml(value)}</div>`);
  }

  // NCBI Protein link from protein_id qualifier
  const proteinId = feature.qualifiers['protein_id'];
  if (proteinId) {
    const safeId = encodeURIComponent(proteinId);
    lines.push(
      `<div><a href="https://www.ncbi.nlm.nih.gov/protein/${safeId}" target="_blank" rel="noopener noreferrer">NCBI Protein: ${escapeHtml(proteinId)}</a></div>`,
    );
  }

  // Database cross-reference links from db_xref qualifier
  const dbXref = feature.qualifiers['db_xref'];
  if (dbXref) {
    const xrefLinks = parseDbXrefLinks(dbXref);
    for (const link of xrefLinks) {
      lines.push(renderDbXrefLink(link));
    }
  }

  return lines.join('');
}

/** Create a feature tooltip that attaches to the document body */
export function createFeatureTooltip(): FeatureTooltipHandle {
  const tooltip = document.createElement('div');
  tooltip.className = 'feature-tooltip';
  tooltip.style.position = 'absolute';
  tooltip.style.opacity = '0';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.background = 'rgba(255, 255, 255, 0.95)';
  tooltip.style.border = '1px solid #ccc';
  tooltip.style.borderRadius = '4px';
  tooltip.style.padding = '6px 10px';
  tooltip.style.fontSize = '12px';
  tooltip.style.fontFamily = 'sans-serif';
  tooltip.style.maxWidth = '400px';
  tooltip.style.zIndex = '1000';
  tooltip.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
  document.body.appendChild(tooltip);

  // Mutable state for close handler cleanup (intentional exception to immutability rule)
  let activeCloseHandler: ((e: MouseEvent) => void) | null = null;

  function show(feature: GenomicFeature, event: MouseEvent): void {
    cleanupCloseHandler();
    tooltip.innerHTML = buildTooltipContent(feature);
    tooltip.style.pointerEvents = 'none';
    tooltip.style.left = `${event.pageX + 15}px`;
    tooltip.style.top = `${event.pageY}px`;
    tooltip.style.opacity = '0.95';
  }

  function showDetails(feature: GenomicFeature, event: MouseEvent): void {
    cleanupCloseHandler();
    tooltip.innerHTML = buildDetailContent(feature);
    tooltip.style.pointerEvents = 'auto';
    tooltip.style.left = `${event.pageX + 15}px`;
    tooltip.style.top = `${event.pageY}px`;
    tooltip.style.opacity = '0.95';

    // Close on click outside
    const closeHandler = (e: MouseEvent) => {
      if (!tooltip.contains(e.target as Node)) {
        hide();
        cleanupCloseHandler();
      }
    };
    activeCloseHandler = closeHandler;
    // Delay adding listener to not catch the triggering click
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
  }

  function cleanupCloseHandler(): void {
    if (activeCloseHandler) {
      document.removeEventListener('click', activeCloseHandler);
      activeCloseHandler = null;
    }
  }

  function hide(): void {
    tooltip.style.opacity = '0';
    tooltip.style.pointerEvents = 'none';
  }

  function destroy(): void {
    cleanupCloseHandler();
    tooltip.remove();
  }

  return { show, showDetails, hide, destroy };
}
