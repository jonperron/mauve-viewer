import { describe, expect, it } from 'vitest';
import { loadWeakArgCache, parseWeakArgXml } from './loader.ts';

describe('parseWeakArgXml', () => {
  it('parses a minimal WeakARG XML', () => {
    const xml = `<?xml version="1.0"?>
<WeakArg>
  <Tree>(A:0.1,B:0.2);</Tree>
  <Iteration>
    <recedge>
      <start>10</start>
      <end>20</end>
      <efrom>0</efrom>
      <eto>1</eto>
      <afrom>0.5</afrom>
      <ato>0.3</ato>
    </recedge>
  </Iteration>
</WeakArg>`;

    const data = parseWeakArgXml(xml, [100, 100]);
    expect(data.treeString).toBe('(A:0.1,B:0.2);');
    expect(data.edges).toHaveLength(1);
    expect(data.edges[0]!.start).toBe(10);
    expect(data.edges[0]!.end).toBe(20);
    expect(data.edges[0]!.edgeFrom).toBe(0);
    expect(data.edges[0]!.edgeTo).toBe(1);
    expect(data.edges[0]!.ageFrom).toBeCloseTo(0.5);
    expect(data.edges[0]!.ageTo).toBeCloseTo(0.3);
  });

  it('builds incoming histograms from edges', () => {
    const xml = `<?xml version="1.0"?>
<WeakArg>
  <Tree>tree</Tree>
  <Iteration>
    <recedge>
      <start>5</start>
      <end>10</end>
      <efrom>0</efrom>
      <eto>1</eto>
      <afrom>0.0</afrom>
      <ato>0.0</ato>
    </recedge>
  </Iteration>
</WeakArg>`;

    const data = parseWeakArgXml(xml, [20, 20]);
    // Incoming to genome 1: positions 5..10 should be tallied
    expect(data.incoming[1]!.values[5]).toBe(1);
    expect(data.incoming[1]!.values[10]).toBe(1);
    expect(data.incoming[1]!.values[4]).toBe(0);
    expect(data.incoming[1]!.values[11]).toBe(0);
  });

  it('builds outgoing histograms from edges', () => {
    const xml = `<?xml version="1.0"?>
<WeakArg>
  <Tree>tree</Tree>
  <Iteration>
    <recedge>
      <start>5</start>
      <end>10</end>
      <efrom>0</efrom>
      <eto>1</eto>
      <afrom>0.0</afrom>
      <ato>0.0</ato>
    </recedge>
  </Iteration>
</WeakArg>`;

    const data = parseWeakArgXml(xml, [20, 20]);
    // Outgoing from genome 0: positions 5..10 should be tallied
    expect(data.outgoing[0]!.values[5]).toBe(1);
    expect(data.outgoing[0]!.values[10]).toBe(1);
  });

  it('handles multiple edges', () => {
    const xml = `<?xml version="1.0"?>
<WeakArg>
  <Tree>t</Tree>
  <Iteration>
    <recedge>
      <start>5</start>
      <end>10</end>
      <efrom>0</efrom>
      <eto>0</eto>
      <afrom>0.0</afrom>
      <ato>0.0</ato>
    </recedge>
    <recedge>
      <start>8</start>
      <end>12</end>
      <efrom>0</efrom>
      <eto>0</eto>
      <afrom>0.0</afrom>
      <ato>0.0</ato>
    </recedge>
  </Iteration>
</WeakArg>`;

    const data = parseWeakArgXml(xml, [20]);
    // Overlapping edges: position 8..10 should have tally 2
    expect(data.incoming[0]!.values[9]).toBe(2);
  });

  it('handles empty XML gracefully', () => {
    const xml = `<?xml version="1.0"?><WeakArg></WeakArg>`;
    const data = parseWeakArgXml(xml, [100]);
    expect(data.treeString).toBe('');
    expect(data.edges).toHaveLength(0);
  });

  it('throws on malformed XML', () => {
    expect(() => parseWeakArgXml('<not valid xml>>>', [100])).toThrow('WeakARG XML parse error');
  });

  it('skips recedge elements with missing required fields', () => {
    const xml = `<?xml version="1.0"?>
<WeakArg>
  <Tree>t</Tree>
  <Iteration>
    <recedge>
      <start>5</start>
    </recedge>
    <recedge>
      <start>1</start>
      <end>2</end>
      <efrom>0</efrom>
      <eto>0</eto>
      <afrom>0.0</afrom>
      <ato>0.0</ato>
    </recedge>
  </Iteration>
</WeakArg>`;
    const data = parseWeakArgXml(xml, [10]);
    // First recedge missing end/efrom/eto → NaN → skipped
    expect(data.edges).toHaveLength(1);
    expect(data.edges[0]!.start).toBe(1);
  });

  it('handles edges with out-of-bounds genome indices', () => {
    const xml = `<?xml version="1.0"?>
<WeakArg>
  <Tree>t</Tree>
  <Iteration>
    <recedge>
      <start>0</start>
      <end>5</end>
      <efrom>99</efrom>
      <eto>99</eto>
      <afrom>0.0</afrom>
      <ato>0.0</ato>
    </recedge>
  </Iteration>
</WeakArg>`;
    const data = parseWeakArgXml(xml, [10]);
    expect(data.edges).toHaveLength(1);
    // Histograms should be empty (genome index 99 is out of range)
    expect(data.incoming[0]!.values.every((v) => v === 0)).toBe(true);
  });

  it('throws when edges exceed maxEdges limit', () => {
    let edgeXml = '';
    for (let i = 0; i < 5; i++) {
      edgeXml += `<recedge><start>0</start><end>10</end><efrom>0</efrom><eto>0</eto><afrom>0</afrom><ato>0</ato></recedge>`;
    }
    const xml = `<?xml version="1.0"?><WeakArg><Tree>t</Tree><Iteration>${edgeXml}</Iteration></WeakArg>`;
    expect(() => parseWeakArgXml(xml, [20], { maxEdges: 3 })).toThrow('Too many recombination edges');
  });

  it('processes valid edge count without error', () => {
    let edgeXml = '';
    for (let i = 0; i < 5; i++) {
      edgeXml += `<recedge><start>0</start><end>10</end><efrom>0</efrom><eto>0</eto><afrom>0</afrom><ato>0</ato></recedge>`;
    }
    const xml = `<?xml version="1.0"?><WeakArg><Tree>t</Tree><Iteration>${edgeXml}</Iteration></WeakArg>`;
    const data = parseWeakArgXml(xml, [20]);
    expect(data.edges).toHaveLength(5);
  });
});

