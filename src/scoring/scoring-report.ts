/**
 * Scoring report dialog for assembly quality scoring results.
 *
 * Displays all assembly quality metrics in a tabbed modal dialog with five
 * sections: Structural, Sequence, Contigs, CDS, and Content. Also provides
 * export of the full report as a tab-delimited text file.
 */
import type { StructuralMetrics } from './structural-metrics.ts';
import type { SequenceMetrics } from './sequence-metrics.ts';
import type { ContigStats } from './contig-stats.ts';
import type { CdsQualityMetrics } from './cds-quality.ts';
import type { ContentMetrics } from './content-metrics.ts';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** All computed metrics passed to the scoring report dialog */
export interface ScoringReportMetrics {
  readonly structural: StructuralMetrics;
  readonly sequence: SequenceMetrics;
  readonly contigs: ContigStats;
  readonly cds: CdsQualityMetrics;
  readonly content: ContentMetrics;
}

/** Callbacks for the scoring report dialog */
export interface ScoringReportCallbacks {
  readonly onClose?: () => void;
}

/** Handle for the scoring report dialog lifecycle */
export interface ScoringReportHandle {
  readonly element: HTMLDialogElement;
  readonly destroy: () => void;
}

/** Tab identifiers for the scoring report */
export type ScoringReportTab =
  | 'structural'
  | 'sequence'
  | 'contigs'
  | 'cds'
  | 'content';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(2)}%`;
}

function buildMetricRow(label: string, value: string | number): string {
  return `
    <tr>
      <td class="scoring-metric-label">${escapeHtml(label)}</td>
      <td class="scoring-metric-value">${escapeHtml(String(value))}</td>
    </tr>
  `;
}

// ---------------------------------------------------------------------------
// Tab content builders
// ---------------------------------------------------------------------------

function buildStructuralTab(m: StructuralMetrics): string {
  const rows = [
    buildMetricRow('Contig count', m.contigCount),
    buildMetricRow('Replicon count', m.repliconCount),
    buildMetricRow('Assembly bases', m.assemblyBases.toLocaleString()),
    buildMetricRow('Reference bases', m.referenceBases.toLocaleString()),
    buildMetricRow('DCJ distance', m.distances.dcj),
    buildMetricRow('Breakpoint distance', m.distances.breakpoint),
    buildMetricRow('SCJ distance', m.distances.scj),
    buildMetricRow('Alignment blocks', m.distances.blocks),
    buildMetricRow('Type I errors (false positive joins)', m.typeIErrors),
    buildMetricRow('Type II errors (orientation inconsistencies)', m.typeIIErrors),
  ];

  return `
    <table class="scoring-metrics-table">
      <tbody>${rows.join('')}</tbody>
    </table>
  `;
}

function buildSubstitutionMatrix(m: SequenceMetrics): string {
  const bases = ['A', 'C', 'T', 'G'];
  const headerCols = bases.map((b) => `<th>${escapeHtml(b)}</th>`).join('');
  const bodyRows = m.substitutionMatrix.counts
    .map((row, i) => {
      const cells = row.map((v) => `<td>${v}</td>`).join('');
      return `<tr><th>${escapeHtml(bases[i] ?? '')}</th>${cells}</tr>`;
    })
    .join('');

  return `
    <table class="scoring-substitution-matrix" aria-label="Substitution matrix (row=reference, col=assembly)">
      <thead>
        <tr><th></th>${headerCols}</tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
}

function buildSequenceTab(m: SequenceMetrics): string {
  const rows = [
    buildMetricRow('Missed bases (assembly gaps)', m.missedBases.toLocaleString()),
    buildMetricRow('Missed bases (%)', formatPercent(m.missedBasesPercent)),
    buildMetricRow('Extra bases (reference gaps)', m.extraBases.toLocaleString()),
    buildMetricRow('Extra bases (%)', formatPercent(m.extraBasesPercent)),
    buildMetricRow('SNP count', m.snpCount.toLocaleString()),
    buildMetricRow('Assembly gap runs', m.assemblyGaps.length.toLocaleString()),
    buildMetricRow('Reference gap runs', m.refGaps.length.toLocaleString()),
  ];

  return `
    <table class="scoring-metrics-table">
      <tbody>${rows.join('')}</tbody>
    </table>
    <h4>Substitution Matrix</h4>
    <p class="scoring-matrix-hint">Row = reference base, Column = assembly base. A=0, C=1, T=2, G=3.</p>
    ${buildSubstitutionMatrix(m)}
  `;
}

