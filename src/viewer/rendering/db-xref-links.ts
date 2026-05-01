/** A resolved database cross-reference link */
export interface DbXrefLink {
  readonly label: string;
  readonly url: string;
}

/** Supported db_xref database prefixes */
const UNIPROT_PREFIXES = new Set(['UniProtKB', 'UniProtKB/Swiss-Prot', 'UniProtKB/TrEMBL']);

/** Pattern for valid KEGG identifiers: organism:entry (e.g. eco:b0001) */
const KEGG_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]*:[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

/**
 * Map a single db_xref token (format "Database:ID") to a clickable link.
 * Returns null if the database is not supported or the identifier is invalid.
 */
export function resolveDbXrefLink(xref: string): DbXrefLink | null {
  const colonIdx = xref.indexOf(':');
  if (colonIdx === -1) return null;

  const db = xref.slice(0, colonIdx);
  const id = xref.slice(colonIdx + 1);

  if (!db || !id) return null;

  if (db === 'GeneID') {
    const safeId = encodeURIComponent(id);
    return { label: `NCBI Gene: ${id}`, url: `https://www.ncbi.nlm.nih.gov/gene/${safeId}` };
  }

  if (UNIPROT_PREFIXES.has(db)) {
    const safeId = encodeURIComponent(id);
    return { label: `UniProt: ${id}`, url: `https://www.uniprot.org/uniprot/${safeId}` };
  }

  if (db === 'PDB') {
    const safeId = encodeURIComponent(id);
    return { label: `PDB: ${id}`, url: `https://www.rcsb.org/structure/${safeId}` };
  }

  if (db === 'GO') {
    const safeId = encodeURIComponent(id);
    return { label: `GO: ${id}`, url: `https://www.ebi.ac.uk/QuickGO/term/GO:${safeId}` };
  }

  if (db === 'InterPro') {
    const safeId = encodeURIComponent(id);
    return { label: `InterPro: ${id}`, url: `https://www.ebi.ac.uk/interpro/entry/InterPro/${safeId}/` };
  }

  if (db === 'KEGG') {
    if (!KEGG_ID_PATTERN.test(id)) return null;
    return { label: `KEGG: ${id}`, url: `https://www.genome.jp/dbget-bin/www_bget?${id}` };
  }

  return null;
}

/**
 * Parse a db_xref qualifier string (semicolon-separated) and return all recognized links.
 * Unrecognized database prefixes are silently ignored.
 */
export function parseDbXrefLinks(dbXref: string): readonly DbXrefLink[] {
  if (!dbXref) return [];

  return dbXref
    .split(';')
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
    .reduce<DbXrefLink[]>((acc, token) => {
      const link = resolveDbXrefLink(token);
      if (link !== null) acc.push(link);
      return acc;
    }, []);
}
