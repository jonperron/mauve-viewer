import { createAlignmentLoader } from './import/file-loading/alignment-loader.ts';

declare const __APP_VERSION__: string;

const alignmentLoader = createAlignmentLoader();

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

function loadFiles(files: readonly File[], viewer: HTMLElement): void {
  alignmentLoader.loadFiles(files, viewer);
}

function renderFooter(): void {
  const footer = document.getElementById('appFooter');
  if (footer) {
    const link = document.createElement('a');
    link.href = 'https://github.com/jonperron/mauve-viewer/issues';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Github';

    const privacy = document.createElement('div');
    privacy.textContent =
      'Data policy: Your files are parsed in your browser. Server-side jobs write them to a ' +
      'temporary working directory and delete it once the job finishes; nothing ' +
      'is stored beyond that.';

    footer.replaceChildren(
      document.createTextNode(`v${__APP_VERSION__} - Report issues on `),
      link,
      privacy,
    );
  }
}

setupDropZone();
renderFooter();
