import type { SummaryInput, SummaryResult, SummaryOptions } from './types.ts';
import { DEFAULT_SUMMARY_OPTIONS } from './types.ts';
import { processSegments } from './segment-processor.ts';
import { formatOverview } from './overview.ts';
import { formatIslandCoordinates, formatIslandFeatures, formatIslandGeneFeatures } from './island-output.ts';
import { formatTroubleBackbone } from './trouble-backbone.ts';
import { downloadTextFile } from '../snp/snp-export.ts';

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
 * Export summary pipeline results as downloadable files.
 */
export function exportSummary(result: SummaryResult, filePrefix = 'alignment'): void {
  downloadTextFile(result.overview, `${filePrefix}_overview.tab`);
  downloadTextFile(result.islandCoordinates, `${filePrefix}_islandcoords.tab`);
  downloadTextFile(result.troubleBackbone, `${filePrefix}_problembb.tab`);

  for (let gi = 0; gi < result.islandFeatures.length; gi++) {
    const feat = result.islandFeatures[gi];
    if (feat !== undefined && feat.length > 0) {
      downloadTextFile(feat, `${filePrefix}_seq${gi}_islands.tab`);
    }
  }

  for (let gi = 0; gi < result.islandGenes.length; gi++) {
    const genes = result.islandGenes[gi];
    if (genes !== undefined && genes.length > 0) {
      downloadTextFile(genes, `${filePrefix}_seq${gi}_island_genes.tab`);
    }
  }

  for (let gi = 0; gi < result.backboneGenes.length; gi++) {
    const genes = result.backboneGenes[gi];
    if (genes !== undefined && genes.length > 0) {
      downloadTextFile(genes, `${filePrefix}_seq${gi}_backbone_genes.tab`);
    }
  }
}
