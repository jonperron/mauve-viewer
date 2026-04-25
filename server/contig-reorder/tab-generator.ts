/**
 * Generates *_contigs.tab file content for Mauve Contig Mover (MCM) results.
 *
 * The output format mirrors org.gel.mauve.contigs.ContigFeatureWriter:
 * - A descriptive header paragraph
 * - Three sections: "Contigs to reverse", "Ordered Contigs",
 *   "Contigs with conflicting ordering information"
 * - Each section has tab-delimited column headers and data rows
 *
 * Mirrors: org.gel.mauve.contigs.ContigFeatureWriter
 */

/** Column headers used in all sections of *_contigs.tab */
const COLUMN_HEADERS = ['type', 'label', 'contig', 'strand', 'left', 'right'] as const;

/** Fixed type value for all contig rows */
const CONTIG_TYPE = 'contig';
/** Fixed label value for all contig rows */
const CHROMOSOME_LABEL = 'chromosome';

/** Strand label for forward-oriented contigs */
const FORWARD = 'forward';
/** Strand label for reverse-complemented contigs */
const COMPLEMENT = 'complement';

/** Section header names as emitted by ContigFeatureWriter */
export const SECTION_REVERSED = 'Contigs to reverse';
export const SECTION_ORDERED = 'Ordered Contigs';
export const SECTION_CONFLICTED = 'Contigs with conflicting ordering information';

/**
 * Preamble text matching ContigFeatureWriter.printHeaderInfoForFile().
 */
export const PREAMBLE =
  'Contigs in Reversed Category are those reversed from the order immediately preceding.\n' +
  '  The strand is forward if the contig is oriented the same as the original input,\n' +
  'and complement otherwise.  The left and right ends are in\n' +
  'pseudomolecule coordinates.  The ordered contigs contain all contigs in the correct order,\n' +
  ' and those in the conflicted category had multiple possible orders.';

/** A contig entry with pseudomolecule coordinates for the tab file */
export interface TabContigEntry {
  readonly name: string;
  /** Pseudomolecule start coordinate (1-based) */
  readonly start: number;
  /** Pseudomolecule end coordinate (1-based, inclusive) */
  readonly end: number;
  /** true = forward strand (same as original input), false = complement */
  readonly forward: boolean;
}

/** Input for generating a complete *_contigs.tab file */
export interface ContigsTabInput {
  /** Contigs to reverse relative to their orientation in the previous iteration */
  readonly toReverse: readonly TabContigEntry[];
  /** All contigs in their new order with sequential pseudomolecule coordinates */
  readonly ordered: readonly TabContigEntry[];
  /** Contigs with ambiguous/conflicting reference placement */
  readonly conflicted: readonly TabContigEntry[];
}

function formatRow(entry: TabContigEntry): string {
  const strand = entry.forward ? FORWARD : COMPLEMENT;
  return [CONTIG_TYPE, entry.name, CHROMOSOME_LABEL, strand, entry.start, entry.end].join('\t');
}

function buildSection(title: string, entries: readonly TabContigEntry[]): string {
  if (entries.length === 0) return '';
  const header = COLUMN_HEADERS.join('\t');
  const rows = entries.map(formatRow).join('\n');
  return `${title}\n${header}\n${rows}\n\n`;
}

/**
 * Assign sequential pseudomolecule coordinates to a list of contigs.
 *
 * Each contig is allocated a coordinate range [cursor, cursor + length - 1],
 * matching ContigFeatureWriter.correctPseudoCoords().
 */
export function assignPseudocoordinates(
  names: readonly string[],
  lengths: ReadonlyMap<string, number>,
  forwardFlags: ReadonlyMap<string, boolean>,
): readonly TabContigEntry[] {
  const entries: TabContigEntry[] = [];
  let cursor = 1;

  for (const name of names) {
    const length = lengths.get(name) ?? 0;
    entries.push({
      name,
      start: cursor,
      end: cursor + Math.max(length - 1, 0),
      forward: forwardFlags.get(name) ?? true,
    });
    cursor += Math.max(length, 1);
  }

  return entries;
}

/**
 * Generate the full text content of a *_contigs.tab file.
 *
 * Sections are only emitted when they contain at least one entry.
 */
export function generateContigsTab(input: ContigsTabInput): string {
  const parts: string[] = [PREAMBLE, '\n\n'];

  parts.push(buildSection(SECTION_REVERSED, input.toReverse));
  parts.push(buildSection(SECTION_ORDERED, input.ordered));
  parts.push(buildSection(SECTION_CONFLICTED, input.conflicted));

  return parts.join('');
}
