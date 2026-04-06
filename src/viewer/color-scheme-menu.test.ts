import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createColorSchemeMenu } from './color-scheme-menu.ts';
import type { ColorSchemeMenuHandle } from './color-scheme-menu.ts';
import type { ColorScheme, ColorSchemeId } from './color-schemes.ts';

const MOCK_SCHEMES: readonly ColorScheme[] = [
  { id: 'lcb', label: 'LCB', apply: () => [] },
  { id: 'offset', label: 'Offset', apply: () => [] },
  { id: 'multiplicity', label: 'Multiplicity', apply: () => [] },
];

describe('createColorSchemeMenu', () => {
  let container: HTMLDivElement;
  let handle: ColorSchemeMenuHandle | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    handle?.destroy();
    handle = undefined;
    container.remove();
  });

  it('should create a menu element with a select dropdown', () => {
    handle = createColorSchemeMenu(container, MOCK_SCHEMES, 'lcb', { onSchemeChange: () => {} });
    const select = container.querySelector('select');
    expect(select).toBeTruthy();
  });

  it('should populate options from provided schemes', () => {
    handle = createColorSchemeMenu(container, MOCK_SCHEMES, 'lcb', { onSchemeChange: () => {} });
    const options = container.querySelectorAll('option');
    expect(options).toHaveLength(3);
    expect(options[0]?.textContent).toBe('LCB');
    expect(options[1]?.textContent).toBe('Offset');
    expect(options[2]?.textContent).toBe('Multiplicity');
  });

  it('should select the initial scheme', () => {
    handle = createColorSchemeMenu(container, MOCK_SCHEMES, 'offset', { onSchemeChange: () => {} });
    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('offset');
    expect(handle!.getSelectedScheme()).toBe('offset');
  });

  it('should invoke callback when scheme changes', () => {
    const changes: ColorSchemeId[] = [];
    handle = createColorSchemeMenu(container, MOCK_SCHEMES, 'lcb', {
      onSchemeChange: (id) => changes.push(id),
    });
    const select = container.querySelector('select') as HTMLSelectElement;
    select.value = 'multiplicity';
    select.dispatchEvent(new Event('change'));
    expect(changes).toEqual(['multiplicity']);
    expect(handle!.getSelectedScheme()).toBe('multiplicity');
  });

  it('should remove element on destroy', () => {
    handle = createColorSchemeMenu(container, MOCK_SCHEMES, 'lcb', { onSchemeChange: () => {} });
    expect(container.querySelector('.color-scheme-menu')).toBeTruthy();
    handle.destroy();
    expect(container.querySelector('.color-scheme-menu')).toBeNull();
    handle = undefined;
  });
});