function buildContigsTab(m: ContigStats): string {
  const rows = [
    buildMetricRow('N50', m.n50.toLocaleString()),
    buildMetricRow('N90', m.n90.toLocaleString()),
    buildMetricRow('Minimum contig length', m.minLength.toLocaleString()),
    buildMetricRow('Maximum contig length', m.maxLength.toLocaleString()),
    buildMetricRow('Number of contigs', m.lengthDistribution.length.toLocaleString()),
  ];

  const distRows = m.lengthDistribution
    .map(
      (len, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${len.toLocaleString()}</td>
      </tr>
    `,
    )
    .join('');

  const distTable =
    m.lengthDistribution.length === 0
      ? '<p class="scoring-empty">No contigs.</p>'
      : `
        <table class="scoring-contig-lengths-table">
          <thead>
            <tr><th>#</th><th>Length (bp)</th></tr>
          </thead>
          <tbody>${distRows}</tbody>
        </table>
      `;

  return `
    <table class="scoring-metrics-table">
      <tbody>${rows.join('')}</tbody>
    </table>
    <h4>Contig Length Distribution</h4>
    ${distTable}
  `;
}

function buildCdsRow(brokenCds: CdsQualityMetrics['brokenCds'][number]): string {
  return `
    <tr>
      <td>${escapeHtml(brokenCds.featureId)}</td>
      <td>${brokenCds.frameshifts.length}</td>
      <td>${brokenCds.prematureStops.length}</td>
      <td>${brokenCds.aaSubstitutions.length}</td>
    </tr>
  `;
}

function buildCdsTab(m: CdsQualityMetrics): string {
  const summaryRows = [
    buildMetricRow('Total CDS analyzed', m.totalCds),
    buildMetricRow('Complete CDS', m.completeCds),
    buildMetricRow('Broken CDS', m.brokenCdsCount),
    buildMetricRow('Frameshift mutations', m.frameshiftCount),
    buildMetricRow('Premature stop codons', m.prematureStopCount),
    buildMetricRow('Amino acid substitutions', m.aaSubstitutionCount),
  ];

  const brokenTable =
    m.brokenCds.length === 0
      ? '<p class="scoring-empty">No broken CDS detected.</p>'
      : `
        <table class="scoring-broken-cds-table">
          <thead>
            <tr>
              <th>Feature ID</th>
              <th>Frameshifts</th>
              <th>Premature Stops</th>
              <th>AA Substitutions</th>
            </tr>
          </thead>
          <tbody>${m.brokenCds.map(buildCdsRow).join('')}</tbody>
        </table>
      `;

  return `
    <table class="scoring-metrics-table">
      <tbody>${summaryRows.join('')}</tbody>
    </table>
    <h4>Broken CDS Details</h4>
    ${brokenTable}
  `;
}

function buildContentTab(m: ContentMetrics): string {
  const missingRows = m.missingChromosomes
    .map(
      (chr) => `
      <tr>
        <td>${chr.chromosomeIndex}</td>
        <td>${escapeHtml(chr.name)}</td>
        <td>${chr.length.toLocaleString()}</td>
      </tr>
    `,
    )
    .join('');

  const missingTable =
    m.missingChromosomes.length === 0
      ? '<p class="scoring-empty">None.</p>'
      : `
        <table class="scoring-missing-chr-table">
          <thead>
            <tr><th>#</th><th>Name</th><th>Length (bp)</th></tr>
          </thead>
          <tbody>${missingRows}</tbody>
        </table>
      `;

  const extraRows = m.extraContigs
    .map(
      (c) => `
      <tr>
        <td>${c.genomeIndex}</td>
        <td>${escapeHtml(c.name)}</td>
        <td>${c.length.toLocaleString()}</td>
      </tr>
    `,
    )
    .join('');

  const extraTable =
    m.extraContigs.length === 0
      ? '<p class="scoring-empty">None.</p>'
      : `
        <table class="scoring-extra-contigs-table">
          <thead>
            <tr><th>Index</th><th>Name</th><th>Length (bp)</th></tr>
          </thead>
          <tbody>${extraRows}</tbody>
        </table>
      `;

  return `
    <h4>Missing Chromosomes (${m.missingChromosomeCount})</h4>
    ${missingTable}
    <h4>Extra Contigs (${m.extraContigCount})</h4>
    ${extraTable}
  `;
}

// ---------------------------------------------------------------------------
// Dialog builder
// ---------------------------------------------------------------------------

const TAB_LABELS: readonly { id: ScoringReportTab; label: string }[] = [
  { id: 'structural', label: 'Structural' },
  { id: 'sequence', label: 'Sequence' },
  { id: 'contigs', label: 'Contigs' },
  { id: 'cds', label: 'CDS' },
  { id: 'content', label: 'Content' },
];

function buildDialogHtml(metrics: ScoringReportMetrics): string {
  const tabButtons = TAB_LABELS.map(
    ({ id, label }, i) => `
    <button
      type="button"
      class="scoring-tab-btn${i === 0 ? ' scoring-tab-active' : ''}"
      data-tab="${escapeHtml(id)}"
      aria-selected="${i === 0 ? 'true' : 'false'}"
      role="tab"
    >${escapeHtml(label)}</button>
  `,
  ).join('');

  const tabPanels = [
    { id: 'structural', html: buildStructuralTab(metrics.structural) },
    { id: 'sequence', html: buildSequenceTab(metrics.sequence) },
    { id: 'contigs', html: buildContigsTab(metrics.contigs) },
    { id: 'cds', html: buildCdsTab(metrics.cds) },
    { id: 'content', html: buildContentTab(metrics.content) },
  ]
    .map(
      ({ id, html }, i) => `
      <div
        class="scoring-tab-panel${i === 0 ? ' scoring-tab-panel-active' : ''}"
        data-panel="${escapeHtml(id)}"
        role="tabpanel"
        aria-labelledby="scoring-tab-${escapeHtml(id)}"
        ${i !== 0 ? 'hidden' : ''}
      >
        ${html}
      </div>
    `,
    )
    .join('');

  return `
    <div class="scoring-report-content">
      <h3 class="scoring-report-title">Assembly Scoring Report</h3>
      <div class="scoring-tabs" role="tablist">
        ${tabButtons}
      </div>
      <div class="scoring-panels">
        ${tabPanels}
      </div>
      <div class="scoring-report-actions">
        <button type="button" class="scoring-export-btn">Export Report</button>
        <button type="button" class="scoring-close-btn">Close</button>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Tab switching
// ---------------------------------------------------------------------------

function activateTab(dialog: HTMLDialogElement, tabId: ScoringReportTab): void {
  const allBtns = dialog.querySelectorAll<HTMLButtonElement>('.scoring-tab-btn');
  const allPanels = dialog.querySelectorAll<HTMLElement>('.scoring-tab-panel');

  for (const btn of allBtns) {
    const active = btn.dataset['tab'] === tabId;
    btn.classList.toggle('scoring-tab-active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  }

  for (const panel of allPanels) {
    const active = panel.dataset['panel'] === tabId;
    panel.classList.toggle('scoring-tab-panel-active', active);
    panel.hidden = !active;
  }
}

// ---------------------------------------------------------------------------
// TSV export
// ---------------------------------------------------------------------------

/**
 * Generate a tab-delimited text report of all scoring metrics.
 *
 * Format: three columns — Section, Metric, Value — with a header row.
 * Each logical section is separated by a blank line.
 */
export function exportScoringReport(metrics: ScoringReportMetrics): string {
  const lines: string[] = ['Section\tMetric\tValue'];

  const row = (section: string, metric: string, value: string | number): void => {
    lines.push(`${section}\t${metric}\t${String(value)}`);
  };

  // Structural
  const s = metrics.structural;
  row('Structural', 'Contig count', s.contigCount);
  row('Structural', 'Replicon count', s.repliconCount);
  row('Structural', 'Assembly bases', s.assemblyBases);
  row('Structural', 'Reference bases', s.referenceBases);
  row('Structural', 'DCJ distance', s.distances.dcj);
  row('Structural', 'Breakpoint distance', s.distances.breakpoint);
  row('Structural', 'SCJ distance', s.distances.scj);
  row('Structural', 'Alignment blocks', s.distances.blocks);
  row('Structural', 'Type I errors', s.typeIErrors);
  row('Structural', 'Type II errors', s.typeIIErrors);
  lines.push('');

  // Sequence
  const q = metrics.sequence;
  row('Sequence', 'Missed bases', q.missedBases);
  row('Sequence', 'Missed bases (%)', (q.missedBasesPercent * 100).toFixed(4));
  row('Sequence', 'Extra bases', q.extraBases);
  row('Sequence', 'Extra bases (%)', (q.extraBasesPercent * 100).toFixed(4));
  row('Sequence', 'SNP count', q.snpCount);
  row('Sequence', 'Assembly gap runs', q.assemblyGaps.length);
  row('Sequence', 'Reference gap runs', q.refGaps.length);

  const bases = ['A', 'C', 'T', 'G'];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const refBase = bases[r] ?? '';
      const asmBase = bases[c] ?? '';
      row(
        'Sequence',
        `Substitution ${refBase}->${asmBase}`,
        q.substitutionMatrix.counts[r]?.[c] ?? 0,
      );
    }
  }
  lines.push('');

  // Contigs
  const ct = metrics.contigs;
  row('Contigs', 'N50', ct.n50);
  row('Contigs', 'N90', ct.n90);
  row('Contigs', 'Minimum length', ct.minLength);
  row('Contigs', 'Maximum length', ct.maxLength);
  row('Contigs', 'Count', ct.lengthDistribution.length);
  for (const [i, len] of ct.lengthDistribution.entries()) {
    row('Contigs', `Contig ${i + 1} length`, len);
  }
  lines.push('');

  // CDS
  const cds = metrics.cds;
  row('CDS', 'Total CDS', cds.totalCds);
  row('CDS', 'Complete CDS', cds.completeCds);
  row('CDS', 'Broken CDS', cds.brokenCdsCount);
  row('CDS', 'Frameshift count', cds.frameshiftCount);
  row('CDS', 'Premature stop count', cds.prematureStopCount);
  row('CDS', 'AA substitution count', cds.aaSubstitutionCount);
  for (const broken of cds.brokenCds) {
    row('CDS', `Broken: ${broken.featureId} frameshifts`, broken.frameshifts.length);
    row('CDS', `Broken: ${broken.featureId} premature stops`, broken.prematureStops.length);
    row('CDS', `Broken: ${broken.featureId} AA substitutions`, broken.aaSubstitutions.length);
  }
  lines.push('');

  // Content
  const cn = metrics.content;
  row('Content', 'Missing chromosomes', cn.missingChromosomeCount);
  for (const chr of cn.missingChromosomes) {
    row('Content', `Missing: ${chr.name}`, chr.length);
  }
  row('Content', 'Extra contigs', cn.extraContigCount);
  for (const ec of cn.extraContigs) {
    row('Content', `Extra: ${ec.name}`, ec.length);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

function triggerTsvDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/tab-separated-values' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a modal dialog displaying assembly scoring results in a tabbed layout.
 *
 * Five tabs: Structural, Sequence, Contigs, CDS, Content.
 * An "Export Report" button downloads a tab-delimited text file.
 *
 * @param container - Host element for the dialog
 * @param metrics   - All computed scoring metrics
 * @param callbacks - Lifecycle callbacks
 */
export function createScoringReport(
  container: HTMLElement,
  metrics: ScoringReportMetrics,
  callbacks: ScoringReportCallbacks,
): ScoringReportHandle {
  const dialog = document.createElement('dialog');
  dialog.className = 'scoring-report-dialog';
  dialog.setAttribute('aria-label', 'Assembly Scoring Report');
  dialog.setAttribute('role', 'dialog');
  dialog.innerHTML = buildDialogHtml(metrics);

  container.appendChild(dialog);
  dialog.showModal();

  const closeBtn = dialog.querySelector('.scoring-close-btn') as HTMLButtonElement;
  const exportBtn = dialog.querySelector('.scoring-export-btn') as HTMLButtonElement;
  const tabBtns = dialog.querySelectorAll<HTMLButtonElement>('.scoring-tab-btn');

  function destroy(): void {
    if (dialog.open) {
      dialog.close();
    }
    dialog.remove();
  }

  closeBtn.addEventListener('click', () => {
    callbacks.onClose?.();
    destroy();
  });

  exportBtn.addEventListener('click', () => {
    const tsv = exportScoringReport(metrics);
    triggerTsvDownload(tsv, 'assembly-scoring-report.tsv');
  });

  for (const btn of tabBtns) {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset['tab'] as ScoringReportTab | undefined;
      if (tabId !== undefined) {
        activateTab(dialog, tabId);
      }
    });
  }

  // Prevent native Escape key from closing the dialog
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
  });

  return { element: dialog, destroy };
}
