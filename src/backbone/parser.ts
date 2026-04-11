import type {
  BackboneSegment,
  IdentityMatrix,
  IslandSegment,
  LcbBoundary,
  PermutationRow,
} from './types.ts';

const MAX_ROWS = 10_000_000;

function normalizeDataLines(content: string): readonly string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

/** Parse .backbone tab-delimited rows: seq_index followed by left/right pairs per genome. */
export function parseBackbone(content: string): readonly BackboneSegment[] {
  const lines = normalizeDataLines(content);
  const dataLines = lines.filter((line) => !/[A-Za-z]/.test(line));
  if (dataLines.length > MAX_ROWS) {
    throw new Error(`Backbone file too large (max ${MAX_ROWS} rows)`);
  }

  return dataLines.map((line) => {
    const values = line.split(/\s+/).map((token) => Number(token));
    if (values.some((value) => !Number.isFinite(value))) {
      throw new Error(`Invalid numeric value in backbone row: ${line}`);
    }
    if (values.length < 3) {
      throw new Error(`Backbone row too short: ${line}`);
    }

    const seqIndex = values.length % 2 === 1 ? values[0]! : 0;
    const start = values.length % 2 === 1 ? 1 : 0;
    const pairValues = values.slice(start);
    if (pairValues.length % 2 !== 0) {
      throw new Error(`Backbone row must contain left/right coordinate pairs: ${line}`);
    }

    const intervals = Array.from({ length: pairValues.length / 2 }, (_, idx) => ({
      leftEnd: pairValues[2 * idx]!,
      rightEnd: pairValues[2 * idx + 1]!,
    }));

    return {
      seqIndex,
      intervals,
      isBackbone: intervals.every((interval) => interval.leftEnd > 0 && interval.rightEnd > 0),
    };
  });
}

/** Parse .islands rows as: genomeIndex start end [label]. */
export function parseIslands(content: string): readonly IslandSegment[] {
  return normalizeDataLines(content).map((line) => {
    const [genomeIndexRaw, startRaw, endRaw, ...labelParts] = line.split(/\s+/);
    const genomeIndex = Number(genomeIndexRaw);
    const start = Number(startRaw);
    const end = Number(endRaw);
    if (!Number.isFinite(genomeIndex) || !Number.isFinite(start) || !Number.isFinite(end)) {
      throw new Error(`Invalid islands row: ${line}`);
    }
    const label = labelParts.length > 0 ? labelParts.join(' ') : undefined;
    return { genomeIndex, start, end, label };
  });
}

/** Parse tab-delimited identity matrix with header row. */
export function parseIdentityMatrix(content: string): IdentityMatrix {
  const lines = content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0 && !line.trimStart().startsWith('#'));
  if (lines.length < 2) {
    throw new Error('Identity matrix must contain header and at least one row');
  }

  const headerCells = lines[0]!.split('\t').map((cell) => cell.trim());
  const labels = headerCells.slice(1);

  const values = lines.slice(1).map((line) => {
    const row = line.split(/\t+/).map((cell) => cell.trim());
    return row.slice(1).map((cell) => Number(cell));
  });

  for (const row of values) {
    if (row.some((cell) => !Number.isFinite(cell))) {
      throw new Error('Identity matrix contains non-numeric values');
    }
  }

  return { labels, values };
}

/** Parse permutation rows as: genomeLabel int int int ... */
export function parsePermutation(content: string): readonly PermutationRow[] {
  return normalizeDataLines(content).map((line) => {
    const [genomeLabel, ...valueTokens] = line.split(/\s+/);
    if (!genomeLabel || valueTokens.length === 0) {
      throw new Error(`Invalid permutation row: ${line}`);
    }
    const values = valueTokens.map((token) => Number(token));
    if (values.some((value) => !Number.isFinite(value))) {
      throw new Error(`Invalid permutation row: ${line}`);
    }
    return { genomeLabel, values };
  });
}

/** Parse lcb boundary rows as: genomeIndex lcbId left right strand. */
export function parseLcbCoords(content: string): readonly LcbBoundary[] {
  return normalizeDataLines(content).map((line) => {
    const [genomeIndexRaw, lcbIdRaw, leftRaw, rightRaw, strandRaw] = line.split(/\s+/);
    const genomeIndex = Number(genomeIndexRaw);
    const lcbId = Number(lcbIdRaw);
    const left = Number(leftRaw);
    const right = Number(rightRaw);
    const strand = strandRaw === '-' ? '-' : '+';
    if (
      !Number.isFinite(genomeIndex)
      || !Number.isFinite(lcbId)
      || !Number.isFinite(left)
      || !Number.isFinite(right)
      || (strandRaw !== '+' && strandRaw !== '-')
    ) {
      throw new Error(`Invalid LCB coordinate row: ${line}`);
    }
    return { genomeIndex, lcbId, left, right, strand };
  });
}