describe('loadWeakArgCache', () => {
  it('loads valid cache JSON', () => {
    const cache = JSON.stringify({
      treeString: '(A,B);',
      incoming: [{ genomeIndex: 0, values: [0, 1, 2] }],
      outgoing: [{ genomeIndex: 0, values: [1, 0, 0] }],
      edges: [{ start: 1, end: 2, edgeFrom: 0, edgeTo: 0, ageFrom: 0, ageTo: 0 }],
    });

    const data = loadWeakArgCache(cache);
    expect(data.treeString).toBe('(A,B);');
    expect(data.incoming).toHaveLength(1);
    expect(data.outgoing).toHaveLength(1);
    expect(data.edges).toHaveLength(1);
  });

  it('handles missing fields gracefully', () => {
    const data = loadWeakArgCache('{}');
    expect(data.treeString).toBe('');
    expect(data.incoming).toHaveLength(0);
    expect(data.outgoing).toHaveLength(0);
    expect(data.edges).toHaveLength(0);
  });

  it('throws for invalid JSON', () => {
    expect(() => loadWeakArgCache('not json')).toThrow();
  });

  it('handles histogram items without values property', () => {
    const cache = JSON.stringify({
      treeString: 't',
      incoming: [{ genomeIndex: 0 }],
      outgoing: [],
      edges: [],
    });
    const data = loadWeakArgCache(cache);
    expect(data.incoming[0]!.genomeIndex).toBe(0);
    expect(data.incoming[0]!.values).toEqual([]);
  });

  it('handles histogram item without genomeIndex', () => {
    const cache = JSON.stringify({
      treeString: '',
      incoming: [{ values: [1, 2, 3] }],
      outgoing: [],
      edges: [],
    });
    const data = loadWeakArgCache(cache);
    // Falls back to array index as genomeIndex
    expect(data.incoming[0]!.genomeIndex).toBe(0);
    expect(data.incoming[0]!.values).toEqual([1, 2, 3]);
  });

  it('handles histogram item with non-array values', () => {
    const cache = JSON.stringify({
      treeString: '',
      incoming: [{ genomeIndex: 0, values: 'not-an-array' }],
      outgoing: [],
      edges: [],
    });
    const data = loadWeakArgCache(cache);
    expect(data.incoming[0]!.values).toEqual([]);
  });

  it('handles non-object items in edges array', () => {
    const cache = JSON.stringify({
      treeString: '',
      incoming: [],
      outgoing: [],
      edges: [null, 42, 'string', { start: 1, end: 2, edgeFrom: 0, edgeTo: 0, ageFrom: 0, ageTo: 0 }],
    });
    const data = loadWeakArgCache(cache);
    // null, 42, 'string' are filtered out; only the valid object remains
    expect(data.edges).toHaveLength(1);
    expect(data.edges[0]!.start).toBe(1);
  });

  it('handles edge objects with missing fields', () => {
    const cache = JSON.stringify({
      treeString: '',
      incoming: [],
      outgoing: [],
      edges: [{}],
    });
    const data = loadWeakArgCache(cache);
    // Missing fields default to 0 via Number(undefined ?? 0)
    expect(data.edges[0]!.start).toBe(0);
    expect(data.edges[0]!.end).toBe(0);
    expect(data.edges[0]!.edgeFrom).toBe(0);
  });

  it('throws for non-object cache data', () => {
    expect(() => loadWeakArgCache('"just a string"')).toThrow('Invalid WeakARG cache format');
  });
});
