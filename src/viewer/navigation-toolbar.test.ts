import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createNavigationToolbar } from './navigation-toolbar.ts';
import type { NavigationToolbarHandle, NavigationCallbacks } from './navigation-toolbar.ts';

function makeCallbacks(): NavigationCallbacks {
  return {
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onPanLeft: vi.fn(),
    onPanRight: vi.fn(),
    onReset: vi.fn(),
  };
}

describe('createNavigationToolbar', () => {
  let container: HTMLElement;
  let handle: NavigationToolbarHandle | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    handle?.destroy();
    handle = undefined;
    container.remove();
  });

  it('should create a toolbar element in the container', () => {
    const callbacks = makeCallbacks();
    handle = createNavigationToolbar(container, callbacks);
    const toolbar = container.querySelector('.navigation-toolbar');
    expect(toolbar).toBeInstanceOf(HTMLElement);
  });

  it('should create all five navigation buttons', () => {
    const callbacks = makeCallbacks();
    handle = createNavigationToolbar(container, callbacks);
    const buttons = container.querySelectorAll<HTMLButtonElement>('.navigation-toolbar button');
    expect(buttons).toHaveLength(5);
  });

  it('should have buttons in correct order: reset, pan-left, zoom-in, zoom-out, pan-right', () => {
    const callbacks = makeCallbacks();
    handle = createNavigationToolbar(container, callbacks);
    const buttons = container.querySelectorAll<HTMLButtonElement>('.navigation-toolbar button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]!.classList.contains('nav-reset')).toBe(true);
    expect(buttons[1]!.classList.contains('nav-pan-left')).toBe(true);
    expect(buttons[2]!.classList.contains('nav-zoom-in')).toBe(true);
    expect(buttons[3]!.classList.contains('nav-zoom-out')).toBe(true);
    expect(buttons[4]!.classList.contains('nav-pan-right')).toBe(true);
  });

  it('should set accessible titles on buttons', () => {
    const callbacks = makeCallbacks();
    handle = createNavigationToolbar(container, callbacks);
    const buttons = container.querySelectorAll<HTMLButtonElement>('.navigation-toolbar button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]!.title).toBe('Reset view');
    expect(buttons[1]!.title).toBe('Pan left (Ctrl+Left)');
    expect(buttons[2]!.title).toBe('Zoom in (Ctrl+Up)');
    expect(buttons[3]!.title).toBe('Zoom out (Ctrl+Down)');
    expect(buttons[4]!.title).toBe('Pan right (Ctrl+Right)');
  });

  it('should set aria-labels on buttons', () => {
    const callbacks = makeCallbacks();
    handle = createNavigationToolbar(container, callbacks);
    const buttons = container.querySelectorAll<HTMLButtonElement>('.navigation-toolbar button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]!.getAttribute('aria-label')).toBe('Reset view');
    expect(buttons[1]!.getAttribute('aria-label')).toBe('Pan left');
    expect(buttons[2]!.getAttribute('aria-label')).toBe('Zoom in');
    expect(buttons[3]!.getAttribute('aria-label')).toBe('Zoom out');
    expect(buttons[4]!.getAttribute('aria-label')).toBe('Pan right');
  });

  it('should call onReset when reset button is clicked', () => {
    const callbacks = makeCallbacks();
    handle = createNavigationToolbar(container, callbacks);
    const btn = container.querySelector('.nav-reset') as HTMLButtonElement;
    btn.click();
    expect(callbacks.onReset).toHaveBeenCalledOnce();
  });

  it('should call onPanLeft when pan-left button is clicked', () => {
    const callbacks = makeCallbacks();
    handle = createNavigationToolbar(container, callbacks);
    const btn = container.querySelector('.nav-pan-left') as HTMLButtonElement;
    btn.click();
    expect(callbacks.onPanLeft).toHaveBeenCalledOnce();
  });

  it('should call onZoomIn when zoom-in button is clicked', () => {
    const callbacks = makeCallbacks();
    handle = createNavigationToolbar(container, callbacks);
    const btn = container.querySelector('.nav-zoom-in') as HTMLButtonElement;
    btn.click();
    expect(callbacks.onZoomIn).toHaveBeenCalledOnce();
  });

  it('should call onZoomOut when zoom-out button is clicked', () => {
    const callbacks = makeCallbacks();
    handle = createNavigationToolbar(container, callbacks);
    const btn = container.querySelector('.nav-zoom-out') as HTMLButtonElement;
    btn.click();
    expect(callbacks.onZoomOut).toHaveBeenCalledOnce();
  });

  it('should call onPanRight when pan-right button is clicked', () => {
    const callbacks = makeCallbacks();
    handle = createNavigationToolbar(container, callbacks);
    const btn = container.querySelector('.nav-pan-right') as HTMLButtonElement;
    btn.click();
    expect(callbacks.onPanRight).toHaveBeenCalledOnce();
  });

  it('should remove toolbar on destroy', () => {
    const callbacks = makeCallbacks();
    handle = createNavigationToolbar(container, callbacks);
    expect(container.querySelector('.navigation-toolbar')).not.toBeNull();
    handle.destroy();
    expect(container.querySelector('.navigation-toolbar')).toBeNull();
    handle = undefined;
  });

  it('should not throw when clicking after destroy', () => {
    const callbacks = makeCallbacks();
    handle = createNavigationToolbar(container, callbacks);
    const btn = container.querySelector('.nav-zoom-in') as HTMLButtonElement;
    handle.destroy();
    handle = undefined;
    // Button is removed from DOM, no error expected
    expect(() => btn.click()).not.toThrow();
  });
});
