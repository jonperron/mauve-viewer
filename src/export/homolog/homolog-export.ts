import type { XmfaAlignment, AlignmentBlock } from '../import/xmfa/types.ts';
import type { BackboneSegment } from '../import/backbone/types.ts';
import type { GenomeAnnotations, FeatureType } from '../annotations/types.ts';

/** Configurable parameters for positional homolog export */
export interface HomologExportParameters {
  /** Minimum nucleotide identity in aligned region (0..1, default 0.6) */
  readonly minIdentity: number;
  /** Maximum nucleotide identity in aligned region (0..1, default 1.0) */
  readonly maxIdentity: number;
  /** Minimum fraction of feature length covered by alignment (0..1, default 0.7) */
  readonly minCoverage: number;
  /** Maximum fraction of feature length covered by alignment (0..1, default 1.0) */
  readonly maxCoverage: number;
  /** Feature type to search for orthologs (default: 'CDS') */
  readonly featureType: FeatureType;
}

/** Default parameters matching legacy Java defaults */
export const DEFAULT_HOMOLOG_PARAMS: Readonly<HomologExportParameters> = Object.freeze({
  minIdentity: 0.6,
  maxIdentity: 1.0,
  minCoverage: 0.7,
  maxCoverage: 1.0,
  featureType: 'CDS',
});

/** A member in a homolog group */
export interface HomologMember {
  readonly genomeIndex: number;
  readonly locusTag: string;
  readonly left: number;
  readonly right: number;
  readonly featureType: FeatureType;
}

/** A group of positional homologs across genomes */
export interface HomologGroup {
  readonly members: readonly HomologMember[];
}

/** Result of homolog extraction */
export interface HomologResult {
  readonly groups: readonly HomologGroup[];
  readonly singletons: readonly HomologMember[];
}

/** Lightweight feature with coordinates, used internally for matching */
interface LightFeature {
  readonly genomeIndex: number;
  readonly left: number;
  readonly right: number;
  readonly strand: '+' | '-';
  readonly locusTag: string;
  readonly featureType: FeatureType;
}

/**
 * Extract annotated features of the specified type from a genome's annotations.
 * Features are sorted by left coordinate and deduplicated.
 */
function extractFeatures(
  annotations: GenomeAnnotations,
  featureType: FeatureType,
): readonly LightFeature[] {
  const features: LightFeature[] = [];

  for (const f of annotations.features) {
    if (f.type !== featureType) continue;

    const left = Math.min(f.start, f.end);
    const right = Math.max(f.start, f.end);
    const locusTag = f.qualifiers.locus_tag ?? f.qualifiers.gene ?? '';

    features.push({
      genomeIndex: annotations.genomeIndex,
      left,
      right,
      strand: f.strand,
      locusTag,
      featureType: f.type,
    });
  }

  // Sort by left coordinate, then right, for consistent ordering
  features.sort((a, b) => a.left !== b.left ? a.left - b.left : a.right - b.right);

  // Remove exact duplicates (same coordinates and locus)
  const deduped: LightFeature[] = [];
  for (const f of features) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.left === f.left && prev.right === f.right && prev.locusTag === f.locusTag) continue;
    deduped.push(f);
  }

  return deduped;
}

/**
 * Find backbone segments that overlap a given feature's coordinates in a genome.
 * Returns the coordinate ranges in all genomes for the overlapping region.
 */
function findBackboneOverlaps(
  backbone: readonly BackboneSegment[],
  genomeIndex: number,
  featureLeft: number,
  featureRight: number,
): readonly BackboneSegment[] {
  return backbone.filter((seg) => {
    const interval = seg.intervals[genomeIndex];
    if (!interval || interval.leftEnd <= 0 || interval.rightEnd <= 0) return false;
    // Overlap check: backbone interval intersects feature range
    return interval.leftEnd <= featureRight && interval.rightEnd >= featureLeft;
  });
}

/**
 * Compute the overlap region between two intervals.
 * Returns [overlapLeft, overlapRight] or null if no overlap.
 */
function computeOverlap(
  aLeft: number,
  aRight: number,
  bLeft: number,
  bRight: number,
): readonly [number, number] | null {
  const left = Math.max(aLeft, bLeft);
  const right = Math.min(aRight, bRight);
  if (left > right) return null;
  return [left, right] as const;
}

