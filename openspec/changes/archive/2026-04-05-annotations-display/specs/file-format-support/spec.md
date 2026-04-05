## MODIFIED Requirements

### Requirement: GenBank format support
The system SHALL read genome sequences and annotations from GenBank flat files (.gbk extension). The parser SHALL extract features of types CDS, gene, tRNA, rRNA, and misc_RNA with their qualifiers (gene, product, locus_tag, protein_id, db_xref). The parser SHALL handle complement() locations for reverse-strand features and join() locations for multi-exon features by computing the full coordinate span. The parser SHALL support multi-record GenBank files, detecting contig boundaries between records and offsetting feature coordinates to global positions. Features with unparseable locations SHALL be silently skipped. If no FEATURES or ORIGIN section is found, the parser SHALL return an empty annotation set.

#### Scenario: Parse single-record GenBank file
- **WHEN** user provides a single-record .gbk file with CDS, tRNA, and rRNA features
- **THEN** system extracts each feature with type, start, end, strand, and qualifiers

#### Scenario: Parse complement location
- **WHEN** a feature has a complement() location (e.g., complement(1234..5678))
- **THEN** system records the feature with strand '-' and the correct coordinate range

#### Scenario: Parse join location
- **WHEN** a feature has a join() location (e.g., join(100..200,300..400))
- **THEN** system records the feature spanning the full range (100..400)

#### Scenario: Parse multi-record GenBank file
- **WHEN** user provides a GenBank file with multiple LOCUS records separated by //
- **THEN** system offsets feature coordinates to global positions and creates contig boundaries at record junctions

#### Scenario: Skip unparseable feature locations
- **WHEN** a feature has a location that cannot be parsed
- **THEN** system silently skips that feature without error

#### Scenario: Handle missing FEATURES section
- **WHEN** a GenBank file lacks a FEATURES or ORIGIN section
- **THEN** system returns an empty GenomeAnnotations with no features and no contigs

#### Scenario: Extract qualifier values
- **WHEN** a feature has /gene, /product, /locus_tag, /protein_id, or /db_xref qualifiers
- **THEN** system extracts each qualifier key-value pair into the feature's qualifiers record
