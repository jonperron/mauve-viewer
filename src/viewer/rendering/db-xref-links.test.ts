import { describe, it, expect } from 'vitest';
import { resolveDbXrefLink, parseDbXrefLinks } from './db-xref-links.ts';

describe('resolveDbXrefLink', () => {
  describe('GeneID', () => {
    it('returns NCBI Gene link', () => {
      const link = resolveDbXrefLink('GeneID:12345');
      expect(link).not.toBeNull();
      expect(link!.url).toBe('https://www.ncbi.nlm.nih.gov/gene/12345');
      expect(link!.label).toContain('NCBI Gene');
      expect(link!.label).toContain('12345');
    });
  });

  describe('UniProtKB', () => {
    it('returns UniProt link for UniProtKB prefix', () => {
      const link = resolveDbXrefLink('UniProtKB:P12345');
      expect(link).not.toBeNull();
      expect(link!.url).toBe('https://www.uniprot.org/uniprot/P12345');
      expect(link!.label).toContain('UniProt');
    });

    it('returns UniProt link for UniProtKB/Swiss-Prot prefix', () => {
      const link = resolveDbXrefLink('UniProtKB/Swiss-Prot:P12345');
      expect(link).not.toBeNull();
      expect(link!.url).toBe('https://www.uniprot.org/uniprot/P12345');
    });

    it('returns UniProt link for UniProtKB/TrEMBL prefix', () => {
      const link = resolveDbXrefLink('UniProtKB/TrEMBL:A0A000ABC1');
      expect(link).not.toBeNull();
      expect(link!.url).toBe('https://www.uniprot.org/uniprot/A0A000ABC1');
    });
  });

  describe('PDB', () => {
    it('returns RCSB PDB link', () => {
      const link = resolveDbXrefLink('PDB:1ABC');
      expect(link).not.toBeNull();
      expect(link!.url).toBe('https://www.rcsb.org/structure/1ABC');
      expect(link!.label).toContain('PDB');
      expect(link!.label).toContain('1ABC');
    });
  });

  describe('GO', () => {
    it('returns QuickGO link', () => {
      const link = resolveDbXrefLink('GO:0006412');
      expect(link).not.toBeNull();
      expect(link!.url).toBe('https://www.ebi.ac.uk/QuickGO/term/GO:0006412');
      expect(link!.label).toContain('GO');
    });
  });

  describe('InterPro', () => {
    it('returns InterPro link', () => {
      const link = resolveDbXrefLink('InterPro:IPR001234');
      expect(link).not.toBeNull();
      expect(link!.url).toBe('https://www.ebi.ac.uk/interpro/entry/InterPro/IPR001234/');
      expect(link!.label).toContain('InterPro');
      expect(link!.label).toContain('IPR001234');
    });
  });

  describe('KEGG', () => {
    it('returns KEGG link for organism:gene format', () => {
      const link = resolveDbXrefLink('KEGG:eco:b0001');
      expect(link).not.toBeNull();
      expect(link!.url).toBe('https://www.genome.jp/dbget-bin/www_bget?eco:b0001');
      expect(link!.label).toContain('KEGG');
    });

    it('returns null for KEGG with invalid id format', () => {
      const link = resolveDbXrefLink('KEGG:invalid id with spaces');
      expect(link).toBeNull();
    });
  });

  describe('unknown databases', () => {
    it('returns null for unrecognized prefix', () => {
      expect(resolveDbXrefLink('UnknownDB:12345')).toBeNull();
    });

    it('returns null for malformed xref without colon', () => {
      expect(resolveDbXrefLink('GeneID12345')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(resolveDbXrefLink('')).toBeNull();
    });

    it('returns null when id is empty', () => {
      expect(resolveDbXrefLink('GeneID:')).toBeNull();
    });
  });

  describe('security', () => {
    it('encodes special characters in GeneID', () => {
      const link = resolveDbXrefLink('GeneID:<script>');
      expect(link).not.toBeNull();
      expect(link!.url).not.toContain('<script>');
    });

    it('encodes special characters in UniProtKB id', () => {
      const link = resolveDbXrefLink('UniProtKB:</p>');
      expect(link).not.toBeNull();
      expect(link!.url).not.toContain('</p>');
    });

    it('rejects KEGG id with special characters', () => {
      const link = resolveDbXrefLink('KEGG:eco:<script>');
      expect(link).toBeNull();
    });
  });
});

describe('parseDbXrefLinks', () => {
  it('parses single xref', () => {
    const links = parseDbXrefLinks('GeneID:12345');
    expect(links).toHaveLength(1);
    expect(links[0].url).toContain('12345');
  });

  it('parses multiple semicolon-separated xrefs', () => {
    const links = parseDbXrefLinks('GeneID:12345; UniProtKB:P12345; PDB:1ABC');
    expect(links).toHaveLength(3);
  });

  it('skips unrecognized databases', () => {
    const links = parseDbXrefLinks('GeneID:12345; UnknownDB:abc');
    expect(links).toHaveLength(1);
    expect(links[0].url).toContain('12345');
  });

  it('returns empty array for empty string', () => {
    expect(parseDbXrefLinks('')).toHaveLength(0);
  });

  it('handles whitespace around semicolons', () => {
    const links = parseDbXrefLinks('GeneID:12345 ; UniProtKB:P12345');
    expect(links).toHaveLength(2);
  });

  it('skips empty tokens from trailing semicolons', () => {
    const links = parseDbXrefLinks('GeneID:12345;');
    expect(links).toHaveLength(1);
  });
});
