## MODIFIED Requirements

### Requirement: DCJ distance computation
The system SHALL compute Double Cut and Join (DCJ) distance between genome arrangements, along with breakpoint distance and Single Cut or Join (SCJ) distance. Distances are computed from an adjacency graph built by pairing block-endpoint adjacencies between two signed permutations.

**Formulas** (Yancopoulos et al. 2005, Feijao & Meidanis 2011):
- DCJ distance: `d = N - (C + ⌊I/2⌋)` where N = blocks, C = cycles, I = odd paths
- Breakpoint distance: `d = N - C₂ - ⌊P₁/2⌋` where C₂ = 2-cycles, P₁ = 1-paths
- SCJ distance: `d = 2 × BP - P≥₂` where BP = breakpoint distance, P≥₂ = paths of length ≥ 2

**Exported functions**:
- `computeDistances(genomeX, genomeY)` → `DistanceResult { dcj, breakpoint, scj, blocks }`
- `computeDistanceMatrix(permutations, labels)` → `DistanceMatrix { labels, distances[][] }`
- `computeDistanceMatrixFromLcbs(lcbs, genomeCount, genomeLabels)` → `DistanceMatrix`

**Module**: `src/analysis/dcj/distance.ts`

#### Scenario: Compute DCJ distance via GUI
- **WHEN** user clicks the DCJ toolbar button with an alignment loaded
- **THEN** system computes DCJ, breakpoint, and SCJ distances and displays results

#### Scenario: Compute pairwise DCJ distances
- **WHEN** an alignment with multiple genomes is loaded
- **THEN** system computes pairwise DCJ distances between all genome pairs and returns an N×N `DistanceMatrix`

#### Scenario: Compute distances from LCB data directly
- **WHEN** the caller provides LCB data with id, left, right, and reverse arrays
- **THEN** system converts LCBs to signed permutation strings and computes the full distance matrix

### Requirement: Extended DCJ permutation model
The system SHALL support an extended DCJ analysis using a full permutation model with `Block` (name + inverted flag), `ContigDef` (ordered blocks + circular flag), `Adjacency` (endpoint pairs or telomeres), and `BlockLocation` ([tailIndex, headIndex] into the adjacency array). The model supports linear and circular chromosomes, multi-contig genomes, and efficient block-to-adjacency lookup via a `ReadonlyMap<string, BlockLocation>`.

**Parsing format**: Contigs separated by `$`, blocks separated by `,`, negative = inverted, `*` suffix = circular.
Example: `"1,-2,3$4,5*$"` → two contigs, first linear with block 2 inverted, second circular.

**Exported functions**:
- `buildBlockIdMap(...permStrings)` → `Map<string, number>` (union of all block names across inputs)
- `parsePermutationString(input, blockIdMap, name?)` → `Permutation`
- `lcbsToPermutationStrings(lcbs, genomeCount)` → `readonly string[]`
- `equalContents(x, y)` → `boolean`

**Module**: `src/analysis/dcj/permutation.ts`

#### Scenario: Parse permutation string with linear and circular contigs
- **WHEN** given a permutation string `"1,-2,3$4,5*$"`
- **THEN** system produces a `Permutation` with two contigs: the first linear (3 blocks, block 2 inverted), the second circular (2 blocks)

#### Scenario: Analyze block adjacencies via adjacency graph
- **WHEN** DCJ analysis runs with two permutations sharing the same block set
- **THEN** system builds `AdjacencyGraphStats { cycles, oddPaths, len2Cycles, len1Paths, pathsGte2 }` by traversing connected components in the merged adjacency graph

#### Scenario: Convert LCBs to permutation strings
- **WHEN** given LCB data with per-genome coordinates and strand information
- **THEN** system produces one signed permutation string per genome, sorted by left coordinate, with `$` contig separator

#### Scenario: Block count safety limit
- **WHEN** the combined block count exceeds 100,000
- **THEN** system throws an error to prevent excessive memory usage