/** Result of identity and coverage computation for a pair of features */
interface IdentityCoverageResult {
  readonly identity: number;
  readonly coveredSpanI: number;
  readonly coveredSpanJ: number;
}

/**
 * Compute nucleotide identity and coordinate-span coverage between two genomes
 * over a specified coordinate region of genome I.
 *
 * Coverage is measured as the genomic coordinate range spanned by the alignment
 * (matching the legacy `CdsOverlap.length_i/length_j` semantics), not the count
 * of non-gap columns.
 */
function computeIdentityAndCoverage(
  blocks: readonly AlignmentBlock[],
  genomeI: number,
  genomeJ: number,
  regionLeftI: number,
  regionRightI: number,
): IdentityCoverageResult {
  let matches = 0;
  let total = 0;
  let minPosI = Infinity;
  let maxPosI = -Infinity;
  let minPosJ = Infinity;
  let maxPosJ = -Infinity;

  for (const block of blocks) {
    const segI = block.segments.find((s) => s.sequenceIndex === genomeI);
    const segJ = block.segments.find((s) => s.sequenceIndex === genomeJ);
    if (!segI || !segJ) continue;

    const segLeft = Math.min(segI.start, segI.end);
    const segRight = Math.max(segI.start, segI.end);
    const overlap = computeOverlap(segLeft, segRight, regionLeftI, regionRightI);
    if (!overlap) continue;

    const seqI = segI.sequenceData;
    const seqJ = segJ.sequenceData;
    const len = Math.min(seqI.length, seqJ.length);

    let posI = segI.start;
    let posJ = segJ.start;
    const strandMultI = segI.strand === '+' ? 1 : -1;
    const strandMultJ = segJ.strand === '+' ? 1 : -1;

    for (let col = 0; col < len; col++) {
      const chI = seqI[col]!;
      const chJ = seqJ[col]!;
      const isGapI = chI === '-';
      const isGapJ = chJ === '-';

      if (!isGapI && posI >= overlap[0] && posI <= overlap[1]) {
        minPosI = Math.min(minPosI, posI);
        maxPosI = Math.max(maxPosI, posI);

        if (!isGapJ) {
          total++;
          minPosJ = Math.min(minPosJ, posJ);
          maxPosJ = Math.max(maxPosJ, posJ);
          if (chI.toLowerCase() === chJ.toLowerCase()) {
            matches++;
          }
        }
      }

      if (!isGapI) posI += strandMultI;
      if (!isGapJ) posJ += strandMultJ;
    }
  }

  const coveredSpanI = maxPosI > minPosI ? maxPosI - minPosI : 0;
  const coveredSpanJ = maxPosJ > minPosJ ? maxPosJ - minPosJ : 0;

  if (total === 0) return { identity: 0, coveredSpanI, coveredSpanJ };
  return { identity: matches / total, coveredSpanI, coveredSpanJ };
}

/**
 * Build a pairwise ortholog mapping between features of two genomes.
 * For each feature in genome I, finds overlapping features in genome J
 * via backbone coordinate mapping, then verifies identity and coverage.
 */
function findPairwiseOrthologs(
  featuresI: readonly LightFeature[],
  featuresJ: readonly LightFeature[],
  genomeI: number,
  genomeJ: number,
  backbone: readonly BackboneSegment[],
  blocks: readonly AlignmentBlock[],
  params: HomologExportParameters,
): ReadonlyMap<number, readonly number[]> {
  const pairs = new Map<number, number[]>();

  for (let fi = 0; fi < featuresI.length; fi++) {
    const featureI = featuresI[fi]!;
    const featureLenI = featureI.right - featureI.left;
    if (featureLenI <= 0) continue;

    // Find backbone segments overlapping feature I
    const overlappingBB = findBackboneOverlaps(backbone, genomeI, featureI.left, featureI.right);
    if (overlappingBB.length === 0) continue;

    // For each backbone segment, find overlapping features in genome J
    for (let fj = 0; fj < featuresJ.length; fj++) {
      const featureJ = featuresJ[fj]!;
      const featureLenJ = featureJ.right - featureJ.left;
      if (featureLenJ <= 0) continue;

      // Check if any backbone segment maps feature I to an area overlapping feature J
      let hasBackboneOverlap = false;
      for (const bbSeg of overlappingBB) {
        const intervalJ = bbSeg.intervals[genomeJ];
        if (!intervalJ || intervalJ.leftEnd <= 0 || intervalJ.rightEnd <= 0) continue;

        if (intervalJ.leftEnd <= featureJ.right && intervalJ.rightEnd >= featureJ.left) {
          hasBackboneOverlap = true;
          break;
        }
      }
      if (!hasBackboneOverlap) continue;

      // Compute nucleotide identity and alignment-based coverage
      const { identity, coveredSpanI, coveredSpanJ } = computeIdentityAndCoverage(
        blocks, genomeI, genomeJ, featureI.left, featureI.right,
      );

      // Check alignment coverage thresholds (fraction of feature covered by alignment)
      const coverageI = coveredSpanI / featureLenI;
      const coverageJ = coveredSpanJ / featureLenJ;
      if (coverageI < params.minCoverage || coverageI > params.maxCoverage) continue;
      if (coverageJ < params.minCoverage || coverageJ > params.maxCoverage) continue;

      // Check identity thresholds
      if (identity < params.minIdentity || identity > params.maxIdentity) continue;

      // Record the ortholog pair
      const existing = pairs.get(fi) ?? [];
      if (!existing.includes(fj)) {
        pairs.set(fi, [...existing, fj]);
      }
    }
  }

  return pairs;
}

