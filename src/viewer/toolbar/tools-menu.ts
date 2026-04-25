/** Callbacks for tools actions — undefined means the action is unavailable */
export interface ToolsMenuCallbacks {
  readonly onOrderContigs?: () => void;
}

/** Handle returned by createToolsMenu for lifecycle management */
export interface ToolsMenuHandle {
  readonly element: HTMLElement;
  readonly destroy: () => void;
}

interface ToolsButtonDef {
  readonly key: keyof ToolsMenuCallbacks;
  readonly label: string;
}

const TOOLS_BUTTON_DEFS: readonly ToolsButtonDef[] = [
  { key: 'onOrderContigs', label: 'Order Contigs' },
];

/**
 * Create a Tools dropdown menu in the viewer controls bar.
 *
 * Renders a "Tools" toggle button that reveals a dropdown of available
 * tool actions. Actions whose callbacks are undefined are hidden.
 * If no callbacks are defined, the toggle is disabled.
 */
export function createToolsMenu(
  container: HTMLElement,
  callbacks: ToolsMenuCallbacks,
): ToolsMenuHandle {
  const activeButtons = TOOLS_BUTTON_DEFS.filter(
    (def) => callbacks[def.key] !== undefined,
  );

  const panel = document.createElement('div');
  panel.className = 'tools-menu';

  const btn = document.createElement('button');
  btn.className = 'tools-menu-toggle';
  btn.type = 'button';
  btn.textContent = 'Tools';
  btn.setAttribute('aria-label', 'Toggle tools menu');

  if (activeButtons.length === 0) {
    btn.disabled = true;
  }

  panel.appendChild(btn);

  const dropdown = document.createElement('div');
  dropdown.className = 'tools-menu-dropdown';
  panel.appendChild(dropdown);

  for (const def of activeButtons) {
    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'tools-menu-action-btn';
    actionBtn.textContent = def.label;
    const callback = callbacks[def.key];
    actionBtn.addEventListener('click', () => {
      dropdown.classList.remove('show');
      callback?.();
    });
    dropdown.appendChild(actionBtn);
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Close sibling dropdowns
    panel.parentElement?.querySelectorAll('.export-menu-dropdown.show, .options-dropdown.show').forEach((el) =>
      el.classList.remove('show'),
    );
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
