const VALID_RAW_SEQUENCE = /^[ACGTURYSWKMBDHVN]+$/i;

/** Parse a raw nucleotide file into a normalized upper-case sequence string. */
export function parseRawSequence(content: string): string {
  const normalized = content.replace(/\s+/g, '').toUpperCase();
  if (!normalized) {
    throw new Error('Empty raw sequence content');
  }

  if (!VALID_RAW_SEQUENCE.test(normalized)) {
    const invalid = normalized.match(/[^ACGTURYSWKMBDHVN]/i)?.[0] ?? '?';
    throw new Error(`Invalid raw sequence character: ${invalid}`);
  }

  return normalized;
}