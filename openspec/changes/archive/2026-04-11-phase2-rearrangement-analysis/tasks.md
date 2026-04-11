# Tasks: Phase 2 Rearrangement Analysis

## 1. DCJ Permutation Model

- [x] Define types: `Block`, `ContigDef`, `Adjacency`, `BlockLocation`, `Permutation` (`src/analysis/dcj/types.ts`)
- [x] Implement `buildBlockIdMap()` with 100K block safety limit
- [x] Implement `parsePermutationString()` with `$` contig separator, `,` block separator, `-` inversion, `*` circular
- [x] Implement `lcbsToPermutationStrings()` to convert LCB data to signed permutation strings
- [x] Implement `equalContents()` for block set equality check
- [x] Implement `buildAdjacencies()` with telomere handling for linear contigs and wrap-around for circular
- [x] Export public API via `src/analysis/dcj/index.ts`

## 2. DCJ Adjacency Graph & Distance

- [x] Define types: `AdjacencyGraphStats`, `DistanceResult`, `DistanceMatrix` (`src/analysis/dcj/types.ts`)
- [x] Implement `buildAdjacencyGraph()` using neighbor-list graph with iterative DFS component traversal
- [x] Implement `computeDistances()` with DCJ/breakpoint/SCJ formulas
- [x] Implement `computeDistanceMatrix()` for pairwise N×N computation
- [x] Implement `computeDistanceMatrixFromLcbs()` as convenience wrapper

## 3. Backbone Computation

- [x] Implement `computeBackbone()` with minWeight and minMultiplicity options
- [x] Implement `getMultiplicityMask()` returning genome presence bitmask
- [x] Implement `filterByWeight()` for post-hoc weight filtering
- [x] Implement `computeIslands()` for gap detection between backbone segments
- [x] Export public API via `src/analysis/backbone/index.ts`

## 4. Similarity Index

- [x] Define types: `SimilarityProfile`, `SimilarityOptions`, `MultiLevelProfile` (`src/analysis/similarity/types.ts`)
- [x] Implement IUPAC-aware `CHAR_MAP` matching legacy Java character mapping
- [x] Implement `computeColumnEntropy()` with Shannon entropy and per-gap unique character treatment
- [x] Implement `computeSimilarityProfile()` handling forward and reverse strand segments
- [x] Implement `computeMultiLevelProfile()` with default zoom levels [1, 10, 100, 1000, 10000]
- [x] Implement `selectProfileForZoom()` for resolution selection
- [x] Export public API via `src/analysis/similarity/index.ts`

## 5. GRIMM Solver

- [x] Define types: `Reversal`, `GrimmResult` (`src/analysis/grimm/types.ts`)
- [x] Implement `countBreakpointCycles()` via pair representation and alternating cycle DFS
- [x] Implement `countBreakpoints()` for signed permutation breakpoints
- [x] Implement `applyReversal()` (immutable reversal + sign negation)
- [x] Implement `analyzePermutation()` with `d = n + 1 - c` formula and greedy sorting
- [x] Implement `permutationStringToArray()` for LCB string conversion
- [x] Add 100K element safety limit
- [x] Export public API via `src/analysis/grimm/index.ts`

## 6. WeakARG Loader

- [x] Define types: `RecombinationEdge`, `RecombinationHistogram`, `WeakArgData` (`src/analysis/weakarg/types.ts`)
- [x] Implement `parseWeakArgXml()` with DOMParser and parsererror detection
- [x] Implement per-genome histogram building for incoming/outgoing directions
- [x] Implement `loadWeakArgCache()` for JSON cache deserialization
- [x] Add 10M edge safety limit
- [x] Export public API via `src/analysis/weakarg/index.ts`

## 7. Spec Update

- [x] Update `openspec/specs/rearrangement-analysis/spec.md` with implementation details