/**
 * Expand a group of orthologs via depth-first search of the ortholog network.
 * Mutates memberSets in-place by adding transitively connected features.
 */
function dfsExpandGroup(
  memberSets: readonly Set<number>[],
  orthoPairs: readonly (readonly ReadonlyMap<number, readonly number[]>[])[],
  genomeCount: number,
  seedGenomes: readonly number[],
): void {
  const stack: number[] = [...seedGenomes];

  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (let i = 0; i < genomeCount; i++) {
      const curPairs = orthoPairs[cur]![i]!;
      for (const memberIdx of memberSets[cur]!) {
        const targets = curPairs.get(memberIdx);
        if (!targets) continue;

        const prevSize = memberSets[i]!.size;
        for (const t of targets) {
          memberSets[i]!.add(t);
        }

        if (memberSets[i]!.size > prevSize) {
          stack.push(i);
        }
      }
    }
  }
}

/**
 * Apply transitive closure to pairwise ortholog relationships.
 * If A↔B and B↔C, then {A, B, C} form a group.
 * Uses depth-first search to find connected components.
 */
function computeTransitiveClosure(
  allFeatures: readonly (readonly LightFeature[])[],
  orthoPairs: readonly (readonly ReadonlyMap<number, readonly number[]>[])[],
  genomeCount: number,
): { readonly groups: readonly HomologGroup[]; readonly found: readonly (readonly boolean[])[] } {
  const groups: HomologGroup[] = [];
  const found: boolean[][] = allFeatures.map(
    (feats) => new Array(feats.length).fill(false) as boolean[],
  );

  for (let gI = 0; gI < genomeCount; gI++) {
    for (let gJ = 0; gJ < genomeCount; gJ++) {
      if (gI === gJ) continue;
      const pairMap = orthoPairs[gI]![gJ]!;

      for (const [keyI] of pairMap) {
        if (found[gI]![keyI]) continue;

        const memberSets: Set<number>[] = Array.from(
          { length: genomeCount }, () => new Set<number>(),
        );
        memberSets[gI]!.add(keyI);

        const valuesJ = pairMap.get(keyI);
        if (valuesJ) {
          for (const vj of valuesJ) {
            memberSets[gJ]!.add(vj);
          }
        }

        dfsExpandGroup(memberSets, orthoPairs, genomeCount, [gI, gJ]);

        const members = collectGroupMembers(memberSets, allFeatures, found, genomeCount);
        if (members.length > 1) {
          groups.push({ members });
        }
      }
    }
  }

  return { groups, found };
}

/** Collect HomologMembers from memberSets and mark them as found */
function collectGroupMembers(
  memberSets: readonly Set<number>[],
  allFeatures: readonly (readonly LightFeature[])[],
  found: boolean[][],
  genomeCount: number,
): readonly HomologMember[] {
  const members: HomologMember[] = [];
  for (let s = 0; s < genomeCount; s++) {
    for (const idx of memberSets[s]!) {
      found[s]![idx] = true;
      const feat = allFeatures[s]![idx]!;
      members.push({
        genomeIndex: feat.genomeIndex,
        locusTag: feat.locusTag,
        left: feat.left,
        right: feat.right,
        featureType: feat.featureType,
      });
    }
  }
  return members;
}

