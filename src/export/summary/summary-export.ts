import type { SummaryInput, SummaryResult, SummaryOptions } from './types.ts';
import { DEFAULT_SUMMARY_OPTIONS } from './types.ts';
import { processSegments } from './segment-processor.ts';
import { formatOverview } from './overview.ts';
import { formatIslandCoordinates, formatIslandFeatures, formatIslandGeneFeatures } from './island-output.ts';
import { formatTroubleBackbone } from './trouble-backbone.ts';
import type { ZipEntry } from '../zip-download.ts';
import { buildZipBlob, downloadZip } from '../zip-download.ts';

/**
 * Run the full summary pipeline.
 * Processes backbone segments, identifies islands, and generates all output files.
 */
export function runSummaryPipeline(input: SummaryInput): SummaryResult {
  const options: SummaryOptions = { ...DEFAULT_SUMMARY_OPTIONS, ...input.options };
  const genomeCount = input.genomes.length;

  // Process segments
  const { allSegments, chains, referenceGenome } = processSegments(
    input.backboneSegments,
    input.lcbs,
    input.genomes,
  );

  // Overview
  const overview = formatOverview(
    chains,
    input.genomes,
    input.annotations,
    options,
    referenceGenome,
  );

  // Island coordinates
  const islandCoordinates = formatIslandCoordinates(
    chains,
    input.genomes,
    options,
    referenceGenome,
  );

  // Per-genome outputs
  const islandFeatures: string[] = [];
  const islandGenes: string[] = [];
  const backboneGenes: string[] = [];

  for (let gi = 0; gi < genomeCount; gi++) {
    const chain = chains[gi] ?? [];
    const genomeAnnotations = input.annotations?.find((a) => a.genomeIndex === gi);
    const contigs = genomeAnnotations?.contigs ?? [];

    // Island features
    islandFeatures.push(
      formatIslandFeatures(chain, gi, input.genomes, contigs, options),
    );

    // Island gene features
    if (genomeAnnotations !== undefined) {
      islandGenes.push(
        formatIslandGeneFeatures(chain, gi, input.genomes, genomeAnnotations, contigs, options, false),
      );
      backboneGenes.push(
        formatIslandGeneFeatures(chain, gi, input.genomes, genomeAnnotations, contigs, options, true),
      );
    } else {
      islandGenes.push('');
      backboneGenes.push('');
    }
  }

  // Trouble backbone
  const troubleBackbone = formatTroubleBackbone(
    allSegments,
    genomeCount,
    options,
    referenceGenome,
  );

  return {
    overview,
    islandCoordinates,
    islandFeatures,
    islandGenes,
    backboneGenes,
    troubleBackbone,
  };
}

/**
 * Build the list of ZIP entries from a summary result.
 */
function buildEntries(result: SummaryResult, filePrefix: string): readonly ZipEntry[] {
  const entries: ZipEntry[] = [
    { filename: `${filePrefix}_overview.tab`, content: result.overview },
    { filename: `${filePrefix}_islandcoords.tab`, content: result.islandCoordinates },
    { filename: `${filePrefix}_problembb.tab`, content: result.troubleBackbone },
  ];

  for (let gi = 0; gi < result.islandFeatures.length; gi++) {
    const feat = result.islandFeatures[gi];
    if (feat !== undefined && feat.length > 0) {
      entries.push({ filename: `${filePrefix}_seq${gi}_islands.tab`, content: feat });
    }
  }

  for (let gi = 0; gi < result.islandGenes.length; gi++) {
    const genes = result.islandGenes[gi];
    if (genes !== undefined && genes.length > 0) {
      entries.push({ filename: `${filePrefix}_seq${gi}_island_genes.tab`, content: genes });
    }
  }

  for (let gi = 0; gi < result.backboneGenes.length; gi++) {
    const genes = result.backboneGenes[gi];
    if (genes !== undefined && genes.length > 0) {
      entries.push({ filename: `${filePrefix}_seq${gi}_backbone_genes.tab`, content: genes });
    }
  }

  return entries;
}

/** Build blob URL and filename for a summary result (without triggering download). */
export interface SummaryBlobResult {
  readonly blobUrl: string;
  readonly filename: string;
  readonly revoke: () => void;
}

/**
 * Build a summary ZIP blob URL that can be attached to an `<a>` element.
 * The caller is responsible for calling `revoke()` to free the blob URL when done.
 */
export function buildSummaryBlobUrl(result: SummaryResult, filePrefix = 'alignment'): SummaryBlobResult {
  const entries = buildEntries(result, filePrefix);
  const blob = buildZipBlob(entries);
  const blobUrl = URL.createObjectURL(blob);
  const filename = `${filePrefix}_summary.zip`;
  return {
    blobUrl,
    filename,
    revoke: () => URL.revokeObjectURL(blobUrl),
  };
}

/**
 * Export summary pipeline results as a single ZIP download.
 * Bundles overview, island coordinates, trouble backbone, and per-genome files.
 */
export function exportSummary(result: SummaryResult, filePrefix = 'alignment'): void {
  const entries = buildEntries(result, filePrefix);
  downloadZip(entries, `${filePrefix}_summary.zip`);
}
