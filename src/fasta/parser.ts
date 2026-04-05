import type { FastaEntry, FastaResult } from './types.ts';

const MAX_ENTRIES = 100_000;
const MAX_SEQUENCE_LENGTH = 100_000_000;

/** Parse a FASTA/Multi-FASTA file into individual entries */
export function parseFasta(content: string): FastaResult {
  if (!content.trim()) {
    throw new Error('Empty FASTA content');
  }

  const lines = content.split(/\r?\n/);
  const entries: FastaEntry[] = [];
  let currentHeader: string | null = null;
  let sequenceParts: string[] = [];
  let sequenceLength = 0;

  const flushEntry = () => {
    if (currentHeader !== null) {
      if (entries.length >= MAX_ENTRIES) {
        throw new Error(`Too many FASTA entries (max ${MAX_ENTRIES})`);
      }
      entries.push({
        header: currentHeader,
        sequence: sequenceParts.join(''),
      });
      currentHeader = null;
      sequenceParts = [];
      sequenceLength = 0;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    if (trimmed.startsWith('>')) {
      flushEntry();
      currentHeader = trimmed.slice(1).trim();
      continue;
    }

    if (trimmed.startsWith(';')) continue;

    if (currentHeader === null) {
      throw new Error('Sequence data found before header line');
    }

    sequenceLength += trimmed.length;
    if (sequenceLength > MAX_SEQUENCE_LENGTH) {
      throw new Error(`Sequence too large (max ${MAX_SEQUENCE_LENGTH} characters)`);
    }
    sequenceParts.push(trimmed);
  }

  flushEntry();

  if (entries.length === 0) {
    throw new Error('No FASTA entries found');
  }

  return { entries };
}

/**
 * Concatenate all FASTA entries into a single genome sequence.
 * Used for multi-chromosomal genomes stored as Multi-FASTA.
 */
export function concatenateFastaEntries(
  entries: readonly FastaEntry[],
): string {
  return entries.map((e) => e.sequence).join('');
}
