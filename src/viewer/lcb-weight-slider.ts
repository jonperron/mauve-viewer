/** Callbacks for the LCB weight slider */
export interface LcbWeightSliderCallbacks {
  readonly onWeightChange: (minWeight: number) => void;
}

/** Active slider handle for cleanup and state queries */
export interface LcbWeightSliderHandle {
  readonly element: HTMLElement;
  /** Current minimum weight threshold */
  readonly getMinWeight: () => number;
  readonly destroy: () => void;
}

/**
 * Create a slider control that filters LCBs by minimum weight threshold.
 * The slider is only rendered when maxWeight > 0 (i.e., when LCBs with weights exist).
 * Returns undefined when there is nothing to filter (maxWeight is 0).
 */
export function createLcbWeightSlider(
  container: HTMLElement,
  maxWeight: number,
  callbacks: LcbWeightSliderCallbacks,
  initialWeight: number = 0,
): LcbWeightSliderHandle | undefined {
  if (maxWeight <= 0) return undefined;

  const wrapper = document.createElement('div');
  wrapper.className = 'lcb-weight-slider';
  wrapper.setAttribute('role', 'group');
  wrapper.setAttribute('aria-label', 'LCB weight filter');

  const labelEl = document.createElement('label');
  labelEl.className = 'lcb-weight-slider__label';
  labelEl.htmlFor = 'lcb-weight-input';
  labelEl.textContent = 'Min LCB weight:';

  const slider = document.createElement('input');
  slider.id = 'lcb-weight-input';
  slider.type = 'range';
  slider.className = 'lcb-weight-slider__input';
  slider.min = '0';
  slider.max = String(maxWeight);
  slider.step = '1';
  slider.value = String(Math.max(0, Math.min(initialWeight, maxWeight)));
  slider.setAttribute('aria-label', 'Minimum LCB weight threshold');
  slider.setAttribute('aria-valuemin', '0');
  slider.setAttribute('aria-valuemax', String(maxWeight));
  slider.setAttribute('aria-valuenow', slider.value);

  const valueDisplay = document.createElement('span');
  valueDisplay.className = 'lcb-weight-slider__value';
  valueDisplay.textContent = slider.value;
  valueDisplay.setAttribute('aria-live', 'polite');

  let currentWeight = Number(slider.value);

  const onInput = (): void => {
    currentWeight = Number(slider.value);
    valueDisplay.textContent = String(currentWeight);
    slider.setAttribute('aria-valuenow', String(currentWeight));
    callbacks.onWeightChange(currentWeight);
  };

  slider.addEventListener('input', onInput);

  wrapper.appendChild(labelEl);
  wrapper.appendChild(slider);
  wrapper.appendChild(valueDisplay);
  container.appendChild(wrapper);

  return {
    element: wrapper,
    getMinWeight: () => currentWeight,
    destroy: () => {
      slider.removeEventListener('input', onInput);
      wrapper.remove();
    },
  };
}
