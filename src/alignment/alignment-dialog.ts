import type {
  AlignmentAlgorithm,
  AlignmentParams,
  AlignmentSequenceInput,
  MauveAlignerParams,
  ProgressiveMauveParams,
} from './types.ts';

/** Sequence format choices supported by the alignment API */
type SequenceFormat = AlignmentSequenceInput['format'];

/** Result returned to the caller when user confirms the dialog */
export interface AlignmentDialogResult {
  readonly sequences: readonly AlignmentSequenceInput[];
  readonly params: AlignmentParams;
}

/** Handle for alignment dialog lifecycle */
export interface AlignmentDialogHandle {
  readonly element: HTMLDialogElement;
  readonly destroy: () => void;
}

/** Loaded sequence descriptor passed to the dialog as pre-loaded input */
export interface LoadedSequence {
  readonly name: string;
  readonly content: string;
  readonly format: SequenceFormat;
}

const SEQUENCE_FORMATS: readonly SequenceFormat[] = ['fasta', 'genbank', 'embl', 'raw'];

const DEFAULT_MAUVE_ALIGNER_PARAMS: MauveAlignerParams = {
  algorithm: 'mauveAligner',
  seedWeight: 'auto',
  collinear: false,
  fullAlignment: true,
  extendLcbs: true,
};

const DEFAULT_PROGRESSIVE_PARAMS: ProgressiveMauveParams = {
  algorithm: 'progressiveMauve',
  seedWeight: 'auto',
  collinear: false,
  fullAlignment: true,
  seedFamilies: false,
  iterativeRefinement: true,
  sumOfPairsScoring: true,
};

function detectFormatFromName(filename: string): SequenceFormat {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.gbk') || lower.endsWith('.gb') || lower.endsWith('.genbank')) return 'genbank';
  if (lower.endsWith('.embl')) return 'embl';
  if (lower.endsWith('.fasta') || lower.endsWith('.fa') || lower.endsWith('.fna') || lower.endsWith('.fas')) return 'fasta';
  return 'fasta';
}

