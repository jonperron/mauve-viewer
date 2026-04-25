import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLcbWeightSlider } from './lcb-weight-slider.ts';
import type { LcbWeightSliderHandle, LcbWeightSliderCallbacks } from './lcb-weight-slider.ts';

function makeCallbacks(): LcbWeightSliderCallbacks {
  return { onWeightChange: vi.fn() };
}

describe('createLcbWeightSlider', () => {
  let container: HTMLElement;
  let handle: LcbWeightSliderHandle | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    handle?.destroy();
    handle = undefined;
    container.remove();
  });

  it('returns undefined when maxWeight is 0', () => {
    const result = createLcbWeightSlider(container, 0, makeCallbacks());
    expect(result).toBeUndefined();
    expect(container.querySelector('.lcb-weight-slider')).toBeNull();
  });

  it('returns undefined when maxWeight is negative', () => {
    const result = createLcbWeightSlider(container, -5, makeCallbacks());
    expect(result).toBeUndefined();
  });

  it('creates a slider element in the container when maxWeight > 0', () => {
    handle = createLcbWeightSlider(container, 1000, makeCallbacks());
    expect(handle).toBeDefined();
    expect(container.querySelector('.lcb-weight-slider')).toBeInstanceOf(HTMLElement);
  });

  it('creates a range input with correct min, max, and step', () => {
    handle = createLcbWeightSlider(container, 500, makeCallbacks());
    const input = container.querySelector<HTMLInputElement>('input[type="range"]');
    expect(input).toBeDefined();
    expect(input!.min).toBe('0');
    expect(input!.max).toBe('500');
    expect(input!.step).toBe('1');
  });

  it('sets initial value to 0 by default', () => {
    handle = createLcbWeightSlider(container, 500, makeCallbacks());
    expect(handle!.getMinWeight()).toBe(0);
    const input = container.querySelector<HTMLInputElement>('input[type="range"]');
    expect(input!.value).toBe('0');
  });

  it('sets initial value to the provided initialWeight', () => {
    handle = createLcbWeightSlider(container, 1000, makeCallbacks(), 250);
    expect(handle!.getMinWeight()).toBe(250);
    const input = container.querySelector<HTMLInputElement>('input[type="range"]');
    expect(input!.value).toBe('250');
  });

  it('clamps initialWeight to maxWeight', () => {
    handle = createLcbWeightSlider(container, 100, makeCallbacks(), 500);
    expect(handle!.getMinWeight()).toBe(100);
  });

  it('clamps negative initialWeight to 0', () => {
    handle = createLcbWeightSlider(container, 100, makeCallbacks(), -10);
    expect(handle!.getMinWeight()).toBe(0);
  });

  it('calls onWeightChange when slider input event fires', () => {
    const callbacks = makeCallbacks();
    handle = createLcbWeightSlider(container, 1000, callbacks);
    const input = container.querySelector<HTMLInputElement>('input[type="range"]')!;
    input.value = '300';
    input.dispatchEvent(new Event('input'));
    expect(callbacks.onWeightChange).toHaveBeenCalledWith(300);
  });

  it('updates getMinWeight after slider change', () => {
    handle = createLcbWeightSlider(container, 1000, makeCallbacks());
    const input = container.querySelector<HTMLInputElement>('input[type="range"]')!;
    input.value = '750';
    input.dispatchEvent(new Event('input'));
    expect(handle!.getMinWeight()).toBe(750);
  });

  it('updates value display after slider change', () => {
    handle = createLcbWeightSlider(container, 1000, makeCallbacks());
    const input = container.querySelector<HTMLInputElement>('input[type="range"]')!;
    input.value = '400';
    input.dispatchEvent(new Event('input'));
    const valueDisplay = container.querySelector('.lcb-weight-slider__value');
    expect(valueDisplay!.textContent).toBe('400');
  });

  it('has accessible label and aria attributes', () => {
    handle = createLcbWeightSlider(container, 1000, makeCallbacks());
    const wrapper = container.querySelector('.lcb-weight-slider')!;
    expect(wrapper.getAttribute('role')).toBe('group');
    const input = container.querySelector<HTMLInputElement>('input[type="range"]')!;
    expect(input.getAttribute('aria-label')).toBe('Minimum LCB weight threshold');
    expect(input.getAttribute('aria-valuemin')).toBe('0');
    expect(input.getAttribute('aria-valuemax')).toBe('1000');
  });

  it('removes the element from DOM on destroy', () => {
    handle = createLcbWeightSlider(container, 1000, makeCallbacks());
    expect(container.querySelector('.lcb-weight-slider')).not.toBeNull();
    handle!.destroy();
    expect(container.querySelector('.lcb-weight-slider')).toBeNull();
    handle = undefined;
  });

  it('does not call onWeightChange after destroy', () => {
    const callbacks = makeCallbacks();
    handle = createLcbWeightSlider(container, 1000, callbacks);
    const input = container.querySelector<HTMLInputElement>('input[type="range"]')!;
    handle!.destroy();
    handle = undefined;
    input.value = '200';
    input.dispatchEvent(new Event('input'));
    expect(callbacks.onWeightChange).not.toHaveBeenCalled();
  });
});
