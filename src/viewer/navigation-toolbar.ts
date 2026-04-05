/** Callbacks for navigation toolbar actions */
export interface NavigationCallbacks {
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onPanLeft: () => void;
  readonly onPanRight: () => void;
  readonly onReset: () => void;
}

/** Active toolbar handle for cleanup */
export interface NavigationToolbarHandle {
  readonly element: HTMLElement;
  readonly destroy: () => void;
}

interface ButtonDef {
  readonly className: string;
  readonly title: string;
  readonly ariaLabel: string;
  readonly text: string;
  readonly action: keyof NavigationCallbacks;
}

const BUTTON_DEFS: readonly ButtonDef[] = [
  { className: 'nav-reset', title: 'Reset view', ariaLabel: 'Reset view', text: '\u21BA', action: 'onReset' },
  { className: 'nav-pan-left', title: 'Pan left (Ctrl+Left)', ariaLabel: 'Pan left', text: '\u25C0', action: 'onPanLeft' },
  { className: 'nav-zoom-in', title: 'Zoom in (Ctrl+Up)', ariaLabel: 'Zoom in', text: '+', action: 'onZoomIn' },
  { className: 'nav-zoom-out', title: 'Zoom out (Ctrl+Down)', ariaLabel: 'Zoom out', text: '\u2212', action: 'onZoomOut' },
  { className: 'nav-pan-right', title: 'Pan right (Ctrl+Right)', ariaLabel: 'Pan right', text: '\u25B6', action: 'onPanRight' },
];

/** Create a navigation toolbar with zoom/pan/reset buttons */
export function createNavigationToolbar(
  container: HTMLElement,
  callbacks: NavigationCallbacks,
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

  container.insertBefore(toolbar, container.firstChild);

  return {
    element: toolbar,
    destroy: () => {
      toolbar.remove();
    },
  };
}
