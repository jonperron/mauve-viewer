## Why

Feature tooltips display raw `db_xref` qualifier strings without linking to the referenced databases, preventing users from quickly navigating to NCBI Gene, UniProt, PDB, GO, InterPro, or KEGG entries. Resolving these references to clickable links closes the gap with legacy Mauve's NCBI Entrez linking and extends it to a broader set of databases.

## What Changes

- New module `db-xref-links` resolves `Database:ID` tokens from `db_xref` qualifiers to clickable external URLs.
- Feature tooltips render recognized `db_xref` entries as `<a target="_blank" rel="noopener noreferrer">` links instead of raw text.
- Supported databases: GeneID (NCBI Gene), UniProtKB / UniProtKB/Swiss-Prot / UniProtKB/TrEMBL (UniProt), PDB (RCSB), GO (QuickGO), InterPro (EBI), KEGG.
- Raw `db_xref` text is suppressed from the generic "other qualifiers" section when links are rendered.
- NCBI Protein link label now includes the protein ID.

## Capabilities

### New Capabilities
- None — this extends the existing `data-integration` capability.

### Modified Capabilities
- `data-integration`: The "Database cross-reference links" requirement now specifies which databases are supported and how links are rendered in feature tooltips.

## Impact

- `src/viewer/rendering/db-xref-links.ts` — new module
- `src/viewer/rendering/feature-tooltip.ts` — extended to use `parseDbXrefLinks`
- No API or dependency changes
