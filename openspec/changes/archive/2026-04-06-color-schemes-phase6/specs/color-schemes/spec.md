## MODIFIED Requirements

### Requirement: LCB color scheme
The system SHALL assign each LCB a unique color based on HSB hue rotation with a 1/6 bump (`BUMP_SIZE = 1/6`). The hue for LCB index `i` is computed as `(i * BUMP_SIZE) % 1 * colorIncrement + (i * BUMP_SIZE) % 1` with saturation `MATCH_SAT = 0.8` and brightness `MATCH_BRIGHT = 0.65`. This scheme SHALL be the default color scheme. HSB to hex conversion SHALL match Java's `Color.getHSBColor` behavior.

#### Scenario: Apply LCB color
- **WHEN** user selects LCB Color scheme (or loads alignment with default settings)
- **THEN** each LCB is rendered in a distinct color computed via HSB hue rotation with 1/6 bump

#### Scenario: Default scheme on load
- **WHEN** an alignment is loaded
- **THEN** the LCB color scheme is applied by default

### Requirement: Offset color scheme
The system SHALL color LCBs by generalized offset — the sum of start positions across genomes — using a linear mapping across the HSB color spectrum. The mapping SHALL include a `SPECTRUM_GAP = 0.2` to avoid hue wrap-around, with saturation `MATCH_SAT = 0.8` and brightness `MATCH_BRIGHT = 0.65`.

#### Scenario: Apply offset color
- **WHEN** user selects the Offset color scheme
- **THEN** LCBs with similar generalized offsets (likely collinear) appear in similar colors

### Requirement: Normalized offset color scheme
The system SHALL provide a variant of offset color where offset values are rank-ordered and uniformly distributed across the full color spectrum (excluding `SPECTRUM_GAP`), producing maximally distinguishable colors regardless of offset distribution.

#### Scenario: Apply normalized offset color
- **WHEN** user selects Normalized Offset Color scheme
- **THEN** the full color spectrum is utilized evenly across all offset rank values

### Requirement: Multiplicity color scheme
The system SHALL color LCBs based on their multiplicity (number of genomes sharing the LCB), using a cycled HSB hue assignment with `maxM = 3` colors per cycle and saturation `MATCH_SAT = 0.8`, brightness `MATCH_BRIGHT = 0.65`. Multiplicity values start at 2 (minimum possible).

#### Scenario: Apply multiplicity color
- **WHEN** user selects Multiplicity Color scheme
- **THEN** LCBs conserved among 3 genomes are a different color from those conserved among 5

### Requirement: Multiplicity type color scheme
The system SHALL color LCBs by the exact combination of genomes sharing them, using a bitmask representation. The hue SHALL be `type / 2^genomeCount`. This scheme SHALL only be available for alignments with ≤ 62 sequences (`MAX_MULTIPLICITY_TYPE_SEQUENCES = 62`). If applied to an alignment exceeding this limit, the system SHALL throw an error.

#### Scenario: Apply multiplicity type color
- **WHEN** user selects Multiplicity Type Color scheme with 4 genomes
- **THEN** regions shared by genomes A+B are a different color from regions shared by genomes B+C

#### Scenario: Reject alignments exceeding sequence limit
- **WHEN** multiplicity type color scheme is applied to an alignment with more than 62 sequences
- **THEN** the system SHALL throw an error indicating the sequence limit

### Requirement: Normalized multiplicity type color scheme
The system SHALL provide a normalized variant of multiplicity type that rank-orders the multiplicity type bitmasks actually present in the alignment and distributes them evenly across the hue spectrum. Unused multiplicity type values SHALL NOT consume palette space. Subject to the same 62-sequence limit as the standard multiplicity type scheme.

#### Scenario: Apply normalized multiplicity type color
- **WHEN** user selects Normalized Multiplicity Type Color scheme
- **THEN** only multiplicity type combinations actually present in the alignment consume palette space, producing more distinguishable colors

### Requirement: Dynamic color scheme menu
The system SHALL provide a `<select>` dropdown in the controls bar allowing users to switch between available color schemes. The menu SHALL dynamically filter schemes based on alignment properties: multiplicity type schemes SHALL be hidden for alignments with more than 62 sequences, and backbone schemes SHALL be hidden when backbone data is not available. Changing the selection SHALL immediately recolor all LCB panels.

#### Scenario: Show multiplicity type schemes for small alignments
- **WHEN** user opens an alignment with ≤ 62 sequences
- **THEN** the Color Scheme menu includes Multiplicity Type and Normalized Multiplicity Type options

#### Scenario: Hide multiplicity type schemes for large alignments
- **WHEN** user opens an alignment with more than 62 sequences
- **THEN** the Color Scheme menu does not include Multiplicity Type or Normalized Multiplicity Type options

#### Scenario: Immediate recolor on scheme change
- **WHEN** user selects a different color scheme from the dropdown
- **THEN** all LCB panels are immediately recolored using the new scheme

#### Scenario: Hide backbone schemes for non-backbone data
- **WHEN** user opens an alignment without backbone data
- **THEN** the Color Scheme menu does not include backbone-specific options

### Requirement: Backbone LCB color scheme
The system SHALL provide a color scheme that colors backbone regions (conserved among all genomes) in mauve color, with subset-conserved regions in distinct colors per multiplicity type. This scheme SHALL only be available for XMFA alignments with computed backbone data. **Status: DEFERRED** — requires backbone data support.

#### Scenario: Apply backbone LCB color
- **WHEN** user selects the Backbone/LCB color scheme from the Color Scheme menu with a progressiveMauve alignment that has backbone data
- **THEN** system colors backbone segments in mauve and lineage-specific segments in distinct colors

### Requirement: Backbone multiplicity color scheme
The system SHALL provide a color scheme that assigns distinct colors based on the exact presence/absence pattern of a segment across genomes, using HSB cylindrical color space. This scheme SHALL only be available for XMFA alignments with computed backbone data. **Status: DEFERRED** — requires backbone data support.

#### Scenario: Apply backbone multiplicity color
- **WHEN** user selects Backbone Multiplicity color scheme with backbone data available
- **THEN** system colors each segment according to which exact combination of genomes share it

## ADDED Requirements

### Requirement: HSB to hex color conversion
The system SHALL provide an `hsbToHex()` function that converts HSB color values (hue 0–1, saturation 0–1, brightness 0–1) to hex color strings, matching Java's `Color.getHSBColor` behavior. Hue values SHALL wrap around using modular arithmetic `((h % 1) + 1) % 1`.

#### Scenario: Convert HSB to hex
- **WHEN** `hsbToHex(0, 0.8, 0.65)` is called
- **THEN** the result SHALL be a valid hex color string matching Java's `Color.getHSBColor(0, 0.8, 0.65)` output

#### Scenario: Wrap negative hue values
- **WHEN** `hsbToHex(-0.5, 0.8, 0.65)` is called
- **THEN** the hue SHALL wrap to 0.5 before conversion
