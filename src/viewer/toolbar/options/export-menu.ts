/** Callbacks for export actions — undefined means the action is unavailable */
export interface ExportCallbacks {
  readonly onExportImage?: () => void;
  readonly onExportSnps?: () => void;
  readonly onExportGaps?: () => void;
  readonly onExportPermutations?: () => void;
  readonly onExportHomologs?: () => void;
  readonly onExportIdentityMatrix?: () => void;
  readonly onExportCdsErrors?: () => void;
  readonly onExportSummary?: () => void;
  readonly onPrint?: () => void;
}

/** Handle returned by createExportMenu for lifecycle management */
export interface ExportMenuHandle {
  readonly element: HTMLElement;
  readonly destroy: () => void;
}

/** Export callback keys — only the optional () => void members */
type ExportCallbackKey = {
  [K in keyof ExportCallbacks]: ExportCallbacks[K] extends (() => void) | undefined ? K : never;
}[keyof ExportCallbacks];

/** Button definition for data-driven rendering */
interface ExportButtonDef {
  readonly callbackKey: ExportCallbackKey;
  readonly label: string;
}

/** Ordered list of export buttons rendered in the dropdown */
const EXPORT_BUTTON_DEFS: readonly ExportButtonDef[] = [
  { callbackKey: 'onExportImage', label: 'Export Image (Ctrl+E)' },
  { callbackKey: 'onExportSnps', label: 'Export SNPs' },
  { callbackKey: 'onExportGaps', label: 'Export Gaps' },
  { callbackKey: 'onExportPermutations', label: 'Export Permutations' },
  { callbackKey: 'onExportHomologs', label: 'Export Positional Orthologs' },
  { callbackKey: 'onExportIdentityMatrix', label: 'Export Identity Matrix' },
  { callbackKey: 'onExportCdsErrors', label: 'Export CDS Errors' },
  { callbackKey: 'onExportSummary', label: 'Export Summary' },
  { callbackKey: 'onPrint', label: 'Print (Ctrl+P)' },
];

/** Create an export dropdown menu with available export actions */
export function createExportMenu(
  container: HTMLElement,
  callbacks: ExportCallbacks,
): ExportMenuHandle {
  const activeButtons = EXPORT_BUTTON_DEFS.filter(
    (def) => callbacks[def.callbackKey] !== undefined,
  );

  const panel = document.createElement('div');
  panel.className = 'export-menu';

  const btn = document.createElement('button');
  btn.className = 'export-menu-toggle';
  btn.type = 'button';
  btn.textContent = 'Export';
  btn.setAttribute('aria-label', 'Toggle export menu');

  if (activeButtons.length === 0) {
    btn.disabled = true;
  }

  panel.appendChild(btn);

  const dropdown = document.createElement('div');
  dropdown.className = 'export-menu-dropdown';
  panel.appendChild(dropdown);

  for (const def of activeButtons) {
    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'export-menu-action-btn';
    actionBtn.textContent = def.label;
    const callback = callbacks[def.callbackKey];
    actionBtn.addEventListener('click', () => {
      dropdown.classList.remove('show');
      callback?.();
    });
    dropdown.appendChild(actionBtn);
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Close sibling dropdowns (e.g. options panel)
    panel.parentElement?.querySelectorAll('.options-dropdown.show').forEach((el) => el.classList.remove('show'));
    dropdown.classList.toggle('show');
  });

  const onDocumentClick = (e: MouseEvent) => {
    if (!panel.contains(e.target as Node)) {
      dropdown.classList.remove('show');
    }
  };
  document.addEventListener('click', onDocumentClick);

  container.appendChild(panel);

  return {
    element: panel,
    destroy: () => {
      document.removeEventListener('click', onDocumentClick);
      panel.remove();
    },
  };
}
