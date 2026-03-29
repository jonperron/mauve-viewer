## Purpose

Defines the color scheme system for alignment visualization: backbone LCB color, backbone multiplicity color, LCB color, offset color, multiplicity color, multiplicity type color, and their normalized variants, with a dynamic color menu based on model type.

## Requirements

### Requirement: Backbone LCB color scheme
The system SHALL provide a color scheme that colors backbone regions (conserved among all genomes) in mauve color, with subset-conserved regions in distinct colors per multiplicity type. Available only for XMFA alignments with computed backbone.

#### Scenario: Apply backbone LCB color
- **WHEN** user selects the Backbone/LCB color scheme from the View → Color Scheme menu with a progressiveMauve alignment
- **THEN** system colors backbone segments in mauve and lineage-specific segments in distinct colors

### Requirement: Backbone multiplicity color scheme
The system SHALL provide a color scheme that assigns distinct colors based on the exact presence/absence pattern of a segment across genomes, using HSB cylindrical color space.

#### Scenario: Apply backbone multiplicity color
- **WHEN** user selects Backbone Multiplicity color scheme
- **THEN** system colors each segment according to which exact combination of genomes share it

### Requirement: LCB color scheme
The system SHALL assign each LCB a unique color based on HSB hue rotation with a 1/6 bump. Available in LCB viewer mode.

#### Scenario: Apply LCB color
- **WHEN** user selects LCB Color scheme
- **THEN** each LCB is rendered in a distinct color

### Requirement: Offset color scheme
The system SHALL color matches by generalized offset—a number summarizing relative positioning across genomes—using a linear mapping across the color spectrum.

#### Scenario: Apply offset color
- **WHEN** user selects Offset Color scheme
- **THEN** matches with similar generalized offsets (likely collinear) appear in similar colors

### Requirement: Normalized offset color scheme
The system SHALL provide a variant of offset color where the offset values are uniformly distributed across the full color spectrum.

#### Scenario: Apply normalized offset color
- **WHEN** user selects Normalized Offset Color
- **THEN** the full color spectrum is utilized evenly across all offset values

### Requirement: Multiplicity color scheme
The system SHALL color matches based on their multiplicity (number of genomes sharing the match), with distinct colors for each multiplicity value ≥ 2.

#### Scenario: Apply multiplicity color
- **WHEN** user selects Multiplicity Color scheme
- **THEN** matches conserved among 3 genomes are a different color from those conserved among 5

### Requirement: Multiplicity type color scheme
The system SHALL color matches by the exact combination of genomes sharing them (bitmask-based). Available for alignments with ≤ 62 sequences.

#### Scenario: Apply multiplicity type color
- **WHEN** user selects Multiplicity Type Color scheme with 4 genomes
- **THEN** regions shared by genomes A+B are a different color from regions shared by genomes B+C

### Requirement: Normalized multiplicity type color scheme
The system SHALL provide a normalized variant that eliminates unused multiplicity types from the palette for more distinguishable colors.

#### Scenario: Apply normalized multiplicity type color
- **WHEN** user selects Normalized Multiplicity Type Color
- **THEN** only multiplicity type combinations actually present in the alignment consume palette space

### Requirement: Dynamic color scheme menu
The system SHALL dynamically build the color scheme menu based on the current model type, showing only applicable color schemes.

#### Scenario: Show backbone schemes for XMFA with backbone
- **WHEN** user opens an XMFA alignment with backbone data computed
- **THEN** the Color Scheme menu includes Backbone LCB and Backbone Multiplicity options

#### Scenario: Hide backbone schemes for non-backbone data
- **WHEN** user opens an alignment without backbone data
- **THEN** the Color Scheme menu does not include backbone-specific options
