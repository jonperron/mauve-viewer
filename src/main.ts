import { parseXmfa } from './xmfa/index.ts';
import { renderAlignment } from './viewer/alignment-viewer.ts';
import type { ViewerHandle } from './viewer/alignment-viewer.ts';

let currentHandle: ViewerHandle | undefined;

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
    const file = e.dataTransfer?.files[0];
    if (file) {
      loadFile(file, viewer);
    }
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) {
      loadFile(file, viewer);
    }
  });
}

const MAX_FILE_SIZE = 500 * 1024 * 1024;

function loadFile(file: File, viewer: HTMLElement): void {
  if (file.size > MAX_FILE_SIZE) {
    viewer.textContent = 'File too large (max 500 MB)';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const content = reader.result;
    if (typeof content !== 'string') return;

    try {
      const alignment = parseXmfa(content);
      currentHandle?.destroy();
      currentHandle = renderAlignment(viewer, alignment);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      viewer.textContent = `Error parsing XMFA file: ${message}`;
    }
  };
  reader.readAsText(file);
}

setupDropZone();
