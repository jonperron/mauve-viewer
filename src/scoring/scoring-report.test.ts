import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createScoringReport, exportScoringReport } from './scoring-report.ts';
import type { ScoringReportMetrics } from './scoring-report.ts';
import type { StructuralMetrics } from './structural-metrics.ts';
import type { SequenceMetrics } from './sequence-metrics.ts';
import type { ContigStats } from './contig-stats.ts';
import type { CdsQualityMetrics } from './cds-quality.ts';
import type { ContentMetrics } from './content-metrics.ts';

// ---------------------------------------------------------------------------
// JSDOM stubs
// ---------------------------------------------------------------------------

beforeEach(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Helpers — fixture builders
// ---------------------------------------------------------------------------

function makeStructural(overrides?: Partial<StructuralMetrics>): StructuralMetrics {
  return {
    contigCount: 5,
    repliconCount: 1,
    assemblyBases: 500_000,
    referenceBases: 510_000,
    distances: { dcj: 3, breakpoint: 4, scj: 2, blocks: 10 },
    typeIErrors: 1,
    typeIIErrors: 2,
    ...overrides,
  };
}

function makeSequence(overrides?: Partial<SequenceMetrics>): SequenceMetrics {
  return {
    missedBases: 100,
    missedBasesPercent: 0.0002,
    extraBases: 50,
    extraBasesPercent: 0.0001,
    snpCount: 25,
    substitutionMatrix: {
      counts: [
        [0, 2, 1, 3],
        [4, 0, 1, 0],
        [2, 0, 0, 1],
        [0, 1, 2, 0],
      ],
    },
    refGaps: [{ genomeWidePosition: 100, length: 5 }],
    assemblyGaps: [{ genomeWidePosition: 200, length: 3 }],
    ...overrides,
  };
}

function makeContigStats(overrides?: Partial<ContigStats>): ContigStats {
  return {
    n50: 80_000,
    n90: 40_000,
    minLength: 10_000,
    maxLength: 150_000,
    lengthDistribution: [10_000, 50_000, 80_000, 150_000, 210_000],
    ...overrides,
  };
}

function makeCdsMetrics(overrides?: Partial<CdsQualityMetrics>): CdsQualityMetrics {
  return {
    totalCds: 10,
    completeCds: 8,
    brokenCdsCount: 2,
    frameshiftCount: 1,
    prematureStopCount: 2,
    aaSubstitutionCount: 5,
    brokenCds: [
      {
        genomeIndex: 0,
        featureId: 'geneA',
        peptideLength: 300,
        aaSubRate: 0.01,
        frameshifts: [{ startCodon: 50, endCodon: 51 }],
        gapSegments: [],
        aaSubstitutions: [
          { codonPosition: 10, refAa: 'A', assAa: 'G' },
          { codonPosition: 20, refAa: 'L', assAa: 'P' },
        ],
        prematureStops: [{ codonPosition: 200, originalAa: 'K' }],
        insertionStops: [],
      },
    ],
    ...overrides,
  };
}

function makeContentMetrics(overrides?: Partial<ContentMetrics>): ContentMetrics {
  return {
    missingChromosomes: [
      { chromosomeIndex: 2, name: 'chrB', length: 50_000 },
    ],
    missingChromosomeCount: 1,
    extraContigs: [
      { genomeIndex: 3, name: 'extraContig1', length: 5_000 },
    ],
    extraContigCount: 1,
    ...overrides,
  };
}

function makeMetrics(overrides?: Partial<ScoringReportMetrics>): ScoringReportMetrics {
  return {
    structural: makeStructural(),
    sequence: makeSequence(),
    contigs: makeContigStats(),
    cds: makeCdsMetrics(),
    content: makeContentMetrics(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createScoringReport — dialog rendering
// ---------------------------------------------------------------------------

describe('createScoringReport — rendering', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('creates an open dialog element', () => {
    const handle = createScoringReport(container, makeMetrics(), {});
    expect(handle.element).toBeInstanceOf(HTMLDialogElement);
    expect(handle.element.open).toBe(true);
    handle.destroy();
  });

  it('appends the dialog to the container', () => {
    const handle = createScoringReport(container, makeMetrics(), {});
    expect(container.contains(handle.element)).toBe(true);
    handle.destroy();
  });

  it('has five tab buttons', () => {
    const handle = createScoringReport(container, makeMetrics(), {});
    const buttons = handle.element.querySelectorAll('.scoring-tab-btn');
    expect(buttons).toHaveLength(5);
    handle.destroy();
  });

  it('has five tab panels', () => {
    const handle = createScoringReport(container, makeMetrics(), {});
    const panels = handle.element.querySelectorAll('.scoring-tab-panel');
    expect(panels).toHaveLength(5);
    handle.destroy();
  });

  it('activates Structural tab by default', () => {
    const handle = createScoringReport(container, makeMetrics(), {});
    const activeBtn = handle.element.querySelector('.scoring-tab-btn.scoring-tab-active');
    expect(activeBtn?.getAttribute('data-tab')).toBe('structural');
    handle.destroy();
  });

  it('shows structural panel by default and hides others', () => {
    const handle = createScoringReport(container, makeMetrics(), {});
    const activePanel = handle.element.querySelector('.scoring-tab-panel:not([hidden])');
    expect(activePanel?.getAttribute('data-panel')).toBe('structural');
    const hiddenPanels = handle.element.querySelectorAll('.scoring-tab-panel[hidden]');
    expect(hiddenPanels).toHaveLength(4);
    handle.destroy();
  });

  it('displays structural metrics values', () => {
    const handle = createScoringReport(container, makeMetrics(), {});
    const structuralPanel = handle.element.querySelector('[data-panel="structural"]');
    expect(structuralPanel?.textContent).toContain('5');   // contigCount
    expect(structuralPanel?.textContent).toContain('3');   // dcj distance
    handle.destroy();
  });

  it('renders an Export Report button', () => {
    const handle = createScoringReport(container, makeMetrics(), {});
    const btn = handle.element.querySelector('.scoring-export-btn');
    expect(btn).not.toBeNull();
    handle.destroy();
  });

  it('renders a Close button', () => {
    const handle = createScoringReport(container, makeMetrics(), {});
    const btn = handle.element.querySelector('.scoring-close-btn');
    expect(btn).not.toBeNull();
    handle.destroy();
  });
});

// ---------------------------------------------------------------------------
// createScoringReport — tab switching
// ---------------------------------------------------------------------------

describe('createScoringReport — tab switching', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('activates the clicked tab and deactivates the previous one', () => {
    const handle = createScoringReport(container, makeMetrics(), {});
    const seqBtn = handle.element.querySelector<HTMLButtonElement>(
      '[data-tab="sequence"]',
    );
    seqBtn?.click();

    const activeBtn = handle.element.querySelector('.scoring-tab-btn.scoring-tab-active');
    expect(activeBtn?.getAttribute('data-tab')).toBe('sequence');

    const activePanel = handle.element.querySelector('.scoring-tab-panel:not([hidden])');
    expect(activePanel?.getAttribute('data-panel')).toBe('sequence');
    handle.destroy();
  });

  it('hides all other panels when a tab is selected', () => {
    const handle = createScoringReport(container, makeMetrics(), {});
    const cdsBtn = handle.element.querySelector<HTMLButtonElement>('[data-tab="cds"]');
    cdsBtn?.click();

    const hiddenPanels = handle.element.querySelectorAll('.scoring-tab-panel[hidden]');
    expect(hiddenPanels).toHaveLength(4);
    handle.destroy();
  });

  it('each tab button has aria-selected updated', () => {
    const handle = createScoringReport(container, makeMetrics(), {});
    const contigsBtn = handle.element.querySelector<HTMLButtonElement>(
      '[data-tab="contigs"]',
    );
    contigsBtn?.click();

    expect(contigsBtn?.getAttribute('aria-selected')).toBe('true');
    const otherBtns = handle.element.querySelectorAll<HTMLButtonElement>(
      '.scoring-tab-btn:not([data-tab="contigs"])',
    );
    for (const btn of otherBtns) {
      expect(btn.getAttribute('aria-selected')).toBe('false');
    }
    handle.destroy();
  });
});

// ---------------------------------------------------------------------------
// createScoringReport — Close callback & destroy
// ---------------------------------------------------------------------------

describe('createScoringReport — close', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('calls onClose when Close button is clicked', () => {
    const onClose = vi.fn();
    const handle = createScoringReport(container, makeMetrics(), { onClose });
    const closeBtn = handle.element.querySelector<HTMLButtonElement>('.scoring-close-btn');
    closeBtn?.click();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('removes the dialog from the DOM after Close', () => {
    const handle = createScoringReport(container, makeMetrics(), {});
    const closeBtn = handle.element.querySelector<HTMLButtonElement>('.scoring-close-btn');
    closeBtn?.click();
    expect(container.contains(handle.element)).toBe(false);
  });

  it('destroy() removes the dialog from the DOM', () => {
    const handle = createScoringReport(container, makeMetrics(), {});
    handle.destroy();
    expect(container.contains(handle.element)).toBe(false);
  });

  it('destroy() is idempotent', () => {
    const handle = createScoringReport(container, makeMetrics(), {});
    expect(() => {
      handle.destroy();
      handle.destroy();
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// createScoringReport — content spot checks
// ---------------------------------------------------------------------------

describe('createScoringReport — content spot checks', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('shows CDS details in the CDS panel', () => {
    const handle = createScoringReport(container, makeMetrics(), {});
    const cdsBtn = handle.element.querySelector<HTMLButtonElement>('[data-tab="cds"]');
    cdsBtn?.click();
    const cdsPanel = handle.element.querySelector('[data-panel="cds"]');
    expect(cdsPanel?.textContent).toContain('geneA');
    handle.destroy();
  });

  it('shows "No broken CDS detected" when brokenCds is empty', () => {
    const metrics = makeMetrics({
      cds: makeCdsMetrics({ brokenCds: [], brokenCdsCount: 0 }),
    });
    const handle = createScoringReport(container, metrics, {});
    const cdsBtn = handle.element.querySelector<HTMLButtonElement>('[data-tab="cds"]');
    cdsBtn?.click();
    const cdsPanel = handle.element.querySelector('[data-panel="cds"]');
    expect(cdsPanel?.textContent).toContain('No broken CDS detected');
    handle.destroy();
  });

  it('shows missing chromosome names in content panel', () => {
    const handle = createScoringReport(container, makeMetrics(), {});
    const contentBtn = handle.element.querySelector<HTMLButtonElement>(
      '[data-tab="content"]',
    );
    contentBtn?.click();
    const contentPanel = handle.element.querySelector('[data-panel="content"]');
    expect(contentPanel?.textContent).toContain('chrB');
    handle.destroy();
  });

  it('shows "None." when no missing chromosomes', () => {
    const metrics = makeMetrics({
      content: makeContentMetrics({
        missingChromosomes: [],
        missingChromosomeCount: 0,
      }),
    });
    const handle = createScoringReport(container, metrics, {});
    const contentBtn = handle.element.querySelector<HTMLButtonElement>(
      '[data-tab="content"]',
    );
    contentBtn?.click();
    const contentPanel = handle.element.querySelector('[data-panel="content"]');
    expect(contentPanel?.textContent).toContain('None.');
    handle.destroy();
  });

  it('shows contig N50 in the contigs panel', () => {
    const handle = createScoringReport(container, makeMetrics(), {});
    const contigsBtn = handle.element.querySelector<HTMLButtonElement>(
      '[data-tab="contigs"]',
    );
    contigsBtn?.click();
    const contigsPanel = handle.element.querySelector('[data-panel="contigs"]');
    expect(contigsPanel?.textContent).toContain('80');
    handle.destroy();
  });

  it('shows "No contigs." when lengthDistribution is empty', () => {
    const metrics = makeMetrics({
      contigs: makeContigStats({ lengthDistribution: [], n50: 0, n90: 0 }),
    });
    const handle = createScoringReport(container, metrics, {});
    const contigsBtn = handle.element.querySelector<HTMLButtonElement>(
      '[data-tab="contigs"]',
    );
    contigsBtn?.click();
    const contigsPanel = handle.element.querySelector('[data-panel="contigs"]');
    expect(contigsPanel?.textContent).toContain('No contigs.');
    handle.destroy();
  });

  it('escapes HTML in chromosome names', () => {
    const metrics = makeMetrics({
      content: makeContentMetrics({
        missingChromosomes: [
          { chromosomeIndex: 1, name: '<script>alert(1)</script>', length: 1000 },
        ],
        missingChromosomeCount: 1,
      }),
    });
    const handle = createScoringReport(container, metrics, {});
    const html = handle.element.innerHTML;
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    handle.destroy();
  });

  it('escapes HTML in featureId of broken CDS', () => {
    const metrics = makeMetrics({
      cds: makeCdsMetrics({
        brokenCds: [
          {
            genomeIndex: 0,
            featureId: '<img src=x onerror=alert(1)>',
            peptideLength: 100,
            aaSubRate: 0.0,
            frameshifts: [],
            gapSegments: [],
            aaSubstitutions: [],
            prematureStops: [],
            insertionStops: [],
          },
        ],
        brokenCdsCount: 1,
      }),
    });
    const handle = createScoringReport(container, metrics, {});
    const cdsBtn = handle.element.querySelector<HTMLButtonElement>('[data-tab="cds"]');
    cdsBtn?.click();
    const html = handle.element.querySelector('[data-panel="cds"]')?.innerHTML ?? '';
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
    handle.destroy();
  });
});

// ---------------------------------------------------------------------------
// createScoringReport — Export button
// ---------------------------------------------------------------------------

describe('createScoringReport — Export button', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('triggers a download when Export Report is clicked', () => {
    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock');
    const mockRevokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    });

    // Stub anchor click to avoid JSDOM navigation error
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const handle = createScoringReport(container, makeMetrics(), {});
    const exportBtn = handle.element.querySelector<HTMLButtonElement>('.scoring-export-btn');
    exportBtn?.click();

    expect(mockCreateObjectURL).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    handle.destroy();
  });
});

// ---------------------------------------------------------------------------
// exportScoringReport — TSV output
// ---------------------------------------------------------------------------

describe('exportScoringReport — TSV format', () => {
  it('starts with a header row', () => {
    const tsv = exportScoringReport(makeMetrics());
    const firstLine = tsv.split('\n')[0];
    expect(firstLine).toBe('Section\tMetric\tValue');
  });

  it('contains Structural section rows', () => {
    const tsv = exportScoringReport(makeMetrics());
    expect(tsv).toContain('Structural\tContig count\t5');
    expect(tsv).toContain('Structural\tDCJ distance\t3');
  });

  it('contains Sequence section rows', () => {
    const tsv = exportScoringReport(makeMetrics());
    expect(tsv).toContain('Sequence\tSNP count\t25');
    expect(tsv).toContain('Sequence\tMissed bases\t100');
  });

  it('contains substitution matrix rows', () => {
    const tsv = exportScoringReport(makeMetrics());
    expect(tsv).toContain('Sequence\tSubstitution A->C\t2');
  });

  it('contains Contigs section rows', () => {
    const tsv = exportScoringReport(makeMetrics());
    expect(tsv).toContain('Contigs\tN50\t80000');
    expect(tsv).toContain('Contigs\tN90\t40000');
  });

  it('contains per-contig length rows', () => {
    const tsv = exportScoringReport(makeMetrics());
    expect(tsv).toContain('Contigs\tContig 1 length\t10000');
    expect(tsv).toContain('Contigs\tContig 5 length\t210000');
  });

  it('contains CDS section rows', () => {
    const tsv = exportScoringReport(makeMetrics());
    expect(tsv).toContain('CDS\tTotal CDS\t10');
    expect(tsv).toContain('CDS\tBroken CDS\t2');
  });

  it('contains per-gene broken CDS rows', () => {
    const tsv = exportScoringReport(makeMetrics());
    expect(tsv).toContain('CDS\tBroken: geneA frameshifts\t1');
    expect(tsv).toContain('CDS\tBroken: geneA premature stops\t1');
  });

  it('contains Content section rows', () => {
    const tsv = exportScoringReport(makeMetrics());
    expect(tsv).toContain('Content\tMissing chromosomes\t1');
    expect(tsv).toContain('Content\tMissing: chrB\t50000');
    expect(tsv).toContain('Content\tExtra contigs\t1');
    expect(tsv).toContain('Content\tExtra: extraContig1\t5000');
  });

  it('separates sections with blank lines', () => {
    const tsv = exportScoringReport(makeMetrics());
    // After structural rows, there should be a blank line
    expect(tsv).toMatch(/Structural\t.*\n\n/);
  });

  it('handles zero metrics without errors', () => {
    const metrics = makeMetrics({
      structural: makeStructural({ contigCount: 0, assemblyBases: 0 }),
      cds: makeCdsMetrics({ brokenCds: [], totalCds: 0 }),
      content: makeContentMetrics({ missingChromosomes: [], extraContigs: [] }),
      contigs: makeContigStats({ lengthDistribution: [] }),
    });
    expect(() => exportScoringReport(metrics)).not.toThrow();
  });
});
