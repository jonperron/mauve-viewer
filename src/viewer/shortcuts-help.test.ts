import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createShortcutsHelp } from './shortcuts-help.ts';
import type { ShortcutsHelpHandle } from './shortcuts-help.ts';

describe('createShortcutsHelp', () => {
  let container: HTMLElement;
  let handle: ShortcutsHelpHandle | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    handle?.destroy();
    handle = undefined;
    container.remove();
  });

  it('creates a wrapper element in the container', () => {
    handle = createShortcutsHelp(container);
    const wrapper = container.querySelector('.shortcuts-help-wrapper');
    expect(wrapper).toBeInstanceOf(HTMLElement);
  });

  it('returns the wrapper as element on the handle', () => {
    handle = createShortcutsHelp(container);
    expect(handle.element).toBe(container.querySelector('.shortcuts-help-wrapper'));
  });

  it('creates a toggle button with ? text', () => {
    handle = createShortcutsHelp(container);
    const btn = container.querySelector('.shortcuts-help-btn') as HTMLButtonElement;
    expect(btn).toBeInstanceOf(HTMLButtonElement);
    expect(btn.textContent).toBe('?');
    expect(btn.type).toBe('button');
  });

  it('sets aria-label and title on the toggle button', () => {
    handle = createShortcutsHelp(container);
    const btn = container.querySelector('.shortcuts-help-btn') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBe('Keyboard shortcuts');
    expect(btn.title).toBe('Keyboard shortcuts (?)');
  });

  it('creates a help box that is initially hidden (no show class)', () => {
    handle = createShortcutsHelp(container);
    const box = container.querySelector('.shortcuts-help-box');
    expect(box).toBeInstanceOf(HTMLElement);
    expect(box!.classList.contains('show')).toBe(false);
  });

  it('displays a title inside the help box', () => {
    handle = createShortcutsHelp(container);
    const title = container.querySelector('.shortcuts-help-title');
    expect(title).not.toBeNull();
    expect(title!.textContent).toBe('Keyboard Shortcuts');
  });

  it('renders all 10 shortcut rows', () => {
    handle = createShortcutsHelp(container);
    const rows = container.querySelectorAll('.shortcuts-help-row');
    expect(rows).toHaveLength(10);
  });

  it('renders each row with a dt containing kbd elements and a dd with description', () => {
    handle = createShortcutsHelp(container);
    const rows = container.querySelectorAll('.shortcuts-help-row');
    for (const row of rows) {
      const dt = row.querySelector('dt');
      const dd = row.querySelector('dd');
      expect(dt).not.toBeNull();
      expect(dd).not.toBeNull();
      expect(dt!.querySelectorAll('kbd').length).toBeGreaterThan(0);
      expect(dd!.textContent!.length).toBeGreaterThan(0);
    }
  });

  it('renders the first shortcut as Ctrl + Up → Zoom in', () => {
    handle = createShortcutsHelp(container);
    const firstRow = container.querySelector('.shortcuts-help-row')!;
    const kbds = firstRow.querySelectorAll('dt kbd');
    expect(kbds).toHaveLength(2);
    expect(kbds[0]!.textContent).toBe('Ctrl');
    expect(kbds[1]!.textContent).toBe('Up');
    expect(firstRow.querySelector('dd')!.textContent).toBe('Zoom in');
  });

  describe('toggle button click', () => {
    it('shows the help box on first click', () => {
      handle = createShortcutsHelp(container);
      const btn = container.querySelector('.shortcuts-help-btn') as HTMLButtonElement;
      const box = container.querySelector('.shortcuts-help-box')!;

      btn.click();
      expect(box.classList.contains('show')).toBe(true);
    });

    it('hides the help box on second click', () => {
      handle = createShortcutsHelp(container);
      const btn = container.querySelector('.shortcuts-help-btn') as HTMLButtonElement;
      const box = container.querySelector('.shortcuts-help-box')!;

      btn.click();
      btn.click();
      expect(box.classList.contains('show')).toBe(false);
    });
  });

  describe('? key shortcut', () => {
    it('toggles help box when ? key is pressed', () => {
      handle = createShortcutsHelp(container);
      const box = container.querySelector('.shortcuts-help-box')!;

      document.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
      expect(box.classList.contains('show')).toBe(true);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
      expect(box.classList.contains('show')).toBe(false);
    });

    it('does not toggle when ? is pressed with ctrlKey', () => {
      handle = createShortcutsHelp(container);
      const box = container.querySelector('.shortcuts-help-box')!;

      document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', ctrlKey: true }));
      expect(box.classList.contains('show')).toBe(false);
    });

    it('does not toggle when ? is pressed with altKey', () => {
      handle = createShortcutsHelp(container);
      const box = container.querySelector('.shortcuts-help-box')!;

      document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', altKey: true }));
      expect(box.classList.contains('show')).toBe(false);
    });

    it('does not toggle when ? is pressed with metaKey', () => {
      handle = createShortcutsHelp(container);
      const box = container.querySelector('.shortcuts-help-box')!;

      document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', metaKey: true }));
      expect(box.classList.contains('show')).toBe(false);
    });

    it('does not toggle when target is an INPUT element', () => {
      handle = createShortcutsHelp(container);
      const box = container.querySelector('.shortcuts-help-box')!;
      const input = document.createElement('input');
      container.appendChild(input);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
      expect(box.classList.contains('show')).toBe(false);
    });

    it('does not toggle when target is a TEXTAREA element', () => {
      handle = createShortcutsHelp(container);
      const box = container.querySelector('.shortcuts-help-box')!;
      const textarea = document.createElement('textarea');
      container.appendChild(textarea);

      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
      expect(box.classList.contains('show')).toBe(false);
    });

    it('does not toggle when target is a SELECT element', () => {
      handle = createShortcutsHelp(container);
      const box = container.querySelector('.shortcuts-help-box')!;
      const select = document.createElement('select');
      container.appendChild(select);

      select.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
      expect(box.classList.contains('show')).toBe(false);
    });
  });

  describe('click outside to close', () => {
    it('hides help box when clicking outside the wrapper', () => {
      handle = createShortcutsHelp(container);
      const btn = container.querySelector('.shortcuts-help-btn') as HTMLButtonElement;
      const box = container.querySelector('.shortcuts-help-box')!;

      btn.click();
      expect(box.classList.contains('show')).toBe(true);

      document.body.click();
      expect(box.classList.contains('show')).toBe(false);
    });

    it('does not hide help box when clicking inside the wrapper', () => {
      handle = createShortcutsHelp(container);
      const box = container.querySelector('.shortcuts-help-box')!;

      // Open via button
      const btn = container.querySelector('.shortcuts-help-btn') as HTMLButtonElement;
      btn.click();
      expect(box.classList.contains('show')).toBe(true);

      // Click inside the box itself
      box.click();
      expect(box.classList.contains('show')).toBe(true);
    });
  });

  describe('destroy', () => {
    it('removes the wrapper from the DOM', () => {
      handle = createShortcutsHelp(container);
      expect(container.querySelector('.shortcuts-help-wrapper')).not.toBeNull();
      handle.destroy();
      expect(container.querySelector('.shortcuts-help-wrapper')).toBeNull();
      handle = undefined;
    });

    it('removes keydown listener after destroy', () => {
      handle = createShortcutsHelp(container);
      handle.destroy();

      // Create a new instance to verify the old listener is gone
      const handle2 = createShortcutsHelp(container);
      const box = container.querySelector('.shortcuts-help-box')!;

      // Press ? — only the new instance should respond
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
      expect(box.classList.contains('show')).toBe(true);

      handle2.destroy();
      handle = undefined;
    });

    it('removes click-outside listener after destroy', () => {
      handle = createShortcutsHelp(container);
      handle.destroy();
      handle = undefined;

      // Should not throw when clicking after destroy
      expect(() => document.body.click()).not.toThrow();
    });
  });
});
