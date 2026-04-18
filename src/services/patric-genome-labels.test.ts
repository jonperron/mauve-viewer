import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  enrichJsonGenomeNames,
  extractGenomeId,
  fetchPatricGenomeLabels,
} from './patric-genome-labels.ts';
import type { XmfaAlignment } from '../import/xmfa/types.ts';

function makeAlignment(names: readonly string[]): XmfaAlignment {
  return {
    header: {
      formatVersion: 'JSON',
      sequenceCount: names.length,
      sequenceEntries: names.map((name, i) => ({
        index: i + 1,
        file: name,
        format: 'fasta',
      })),
    },
    blocks: [],
    lcbs: [],
    genomes: names.map((name, i) => ({
      index: i + 1,
      name,
      length: 1000,
      format: 'fasta',
    })),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('extractGenomeId', () => {
  it('extracts numeric genome id from basename with extension', () => {
    expect(extractGenomeId('brucella/520456.3/520456.3.fna')).toBe('520456.3');
  });

  it('returns undefined for non-genome names', () => {
    expect(extractGenomeId('genome_a.fna')).toBeUndefined();
  });
});

describe('fetchPatricGenomeLabels', () => {
  it('returns labels map for a valid API response', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [
        { genome_id: '520456.3', genome_name: 'Brucella suis' },
        { genome_id: '99287.12', genome_name: 'Bacillus subtilis' },
      ],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const labels = await fetchPatricGenomeLabels(['520456.3', '99287.12']);

    expect(labels.get('520456.3')).toBe('Brucella suis');
    expect(labels.get('99287.12')).toBe('Bacillus subtilis');
  });

  it('returns empty map for non-ok responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    const labels = await fetchPatricGenomeLabels(['520456.3']);
    expect(labels.size).toBe(0);
  });

  it('returns empty map on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network');
    }));
    const labels = await fetchPatricGenomeLabels(['520456.3']);
    expect(labels.size).toBe(0);
  });
});

describe('enrichJsonGenomeNames', () => {
  it('enriches matching genome names with organism labels', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => [{ genome_id: '520456.3', genome_name: 'Brucella suis' }],
    })));

    const input = makeAlignment(['brucella/520456.3/520456.3.fna', 'genome2.fna']);
    const enriched = await enrichJsonGenomeNames(input);

    expect(enriched.genomes[0]!.name).toBe('Brucella suis [520456.3]');
    expect(enriched.genomes[1]!.name).toBe('genome2.fna');
  });

  it('returns original alignment when no labels are returned', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })));

    const input = makeAlignment(['brucella/520456.3/520456.3.fna']);
    const enriched = await enrichJsonGenomeNames(input);

    expect(enriched).toBe(input);
  });
});