### Requirement: GRIMM analysis
The system SHALL perform GRIMM-style rearrangement analysis on signed permutations derived from LCB data. For a single linear chromosome, the reversal distance is computed as `d = n + 1 - c` where n = elements and c = alternating cycles in the breakpoint graph. A sorting scenario is produced using a greedy approach (not guaranteed minimal).

**Breakpoint graph construction**: Each element πᵢ maps to a pair representation; reality edges connect consecutive pairs in the actual sequence; desire edges connect (2i, 2i+1); alternating cycles are counted by DFS traversal.

**Exported functions**:
- `analyzePermutation(perm)` → `GrimmResult { reversalDistance, cycleCount, breakpointCount, scenario, permutation }`
- `permutationStringToArray(input)` → `readonly number[]` (only first contig used)

**Limitations**: Operates on single linear chromosomes only (first contig from `$`-separated input). Does not handle multiple chromosomes, hurdles, or fortress structures. Greedy sorting scenario may not be optimal.

**Module**: `src/analysis/grimm/solver.ts`

#### Scenario: Run GRIMM analysis on signed permutation
- **WHEN** user invokes GRIMM analysis with a signed permutation `[3, -2, 1]`
- **THEN** system returns `GrimmResult` with correct reversal distance, cycle count, breakpoint count, and a valid (possibly non-minimal) sorting reversal scenario

#### Scenario: Convert LCB permutation string to numeric array
- **WHEN** given `"1,-3,2$"`
- **THEN** `permutationStringToArray` returns `[1, -3, 2]`

#### Scenario: Permutation size safety limit
- **WHEN** permutation length exceeds 100,000 elements
- **THEN** system throws an error

### Requirement: Recombination detection via WeakARG
The system SHALL parse WeakARG XML data containing recombination edges and produce per-genome histograms of incoming and outgoing recombination events. The parser extracts `<recedge>` elements with start/end positions, source/target node indices, and age values. A cache loading function supports pre-processed JSON format.

**XML structure**: `<WeakArg>` → `<Tree>` (Newick string) + `<Iteration>` → `<recedge>` → `<start>`, `<end>`, `<efrom>`, `<eto>`, `<afrom>`, `<ato>`.

**Exported functions**:
- `parseWeakArgXml(xmlContent, genomeLengths, options?)` → `WeakArgData { treeString, incoming, outgoing, edges }`
- `loadWeakArgCache(json)` → `WeakArgData`

**Types**:
- `RecombinationEdge { start, end, edgeFrom, edgeTo, ageFrom, ageTo }`
- `RecombinationHistogram { genomeIndex, values[] }`

**Limitations**: Per-position tally approach (O(positions × edges)) may be slow for very large datasets. Maximum 10 million edges enforced.

**Module**: `src/analysis/weakarg/loader.ts`

#### Scenario: Load WeakARG XML data
- **WHEN** user provides WeakARG XML content and genome lengths
- **THEN** system parses all `<recedge>` elements and builds per-genome incoming and outgoing `RecombinationHistogram` arrays

#### Scenario: Load from cache
- **WHEN** caller provides a JSON string in the cache format
- **THEN** `loadWeakArgCache` deserializes and returns a valid `WeakArgData` object

#### Scenario: Edge count safety limit
- **WHEN** the number of recombination edges exceeds 10,000,000 (or custom `maxEdges`)
- **THEN** system throws an error

#### Scenario: Malformed XML
- **WHEN** the XML content contains parse errors
- **THEN** system throws an error with a descriptive message

### Requirement: Backbone computation
The system SHALL compute backbone segments from multi-genome LCB data, applying configurable weight and multiplicity filters. A backbone segment is an LCB region conserved among genomes; segments where ALL genomes are present are marked `isBackbone: true`. The system SHALL also compute non-backbone regions (islands) for individual genomes and provide multiplicity bitmasks for subset-conservation analysis.

**Exported functions**:
- `computeBackbone(lcbs, genomeCount, options?)` → `readonly BackboneSegment[]`
  - options: `{ minWeight?: number, minMultiplicity?: number }`