/**
 * Extract positional homologs from an alignment using backbone-based mapping.
 *
 * Algorithm (matching legacy OneToOneOrthologExporter):
 * 1. Extract features of the specified type from each genome
 * 2. For each feature, find backbone segments overlapping it
 * 3. In other genomes, find features overlapping the mapped backbone coordinates
 * 4. Check coverage thresholds (fraction of feature covered by backbone)
 * 5. Compute nucleotide identity in aligned regions
 * 6. Apply transitive closure to build homolog groups
 * 7. Report singletons (features without homologs)
 */
export function extractHomologs(
  alignment: XmfaAlignment,
  backbone: readonly BackboneSegment[],
  annotations: ReadonlyMap<number, GenomeAnnotations>,
  params: HomologExportParameters = DEFAULT_HOMOLOG_PARAMS,
): HomologResult {
  const { genomes, blocks } = alignment;
  const genomeCount = genomes.length;

  // Step 1: Extract features per genome
  const allFeatures: (readonly LightFeature[])[] = [];
  for (let gi = 0; gi < genomeCount; gi++) {
    const ann = annotations.get(gi);
    allFeatures.push(ann ? extractFeatures(ann, params.featureType) : []);
  }

  // Step 2-5: Build pairwise ortholog maps
  const orthoPairs: Map<number, number[]>[][] = Array.from({ length: genomeCount }, () =>
    Array.from({ length: genomeCount }, () => new Map<number, number[]>()),
  );

  for (let gI = 0; gI < genomeCount; gI++) {
    const featuresI = allFeatures[gI]!;
    if (featuresI.length === 0) continue;

    for (let gJ = gI + 1; gJ < genomeCount; gJ++) {
      const featuresJ = allFeatures[gJ]!;
      if (featuresJ.length === 0) continue;

      const pairs = findPairwiseOrthologs(
        featuresI, featuresJ, gI, gJ, backbone, blocks, params,
      );

      // Store bidirectionally
      for (const [fi, fjList] of pairs) {
        const existingIJ = orthoPairs[gI]![gJ]!.get(fi) ?? [];
        orthoPairs[gI]![gJ]!.set(fi, [...existingIJ, ...fjList]);

        for (const fj of fjList) {
          const existingJI = orthoPairs[gJ]![gI]!.get(fj) ?? [];
          if (!existingJI.includes(fi)) {
            orthoPairs[gJ]![gI]!.set(fj, [...existingJI, fi]);
          }
        }
      }
    }
  }

  // Step 6: Transitive closure
  const { groups, found } = computeTransitiveClosure(allFeatures, orthoPairs, genomeCount);

  // Step 7: Collect singletons
  const singletons: HomologMember[] = [];
  for (let s = 0; s < genomeCount; s++) {
    const feats = allFeatures[s]!;
    for (let fi = 0; fi < feats.length; fi++) {
      if (found[s]![fi]) continue;
      const feat = feats[fi]!;
      singletons.push({
        genomeIndex: feat.genomeIndex,
        locusTag: feat.locusTag,
        left: feat.left,
        right: feat.right,
        featureType: feat.featureType,
      });
    }
  }

  return { groups, singletons };
}

/**
 * Format homolog results as tab-delimited text.
 * Each group line: genome:locus_tag:left-right<TAB>genome:locus_tag:left-right...
 * Each singleton on its own line: genome:locus_tag:left-right
 */
export function formatHomologTable(result: HomologResult): string {
  if (result.groups.length === 0 && result.singletons.length === 0) return '';

  const lines: string[] = [];

  for (const group of result.groups) {
    const parts = group.members.map(
      (m) => `${m.genomeIndex}:${m.locusTag}:${m.left}-${m.right}`,
    );
    lines.push(parts.join('\t'));
  }

  for (const singleton of result.singletons) {
    lines.push(`${singleton.genomeIndex}:${singleton.locusTag}:${singleton.left}-${singleton.right}`);
  }

  return lines.join('\n') + '\n';
}

/**
 * Export positional homologs: extract, format, and return as a string.
 */
export function exportHomologs(
  alignment: XmfaAlignment,
  backbone: readonly BackboneSegment[],
  annotations: ReadonlyMap<number, GenomeAnnotations>,
  params?: HomologExportParameters,
): string {
  const result = extractHomologs(alignment, backbone, annotations, params);
  return formatHomologTable(result);
}
