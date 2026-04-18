import type { XmfaAlignment } from '../import/xmfa/types.ts';

const PATRIC_GENOME_API_URL = 'https://p3.theseed.org/services/data_api/genome/';
const PATRIC_LABEL_TIMEOUT_MS = 5000;
const MAX_GENOME_IDS_PER_REQUEST = 50;

export function extractGenomeId(name: string): string | undefined {
  const baseName = name.split(/[/\\]/).pop() ?? name;
  const dotIndex = baseName.lastIndexOf('.');
  const stem = dotIndex > 0 ? baseName.slice(0, dotIndex) : baseName;
  return /^\d+\.\d+$/.test(stem) ? stem : undefined;
}

export async function fetchPatricGenomeLabels(
  genomeIds: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  if (genomeIds.length === 0) {
    return new Map();
  }

  const validIds = genomeIds
    .filter((id) => /^\d+\.\d+$/.test(id))
    .slice(0, MAX_GENOME_IDS_PER_REQUEST);
  if (validIds.length === 0) {
    return new Map();
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), PATRIC_LABEL_TIMEOUT_MS);

  try {
    const idList = validIds.join(',');
    const url = `${PATRIC_GENOME_API_URL}?in(genome_id,(${idList}))&select(genome_id,genome_name)`;
    const response = await fetch(url, {
      signal: controller.signal,
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
    });
    if (!response.ok) {
      return new Map();
    }

    const data = await response.json() as unknown;
    if (!Array.isArray(data)) {
      return new Map();
    }

    const labels = new Map<string, string>();
    for (const item of data) {
      if (typeof item !== 'object' || item === null) {
        continue;
      }
      if (!('genome_id' in item) || !('genome_name' in item)) {
        continue;
      }
      const genomeId = item.genome_id;
      const genomeName = item.genome_name;
      if (typeof genomeId !== 'string' || typeof genomeName !== 'string') {
        continue;
      }
      labels.set(genomeId, genomeName);
    }

    return labels;
  } catch {
    return new Map();
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export async function enrichJsonGenomeNames(alignment: XmfaAlignment): Promise<XmfaAlignment> {
  const genomeIds = alignment.genomes
    .map((genome) => extractGenomeId(genome.name))
    .filter((id): id is string => id !== undefined);

  const uniqueGenomeIds = [...new Set(genomeIds)];
  const labels = await fetchPatricGenomeLabels(uniqueGenomeIds);
  if (labels.size === 0) {
    return alignment;
  }

  const updatedGenomes = alignment.genomes.map((genome) => {
    const genomeId = extractGenomeId(genome.name);
    if (!genomeId) {
      return genome;
    }

    const organismName = labels.get(genomeId);
    if (!organismName) {
      return genome;
    }

    return {
      ...genome,
      name: `${organismName} [${genomeId}]`,
    };
  });

  return {
    ...alignment,
    genomes: updatedGenomes,
  };
}