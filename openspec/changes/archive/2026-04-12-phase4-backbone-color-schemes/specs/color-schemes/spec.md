## MODIFIED Requirements

### Requirement: Backbone LCB color scheme
The system SHALL provide a color scheme that colors backbone regions (conserved among all genomes) in mauve color (#9370DB), with subset-conserved regions colored using multiplicity type colors derived from the genome presence/absence bitmask. This scheme SHALL only be available for XMFA alignments with computed backbone data and ≤ 62 sequences. The scheme SHALL be registered with `requiresBackbone: true` in the `BACKBONE_COLOR_SCHEMES` registry.

#### Scenario: Apply backbone LCB color
- **WHEN** user selects the Backbone LCB color scheme from the Color Scheme menu with a progressiveMauve alignment that has backbone data
- **THEN** system colors backbone segments in mauve (#9370DB) and lineage-specific segments in multiplicity type colors

#### Scenario: Return empty for missing backbone data
- **WHEN** the backbone LCB color scheme is applied without backbone data
- **THEN** the system SHALL return an empty color array

### Requirement: Backbone multiplicity color scheme
The system SHALL provide a color scheme that assigns maximally distinct colors based on the exact presence/absence pattern of a segment across genomes, using HSB cylindrical space partitioning via `generateDistinctColors`. The N-way backbone pattern (all genomes present) SHALL always be assigned mauve color (#9370DB). Colors SHALL be assigned round-robin ordered by nucleotide count frequency so that the most common patterns receive the most distinct colors. This scheme SHALL only be available for XMFA alignments with computed backbone data and ≤ 62 sequences. The scheme SHALL be registered with `requiresBackbone: true` in the `BACKBONE_COLOR_SCHEMES` registry.

#### Scenario: Apply backbone multiplicity color
- **WHEN** user selects Backbone Multiplicity color scheme with backbone data available
- **THEN** system colors each segment according to which exact combination of genomes share it, using maximally distinct HSB cylindrical colors

#### Scenario: N-way backbone always mauve
- **WHEN** a segment is conserved across all genomes in the alignment
- **THEN** the system SHALL color it mauve (#9370DB) regardless of frequency ranking

#### Scenario: Return empty for missing backbone data
- **WHEN** the backbone multiplicity color scheme is applied without backbone data
- **THEN** the system SHALL return an empty color array

### Requirement: Dynamic color scheme menu
The system SHALL provide a `<select>` dropdown in the controls bar allowing users to switch between available color schemes. The menu SHALL dynamically filter schemes based on alignment properties: multiplicity type schemes SHALL be hidden for alignments with more than 62 sequences, and backbone schemes SHALL be included when backbone data is available and genome count ≤ 62. Backbone data SHALL be automatically computed from LCBs when the alignment is loaded. Changing the selection SHALL immediately recolor all LCB panels. The `getAvailableSchemes` and `applyColorScheme` functions SHALL accept an optional `backbone` parameter of type `readonly BackboneSegment[]`.

#### Scenario: Show multiplicity type schemes for small alignments
- **WHEN** user opens an alignment with ≤ 62 sequences
- **THEN** the Color Scheme menu includes Multiplicity Type and Normalized Multiplicity Type options

#### Scenario: Hide multiplicity type schemes for large alignments
- **WHEN** user opens an alignment with more than 62 sequences
- **THEN** the Color Scheme menu does not include Multiplicity Type or Normalized Multiplicity Type options

#### Scenario: Immediate recolor on scheme change
- **WHEN** user selects a different color scheme from the dropdown
- **THEN** all LCB panels are immediately recolored using the new scheme

#### Scenario: Show backbone schemes when backbone data available
- **WHEN** user opens an alignment with ≤ 62 sequences and backbone data is computed from LCBs
- **THEN** the Color Scheme menu includes Backbone LCB and Backbone Multiplicity options

#### Scenario: Hide backbone schemes when no backbone data
- **WHEN** user opens an alignment without backbone data (e.g., no LCBs)
- **THEN** the Color Scheme menu does not include backbone-specific options

## ADDED Requirements

### Requirement: Distinct color generation
The system SHALL provide and export a `generateDistinctColors(count)` function that produces maximally distinct colors using HSB cylindrical space partitioning. The function SHALL divide the HSB space using configurable hue levels (12), saturation levels (2, range 0.7–1.0), and brightness levels (3, range 0.5–1.0) with hue weighted by a factor of 10. This function is used by the backbone multiplicity color scheme.

#### Scenario: Generate distinct colors
- **WHEN** `generateDistinctColors(10)` is called
- **THEN** the system SHALL return 10 maximally distinct hex color strings distributed across HSB cylindrical space

### Requirement: Backbone color scheme registry
The system SHALL export a `BACKBONE_COLOR_SCHEMES` array containing all backbone-requiring color schemes (backbone-lcb and backbone-multiplicity). Each entry SHALL have `requiresBackbone: true`. This registry is separate from the base `COLOR_SCHEMES` array.

#### Scenario: Registry contains backbone schemes
- **WHEN** the `BACKBONE_COLOR_SCHEMES` export is accessed
- **THEN** it SHALL contain exactly two entries: backbone-lcb and backbone-multiplicity, each with `requiresBackbone: true`
