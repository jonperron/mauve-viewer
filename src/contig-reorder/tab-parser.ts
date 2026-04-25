/**
 * Parser for *_contigs.tab files produced by the Mauve Contig Mover (MCM).
 *
 * The file format produced by org.gel.mauve.contigs.ContigFeatureWriter:
 *
 *   <preamble paragraph>
 *
 *   Contigs to reverse
 *   type\tlabel\tcontig\tstrand\tleft\tright
 *   contig\t<name>\tchromosome\tcomplement\t<start>\t<end>
 *   ...
 *
 *   Ordered Contigs
 *   type\tlabel\tcontig\tstrand\tleft\tright
 *   contig\t<name>\tchromosome\tforward\t<start>\t<end>
 *   ...
 *
 *   Contigs with conflicting ordering information
 *   type\tlabel\tcontig\tstrand\tleft\tright
 *   contig\t<name>\tchromosome\tforward\t<start>\t<end>
 *   ...
 */
import type { ParsedContigEntry, ParsedContigsTab, ContigStrand } from './types.ts';

/** Section titles as they appear verbatim in the tab file */
const SECTION_REVERSED = 'Contigs to reverse';
const SECTION_ORDERED = 'Ordered Contigs';
const SECTION_CONFLICTED = 'Contigs with conflicting ordering information';

const KNOWN_SECTIONS = [SECTION_REVERSED, SECTION_ORDERED, SECTION_CONFLICTED] as const;

type KnownSection = (typeof KNOWN_SECTIONS)[number];

function isKnownSection(line: string): line is KnownSection {
  return KNOWN_SECTIONS.includes(line as KnownSection);
}

function isHeaderRow(line: string): boolean {
  return line.startsWith('type\t') || line.startsWith('type ');
}

function parseStrand(value: string): ContigStrand {
  return value.trim() === 'complement' ? 'complement' : 'forward';
}

/**
 * Parse a single data row from a *_contigs.tab section.
 *
 * Expected column order: type, label, contig, strand, left, right
 */
function parseRow(line: string): ParsedContigEntry | undefined {
  const cols = line.split('\t');
  if (cols.length < 6) return undefined;

  const name = cols[1]?.trim();
  const strandStr = cols[3]?.trim();
  const leftStr = cols[4]?.trim();
  const rightStr = cols[5]?.trim();

  if (!name || !strandStr || !leftStr || !rightStr) return undefined;

  const start = parseInt(leftStr, 10);
  const end = parseInt(rightStr, 10);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined;

  return { name, strand: parseStrand(strandStr), start, end };
}

/**
 * Parse the text content of a *_contigs.tab file into a structured object.
 *
 * Lines before the first recognised section header are treated as preamble
 * and ignored. Empty lines and the column-header row are also skipped.
 * Unrecognised section headers are silently ignored.
 */
export function parseContigsTab(content: string): ParsedContigsTab {
  const reversed: ParsedContigEntry[] = [];
  const ordered: ParsedContigEntry[] = [];
  const conflicted: ParsedContigEntry[] = [];

  let currentSection: KnownSection | undefined;

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trimEnd();

    if (line.trim() === '') continue;
    if (isHeaderRow(line)) continue;

    if (isKnownSection(line)) {
      currentSection = line;
      continue;
    }

    if (currentSection === undefined) continue;

    const entry = parseRow(line);
    if (entry === undefined) continue;

    switch (currentSection) {
      case SECTION_REVERSED:
        reversed.push(entry);
        break;
      case SECTION_ORDERED:
        ordered.push(entry);
        break;
      case SECTION_CONFLICTED:
        conflicted.push(entry);
        break;
    }
  }

  return { toReverse: reversed, ordered, conflicted };
}
