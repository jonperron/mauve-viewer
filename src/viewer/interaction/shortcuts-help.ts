/** Keyboard shortcuts help panel */

interface ShortcutDef {
  readonly keys: string;
  readonly description: string;
}

const SHORTCUTS: readonly ShortcutDef[] = [
  { keys: 'Ctrl + Up', description: 'Zoom in' },
  { keys: 'Ctrl + Down', description: 'Zoom out' },
  { keys: 'Ctrl + Left', description: 'Pan left' },
  { keys: 'Ctrl + Right', description: 'Pan right' },
  { keys: 'Ctrl + Shift + Left/Right', description: 'Pan faster' },
  { keys: 'Ctrl + E', description: 'Export image' },
  { keys: 'Ctrl + P', description: 'Print' },
  { keys: 'Ctrl + I', description: 'Sequence navigator' },
  { keys: 'Escape', description: 'Close dialog / clear selection' },
  { keys: '?', description: 'Toggle this help' },
];

export interface ShortcutsHelpHandle {
  readonly element: HTMLElement;
  readonly destroy: () => void;
}

export function createShortcutsHelp(container: HTMLElement): ShortcutsHelpHandle {
  const wrapper = document.createElement('div');
  wrapper.className = 'shortcuts-help-wrapper';

  // Toggle button
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'shortcuts-help-btn';
  btn.textContent = '?';
  btn.setAttribute('aria-label', 'Keyboard shortcuts');
  btn.title = 'Keyboard shortcuts (?)';
  wrapper.appendChild(btn);

  // Help box
  const box = document.createElement('div');
  box.className = 'shortcuts-help-box';

  const title = document.createElement('div');
  title.className = 'shortcuts-help-title';
  title.textContent = 'Keyboard Shortcuts';
  box.appendChild(title);

  const list = document.createElement('dl');
  list.className = 'shortcuts-help-list';
  for (const shortcut of SHORTCUTS) {
    const row = document.createElement('div');
    row.className = 'shortcuts-help-row';

    const dt = document.createElement('dt');
    const keys = shortcut.keys.split(' + ');
    keys.forEach((k, i) => {
      if (i > 0) dt.append(' + ');
      const kbd = document.createElement('kbd');
      kbd.textContent = k;
      dt.appendChild(kbd);
    });

    const dd = document.createElement('dd');
    dd.textContent = shortcut.description;

    row.appendChild(dt);
    row.appendChild(dd);
    list.appendChild(row);
  }
  box.appendChild(list);
  wrapper.appendChild(box);

  function toggle(): void {
    box.classList.toggle('show');
  }

  function hide(): void {
    box.classList.remove('show');
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const target = e.target;
      if (target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;
      e.preventDefault();
      toggle();
    }
  };

  const onDocumentClick = (e: MouseEvent) => {
    if (e.target instanceof Node && !wrapper.contains(e.target)) {
      hide();
    }
  };

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', onDocumentClick);

  container.appendChild(wrapper);

  return {
    element: wrapper,
    destroy: () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onDocumentClick);
      wrapper.remove();
    },
  };
}
