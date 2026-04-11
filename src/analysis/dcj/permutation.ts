import type { Adjacency, Block, BlockLocation, ContigDef, Permutation } from './types.ts';
import { CIRCULAR_CHAR, HEAD_TAG, TAIL_TAG, TELOMERE } from './types.ts';

const MAX_BLOCKS = 100_000;
const VALID_BLOCK = /^[A-Za-z0-9_-]+$/;

/** Get the left endpoint name of a block (depends on orientation) */
function leftEnd(block: Block): string {
  return block.inverted ? block.name + HEAD_TAG : block.name + TAIL_TAG;
}

/** Get the right endpoint name of a block (depends on orientation) */
function rightEnd(block: Block): string {
  return block.inverted ? block.name + TAIL_TAG : block.name + HEAD_TAG;
}

/** Parse a single block token like "1" or "-2" */
function parseBlock(token: string): Block | undefined {
  const trimmed = token.trim();
  if (trimmed.length === 0) return undefined;
  const inverted = trimmed.startsWith('-');
  const name = inverted ? trimmed.slice(1) : trimmed;
  if (name.length === 0 || !VALID_BLOCK.test(name)) return undefined;
  return { name, inverted };
}

/** Parse a contig string like "1,-2,3" or "1,-2,3*" */
function parseContig(str: string): ContigDef {
  const trimmed = str.trim();
  const circular = trimmed.endsWith(CIRCULAR_CHAR);
  const blockStr = circular ? trimmed.slice(0, -1) : trimmed;
  const blocks = blockStr
    .split(',')
    .map((t) => parseBlock(t))
    .filter((b): b is Block => b !== undefined);
  return { blocks, circular };
}

/** Record block-to-adjacency-index locations for a pair of consecutive blocks */
function addLocations(
  prev: Block,
  curr: Block,
  adjIdx: number,
  locations: [number, number][],
  blockIdMap: ReadonlyMap<string, number>,
): void {
  const prevId = blockIdMap.get(prev.name);
  if (prevId !== undefined) {
    if (prev.inverted) {
      locations[prevId]![0] = adjIdx;
    } else {
      locations[prevId]![1] = adjIdx;
    }
  }
  const currId = blockIdMap.get(curr.name);
  if (currId !== undefined) {
    if (curr.inverted) {
      locations[currId]![1] = adjIdx;
    } else {
      locations[currId]![0] = adjIdx;
    }
  }
}

/** Build adjacencies and location lookup from contigs */
function buildAdjacencies(
  contigs: readonly ContigDef[],
  blockIdMap: ReadonlyMap<string, number>,
): {
  readonly adjacencies: readonly Adjacency[];
  readonly locations: ReadonlyMap<string, BlockLocation>;
} {
  const adjacencies: Adjacency[] = [];
  const locations: [number, number][] = Array.from(
    { length: blockIdMap.size },
    () => [0, 0],
  );

  for (const contig of contigs) {
    const { blocks, circular } = contig;
    if (blocks.length === 0) continue;

    if (circular) {
      const last = blocks[blocks.length - 1]!;
      const first = blocks[0]!;
      const adjIdx = adjacencies.length;
      adjacencies.push({ first: rightEnd(last), second: leftEnd(first), telomere: false });
      addLocations(last, first, adjIdx, locations, blockIdMap);
    } else {
      // Left telomere
      const first = blocks[0]!;
      const adjIdx = adjacencies.length;
      adjacencies.push({ first: leftEnd(first), second: TELOMERE, telomere: true });
      const firstId = blockIdMap.get(first.name);
      if (firstId !== undefined) {
        if (first.inverted) {
          locations[firstId]![1] = adjIdx;
        } else {
          locations[firstId]![0] = adjIdx;
        }
      }
    }

    // Internal adjacencies between consecutive blocks
    for (let j = 1; j < blocks.length; j++) {
      const prev = blocks[j - 1]!;
      const curr = blocks[j]!;
      const adjIdx = adjacencies.length;
      adjacencies.push({ first: rightEnd(prev), second: leftEnd(curr), telomere: false });
      addLocations(prev, curr, adjIdx, locations, blockIdMap);
    }

    if (!circular) {
      // Right telomere
      const last = blocks[blocks.length - 1]!;
      const adjIdx = adjacencies.length;
      adjacencies.push({ first: rightEnd(last), second: TELOMERE, telomere: true });
      const lastId = blockIdMap.get(last.name);
      if (lastId !== undefined) {
        if (last.inverted) {
          locations[lastId]![0] = adjIdx;
        } else {
          locations[lastId]![1] = adjIdx;
        }
      }
    }
  }

  const locationMap = new Map<string, BlockLocation>();
  for (const [name, id] of blockIdMap) {
    locationMap.set(name, locations[id]! as BlockLocation);
  }
  return { adjacencies, locations: locationMap };
}

/** Build a block ID map from one or more permutation strings */
export function buildBlockIdMap(...permStrings: readonly string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const perm of permStrings) {
    const tokens = perm.split(/[*$,\s]+/);
    for (const token of tokens) {
      const trimmed = token.trim().replace(/^-/, '');
      if (trimmed.length > 0 && VALID_BLOCK.test(trimmed) && !map.has(trimmed)) {
        if (map.size >= MAX_BLOCKS) {
          throw new Error(`Too many blocks (max ${MAX_BLOCKS})`);
        }
        map.set(trimmed, map.size);
      }
    }
  }
  return map;
}

/**
 * Parse a permutation string into a Permutation structure.
 * Format: "block1,block2,...$block3,block4,...*$"
 * - Contigs separated by "$"
 * - Blocks separated by ","
 * - Negative blocks are inverted (e.g., "-2")
 * - "*" suffix means circular contig
 */
export function parsePermutationString(
  input: string,
  blockIdMap: ReadonlyMap<string, number>,
  name: string = '',
): Permutation {
  const contigStrings = input.split('$').filter((s) => s.trim().length > 0);
  const contigs = contigStrings.map(parseContig);
  const { adjacencies, locations } = buildAdjacencies(contigs, blockIdMap);
  return { name, contigs, adjacencies, locations };
}

/**
 * Convert LCB data to signed permutation strings for each genome.
 * Each genome gets a string of its LCB order with signs based on strand.
 */
export function lcbsToPermutationStrings(
  lcbs: readonly {
    readonly id: number;
    readonly left: readonly number[];
    readonly right: readonly number[];
    readonly reverse: readonly boolean[];
  }[],
  genomeCount: number,
): readonly string[] {
  return Array.from({ length: genomeCount }, (_, gi) => {
    const genomeLcbs = lcbs
      .filter((lcb) => (lcb.left[gi] ?? 0) > 0)
      .map((lcb) => ({
        id: lcb.id,
        left: lcb.left[gi]!,
        reverse: lcb.reverse[gi] ?? false,
      }))
      .sort((a, b) => a.left - b.left);

    return genomeLcbs
      .map((lcb) => (lcb.reverse ? `-${lcb.id}` : `${lcb.id}`))
      .join(',') + '$';
  });
}

/** Check if two permutation strings have equal block content */
export function equalContents(x: string, y: string): boolean {
  const extractBlocks = (s: string): Set<string> => {
    const set = new Set<string>();
    for (const token of s.split(/[$,\s*]+/)) {
      const trimmed = token.trim().replace(/^-/, '');
      if (trimmed.length > 0) set.add(trimmed);
    }
    return set;
  };
  const setX = extractBlocks(x);
  const setY = extractBlocks(y);
  if (setX.size !== setY.size) return false;
  for (const b of setX) {
    if (!setY.has(b)) return false;
  }
  return true;
}
