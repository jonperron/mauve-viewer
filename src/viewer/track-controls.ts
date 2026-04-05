/** Callbacks for track control actions */
export interface TrackControlCallbacks {
  readonly onMoveUp: (displayIndex: number) => void;
  readonly onMoveDown: (displayIndex: number) => void;
  readonly onSetReference: (displayIndex: number) => void;
  readonly onToggleVisibility: (displayIndex: number) => void;
}

/** Layout info for positioning controls next to each genome panel */
export interface TrackControlLayout {
  /** Y offset of each panel (relative to SVG content area, in px) */
  readonly panelYPositions: readonly number[];
  /** Height of each panel in px */
  readonly panelHeights: readonly number[];
  /** Top margin of the SVG content area in px */
  readonly marginTop: number;
  /** Left margin of the SVG content area in px */
  readonly marginLeft: number;
}

/** Active track controls handle for cleanup */
export interface TrackControlsHandle {
  readonly element: HTMLElement;
  readonly destroy: () => void;
}

/**
 * Create track control buttons for each genome panel.
 * Each panel gets: move up, move down, set reference, hide/show.
 * Controls are positioned absolutely next to each genome panel.
 */
export function createTrackControls(
  container: HTMLElement,
  genomeCount: number,
  referenceDisplayIndex: number,
  hiddenDisplayIndices: ReadonlySet<number>,
  callbacks: TrackControlCallbacks,
  layout?: TrackControlLayout,
): TrackControlsHandle {
  const controls = document.createElement('div');
  controls.className = 'track-controls';
  controls.setAttribute('role', 'toolbar');
  controls.setAttribute('aria-label', 'Track controls');

  if (layout) {
    controls.style.position = 'absolute';
    controls.style.top = '0';
    controls.style.left = '0';
    controls.style.pointerEvents = 'none';
  }

  for (let di = 0; di < genomeCount; di++) {
    const group = createControlGroup(
      di,
      genomeCount,
      di === referenceDisplayIndex,
      hiddenDisplayIndices.has(di),
      callbacks,
    );

    if (layout) {
      const panelY = layout.panelYPositions[di] ?? 0;
      const panelH = layout.panelHeights[di] ?? 0;
      const btnWidth = 24;
      const leftOffset = layout.marginLeft - btnWidth - 4;
      group.style.position = 'absolute';
      group.style.top = `${layout.marginTop + panelY}px`;
      group.style.left = `${leftOffset}px`;
      group.style.height = `${panelH}px`;
      group.style.display = 'flex';
      group.style.flexDirection = 'column';
      group.style.alignItems = 'center';
      group.style.justifyContent = 'center';
      group.style.pointerEvents = 'auto';
    }

    controls.appendChild(group);
  }

  container.insertBefore(controls, container.firstChild);

  return {
    element: controls,
    destroy: () => {
      controls.remove();
    },
  };
}

function createControlGroup(
  displayIndex: number,
  genomeCount: number,
  isReference: boolean,
  isHidden: boolean,
  callbacks: TrackControlCallbacks,
): HTMLElement {
  const group = document.createElement('div');
  group.className = 'track-control-group';

  const upBtn = createButton(
    'track-move-up',
    '\u25B2',
    `Move genome ${displayIndex + 1} up`,
    displayIndex === 0,
    () => callbacks.onMoveUp(displayIndex),
  );

  const downBtn = createButton(
    'track-move-down',
    '\u25BC',
    `Move genome ${displayIndex + 1} down`,
    displayIndex === genomeCount - 1,
    () => callbacks.onMoveDown(displayIndex),
  );

  const refBtn = createButton(
    'track-set-ref',
    'R',
    `Set genome ${displayIndex + 1} as reference`,
    false,
    () => callbacks.onSetReference(displayIndex),
  );
  if (isReference) {
    refBtn.classList.add('active');
  }

  const visBtn = createButton(
    'track-toggle-visibility',
    isHidden ? '+' : '\u2212',
    isHidden ? `Show genome ${displayIndex + 1}` : `Hide genome ${displayIndex + 1}`,
    false,
    () => callbacks.onToggleVisibility(displayIndex),
  );

  group.appendChild(upBtn);
  group.appendChild(refBtn);
  group.appendChild(downBtn);
  group.appendChild(visBtn);

  return group;
}

function createButton(
  className: string,
  text: string,
  ariaLabel: string,
  disabled: boolean,
  onClick: () => void,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = className;
  btn.type = 'button';
  btn.textContent = text;
  btn.setAttribute('aria-label', ariaLabel);
  btn.title = ariaLabel;
  btn.disabled = disabled;
  btn.addEventListener('click', onClick);
  return btn;
}
