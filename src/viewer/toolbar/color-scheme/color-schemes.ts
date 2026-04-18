import type { BackboneSegment } from '../import/backbone/types.ts';
import type { Lcb, XmfaAlignment } from '../import/xmfa/types.ts';

/** HSB constants matching the Java Mauve color scheme (ColorScheme.java) */
const MATCH_SAT = 0.8;
const MATCH_BRIGHT = 0.65;
const SPECTRUM_GAP = 0.2;

/** 1/6 hue bump per LCB (LCBColorScheme.java) */
const BUMP_SIZE = 1 / 6;

/** Maximum number of sequences for bitmask-based multiplicity type schemes */
const MAX_MULTIPLICITY_TYPE_SEQUENCES = 62;

/** Mauve color for backbone regions conserved among all genomes */
const MAUVE_COLOR = '#9370DB';

/** HSB cylindrical space parameters for maximally distinct color generation (BackboneMultiplicityColor.java) */
const BMC_HUE_MAX = 1;
const BMC_HUE_WEIGHT = 10;
const BMC_SAT_MIN = 0.7;
const BMC_SAT_MAX = 1;
const BMC_BRIGHT_MIN = 0.5;
const BMC_BRIGHT_MAX = 1;
const BMC_HUE_LEVELS = 12;
const BMC_SAT_LEVELS = 2;
const BMC_BRIGHT_LEVELS = 3;

/** Color scheme identifier */
export type ColorSchemeId =
  | 'lcb'
  | 'offset'
  | 'normalized-offset'
  | 'multiplicity'
  | 'multiplicity-type'
  | 'normalized-multiplicity-type'
  | 'backbone-lcb'
  | 'backbone-multiplicity';

/** A color scheme that assigns colors to LCBs */
export interface ColorScheme {
  readonly id: ColorSchemeId;
  readonly label: string;
  readonly requiresBackbone?: boolean;
  readonly apply: (alignment: XmfaAlignment, backbone?: readonly BackboneSegment[]) => readonly string[];
}

