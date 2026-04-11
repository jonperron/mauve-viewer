import type { XmfaAlignment } from '../../xmfa/types.ts';
import type { MultiLevelProfile, SimilarityOptions, SimilarityProfile } from './types.ts';

/**
 * Nucleotide character map matching the legacy Java SimilarityIndex.
 * Maps characters to indices: A=0, C=1, G=2, T=3, gap/unknown=4.
 * IUPAC ambiguity codes map to their most common base.
 */
const CHAR_MAP: Record<string, number> = {
  A: 0, a: 0, C: 1, c: 1, G: 2, g: 2, T: 3, t: 3,
  '-': 4, N: 4, n: 4, X: 4, x: 4,
  R: 0, r: 0, K: 2, k: 2, S: 1, s: 1, M: 0, m: 0,
  Y: 1, y: 1, W: 0, w: 0, B: 1, b: 1, V: 0, v: 0,
  D: 0, d: 0, H: 0, h: 0,
};

/**
 * Compute Shannon entropy for a single alignment column.
 *
 * Following the legacy Java implementation:
 * - Non-gap characters (A/C/G/T) contribute normally to entropy.
 * - Each gap counts as a separate unique character type.
 */
function computeColumnEntropy(sequences: readonly string[], col: number): number {
  const charCounts = [0, 0, 0, 0, 0]; // A, C, G, T, gap

  for (const seq of sequences) {
    const ch = seq[col];
    if (ch === undefined || ch === '\r' || ch === '\n') continue;
    const idx = CHAR_MAP[ch] ?? 4;
    charCounts[idx] = (charCounts[idx] ?? 0) + 1;
  }

  let total = 0;
  for (const c of charCounts) total += c;
  if (total === 0) return 0;

  let entropy = 0;
  for (let i = 0; i < 4; i++) {
    const count = charCounts[i]!;
    if (count === 0) continue;
    const p = count / total;
    entropy -= p * Math.log2(p);
  }
  // Each gap as a unique character
  const gapCount = charCounts[4]!;
  if (gapCount > 0) {
    const p = 1 / total;
    const logP = Math.log2(p);
    entropy -= gapCount * p * logP;
  }

  return entropy;
}

/**
 * Compute a similarity profile for one genome from an XMFA alignment.
 *
 * For each genome position covered by an alignment block, computes the
 * Shannon entropy of the corresponding alignment column across all genomes.
 * Similarity = 1 - entropy (clamped to [0, 1]).
 *
 * Positions not covered by any alignment block get a value of 0.
 */
export function computeSimilarityProfile(
  alignment: XmfaAlignment,
  genomeIndex: number,
  options: SimilarityOptions = {},
): SimilarityProfile {
  const resolution = options.resolution ?? 1;
  const genome = alignment.genomes[genomeIndex];
  if (!genome) {
    throw new Error(`Invalid genome index: ${genomeIndex}`);
  }

  const profileLength = Math.ceil(genome.length / resolution);
  const entropySums = new Float64Array(profileLength);
  const counts = new Uint32Array(profileLength);

  for (const block of alignment.blocks) {
    const targetSegment = block.segments.find((s) => s.sequenceIndex === genomeIndex);
    if (!targetSegment) continue;

    const sequences = block.segments.map((s) => s.sequenceData);
    if (sequences.length === 0) continue;

    const alignLength = Math.min(...sequences.map((s) => s.length));
    const isReverse = targetSegment.strand === '-';
    let genPos = isReverse ? targetSegment.end : targetSegment.start;

    for (let col = 0; col < alignLength; col++) {
      const ch = targetSegment.sequenceData[col];
      if (ch === '-' || ch === '\n' || ch === '\r') continue;

      const entropy = computeColumnEntropy(sequences, col);
      const profileIdx = Math.floor((genPos - 1) / resolution);

      if (profileIdx >= 0 && profileIdx < profileLength) {
        entropySums[profileIdx] = (entropySums[profileIdx] ?? 0) + entropy;
        counts[profileIdx] = (counts[profileIdx] ?? 0) + 1;
      }

      genPos = isReverse ? genPos - 1 : genPos + 1;
    }
  }

  const values: number[] = new Array(profileLength);
  for (let i = 0; i < profileLength; i++) {
    const count = counts[i]!;
    if (count > 0) {
      const avgEntropy = entropySums[i]! / count;
      values[i] = Math.max(0, Math.min(1, 1 - avgEntropy));
    } else {
      values[i] = 0;
    }
  }

  return { genomeIndex, resolution, values };
}

/** Default zoom levels: each level doubles the resolution */
const DEFAULT_ZOOM_LEVELS = [1, 10, 100, 1000, 10000];

/**
 * Compute multi-level similarity profiles for a genome.
 * Each level has a different resolution (base pairs per entry).
 * Higher levels are computed by averaging lower-level entries.
 */
export function computeMultiLevelProfile(
  alignment: XmfaAlignment,
  genomeIndex: number,
  levels: readonly number[] = DEFAULT_ZOOM_LEVELS,
): MultiLevelProfile {
  const baseProfile = computeSimilarityProfile(alignment, genomeIndex, { resolution: 1 });
  const profileLevels: SimilarityProfile[] = [];

  for (const resolution of levels) {
    if (resolution === 1) {
      profileLevels.push(baseProfile);
      continue;
    }

    const genome = alignment.genomes[genomeIndex]!;
    const length = Math.ceil(genome.length / resolution);
    const values: number[] = new Array(length);

    for (let i = 0; i < length; i++) {
      const startBase = i * resolution;
      const endBase = Math.min(startBase + resolution, baseProfile.values.length);
      let sum = 0;
      let count = 0;
      for (let j = startBase; j < endBase; j++) {
        const v = baseProfile.values[j];
        if (v !== undefined && v > 0) {
          sum += v;
          count++;
        }
      }
      values[i] = count > 0 ? sum / count : 0;
    }

    profileLevels.push({ genomeIndex, resolution, values });
  }

  return { genomeIndex, levels: profileLevels };
}

/**
 * Select the best resolution profile for a given zoom level.
 * Returns the profile with the smallest resolution >= requiredResolution.
 */
export function selectProfileForZoom(
  multiLevel: MultiLevelProfile,
  basePairsPerPixel: number,
): SimilarityProfile {
  const sorted = [...multiLevel.levels].sort((a, b) => a.resolution - b.resolution);
  for (const profile of sorted) {
    if (profile.resolution >= basePairsPerPixel) {
      return profile;
    }
  }
  return sorted[sorted.length - 1]!;
}
