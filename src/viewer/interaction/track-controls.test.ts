import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTrackControls } from './track-controls.ts';
import type { TrackControlsHandle, TrackControlCallbacks } from './track-controls.ts';

function makeCallbacks(): TrackControlCallbacks {
  return {
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    onSetReference: vi.fn(),
    onToggleVisibility: vi.fn(),
  };
}

describe('createTrackControls', () => {
  let container: HTMLElement;
  let handle: TrackControlsHandle | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    handle?.destroy();
    handle = undefined;
    container.remove();
  });

  it('should create a track controls container', () => {
    const callbacks = makeCallbacks();
    handle = createTrackControls(container, 3, 0, new Set(), callbacks);
    const ctrl = container.querySelector('.track-controls');
    expect(ctrl).toBeInstanceOf(HTMLElement);
  });

  it('should create one control group per genome', () => {
    const callbacks = makeCallbacks();
    handle = createTrackControls(container, 3, 0, new Set(), callbacks);
    const groups = container.querySelectorAll('.track-control-group');
    expect(groups).toHaveLength(3);
  });

  it('should create four buttons per genome (up, down, ref, hide)', () => {
    const callbacks = makeCallbacks();
    handle = createTrackControls(container, 3, 0, new Set(), callbacks);
    const groups = container.querySelectorAll('.track-control-group');
    for (const group of groups) {
      const buttons = group.querySelectorAll('button');
      expect(buttons).toHaveLength(4);
    }
  });

  it('should disable move-up button for the first genome', () => {
    const callbacks = makeCallbacks();
    handle = createTrackControls(container, 3, 0, new Set(), callbacks);
    const firstUp = container.querySelector('.track-control-group:nth-child(1) .track-move-up') as HTMLButtonElement;
    expect(firstUp.disabled).toBe(true);
  });

  it('should disable move-down button for the last genome', () => {
    const callbacks = makeCallbacks();
    handle = createTrackControls(container, 3, 0, new Set(), callbacks);
    const lastDown = container.querySelector('.track-control-group:nth-child(3) .track-move-down') as HTMLButtonElement;
    expect(lastDown.disabled).toBe(true);
  });

  it('should mark the reference genome button as active', () => {
    const callbacks = makeCallbacks();
    handle = createTrackControls(container, 3, 1, new Set(), callbacks);
    const refBtns = container.querySelectorAll('.track-set-ref');
    expect((refBtns[0] as HTMLButtonElement).classList.contains('active')).toBe(false);
    expect((refBtns[1] as HTMLButtonElement).classList.contains('active')).toBe(true);
    expect((refBtns[2] as HTMLButtonElement).classList.contains('active')).toBe(false);
  });

  it('should call onMoveUp with display index when up button clicked', () => {
    const callbacks = makeCallbacks();
    handle = createTrackControls(container, 3, 0, new Set(), callbacks);
    const secondUp = container.querySelector('.track-control-group:nth-child(2) .track-move-up') as HTMLButtonElement;
    secondUp.click();
    expect(callbacks.onMoveUp).toHaveBeenCalledWith(1);
  });

  it('should call onMoveDown with display index when down button clicked', () => {
    const callbacks = makeCallbacks();
    handle = createTrackControls(container, 3, 0, new Set(), callbacks);
    const firstDown = container.querySelector('.track-control-group:nth-child(1) .track-move-down') as HTMLButtonElement;
    firstDown.click();
    expect(callbacks.onMoveDown).toHaveBeenCalledWith(0);
  });

  it('should call onSetReference with display index when ref button clicked', () => {
    const callbacks = makeCallbacks();
    handle = createTrackControls(container, 3, 0, new Set(), callbacks);
    const refBtn = container.querySelector('.track-control-group:nth-child(2) .track-set-ref') as HTMLButtonElement;
    refBtn.click();
    expect(callbacks.onSetReference).toHaveBeenCalledWith(1);
  });

  it('should call onToggleVisibility with display index when hide button clicked', () => {
    const callbacks = makeCallbacks();
    handle = createTrackControls(container, 3, 0, new Set(), callbacks);
    const hideBtn = container.querySelector('.track-control-group:nth-child(2) .track-toggle-visibility') as HTMLButtonElement;
    hideBtn.click();
    expect(callbacks.onToggleVisibility).toHaveBeenCalledWith(1);
  });

  it('should show minus sign for visible genomes', () => {
    const callbacks = makeCallbacks();
    handle = createTrackControls(container, 3, 0, new Set(), callbacks);
    const hideBtns = container.querySelectorAll('.track-toggle-visibility');
    for (const btn of hideBtns) {
      expect(btn.textContent).toBe('\u2212');
    }
  });

  it('should show plus sign for hidden genomes', () => {
    const callbacks = makeCallbacks();
    handle = createTrackControls(container, 3, 0, new Set([1]), callbacks);
    const hideBtns = container.querySelectorAll('.track-toggle-visibility');
    expect(hideBtns[0]!.textContent).toBe('\u2212');
    expect(hideBtns[1]!.textContent).toBe('+');
    expect(hideBtns[2]!.textContent).toBe('\u2212');
  });

  it('should have accessible aria-labels on all buttons', () => {
    const callbacks = makeCallbacks();
    handle = createTrackControls(container, 3, 0, new Set(), callbacks);
    const buttons = container.querySelectorAll('.track-controls button');
    for (const btn of buttons) {
      expect(btn.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('should set role toolbar on the controls container', () => {
    const callbacks = makeCallbacks();
    handle = createTrackControls(container, 3, 0, new Set(), callbacks);
    const ctrl = container.querySelector('.track-controls');
    expect(ctrl?.getAttribute('role')).toBe('toolbar');
  });

  it('should remove controls from DOM on destroy', () => {
    const callbacks = makeCallbacks();
    handle = createTrackControls(container, 3, 0, new Set(), callbacks);
    expect(container.querySelector('.track-controls')).toBeTruthy();
    handle.destroy();
    handle = undefined;
    expect(container.querySelector('.track-controls')).toBeNull();
  });

  it('should handle two genomes correctly', () => {
    const callbacks = makeCallbacks();
    handle = createTrackControls(container, 2, 0, new Set(), callbacks);
    const groups = container.querySelectorAll('.track-control-group');
    expect(groups).toHaveLength(2);

    // First can't move up, second can't move down
    const firstUp = container.querySelector('.track-control-group:nth-child(1) .track-move-up') as HTMLButtonElement;
    const secondDown = container.querySelector('.track-control-group:nth-child(2) .track-move-down') as HTMLButtonElement;
    expect(firstUp.disabled).toBe(true);
    expect(secondDown.disabled).toBe(true);
  });

  it('should handle single genome (all move buttons disabled)', () => {
    const callbacks = makeCallbacks();
    handle = createTrackControls(container, 1, 0, new Set(), callbacks);
    const groups = container.querySelectorAll('.track-control-group');
    expect(groups).toHaveLength(1);

    const up = container.querySelector('.track-move-up') as HTMLButtonElement;
    const down = container.querySelector('.track-move-down') as HTMLButtonElement;
    expect(up.disabled).toBe(true);
    expect(down.disabled).toBe(true);
  });
});
