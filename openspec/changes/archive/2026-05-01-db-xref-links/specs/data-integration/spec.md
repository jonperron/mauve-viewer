## MODIFIED Requirements

### Requirement: Database cross-reference links
The system SHALL resolve `db_xref` qualifier values in GenBank/GFF features to clickable hyperlinks in the feature detail tooltip. Each semicolon-separated `Database:ID` token SHALL be mapped to a URL for the following supported databases: GeneID (NCBI Gene), UniProtKB / UniProtKB/Swiss-Prot / UniProtKB/TrEMBL (UniProt), PDB (RCSB), GO (QuickGO), InterPro (EBI), and KEGG. Unrecognized database prefixes SHALL be silently ignored. Identifier values SHALL be percent-encoded before being interpolated into URLs. The raw `db_xref` qualifier text SHALL NOT be shown in the generic "other qualifiers" section when cross-reference links are rendered.

#### Scenario: GeneID link
- **WHEN** a feature has a `db_xref` qualifier containing `GeneID:944742`
- **THEN** the tooltip displays a link labelled `NCBI Gene: 944742` pointing to `https://www.ncbi.nlm.nih.gov/gene/944742`

#### Scenario: UniProtKB link
- **WHEN** a feature has a `db_xref` qualifier containing `UniProtKB:P12345`
- **THEN** the tooltip displays a link labelled `UniProt: P12345` pointing to `https://www.uniprot.org/uniprot/P12345`

#### Scenario: UniProtKB/Swiss-Prot and UniProtKB/TrEMBL links
- **WHEN** a feature has a `db_xref` qualifier containing `UniProtKB/Swiss-Prot:P00533` or `UniProtKB/TrEMBL:A0A000`
- **THEN** the tooltip displays a UniProt link for each entry

#### Scenario: PDB link
- **WHEN** a feature has a `db_xref` qualifier containing `PDB:1ABC`
- **THEN** the tooltip displays a link labelled `PDB: 1ABC` pointing to `https://www.rcsb.org/structure/1ABC`

#### Scenario: GO term link
- **WHEN** a feature has a `db_xref` qualifier containing `GO:0006355`
- **THEN** the tooltip displays a link labelled `GO: 0006355` pointing to `https://www.ebi.ac.uk/QuickGO/term/GO:0006355`

#### Scenario: InterPro link
- **WHEN** a feature has a `db_xref` qualifier containing `InterPro:IPR001234`
- **THEN** the tooltip displays a link labelled `InterPro: IPR001234` pointing to `https://www.ebi.ac.uk/interpro/entry/InterPro/IPR001234/`

#### Scenario: KEGG link
- **WHEN** a feature has a `db_xref` qualifier containing `KEGG:eco:b0001`
- **THEN** the tooltip displays a link labelled `KEGG: eco:b0001` pointing to `https://www.genome.jp/dbget-bin/www_bget?eco:b0001`

#### Scenario: Invalid KEGG identifier rejected
- **WHEN** a `db_xref` token has prefix `KEGG` but its identifier does not match the `organism:entry` pattern
- **THEN** no link is rendered for that token

#### Scenario: Multiple cross-references
- **WHEN** a `db_xref` qualifier contains multiple semicolon-separated tokens
- **THEN** each recognized token is rendered as a separate clickable link in the tooltip

#### Scenario: Unrecognized database ignored
- **WHEN** a `db_xref` qualifier contains a token with an unsupported database prefix
- **THEN** no link is rendered for that token and no error is reported

#### Scenario: Links open in new tab
- **WHEN** a cross-reference link is rendered in the tooltip
- **THEN** the anchor element has `target="_blank"` and `rel="noopener noreferrer"`

#### Scenario: Raw db_xref suppressed
- **WHEN** cross-reference links are rendered for a feature
- **THEN** the raw `db_xref` string is NOT shown in the generic "other qualifiers" section of the tooltip