/** Convert HSB (hue 0-1, saturation 0-1, brightness 0-1) to hex color string */
export function hsbToHex(h: number, s: number, b: number): string {
  const hNorm = ((h % 1) + 1) % 1;
  const i = Math.floor(hNorm * 6);
  const f = hNorm * 6 - i;
  const p = b * (1 - s);
  const q = b * (1 - f * s);
  const t = b * (1 - (1 - f) * s);

  let r: number;
  let g: number;
  let blue: number;

  switch (i % 6) {
    case 0: r = b; g = t; blue = p; break;
    case 1: r = q; g = b; blue = p; break;
    case 2: r = p; g = b; blue = t; break;
    case 3: r = p; g = q; blue = b; break;
    case 4: r = t; g = p; blue = b; break;
    default: r = b; g = p; blue = q; break;
  }

  const toHex = (v: number): string => {
    const hex = Math.round(v * 255).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(blue)}`;
}

/**
 * LCB color scheme: assigns each LCB a unique color via HSB hue rotation
 * with 1/6 bump (ported from LCBColorScheme.java).
 */
function applyLcbColorScheme(alignment: XmfaAlignment): readonly string[] {
  const { lcbs } = alignment;
  const count = lcbs.length;
  if (count === 0) return [];

  const colorIncrement = 1 / count;

  return lcbs.map((_, i) => {
    const wrapBump = i * BUMP_SIZE;
    const colorVal = (i * BUMP_SIZE) % 1;
    const hue = wrapBump * colorIncrement + colorVal;
    return hsbToHex(hue, MATCH_SAT, MATCH_BRIGHT);
  });
}

/** Compute generalized offset for an LCB (sum of start positions across genomes) */
function computeOffset(lcb: Lcb): number {
  let offset = 0;
  for (const left of lcb.left) {
    if (left > 0) offset += left;
  }
  return offset;
}

/**
 * Offset color scheme: linear mapping of generalized offset to hue
 * (ported from OffsetColorScheme.java).
 */
function applyOffsetColorScheme(alignment: XmfaAlignment): readonly string[] {
  const { lcbs } = alignment;
  if (lcbs.length === 0) return [];

  const offsets = lcbs.map(computeOffset);
  let minOffset = Infinity;
  let maxOffset = -Infinity;
  for (const o of offsets) {
    if (o < minOffset) minOffset = o;
    if (o > maxOffset) maxOffset = o;
  }

  let range = maxOffset - minOffset;
  range += range * SPECTRUM_GAP;
  const bump = range * (SPECTRUM_GAP / 2);

  return offsets.map(offset => {
    const adjusted = offset - minOffset + bump;
    const hue = range > 0 ? adjusted / range : 0;
    return hsbToHex(hue, MATCH_SAT, MATCH_BRIGHT);
  });
}

/**
 * Normalized offset color scheme: evenly distributes offset values across the
 * full color spectrum (ported from NormalizedOffsetColorScheme.java).
 */
function applyNormalizedOffsetColorScheme(alignment: XmfaAlignment): readonly string[] {
  const { lcbs } = alignment;
  if (lcbs.length === 0) return [];

  const offsets = lcbs.map(computeOffset);
  const indices = lcbs.map((_, i) => i);
  indices.sort((a, b) => offsets[a]! - offsets[b]!);

  let uniqueCount = 1;
  for (let i = 1; i < indices.length; i++) {
    if (offsets[indices[i]!]! !== offsets[indices[i - 1]!]!) {
      uniqueCount++;
    }
  }

  const spectrumBump = SPECTRUM_GAP / 2;
  const colors: string[] = new Array(lcbs.length) as string[];
  let curRank = 0;
  let prevOffset = offsets[indices[0]!]!;

  for (let i = 0; i < indices.length; i++) {
    const curOffset = offsets[indices[i]!]!;
    if (curOffset !== prevOffset) curRank++;
    prevOffset = curOffset;

    const hue = (1 - SPECTRUM_GAP) * (curRank / uniqueCount) + spectrumBump;
    colors[indices[i]!] = hsbToHex(hue, MATCH_SAT, MATCH_BRIGHT);
  }

  return colors;
}

/** Count genomes present in an LCB (multiplicity) */
function getMultiplicity(lcb: Lcb): number {
  let count = 0;
  for (const left of lcb.left) {
    if (left > 0) count++;
  }
  return count;
}

/**
 * Multiplicity color scheme: color by number of genomes sharing the LCB
 * (ported from MultiplicityColorScheme.java).
 */
function applyMultiplicityColorScheme(alignment: XmfaAlignment): readonly string[] {
  const { lcbs, genomes } = alignment;
  if (lcbs.length === 0) return [];

  const seqCount = genomes.length;
  const maxM = 3;
  const cycles = Math.ceil(seqCount / maxM);

  const colorTable: string[] = [];
  for (let i = 0; i < seqCount; i++) {
    let hue = (i / maxM) % 1;
    hue += ((1 / maxM) / cycles) * Math.floor(i / maxM);
    colorTable.push(hsbToHex(hue, MATCH_SAT, MATCH_BRIGHT));
  }

  return lcbs.map(lcb => {
    const mult = getMultiplicity(lcb);
    const idx = Math.max(0, mult - 2);
    return colorTable[idx % colorTable.length]!;
  });
}

/** Compute multiplicity type bitmask: which genomes are present in the LCB */
function getMultiplicityType(lcb: Lcb, genomeCount: number): number {
  let type = 0;
  for (let i = 0; i < genomeCount; i++) {
    type <<= 1;
    if ((lcb.left[i] ?? 0) > 0) {
      type |= 1;
    }
  }
  return type;
}

/**
 * Multiplicity type color scheme: color by exact combination of genomes
 * (bitmask-based). Limited to 62 sequences (ported from MultiplicityTypeColorScheme.java).
 */
function applyMultiplicityTypeColorScheme(alignment: XmfaAlignment): readonly string[] {
  const { lcbs, genomes } = alignment;
  if (lcbs.length === 0) return [];
  if (genomes.length > MAX_MULTIPLICITY_TYPE_SEQUENCES) {
    throw new Error('Multiplicity type color scheme requires 62 or fewer sequences');
  }

  const multRange = 2 ** genomes.length;

  return lcbs.map(lcb => {
    const type = getMultiplicityType(lcb, genomes.length);
    const hue = type / multRange;
    return hsbToHex(hue, MATCH_SAT, MATCH_BRIGHT);
  });
}

/**
 * Normalized multiplicity type color scheme: eliminates unused multiplicity
 * types from palette for more distinguishable colors
 * (ported from NormalizedMultiplicityTypeColorScheme.java).
 */
function applyNormalizedMultiplicityTypeColorScheme(alignment: XmfaAlignment): readonly string[] {
  const { lcbs, genomes } = alignment;
  if (lcbs.length === 0) return [];
  if (genomes.length > MAX_MULTIPLICITY_TYPE_SEQUENCES) {
    throw new Error('Normalized multiplicity type color scheme requires 62 or fewer sequences');
  }

  const types = lcbs.map(lcb => getMultiplicityType(lcb, genomes.length));
  const indices = lcbs.map((_, i) => i);
  indices.sort((a, b) => types[a]! - types[b]!);

  let uniqueCount = 1;
  for (let i = 1; i < indices.length; i++) {
    if (types[indices[i]!]! !== types[indices[i - 1]!]!) {
      uniqueCount++;
    }
  }

  const colors: string[] = new Array(lcbs.length) as string[];
  let curRank = 0;
  let prevType = types[indices[0]!]!;

  for (let i = 0; i < indices.length; i++) {
    const curType = types[indices[i]!]!;
    if (curType !== prevType) curRank++;
    prevType = curType;

    const hue = curRank / uniqueCount;
    colors[indices[i]!] = hsbToHex(hue, MATCH_SAT, MATCH_BRIGHT);
  }

  return colors;
}

/**
 * Generate maximally distinct colors using HSB cylindrical space partitioning.
 * Ported from BackboneMultiplicityColor.getColors() in Java Mauve.
 */
export function generateDistinctColors(count: number): readonly string[] {
  const maxCols = Math.min(count, BMC_HUE_LEVELS * BMC_SAT_LEVELS * BMC_BRIGHT_LEVELS);
  if (maxCols <= 0) return [];

  const sliceArea = (Math.PI * BMC_SAT_MAX * BMC_SAT_MAX) - (Math.PI * BMC_SAT_MIN * BMC_SAT_MIN);
  const volume = (BMC_BRIGHT_MAX - BMC_BRIGHT_MIN) * sliceArea * BMC_HUE_WEIGHT;
  const cubeSize = volume / maxCols;
  const step = Math.pow(cubeSize, 1 / 3);

  let hSteps = Math.ceil((BMC_HUE_MAX * BMC_HUE_WEIGHT) / step);
  const sSteps = Math.ceil((BMC_SAT_MAX - BMC_SAT_MIN) / step);
  const bSteps = Math.ceil((BMC_BRIGHT_MAX - BMC_BRIGHT_MIN) / step);

  while (hSteps * (sSteps + 1) * (bSteps + 1) < maxCols) {
    hSteps++;
  }

  const sStep = (BMC_SAT_MAX - BMC_SAT_MIN) / sSteps;
  const bStep = (BMC_BRIGHT_MAX - BMC_BRIGHT_MIN) / bSteps;
  const hStep = BMC_HUE_MAX / hSteps;

  const colors: string[] = [];
  let h = 0;

  for (let sI = 0; sI <= sSteps; sI++) {
    for (let bI = 0; bI <= bSteps; bI++) {
      for (let hI = 0; hI < hSteps; hI++) {
        colors.push(hsbToHex(h, sStep * sI + BMC_SAT_MIN, bStep * bI + BMC_BRIGHT_MIN));
        h += hStep;
        if (colors.length === maxCols) return colors;
      }
    }
  }

  return colors;
}

/**
 * Backbone LCB color scheme: backbone regions (all genomes present) in mauve,
 * subset-conserved regions in multiplicity type colors.
 * Requires backbone data.
 *
 * Note: intentional divergence from Java BackboneLcbColor which propagates
 * LCB colors to backbone segments. This version follows the spec: mauve for
 * backbone, multiplicity type colors for non-backbone.
 */
function applyBackboneLcbColorScheme(
  alignment: XmfaAlignment,
  backbone?: readonly BackboneSegment[],
): readonly string[] {
  const { lcbs } = alignment;
  if (lcbs.length === 0 || !backbone || backbone.length === 0) return [];

  const backboneMap = new Map<number, boolean>();
  for (const segment of backbone) {
    backboneMap.set(segment.seqIndex, segment.isBackbone);
  }

  const multTypeColors = applyMultiplicityTypeColorScheme(alignment);

  return lcbs.map((lcb, i) => {
    if (backboneMap.get(lcb.id) === true) {
      return MAUVE_COLOR;
    }
    return multTypeColors[i] ?? MAUVE_COLOR;
  });
}

/**
 * Backbone multiplicity color scheme: assigns maximally distinct colors
 * based on the exact genome presence/absence bitmask pattern.
 * N-way backbone (all genomes) always gets mauve color.
 * Ported from BackboneMultiplicityColor.java.
 */
function applyBackboneMultiplicityColorScheme(
  alignment: XmfaAlignment,
  backbone?: readonly BackboneSegment[],
): readonly string[] {
  const { lcbs, genomes } = alignment;
  if (lcbs.length === 0 || !backbone || backbone.length === 0) return [];

  const genomeCount = genomes.length;
  const lcbMasks = lcbs.map(lcb => getMultiplicityType(lcb, genomeCount));

  // Count nucleotides per multiplicity type pattern
  const ntCountByMask = new Map<number, number>();
  for (let i = 0; i < lcbs.length; i++) {
    const mask = lcbMasks[i]!;
    const lcb = lcbs[i]!;
    let length = 0;
    for (let gi = 0; gi < genomeCount; gi++) {
      const left = lcb.left[gi] ?? 0;
      const right = lcb.right[gi] ?? 0;
      if (left > 0 && right > 0) {
        length += right - left + 1;
      }
    }
    ntCountByMask.set(mask, (ntCountByMask.get(mask) ?? 0) + length);
  }

  const uniqueCount = ntCountByMask.size;

  // Sort by nucleotide count (ascending) so most common patterns
  // are assigned last in the round-robin and get distinct colors
  const sortedEntries = [...ntCountByMask.entries()].sort((a, b) => a[1] - b[1]);

  const distinctColors = generateDistinctColors(uniqueCount);

  // Assign colors round-robin by frequency order
  const maskColorMap = new Map<number, string>();
  let colorIdx = 0;
  for (const [mask] of sortedEntries) {
    maskColorMap.set(mask, distinctColors[colorIdx % distinctColors.length]!);
    colorIdx++;
  }

  // Override: n-way backbone always gets mauve.
  // Use iterative shift to match getMultiplicityType overflow behavior for 32+ genomes.
  let nwayMask = 0;
  for (let i = 0; i < genomeCount; i++) {
    nwayMask <<= 1;
    nwayMask |= 1;
  }
  maskColorMap.set(nwayMask, MAUVE_COLOR);

  return lcbMasks.map(mask => maskColorMap.get(mask) ?? MAUVE_COLOR);
}

/** All color schemes (excluding backbone schemes which require backbone data) */
export const COLOR_SCHEMES: readonly ColorScheme[] = [
  { id: 'lcb', label: 'LCB', apply: applyLcbColorScheme },
  { id: 'offset', label: 'Offset', apply: applyOffsetColorScheme },
  { id: 'normalized-offset', label: 'Normalized Offset', apply: applyNormalizedOffsetColorScheme },
  { id: 'multiplicity', label: 'Multiplicity', apply: applyMultiplicityColorScheme },
  { id: 'multiplicity-type', label: 'Multiplicity Type', apply: applyMultiplicityTypeColorScheme },
  { id: 'normalized-multiplicity-type', label: 'Normalized Multiplicity Type', apply: applyNormalizedMultiplicityTypeColorScheme },
];

/** Backbone color schemes (require backbone data to be available) */
export const BACKBONE_COLOR_SCHEMES: readonly ColorScheme[] = [
  { id: 'backbone-lcb', label: 'Backbone LCB', requiresBackbone: true, apply: applyBackboneLcbColorScheme },
  { id: 'backbone-multiplicity', label: 'Backbone Multiplicity', requiresBackbone: true, apply: applyBackboneMultiplicityColorScheme },
];

/** Get available color schemes for the given alignment */
export function getAvailableSchemes(
  alignment: XmfaAlignment,
  backbone?: readonly BackboneSegment[],
): readonly ColorScheme[] {
  const schemes: ColorScheme[] = COLOR_SCHEMES.filter(
    s => s.id !== 'multiplicity-type' && s.id !== 'normalized-multiplicity-type',
  );

  if (alignment.genomes.length <= MAX_MULTIPLICITY_TYPE_SEQUENCES) {
    const multType = COLOR_SCHEMES.find(s => s.id === 'multiplicity-type');
    const normMultType = COLOR_SCHEMES.find(s => s.id === 'normalized-multiplicity-type');
    if (multType) schemes.push(multType);
    if (normMultType) schemes.push(normMultType);
  }

  if (backbone && backbone.length > 0 && alignment.genomes.length <= MAX_MULTIPLICITY_TYPE_SEQUENCES) {
    schemes.push(...BACKBONE_COLOR_SCHEMES);
  }

  return schemes;
}

/** Apply a color scheme by ID to an alignment */
export function applyColorScheme(
  schemeId: ColorSchemeId,
  alignment: XmfaAlignment,
  backbone?: readonly BackboneSegment[],
): readonly string[] {
  const allSchemes = [...COLOR_SCHEMES, ...BACKBONE_COLOR_SCHEMES];
  const scheme = allSchemes.find(s => s.id === schemeId);
  if (!scheme) {
    throw new Error(`Unknown color scheme: ${schemeId}`);
  }
  return scheme.apply(alignment, backbone);
}

/** Default color scheme ID */
export const DEFAULT_COLOR_SCHEME_ID: ColorSchemeId = 'lcb';
