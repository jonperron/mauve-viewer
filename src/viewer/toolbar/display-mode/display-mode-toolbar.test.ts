import { describe, it, expect, beforeEach } from 'vitest';
import { createNavigationToolbar } from '../navigation-toolbar.ts';
import type { NavigationCallbacks } from '../navigation-toolbar.ts';
import type { DisplayMode } from '../../viewer-state.ts';

describe('createNavigationToolbar with display mode selector', () => {
  let container: HTMLDivElement;
  let callbacks: NavigationCallbacks;
  let lastMode: DisplayMode | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    lastMode = undefined;
    callbacks = {
      onZoomIn: () => {},
      onZoomOut: () => {},
      onPanLeft: () => {},
      onPanRight: () => {},
      onReset: () => {},
      onDisplayModeChange: (mode: DisplayMode) => { lastMode = mode; },
    };
  });

  it('should not show mode selector when only one mode available', () => {
    const handle = createNavigationToolbar(container, callbacks, 'lcb', ['lcb']);
    const select = handle.element.querySelector('.display-mode-selector');
    expect(select).toBeNull();
    handle.destroy();
  });

  it('should show mode selector when multiple modes available', () => {
    const handle = createNavigationToolbar(
      container, callbacks, 'lcb', ['lcb', 'ungapped-match', 'similarity-profile'],
    );
    const select = handle.element.querySelector('.display-mode-selector') as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.options).toHaveLength(3);
    handle.destroy();
  });

  it('should set initial selected mode', () => {
    const handle = createNavigationToolbar(
      container, callbacks, 'ungapped-match', ['lcb', 'ungapped-match'],
    );
    const select = handle.element.querySelector('.display-mode-selector') as HTMLSelectElement;
    expect(select.value).toBe('ungapped-match');
    handle.destroy();
  });

  it('should fire onDisplayModeChange on selection change', () => {
    const handle = createNavigationToolbar(
      container, callbacks, 'lcb', ['lcb', 'ungapped-match'],
    );
    const select = handle.element.querySelector('.display-mode-selector') as HTMLSelectElement;
    select.value = 'ungapped-match';
    select.dispatchEvent(new Event('change'));
    expect(lastMode).toBe('ungapped-match');
    handle.destroy();
  });

  it('should have correct option labels', () => {
    const handle = createNavigationToolbar(
      container, callbacks, 'lcb', ['lcb', 'ungapped-match', 'similarity-profile'],
    );
    const select = handle.element.querySelector('.display-mode-selector') as HTMLSelectElement;
    const labels = Array.from(select.options).map((o) => o.textContent);
    expect(labels).toEqual(['LCB Display', 'Ungapped Matches', 'Similarity Profile']);
    handle.destroy();
  });

  it('should have aria-label on selector', () => {
    const handle = createNavigationToolbar(
      container, callbacks, 'lcb', ['lcb', 'ungapped-match'],
    );
    const select = handle.element.querySelector('.display-mode-selector') as HTMLSelectElement;
    expect(select.getAttribute('aria-label')).toBe('Display mode');
    handle.destroy();
  });

  it('should still have all navigation buttons', () => {
    const handle = createNavigationToolbar(
      container, callbacks, 'lcb', ['lcb', 'ungapped-match'],
    );
    expect(handle.element.querySelector('.nav-reset')).not.toBeNull();
    expect(handle.element.querySelector('.nav-zoom-in')).not.toBeNull();
    expect(handle.element.querySelector('.nav-zoom-out')).not.toBeNull();
    expect(handle.element.querySelector('.nav-pan-left')).not.toBeNull();
    expect(handle.element.querySelector('.nav-pan-right')).not.toBeNull();
    handle.destroy();
  });

  it('should not show selector when no onDisplayModeChange callback', () => {
    const noModeCallbacks: NavigationCallbacks = {
      onZoomIn: () => {},
      onZoomOut: () => {},
      onPanLeft: () => {},
      onPanRight: () => {},
      onReset: () => {},
    };
    const handle = createNavigationToolbar(
      container, noModeCallbacks, 'lcb', ['lcb', 'ungapped-match'],
    );
    const select = handle.element.querySelector('.display-mode-selector');
    expect(select).toBeNull();
    handle.destroy();
  });
});
