import {
  buildAnnotationMap,
  loadAnnotationFiles,
} from '../../annotations/file-annotations.ts';
import { detectFormat } from '../format-detection/index.ts';
import type { FileFormat } from '../format-detection/index.ts';
import { parseJsonLcbs } from '../json-lcbs/index.ts';
import { parseMauveAsXmfa } from '../mauve-format/index.ts';
import { enrichJsonGenomeNames } from '../../services/patric-genome-labels.ts';
import { renderAlignment } from '../../viewer/alignment-viewer.ts';
import type { ViewerHandle } from '../../viewer/alignment-viewer.ts';
import type { AnnotationMap } from '../../viewer/annotations.ts';
import { parseXmfa } from '../xmfa/index.ts';
import type { XmfaAlignment } from '../xmfa/types.ts';

const MAX_FILE_SIZE = 500 * 1024 * 1024;

const ALIGNMENT_FORMATS: ReadonlySet<FileFormat> = new Set(['xmfa', 'json', 'mauve']);
const ANNOTATION_FORMATS: ReadonlySet<FileFormat> = new Set(['genbank', 'embl', 'xml']);

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

function parseFileContent(
  content: string,
  format: FileFormat,
  filename: string,
): XmfaAlignment {
  switch (format) {
    case 'xmfa':
      return parseXmfa(content);
    case 'json':
      return parseJsonLcbs(content);
    case 'mauve':
      return parseMauveAsXmfa(content, filename.toLowerCase().endsWith('.mln') ? 'mln' : 'mauve').xmfa;
    case 'genbank':
      throw new Error(
        'GenBank files contain annotations only. Load an XMFA, JSON, or Mauve alignment file first, then load annotation files.',
      );
    case 'embl':
      throw new Error(
        'EMBL files contain annotations only. Load an XMFA, JSON, or Mauve alignment file first, then load annotation files.',
      );
    case 'xml':
      throw new Error(
        'INSDseq XML files contain annotations only. Load an XMFA, JSON, or Mauve alignment file first, then load annotation files.',
      );
    default:
      throw new Error(
        `Unsupported file format: ${format} (${filename}). Supported alignment formats: XMFA, JSON, Mauve (.mauve/.mln).`,
      );
  }
}

function partitionInputFiles(files: readonly File[]): {
  readonly alignmentFiles: readonly File[];
  readonly annotationFiles: readonly File[];
  readonly error?: string;
} {
  const alignmentFiles: File[] = [];
  const annotationFiles: File[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return {
        alignmentFiles: [],
        annotationFiles: [],
        error: `File too large: ${file.name} (max 500 MB)`,
      };
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
    return {
      alignmentFiles,
      annotationFiles,
      error:
        'Annotation files loaded without alignment. Load an XMFA, JSON, or Mauve alignment file together with GenBank/EMBL/INSDseq annotation files.',
    };
  }

  if (alignmentFiles.length === 0) {
    return {
      alignmentFiles,
      annotationFiles,
      error: 'No supported alignment file found.',
    };
  }

  return { alignmentFiles, annotationFiles };
}

export interface AlignmentLoader {
  loadFiles(files: readonly File[], viewer: HTMLElement): void;
}

export function createAlignmentLoader(): AlignmentLoader {
  let currentHandle: ViewerHandle | undefined;
  // Mutable state for loaded annotations (intentional exception to immutability rule)
  let loadedAnnotations: AnnotationMap = new Map();
  // Monotonic token to ignore stale async load completions.
  let activeLoadToken = 0;

  const render = (
    viewer: HTMLElement,
    alignment: XmfaAlignment,
    annotationMap: AnnotationMap,
  ): void => {
    currentHandle?.destroy();
    currentHandle = renderAlignment(viewer, alignment, undefined, annotationMap);
  };

  const loadFile = async (
    file: File,
    viewer: HTMLElement,
    annotationFiles: readonly File[] = [],
  ): Promise<void> => {
    if (file.size > MAX_FILE_SIZE) {
      viewer.textContent = 'File too large (max 500 MB)';
      return;
    }

    const format = detectFormat(file.name);
    const loadToken = ++activeLoadToken;

    try {
      const content = await readFileAsText(file);
      if (loadToken !== activeLoadToken) return;

      const parsedAlignment = parseFileContent(content, format, file.name);
      const alignment = format === 'json'
        ? await enrichJsonGenomeNames(parsedAlignment)
        : parsedAlignment;

      if (loadToken !== activeLoadToken) return;

      if (annotationFiles.length > 0) {
        loadedAnnotations = await loadAnnotationFiles(annotationFiles, loadedAnnotations);
        if (loadToken !== activeLoadToken) return;
      }

      const annotationMap = buildAnnotationMap(alignment, loadedAnnotations);
      render(viewer, alignment, annotationMap);
    } catch (err) {
      if (loadToken !== activeLoadToken) return;
      const message = err instanceof Error ? err.message : 'Unknown error';
      viewer.textContent = `Error parsing file: ${message}`;
    }
  };

  return {
    loadFiles(files: readonly File[], viewer: HTMLElement): void {
      const { alignmentFiles, annotationFiles, error } = partitionInputFiles(files);
      if (error) {
        viewer.textContent = error;
        return;
      }

      const firstAlignmentFile = alignmentFiles[0];
      if (!firstAlignmentFile) {
        viewer.textContent = 'No supported alignment file found.';
        return;
      }

      void loadFile(firstAlignmentFile, viewer, annotationFiles);
    },
  };
}
