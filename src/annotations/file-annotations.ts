import { parseGenBankMulti } from './index.ts';
import { parseEmblMulti } from '../import/embl/index.ts';
import { parseInsdseqMulti } from '../import/insdseq/index.ts';
import type { GenomeAnnotations } from './index.ts';
import type { FileFormat } from '../import/format-detection/index.ts';
import type { AnnotationMap } from '../viewer/rendering/annotations.ts';

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result;
      if (typeof content === 'string') {
        resolve(content);
      } else {
        reject(new Error('Could not read file as text'));
      }
    };
    reader.onerror = () => {
      reject(new Error('File read failed'));
    };
    reader.readAsText(file);
  });
}

export function mergeAnnotationMaps(
  base: AnnotationMap,
  additions: AnnotationMap,
): AnnotationMap {
  const merged = new Map(base);
  for (const [key, value] of additions) {
    merged.set(key, value);
  }
  return merged;
}

export function buildAnnotationMap(
  _alignment: { readonly genomes: readonly { readonly index: number }[] },
  annotations: AnnotationMap,
): AnnotationMap {
  return annotations;
}

export function parseAnnotationFile(
  content: string,
  genomeIndex: number,
  format: FileFormat,
): GenomeAnnotations {
  const parsed = format === 'genbank'
    ? parseGenBankMulti(content)
    : format === 'embl'
      ? parseEmblMulti(content)
      : format === 'xml'
        ? parseInsdseqMulti(content)
        : (() => {
          throw new Error(`Unsupported annotation format: ${format}`);
        })();

  return {
    genomeIndex,
    features: parsed.flatMap((p) => p.features),
    contigs: parsed.flatMap((p) => p.contigs),
  };
}

export async function loadAnnotationFiles(
  annotationFiles: readonly File[],
  initialAnnotations: AnnotationMap,
): Promise<AnnotationMap> {
  const tasks = annotationFiles.map(async (file, index) => {
    const genomeIndex = index + 1;
    try {
      const content = await readFileAsText(file);
      const ext = file.name.toLowerCase();
      const format: FileFormat = ext.endsWith('.embl')
        ? 'embl'
        : ext.endsWith('.xml') || ext.endsWith('.insdc')
          ? 'xml'
          : 'genbank';
      const parsed = parseAnnotationFile(content, genomeIndex, format);
      return { genomeIndex, parsed };
    } catch {
      // Skip files that fail to read or parse.
      return undefined;
    }
  });

  const parsedEntries = await Promise.all(tasks);
  const merged = new Map(initialAnnotations);
  for (const entry of parsedEntries) {
    if (!entry) {
      continue;
    }
    merged.set(entry.genomeIndex, entry.parsed);
  }

  return merged;
}