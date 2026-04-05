import { parseXmfa } from './xmfa/index.ts';
import { renderAlignment } from './viewer/alignment-viewer.ts';
import type { ViewerHandle } from './viewer/alignment-viewer.ts';
import { parseGenBankMulti } from './annotations/index.ts';
import type { GenomeAnnotations } from './annotations/index.ts';
import type { AnnotationMap } from './viewer/annotations.ts';
import { detectFormat } from './format-detection/index.ts';
import type { FileFormat } from './format-detection/index.ts';
import { parseJsonLcbs } from './json-lcbs/index.ts';
import type { XmfaAlignment } from './xmfa/types.ts';

let currentHandle: ViewerHandle | undefined;
// Mutable state for loaded annotations (intentional exception to immutability rule)
let loadedAnnotations: AnnotationMap = new Map();

function setupDropZone(): void {
  const dropZone = document.getElementById('dropZone');
  const fileInputEl = document.getElementById('fileInput');
  const viewer = document.getElementById('viewer');

  if (!dropZone || !(fileInputEl instanceof HTMLInputElement) || !viewer) return;
  const fileInput = fileInputEl;

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      loadFiles(Array.from(files), viewer);
    }
  });

  fileInput.addEventListener('change', () => {
    const files = fileInput.files;
    if (files && files.length > 0) {
      loadFiles(Array.from(files), viewer);
    }
  });
}

const MAX_FILE_SIZE = 500 * 1024 * 1024;

const ALIGNMENT_FORMATS: ReadonlySet<FileFormat> = new Set(['xmfa', 'json']);
const ANNOTATION_FORMATS: ReadonlySet<FileFormat> = new Set(['genbank']);

function loadFiles(files: readonly File[], viewer: HTMLElement): void {
  // Separate alignment files from annotation files
  const alignmentFiles: File[] = [];
  const annotationFiles: File[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      viewer.textContent = `File too large: ${file.name} (max 500 MB)`;
      return;
    }
    const format = detectFormat(file.name);
    if (ALIGNMENT_FORMATS.has(format)) {
      alignmentFiles.push(file);
    } else if (ANNOTATION_FORMATS.has(format)) {
      annotationFiles.push(file);
    } else {
      alignmentFiles.push(file);
    }
  }

  if (alignmentFiles.length === 0 && annotationFiles.length > 0) {
    viewer.textContent =
      'GenBank files contain annotations only. Load an XMFA or JSON alignment file together with annotation files.';
    return;
  }

  if (alignmentFiles.length === 0) {
    viewer.textContent = 'No supported alignment file found.';
    return;
  }

  // Load alignment file first, then annotations
  loadFile(alignmentFiles[0]!, viewer, annotationFiles);
}

function loadFile(
  file: File,
  viewer: HTMLElement,
  annotationFiles: readonly File[] = [],
): void {
  if (file.size > MAX_FILE_SIZE) {
    viewer.textContent = 'File too large (max 500 MB)';
    return;
  }

  const format = detectFormat(file.name);

  const reader = new FileReader();
  reader.onload = () => {
    const content = reader.result;
    if (typeof content !== 'string') return;

    try {
      const { alignment, annotations: fileAnnotations } = parseFileContent(content, format, file.name);

      // Merge file-level annotations with previously loaded ones
      const mergedAnnotations = fileAnnotations
        ? mergeAnnotationMaps(loadedAnnotations, fileAnnotations)
        : loadedAnnotations;
      loadedAnnotations = mergedAnnotations;

      // Load annotation files if provided alongside the alignment
      if (annotationFiles.length > 0) {
        loadAnnotationFiles(annotationFiles, alignment, viewer);
      } else {
        const annotationMap = buildAnnotationMap(alignment, mergedAnnotations);
        currentHandle?.destroy();
        currentHandle = renderAlignment(viewer, alignment, undefined, annotationMap);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      viewer.textContent = `Error parsing file: ${message}`;
    }
  };
  reader.readAsText(file);
}

interface ParseResult {
  readonly alignment: XmfaAlignment;
  readonly annotations?: AnnotationMap;
}

function parseFileContent(
  content: string,
  format: FileFormat,
  filename: string,
): ParseResult {
  switch (format) {
    case 'xmfa':
      return { alignment: parseXmfa(content) };
    case 'json':
      return { alignment: parseJsonLcbs(content) };
    case 'genbank':
      throw new Error(
        'GenBank files contain annotations only. Load an XMFA or JSON alignment file first, then load GenBank files as annotations.',
      );
    default:
      throw new Error(
        `Unsupported file format: ${format} (${filename}). Supported formats: XMFA, JSON.`,
      );
  }
}

function mergeAnnotationMaps(
  base: AnnotationMap,
  additions: AnnotationMap,
): AnnotationMap {
  const merged = new Map(base);
  for (const [key, value] of additions) {
    merged.set(key, value);
  }
  return merged;
}

function loadAnnotationFiles(
  annotationFiles: readonly File[],
  alignment: XmfaAlignment,
  viewer: HTMLElement,
): void {
  let remaining = annotationFiles.length;

  for (let i = 0; i < annotationFiles.length; i++) {
    const file = annotationFiles[i]!;
    // Assign annotation files to genomes by order (1-based genome index)
    const genomeIndex = i + 1;

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result;
      if (typeof content === 'string') {
        try {
          loadAnnotationFile(content, genomeIndex);
        } catch {
          // Skip annotation files that fail to parse
        }
      }

      remaining--;
      if (remaining === 0) {
        const annotationMap = buildAnnotationMap(alignment, loadedAnnotations);
        currentHandle?.destroy();
        currentHandle = renderAlignment(viewer, alignment, undefined, annotationMap);
      }
    };
    reader.onerror = () => {
      remaining--;
      if (remaining === 0) {
        const annotationMap = buildAnnotationMap(alignment, loadedAnnotations);
        currentHandle?.destroy();
        currentHandle = renderAlignment(viewer, alignment, undefined, annotationMap);
      }
    };
    reader.readAsText(file);
  }
}

setupDropZone();

function buildAnnotationMap(
  _alignment: { readonly genomes: readonly { readonly index: number }[] },
  annotations: AnnotationMap,
): AnnotationMap {
  return annotations;
}

/** Load a GenBank annotation file for a specific genome index */
export function loadAnnotationFile(
  content: string,
  genomeIndex: number,
): GenomeAnnotations {
  const parsed = parseGenBankMulti(content);
  const merged: GenomeAnnotations = {
    genomeIndex,
    features: parsed.flatMap((p) => p.features),
    contigs: parsed.flatMap((p) => p.contigs),
  };

  const newMap = new Map(loadedAnnotations);
  newMap.set(genomeIndex, merged);
  loadedAnnotations = newMap;

  return merged;
}