function buildSequenceListHtml(sequences: readonly LoadedSequence[]): string {
  return sequences.map((seq, i) => `
    <div class="align-seq-item" data-index="${i}">
      <span class="align-seq-name" title="${escapeHtml(seq.name)}">${escapeHtml(seq.name)}</span>
      <select class="align-seq-format" data-index="${i}" aria-label="Format for ${escapeHtml(seq.name)}">
        ${SEQUENCE_FORMATS.map((f) => `<option value="${f}"${f === seq.format ? ' selected' : ''}>${f}</option>`).join('')}
      </select>
      <button type="button" class="align-seq-remove" data-index="${i}" aria-label="Remove ${escapeHtml(seq.name)}" title="Remove">&times;</button>
    </div>
  `).join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Create a native `<dialog>` modal for genome alignment configuration.
 *
 * Shows algorithm selection, parameter fields (seed weight, LCB weight,
 * collinear toggle, full alignment toggle), algorithm-specific options,
 * and sequence input with drag-and-drop support.
 *
 * Calls `onConfirm` with the chosen sequences and parameters.
 */
export function createAlignmentDialog(
  container: HTMLElement,
  loadedSequences: readonly LoadedSequence[],
  onConfirm: (result: AlignmentDialogResult) => void,
): AlignmentDialogHandle {
  const dialog = document.createElement('dialog');
  dialog.className = 'alignment-dialog';
  dialog.setAttribute('aria-label', 'Align Sequences');

  let sequences = [...loadedSequences];

  dialog.innerHTML = `
    <form method="dialog" class="export-dialog-content alignment-dialog-content">
      <h3>Align Sequences</h3>

      <fieldset class="align-fieldset">
        <legend>Sequences</legend>
        <div class="align-seq-list" role="list">
          ${buildSequenceListHtml(sequences)}
        </div>
        <div class="align-seq-drop-zone" role="button" tabindex="0" aria-label="Add sequence files">
          <span>Drop FASTA/GenBank files here or click to browse</span>
          <input type="file" class="align-seq-file-input" multiple accept=".fasta,.fa,.fna,.fas,.gbk,.gb,.genbank,.embl" />
        </div>
        <p class="align-seq-count"><span class="align-seq-count-value">${sequences.length}</span> sequence(s) loaded</p>
      </fieldset>

      <fieldset class="align-fieldset">
        <legend>Algorithm</legend>
        <div class="export-field">
          <label for="align-algorithm">Algorithm:</label>
          <select id="align-algorithm">
            <option value="progressiveMauve" selected>progressiveMauve</option>
            <option value="mauveAligner">mauveAligner</option>
          </select>
        </div>
      </fieldset>

      <fieldset class="align-fieldset">
        <legend>Parameters</legend>
        <div class="export-field">
          <label>
            <input type="checkbox" id="align-default-seed" checked />
            Default seed weight
          </label>
        </div>
        <div class="export-field align-seed-weight-field" style="display:none;">
          <label for="align-seed-weight">Seed weight:</label>
          <input type="number" id="align-seed-weight" value="15" min="3" max="21" step="1" />
        </div>
        <div class="export-field">
          <label for="align-min-lcb-weight">Min LCB weight:</label>
          <input type="text" id="align-min-lcb-weight" value="default" placeholder="default" />
        </div>
        <div class="export-field">
          <label>
            <input type="checkbox" id="align-collinear" />
            Assume collinear genomes
          </label>
        </div>
        <div class="export-field">
          <label>
            <input type="checkbox" id="align-full-alignment" checked />
            Full alignment
          </label>
        </div>
      </fieldset>

      <fieldset class="align-fieldset align-mauve-aligner-fields" style="display:none;">
        <legend>mauveAligner Options</legend>
        <div class="export-field">
          <label>
            <input type="checkbox" id="align-extend-lcbs" checked />
            Extend LCBs
          </label>
        </div>
      </fieldset>

      <fieldset class="align-fieldset align-progressive-fields">
        <legend>progressiveMauve Options</legend>
        <div class="export-field">
          <label>
            <input type="checkbox" id="align-seed-families" />
            Use seed families
          </label>
        </div>
        <div class="export-field">
          <label>
            <input type="checkbox" id="align-iterative-refinement" checked />
            Iterative refinement
          </label>
        </div>
        <div class="export-field">
          <label>
            <input type="checkbox" id="align-sum-of-pairs" checked />
            Sum-of-pairs LCB scoring
          </label>
        </div>
      </fieldset>

      <div class="export-actions">
        <button type="button" class="export-cancel-btn">Cancel</button>
        <button type="button" class="export-confirm-btn align-submit-btn" disabled>Align</button>
      </div>
    </form>
  `;

  container.appendChild(dialog);
  dialog.showModal();

  // Query all inputs
  const algorithmSelect = dialog.querySelector('#align-algorithm') as HTMLSelectElement;
  const defaultSeedCheckbox = dialog.querySelector('#align-default-seed') as HTMLInputElement;
  const seedWeightField = dialog.querySelector('.align-seed-weight-field') as HTMLDivElement;
  const seedWeightInput = dialog.querySelector('#align-seed-weight') as HTMLInputElement;
  const minLcbWeightInput = dialog.querySelector('#align-min-lcb-weight') as HTMLInputElement;
  const collinearCheckbox = dialog.querySelector('#align-collinear') as HTMLInputElement;
  const fullAlignmentCheckbox = dialog.querySelector('#align-full-alignment') as HTMLInputElement;

  // mauveAligner specific
  const mauveAlignerFields = dialog.querySelector('.align-mauve-aligner-fields') as HTMLFieldSetElement;
  const extendLcbsCheckbox = dialog.querySelector('#align-extend-lcbs') as HTMLInputElement;

  // progressiveMauve specific
  const progressiveFields = dialog.querySelector('.align-progressive-fields') as HTMLFieldSetElement;
  const seedFamiliesCheckbox = dialog.querySelector('#align-seed-families') as HTMLInputElement;
  const iterativeRefinementCheckbox = dialog.querySelector('#align-iterative-refinement') as HTMLInputElement;
  const sumOfPairsCheckbox = dialog.querySelector('#align-sum-of-pairs') as HTMLInputElement;

  // Sequence management
  const seqList = dialog.querySelector('.align-seq-list') as HTMLDivElement;
  const seqCountValue = dialog.querySelector('.align-seq-count-value') as HTMLSpanElement;
  const dropZone = dialog.querySelector('.align-seq-drop-zone') as HTMLDivElement;
  const fileInput = dialog.querySelector('.align-seq-file-input') as HTMLInputElement;
  const submitBtn = dialog.querySelector('.align-submit-btn') as HTMLButtonElement;

  function updateSubmitState(): void {
    submitBtn.disabled = sequences.length < 2;
  }

  function updateSequenceList(): void {
    seqList.innerHTML = buildSequenceListHtml(sequences);
    seqCountValue.textContent = String(sequences.length);
    updateSubmitState();
  }

  function updateAlgorithmFields(): void {
    const algo = algorithmSelect.value as AlignmentAlgorithm;
    if (algo === 'mauveAligner') {
      mauveAlignerFields.style.display = '';
      progressiveFields.style.display = 'none';
    } else {
      mauveAlignerFields.style.display = 'none';
      progressiveFields.style.display = '';
    }
  }

  function updateSeedWeightField(): void {
    seedWeightField.style.display = defaultSeedCheckbox.checked ? 'none' : '';
  }

  async function addFiles(files: FileList | readonly File[]): Promise<void> {
    try {
      const fileArray = Array.from(files);
      const newSequences = await Promise.all(
        fileArray.map(async (file) => {
          const content = await file.text();
          return {
            name: file.name,
            content,
            format: detectFormatFromName(file.name),
          };
        }),
      );
      sequences = [...sequences, ...newSequences];
      updateSequenceList();
    } catch {
      // File read failure — ignore silently; files that failed are not added
    }
  }

  function buildParams(): AlignmentParams {
    const algo = algorithmSelect.value as AlignmentAlgorithm;
    const seedWeight: number | 'auto' = defaultSeedCheckbox.checked
      ? 'auto'
      : clampInt(parseInt(seedWeightInput.value, 10), 3, 21, 15);
    const rawLcbWeight = minLcbWeightInput.value.trim();
    const minLcbWeight = rawLcbWeight === '' || rawLcbWeight === 'default'
      ? undefined
      : clampInt(parseInt(rawLcbWeight, 10), 1, Number.MAX_SAFE_INTEGER, undefined);
    const collinear = collinearCheckbox.checked;
    const fullAlignment = fullAlignmentCheckbox.checked;

    if (algo === 'mauveAligner') {
      return {
        ...DEFAULT_MAUVE_ALIGNER_PARAMS,
        seedWeight,
        minLcbWeight,
        collinear,
        fullAlignment,
        extendLcbs: extendLcbsCheckbox.checked,
      };
    }
    return {
      ...DEFAULT_PROGRESSIVE_PARAMS,
      seedWeight,
      minLcbWeight,
      collinear,
      fullAlignment,
      seedFamilies: seedFamiliesCheckbox.checked,
      iterativeRefinement: iterativeRefinementCheckbox.checked,
      sumOfPairsScoring: sumOfPairsCheckbox.checked,
    };
  }

  function buildSequenceInputs(): readonly AlignmentSequenceInput[] {
    const formatSelects = dialog.querySelectorAll('.align-seq-format');
    return sequences.map((seq, i) => {
      const select = formatSelects[i] as HTMLSelectElement | undefined;
      const format = (select?.value ?? seq.format) as SequenceFormat;
      return { name: seq.name, content: seq.content, format };
    });
  }

  // Event handlers
  algorithmSelect.addEventListener('change', updateAlgorithmFields);
  defaultSeedCheckbox.addEventListener('change', updateSeedWeightField);

  dropZone.addEventListener('click', (e) => {
    if (e.target !== fileInput) {
      fileInput.click();
    }
  });

  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('align-drop-active');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('align-drop-active');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('align-drop-active');
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      void addFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      void addFiles(fileInput.files);
      fileInput.value = '';
    }
  });

  seqList.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('align-seq-remove')) {
      const index = parseInt(target.dataset.index ?? '', 10);
      if (!Number.isNaN(index) && index >= 0 && index < sequences.length) {
        sequences = [...sequences.slice(0, index), ...sequences.slice(index + 1)];
        updateSequenceList();
      }
    }
  });

  seqList.addEventListener('change', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('align-seq-format')) {
      const index = parseInt((target as HTMLSelectElement).dataset.index ?? '', 10);
      const format = (target as HTMLSelectElement).value as SequenceFormat;
      const seq = !Number.isNaN(index) && index >= 0 && index < sequences.length
        ? sequences[index]
        : undefined;
      if (seq !== undefined) {
        const updated = { ...seq, format };
        sequences = [...sequences.slice(0, index), updated, ...sequences.slice(index + 1)];
      }
    }
  });

  function handleCancel(): void {
    destroy();
  }

  function handleConfirm(): void {
    if (sequences.length < 2) return;
    const result: AlignmentDialogResult = {
      sequences: buildSequenceInputs(),
      params: buildParams(),
    };
    destroy();
    onConfirm(result);
  }

  const cancelBtn = dialog.querySelector('.export-cancel-btn') as HTMLButtonElement;
  cancelBtn.addEventListener('click', handleCancel);
  submitBtn.addEventListener('click', handleConfirm);

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      handleCancel();
    }
  });

  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    handleCancel();
  });

  updateSubmitState();

  function destroy(): void {
    if (dialog.open) {
      dialog.close();
    }
    dialog.remove();
  }

  return { element: dialog, destroy };
}

function clampInt(value: number, min: number, max: number, fallback: number): number;
function clampInt(value: number, min: number, max: number, fallback: undefined): number | undefined;
function clampInt(value: number, min: number, max: number, fallback: number | undefined): number | undefined {
  if (Number.isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}
