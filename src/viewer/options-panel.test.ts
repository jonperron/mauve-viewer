import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createOptionsPanel,
  DEFAULT_OPTIONS,
  type OptionsState,
  type OptionsPanelHandle,
  type OptionsCallbacks,
} from './options-panel.ts';

function createContainer(): HTMLElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

function createCallbacks(): OptionsCallbacks {
  return {
    onToggleGenomeId: vi.fn(),
    onToggleConnectingLines: vi.fn(),
    onToggleFeatures: vi.fn(),
    onToggleContigs: vi.fn(),
  };
}

describe('DEFAULT_OPTIONS', () => {
  it('has all options enabled by default', () => {
    expect(DEFAULT_OPTIONS).toEqual({
      showGenomeId: true,
      showConnectingLines: true,
      showFeatures: true,
      showContigs: true,
    });
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(DEFAULT_OPTIONS)).toBe(true);
  });
});

describe('createOptionsPanel', () => {
  let container: HTMLElement;
  let callbacks: OptionsCallbacks;
  let handle: OptionsPanelHandle;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = createContainer();
    callbacks = createCallbacks();
    handle = createOptionsPanel(container, callbacks);
  });

  it('creates an options button in the container', () => {
    const btn = container.querySelector('.options-toggle');
    expect(btn).not.toBeNull();
    expect(btn?.textContent).toContain('Options');
  });

  it('creates a dropdown that is initially hidden', () => {
    const dropdown = container.querySelector('.options-dropdown');
    expect(dropdown).not.toBeNull();
    expect(dropdown?.classList.contains('show')).toBe(false);
  });

  it('creates four checkbox options', () => {
    const checkboxes = container.querySelectorAll<HTMLInputElement>(
      '.options-dropdown input[type="checkbox"]',
    );
    expect(checkboxes.length).toBe(4);
  });

  it('all checkboxes are checked by default', () => {
    const checkboxes = container.querySelectorAll<HTMLInputElement>(
      '.options-dropdown input[type="checkbox"]',
    );
    for (const cb of checkboxes) {
      expect(cb.checked).toBe(true);
    }
  });

  it('toggles dropdown visibility when button is clicked', () => {
    const btn = container.querySelector<HTMLButtonElement>('.options-toggle')!;
    const dropdown = container.querySelector('.options-dropdown')!;

    btn.click();
    expect(dropdown.classList.contains('show')).toBe(true);

    btn.click();
    expect(dropdown.classList.contains('show')).toBe(false);
  });

  it('calls onToggleGenomeId when genome ID checkbox changes', () => {
    const cb = container.querySelector<HTMLInputElement>(
      'input[name="showGenomeId"]',
    )!;
    cb.click();
    expect(callbacks.onToggleGenomeId).toHaveBeenCalledWith(false);

    cb.click();
    expect(callbacks.onToggleGenomeId).toHaveBeenCalledWith(true);
  });

  it('calls onToggleConnectingLines when connecting lines checkbox changes', () => {
    const cb = container.querySelector<HTMLInputElement>(
      'input[name="showConnectingLines"]',
    )!;
    cb.click();
    expect(callbacks.onToggleConnectingLines).toHaveBeenCalledWith(false);
  });

  it('calls onToggleFeatures when features checkbox changes', () => {
    const cb = container.querySelector<HTMLInputElement>(
      'input[name="showFeatures"]',
    )!;
    cb.click();
    expect(callbacks.onToggleFeatures).toHaveBeenCalledWith(false);
  });

  it('calls onToggleContigs when contigs checkbox changes', () => {
    const cb = container.querySelector<HTMLInputElement>(
      'input[name="showContigs"]',
    )!;
    cb.click();
    expect(callbacks.onToggleContigs).toHaveBeenCalledWith(false);
  });

  it('getState returns current options state', () => {
    const state = handle.getState();
    expect(state).toEqual(DEFAULT_OPTIONS);
  });

  it('getState reflects checkbox changes', () => {
    const cb = container.querySelector<HTMLInputElement>(
      'input[name="showConnectingLines"]',
    )!;
    cb.click();

    const state = handle.getState();
    expect(state.showConnectingLines).toBe(false);
    expect(state.showGenomeId).toBe(true);
    expect(state.showFeatures).toBe(true);
    expect(state.showContigs).toBe(true);
  });

  it('destroy removes the panel from the DOM', () => {
    handle.destroy();
    expect(container.querySelector('.options-panel')).toBeNull();
  });

  it('creates panel with custom initial state', () => {
    handle.destroy();
    const customState: OptionsState = {
      showGenomeId: false,
      showConnectingLines: false,
      showFeatures: true,
      showContigs: false,
    };
    const customHandle = createOptionsPanel(container, callbacks, customState);
    const genomeIdCb = container.querySelector<HTMLInputElement>(
      'input[name="showGenomeId"]',
    )!;
    const linesCb = container.querySelector<HTMLInputElement>(
      'input[name="showConnectingLines"]',
    )!;
    const featuresCb = container.querySelector<HTMLInputElement>(
      'input[name="showFeatures"]',
    )!;
    const contigsCb = container.querySelector<HTMLInputElement>(
      'input[name="showContigs"]',
    )!;

    expect(genomeIdCb.checked).toBe(false);
    expect(linesCb.checked).toBe(false);
    expect(featuresCb.checked).toBe(true);
    expect(contigsCb.checked).toBe(false);
    expect(customHandle.getState()).toEqual(customState);
  });

  it('closes dropdown when clicking outside', () => {
    const btn = container.querySelector<HTMLButtonElement>('.options-toggle')!;
    const dropdown = container.querySelector('.options-dropdown')!;

    btn.click();
    expect(dropdown.classList.contains('show')).toBe(true);

    // Click outside
    document.body.click();
    expect(dropdown.classList.contains('show')).toBe(false);
  });
});
