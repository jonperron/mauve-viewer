import type { ColorScheme, ColorSchemeId } from './color-schemes.ts';

/** Callback when a color scheme is selected */
export interface ColorSchemeMenuCallbacks {
  readonly onSchemeChange: (schemeId: ColorSchemeId) => void;
}

/** Handle for lifecycle management of the color scheme menu */
export interface ColorSchemeMenuHandle {
  readonly element: HTMLElement;
  readonly getSelectedScheme: () => ColorSchemeId;
  readonly destroy: () => void;
}

/** Create a color scheme selector dropdown in the controls bar */
export function createColorSchemeMenu(
  container: HTMLElement,
  schemes: readonly ColorScheme[],
  initialSchemeId: ColorSchemeId,
  callbacks: ColorSchemeMenuCallbacks,
): ColorSchemeMenuHandle {
  let selectedScheme = initialSchemeId;

  const wrapper = document.createElement('div');
  wrapper.className = 'color-scheme-menu';

  const label = document.createElement('label');
  label.className = 'color-scheme-label';
  label.textContent = 'Color Scheme: ';

  const select = document.createElement('select');
  select.className = 'color-scheme-select';
  select.setAttribute('aria-label', 'Color scheme');

  for (const scheme of schemes) {
    const option = document.createElement('option');
    option.value = scheme.id;
    option.textContent = scheme.label;
    if (scheme.id === initialSchemeId) {
      option.selected = true;
    }
    select.appendChild(option);
  }

  select.addEventListener('change', () => {
    const scheme = schemes.find(s => s.id === select.value);
    if (scheme) {
      selectedScheme = scheme.id;
      callbacks.onSchemeChange(scheme.id);
    }
  });

  label.appendChild(select);
  wrapper.appendChild(label);
  container.appendChild(wrapper);

  return {
    element: wrapper,
    getSelectedScheme: () => selectedScheme,
    destroy: () => {
      wrapper.remove();
    },
  };
}
