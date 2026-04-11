import type { RecombinationEdge, RecombinationHistogram, WeakArgData } from './types.ts';

const MAX_EDGES = 10_000_000;

/**
 * Parse WeakARG XML content into a WeakArgData model.
 *
 * Expected XML structure:
 * ```xml
 * <WeakArg>
 *   <Tree>newick_tree_string</Tree>
 *   <Iteration>
 *     <recedge>
 *       <start>100</start>
 *       <end>200</end>
 *       <efrom>0</efrom>
 *       <eto>1</eto>
 *       <afrom>0.5</afrom>
 *       <ato>0.5</ato>
 *     </recedge>
 *   </Iteration>
 * </WeakArg>
 * ```
 */
export function parseWeakArgXml(
  xmlContent: string,
  genomeLengths: readonly number[],
  options: { readonly maxEdges?: number } = {},
): WeakArgData {
  const maxEdges = options.maxEdges ?? MAX_EDGES;
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`WeakARG XML parse error: ${parseError.textContent ?? 'unknown'}`);
  }

  const treeString = doc.querySelector('Tree')?.textContent?.trim() ?? '';
  const edges = parseRecEdges(doc);

  if (edges.length > maxEdges) {
    throw new Error(`Too many recombination edges (max ${maxEdges})`);
  }

  const genomeCount = genomeLengths.length;
  const incoming = buildHistograms(edges, genomeCount, genomeLengths, 'incoming');
  const outgoing = buildHistograms(edges, genomeCount, genomeLengths, 'outgoing');

  return { treeString, incoming, outgoing, edges };
}

/** Extract recedge elements from the parsed XML document */
function parseRecEdges(doc: Document): readonly RecombinationEdge[] {
  const edgeElements = doc.querySelectorAll('recedge');
  const edges: RecombinationEdge[] = [];

  for (const el of edgeElements) {
    const start = parseIntField(el, 'start');
    const end = parseIntField(el, 'end');
    const edgeFrom = parseIntField(el, 'efrom');
    const edgeTo = parseIntField(el, 'eto');
    const ageFrom = parseFloatField(el, 'afrom');
    const ageTo = parseFloatField(el, 'ato');

    if (
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      Number.isFinite(edgeFrom) &&
      Number.isFinite(edgeTo)
    ) {
      edges.push({ start, end, edgeFrom, edgeTo, ageFrom, ageTo });
    }
  }

  return edges;
}

function parseIntField(parent: Element, tagName: string): number {
  const text = parent.querySelector(tagName)?.textContent?.trim();
  return text !== undefined ? parseInt(text, 10) : NaN;
}

function parseFloatField(parent: Element, tagName: string): number {
  const text = parent.querySelector(tagName)?.textContent?.trim();
  return text !== undefined ? parseFloat(text) : 0;
}

/**
 * Build per-genome histograms from recombination edges.
 * For each edge, tally the affected positions for the relevant genome.
 */
function buildHistograms(
  edges: readonly RecombinationEdge[],
  genomeCount: number,
  genomeLengths: readonly number[],
  direction: 'incoming' | 'outgoing',
): readonly RecombinationHistogram[] {
  const tallies: number[][] = Array.from(
    { length: genomeCount },
    (_, gi) => new Array(genomeLengths[gi] ?? 0).fill(0) as number[],
  );

  for (const edge of edges) {
    const gi = direction === 'incoming' ? edge.edgeTo : edge.edgeFrom;
    if (gi < 0 || gi >= genomeCount) continue;
    const tally = tallies[gi];
    if (!tally) continue;
    const start = Math.max(0, edge.start);
    const end = Math.min(tally.length - 1, edge.end);
    for (let pos = start; pos <= end; pos++) {
      tally[pos] = (tally[pos] ?? 0) + 1;
    }
  }

  return tallies.map((values, gi) => ({ genomeIndex: gi, values }));
}

/**
 * Load WeakARG data from a pre-processed cache format.
 * Cache format: JSON with { treeString, incoming, outgoing, edges }.
 */
export function loadWeakArgCache(json: string): WeakArgData {
  const raw: unknown = JSON.parse(json);
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid WeakARG cache format');
  }
  const data = raw as Record<string, unknown>;
  return {
    treeString: typeof data['treeString'] === 'string' ? data['treeString'] : '',
    incoming: parseHistogramArray(data['incoming']),
    outgoing: parseHistogramArray(data['outgoing']),
    edges: parseEdgeArray(data['edges']),
  };
}

function parseHistogramArray(raw: unknown): readonly RecombinationHistogram[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: unknown, i: number) => {
    if (typeof item === 'object' && item !== null && 'values' in item) {
      const obj = item as Record<string, unknown>;
      return {
        genomeIndex: typeof obj['genomeIndex'] === 'number' ? obj['genomeIndex'] : i,
        values: Array.isArray(obj['values']) ? (obj['values'] as number[]) : [],
      };
    }
    return { genomeIndex: i, values: [] };
  });
}

function parseEdgeArray(raw: unknown): readonly RecombinationEdge[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item: unknown) => typeof item === 'object' && item !== null)
    .map((item: unknown) => {
      const obj = item as Record<string, unknown>;
      return {
        start: Number(obj['start'] ?? 0),
        end: Number(obj['end'] ?? 0),
        edgeFrom: Number(obj['edgeFrom'] ?? 0),
        edgeTo: Number(obj['edgeTo'] ?? 0),
        ageFrom: Number(obj['ageFrom'] ?? 0),
        ageTo: Number(obj['ageTo'] ?? 0),
      };
    });
}
