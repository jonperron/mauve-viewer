import type { DisplayMode } from './viewer-state.ts';

/** Callbacks for navigation toolbar actions */
export interface NavigationCallbacks {
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onPanLeft: () => void;
  readonly onPanRight: () => void;
  readonly onReset: () => void;
  readonly onDisplayModeChange?: (mode: DisplayMode) => void;
}

/** Active toolbar handle for cleanup */
export interface NavigationToolbarHandle {
  readonly element: HTMLElement;
  readonly destroy: () => void;
}

/** Button callback keys (excludes optional onDisplayModeChange) */
type ButtonAction = 'onZoomIn' | 'onZoomOut' | 'onPanLeft' | 'onPanRight' | 'onReset';

interface ButtonDef {
  readonly className: string;
  readonly title: string;
  readonly ariaLabel: string;
  readonly text: string;
  readonly action: ButtonAction;
}

const BUTTON_DEFS: readonly ButtonDef[] = [
  { className: 'nav-reset', title: 'Reset view', ariaLabel: 'Reset view', text: '\u21BA', action: 'onReset' },
  { className: 'nav-pan-left', title: 'Pan left (Ctrl+Left)', ariaLabel: 'Pan left', text: '\u25C0', action: 'onPanLeft' },
  { className: 'nav-zoom-in', title: 'Zoom in (Ctrl+Up)', ariaLabel: 'Zoom in', text: '+', action: 'onZoomIn' },
  { className: 'nav-zoom-out', title: 'Zoom out (Ctrl+Down)', ariaLabel: 'Zoom out', text: '\u2212', action: 'onZoomOut' },
  { className: 'nav-pan-right', title: 'Pan right (Ctrl+Right)', ariaLabel: 'Pan right', text: '\u25B6', action: 'onPanRight' },
];

/** Display mode definitions for the dropdown selector */
const DISPLAY_MODE_LABELS: ReadonlyMap<DisplayMode, string> = new Map([
  ['lcb', 'LCB Display'],
  ['ungapped-match', 'Ungapped Matches'],
  ['similarity-profile', 'Similarity Profile'],
]);

const VALID_DISPLAY_MODES: ReadonlySet<string> = new Set(['lcb', 'ungapped-match', 'similarity-profile']);

function isDisplayMode(value: string): value is DisplayMode {
  return VALID_DISPLAY_MODES.has(value);
}

/** Create a navigation toolbar with zoom/pan/reset buttons and optional display mode selector */
export function createNavigationToolbar(
  container: HTMLElement,
  callbacks: NavigationCallbacks,
  initialMode: DisplayMode = 'lcb',
  availableModes: readonly DisplayMode[] = ['lcb'],
): NavigationToolbarHandle {
  const toolbar = document.createElement('div');
  toolbar.className = 'navigation-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Navigation controls');

  for (const def of BUTTON_DEFS) {
    const btn = document.createElement('button');
    btn.className = def.className;
    btn.title = def.title;
    btn.setAttribute('aria-label', def.ariaLabel);
    btn.textContent = def.text;
    btn.type = 'button';
    btn.addEventListener('click', () => callbacks[def.action]());
    toolbar.appendChild(btn);
  }

  // Display mode selector — only shown when multiple modes are available
  if (availableModes.length > 1 && callbacks.onDisplayModeChange) {
    const select = document.createElement('select');
    select.className = 'display-mode-selector';
    select.setAttribute('aria-label', 'Display mode');
    select.title = 'Display mode';

    for (const mode of availableModes) {
      const option = document.createElement('option');
      option.value = mode;
      option.textContent = DISPLAY_MODE_LABELS.get(mode) ?? mode;
      if (mode === initialMode) option.selected = true;
      select.appendChild(option);
    }

    const onModeChange = callbacks.onDisplayModeChange;
    select.addEventListener('change', () => {
      if (isDisplayMode(select.value)) {
        onModeChange(select.value);
      }
    });

    toolbar.appendChild(select);
  }

  container.appendChild(toolbar);

  return {
    element: toolbar,
    destroy: () => {
      toolbar.remove();
    },
  };
}