- `getMultiplicityMask(segment)` → `number` (bitmask of genomes present)
- `filterByWeight(segments, lcbs, minWeight)` → `readonly BackboneSegment[]`
- `computeIslands(segments, genomeIndex, genomeLength)` → `readonly GenomeInterval[]`

**Types** (from `src/backbone/types.ts`):
- `BackboneSegment { seqIndex, intervals: GenomeInterval[], isBackbone }`
- `GenomeInterval { leftEnd, rightEnd }`

**Module**: `src/analysis/backbone/compute.ts`

#### Scenario: Compute backbone from progressiveMauve alignment
- **WHEN** a progressiveMauve alignment is loaded with LCB data
- **THEN** system computes backbone segments including those conserved among subsets, producing `BackboneSegment[]` with correct `isBackbone` flags

#### Scenario: Filter by minimum weight
- **WHEN** `minWeight` option is set
- **THEN** only LCBs with weight ≥ minWeight are included in backbone segments

#### Scenario: Filter by minimum multiplicity
- **WHEN** `minMultiplicity` is set below genome count
- **THEN** backbone includes LCBs conserved in at least that many genomes (subset conservation)

#### Scenario: Compute islands for a genome
- **WHEN** `computeIslands` is called with backbone segments, genome index, and genome length
- **THEN** system returns `GenomeInterval[]` of regions not covered by any backbone segment, correctly handling gaps between and beyond backbone segments

#### Scenario: Get multiplicity mask
- **WHEN** `getMultiplicityMask` is called on a backbone segment
- **THEN** system returns a bitmask integer where bit i is set if genome i has non-zero coordinates in the segment

### Requirement: Similarity index computation
The system SHALL compute per-genome similarity profiles from XMFA alignment data using Shannon entropy of alignment columns. Following the legacy Java `SimilarityIndex` approach, each genome position covered by an alignment block gets an entropy-based similarity score: `similarity = 1 - entropy` (clamped to [0, 1]). Positions not covered by any alignment block get a value of 0.

**Entropy formula**: `H = -Σ p(x) × log₂(p(x))` over nucleotide frequencies per column. Gap characters are treated as individual unique character types per the legacy implementation. IUPAC ambiguity codes are mapped to their most common base.

**Multi-level zoom**: Profiles are computed at multiple resolutions (default: 1, 10, 100, 1000, 10000 bp per entry). Higher levels are averaged from the base (resolution=1) profile. A selection function chooses the best profile for a given zoom level.

**Exported functions**:
- `computeSimilarityProfile(alignment, genomeIndex, options?)` → `SimilarityProfile { genomeIndex, resolution, values[] }`
- `computeMultiLevelProfile(alignment, genomeIndex, levels?)` → `MultiLevelProfile { genomeIndex, levels[] }`
- `selectProfileForZoom(multiLevel, basePairsPerPixel)` → `SimilarityProfile`

**Deviations from legacy**: No disk caching (profiles computed on-demand). Uses `Float64Array` + `Uint32Array` accumulators instead of pre-computed log tables.

**Module**: `src/analysis/similarity/compute.ts`

#### Scenario: Compute similarity index for a genome
- **WHEN** an XMFA alignment is loaded
- **THEN** system computes a `SimilarityProfile` for each genome with per-position similarity values in [0, 1]

#### Scenario: Multi-level zoom profiles
- **WHEN** `computeMultiLevelProfile` is called
- **THEN** system returns profiles at 5 default zoom levels (1, 10, 100, 1000, 10000 bp/entry), each computed by averaging finer-level values

#### Scenario: Select profile for current zoom
- **WHEN** `selectProfileForZoom` is called with a `basePairsPerPixel` value
- **THEN** system returns the profile with the smallest resolution ≥ the requested value, or the coarsest available

#### Scenario: Handle reverse-strand segments
- **WHEN** a genome segment in an alignment block has strand `'-'`
- **THEN** system traverses genome positions in descending order from `end` to `start`
