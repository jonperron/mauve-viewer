/** State of all viewer options (immutable) */
export interface OptionsState {
  readonly showGenomeId: boolean;
  readonly showConnectingLines: boolean;
  readonly showFeatures: boolean;
  readonly showContigs: boolean;
}

/** Callbacks triggered when an option is toggled or an action is invoked */
export interface OptionsCallbacks {
  readonly onToggleGenomeId: (enabled: boolean) => void;
  readonly onToggleConnectingLines: (enabled: boolean) => void;
  readonly onToggleFeatures: (enabled: boolean) => void;
  readonly onToggleContigs: (enabled: boolean) => void;
  readonly onExportImage?: () => void;
  readonly onPrint?: () => void;
}

/** Handle returned by createOptionsPanel for lifecycle management */
export interface OptionsPanelHandle {
  readonly element: HTMLElement;
  readonly getState: () => OptionsState;
  readonly destroy: () => void;
}

/** Default options: all enabled */
export const DEFAULT_OPTIONS: Readonly<OptionsState> = Object.freeze({
  showGenomeId: true,
  showConnectingLines: true,
  showFeatures: true,
  showContigs: true,
});

/** Required toggle callback keys (always defined) */
type ToggleCallbackKey = 'onToggleGenomeId' | 'onToggleConnectingLines' | 'onToggleFeatures' | 'onToggleContigs';

interface CheckboxDef {
  readonly name: string;
  readonly label: string;
  readonly stateKey: keyof OptionsState;
  readonly callbackKey: ToggleCallbackKey;
}

const CHECKBOX_DEFS: readonly CheckboxDef[] = [
  { name: 'showGenomeId', label: 'Show Genome ID', stateKey: 'showGenomeId', callbackKey: 'onToggleGenomeId' },
  { name: 'showConnectingLines', label: 'LCB Connecting Lines', stateKey: 'showConnectingLines', callbackKey: 'onToggleConnectingLines' },
  { name: 'showFeatures', label: 'Show Features (zoomed)', stateKey: 'showFeatures', callbackKey: 'onToggleFeatures' },
  { name: 'showContigs', label: 'Show Contigs', stateKey: 'showContigs', callbackKey: 'onToggleContigs' },
];

/** Create an options panel with toggle checkboxes */
export function createOptionsPanel(
  container: HTMLElement,
  callbacks: OptionsCallbacks,
  initialState: OptionsState = DEFAULT_OPTIONS,
): OptionsPanelHandle {
  const state: { -readonly [K in keyof OptionsState]: OptionsState[K] } = { ...initialState };

  const panel = document.createElement('div');
  panel.className = 'options-panel';

  const btn = document.createElement('button');
  btn.className = 'options-toggle';
  btn.type = 'button';
  btn.textContent = 'Options';
  btn.setAttribute('aria-label', 'Toggle options panel');
  panel.appendChild(btn);

  const dropdown = document.createElement('div');
  dropdown.className = 'options-dropdown';
  panel.appendChild(dropdown);

  for (const def of CHECKBOX_DEFS) {
    const wrapper = document.createElement('div');
    wrapper.className = 'options-item';

    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = def.name;
    checkbox.checked = state[def.stateKey] ?? true;

    checkbox.addEventListener('change', () => {
      state[def.stateKey] = checkbox.checked;
      callbacks[def.callbackKey](checkbox.checked);
    });

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(` ${def.label}`));
    wrapper.appendChild(label);
    dropdown.appendChild(wrapper);
  }

  // Action buttons (separator + buttons)
  if (callbacks.onExportImage || callbacks.onPrint) {
    const separator = document.createElement('hr');
    separator.className = 'options-separator';
    dropdown.appendChild(separator);

    if (callbacks.onExportImage) {
      const exportBtn = document.createElement('button');
      exportBtn.type = 'button';
      exportBtn.className = 'options-action-btn';
      exportBtn.textContent = 'Export Image (Ctrl+E)';
      exportBtn.addEventListener('click', () => {
        dropdown.classList.remove('show');
        callbacks.onExportImage?.();
      });
      dropdown.appendChild(exportBtn);
    }

    if (callbacks.onPrint) {
      const printBtn = document.createElement('button');
      printBtn.type = 'button';
      printBtn.className = 'options-action-btn';
      printBtn.textContent = 'Print (Ctrl+P)';
      printBtn.addEventListener('click', () => {
        dropdown.classList.remove('show');
        callbacks.onPrint?.();
      });
      dropdown.appendChild(printBtn);
    }
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
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
    getState: () => ({ ...state }),
    destroy: () => {
      document.removeEventListener('click', onDocumentClick);
      panel.remove();
    },
  };
}
