## Purpose

Defines integration with external systems: Chado biological database read/write, RMI remote control for programmatic viewer navigation, Gaggle system bus for inter-tool data exchange, and database cross-reference link generation.

## Requirements

### Requirement: Chado database integration
The system SHALL support reading and writing genomic features from/to Chado biological databases via ChadoDB connection, ChadoReader/ChadoWriter, and ChadoFeatureLoader.

#### Scenario: Load features from Chado
- **WHEN** a Chado database connection is configured and features are requested
- **THEN** system loads annotated features from the database and makes them available for visualization

### Requirement: RMI remote control
The system SHALL support remote control via Java RMI, enabled by the system property `mauve.enable.remote`. The remote interface allows programmatic navigation to specific alignment positions via `setFocus(alignID, sequenceID, start, end, auth_token, contig)`.

#### Scenario: Navigate via remote control
- **WHEN** an external application calls setFocus with valid parameters on the RMI interface
- **THEN** system navigates the viewer to the specified position in the specified alignment

#### Scenario: Enable remote control
- **WHEN** Mauve is launched with `-Dmauve.enable.remote=true`
- **THEN** system starts the RMI server and accepts remote control connections

### Requirement: Gaggle system bus integration
The system SHALL support data exchange with other genome analysis tools via the Gaggle system bus using D-Bus communication.

#### Scenario: Exchange data via Gaggle
- **WHEN** Mauve is connected to the Gaggle bus and another tool broadcasts genome data
- **THEN** system receives and can act on the broadcast data

### Requirement: Database cross-reference links
The system SHALL generate clickable links to external databases (NCBI Entrez, etc.) from annotation db_xref qualifiers when viewing feature details.

#### Scenario: Click database link
- **WHEN** user clicks on a feature and it has a db_xref qualifier
- **THEN** system displays a clickable link to the corresponding external database entry
