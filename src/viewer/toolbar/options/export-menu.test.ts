import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createExportMenu,
  type ExportMenuHandle,
  type ExportCallbacks,
} from './export-menu.ts';

function createContainer(): HTMLElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

function createCallbacks(): ExportCallbacks {
  return {};
}

describe('createExportMenu', () => {
  let container: HTMLElement;
  let handle: ExportMenuHandle;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = createContainer();
    handle = createExportMenu(container, createCallbacks());
  });

  it('creates an export button in the container', () => {
    const btn = container.querySelector('.export-menu-toggle');
    expect(btn).not.toBeNull();
    expect(btn?.textContent).toContain('Export');
  });

  it('creates a dropdown that is initially hidden', () => {
    const dropdown = container.querySelector('.export-menu-dropdown');
    expect(dropdown).not.toBeNull();
    expect(dropdown?.classList.contains('show')).toBe(false);
  });

  it('disables button when no callbacks provided', () => {
    const btn = container.querySelector<HTMLButtonElement>('.export-menu-toggle')!;
    expect(btn.disabled).toBe(true);
  });

  it('enables button when callbacks are provided', () => {
    document.body.innerHTML = '';
    const c = createContainer();
    createExportMenu(c, { onExportImage: vi.fn() });

    const btn = c.querySelector<HTMLButtonElement>('.export-menu-toggle')!;
    expect(btn.disabled).toBe(false);
  });

  it('toggles dropdown visibility when button is clicked', () => {
    document.body.innerHTML = '';
    const c = createContainer();
    createExportMenu(c, { onExportImage: vi.fn() });

    const btn = c.querySelector<HTMLButtonElement>('.export-menu-toggle')!;
    const dropdown = c.querySelector('.export-menu-dropdown')!;

    btn.click();
    expect(dropdown.classList.contains('show')).toBe(true);

    btn.click();
    expect(dropdown.classList.contains('show')).toBe(false);
  });

  it('renders export image button when callback provided', () => {
    document.body.innerHTML = '';
    const c = createContainer();
    createExportMenu(c, { onExportImage: vi.fn() });

    const btn = c.querySelector('.export-menu-action-btn');
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toContain('Export Image');
  });

  it('renders print button when callback provided', () => {
    document.body.innerHTML = '';
    const c = createContainer();
    createExportMenu(c, { onPrint: vi.fn() });

    const btns = c.querySelectorAll('.export-menu-action-btn');
    const printBtn = Array.from(btns).find((b) => b.textContent?.includes('Print'));
    expect(printBtn).toBeDefined();
  });

  it('calls onExportImage and closes dropdown when export button clicked', () => {
    document.body.innerHTML = '';
    const c = createContainer();
    const onExportImage = vi.fn();
    createExportMenu(c, { onExportImage });

    const toggle = c.querySelector<HTMLButtonElement>('.export-menu-toggle')!;
    toggle.click();
    const dropdown = c.querySelector('.export-menu-dropdown')!;
    expect(dropdown.classList.contains('show')).toBe(true);

    const exportBtn = c.querySelector<HTMLButtonElement>('.export-menu-action-btn')!;
    exportBtn.click();

    expect(onExportImage).toHaveBeenCalledOnce();
    expect(dropdown.classList.contains('show')).toBe(false);
  });

  it('calls onPrint and closes dropdown when print button clicked', () => {
    document.body.innerHTML = '';
    const c = createContainer();
    const onPrint = vi.fn();
    createExportMenu(c, { onPrint });

    const toggle = c.querySelector<HTMLButtonElement>('.export-menu-toggle')!;
    toggle.click();

    const btns = c.querySelectorAll<HTMLButtonElement>('.export-menu-action-btn');
    const printBtn = Array.from(btns).find((b) => b.textContent?.includes('Print'))!;
    printBtn.click();

    expect(onPrint).toHaveBeenCalledOnce();
  });

  it('does not render action buttons when no callbacks provided', () => {
    const btns = container.querySelectorAll('.export-menu-action-btn');
    expect(btns.length).toBe(0);
  });

  it('renders all export buttons when all callbacks provided', () => {
    document.body.innerHTML = '';
    const c = createContainer();
    createExportMenu(c, {
      onExportImage: vi.fn(),
      onExportSnps: vi.fn(),
      onExportGaps: vi.fn(),
      onExportPermutations: vi.fn(),
      onExportHomologs: vi.fn(),
      onExportIdentityMatrix: vi.fn(),
      onExportCdsErrors: vi.fn(),
      onExportSummary: vi.fn(),
      onPrint: vi.fn(),
    });

    const btns = c.querySelectorAll('.export-menu-action-btn');
    expect(btns.length).toBe(9);

    const labels = Array.from(btns).map((b) => b.textContent);
    expect(labels).toContain('Export Image (Ctrl+E)');
    expect(labels).toContain('Export SNPs');
    expect(labels).toContain('Export Gaps');
    expect(labels).toContain('Export Permutations');
    expect(labels).toContain('Export Positional Orthologs');
    expect(labels).toContain('Export Identity Matrix');
    expect(labels).toContain('Export CDS Errors');
    expect(labels).toContain('Export Summary');
    expect(labels).toContain('Print (Ctrl+P)');
  });

  it('renders summary button and calls callback when clicked', () => {
    document.body.innerHTML = '';
    const c = createContainer();
    const onExportSummary = vi.fn();
    createExportMenu(c, { onExportSummary });

    const toggle = c.querySelector<HTMLButtonElement>('.export-menu-toggle')!;
    toggle.click();

    const btns = c.querySelectorAll<HTMLButtonElement>('.export-menu-action-btn');
    const summaryBtn = Array.from(btns).find((b) => b.textContent?.includes('Summary'))!;
    expect(summaryBtn).toBeDefined();
    summaryBtn.click();

    expect(onExportSummary).toHaveBeenCalledOnce();
  });

  it('only renders buttons for provided callbacks', () => {
    document.body.innerHTML = '';
    const c = createContainer();
    createExportMenu(c, { onExportSnps: vi.fn(), onExportGaps: vi.fn() });

    const btns = c.querySelectorAll('.export-menu-action-btn');
    expect(btns.length).toBe(2);

    const labels = Array.from(btns).map((b) => b.textContent);
    expect(labels).toContain('Export SNPs');
    expect(labels).toContain('Export Gaps');
  });

  it('closes dropdown when clicking outside', () => {
    document.body.innerHTML = '';
    const c = createContainer();
    createExportMenu(c, { onExportImage: vi.fn() });

    const btn = c.querySelector<HTMLButtonElement>('.export-menu-toggle')!;
    const dropdown = c.querySelector('.export-menu-dropdown')!;

    btn.click();
    expect(dropdown.classList.contains('show')).toBe(true);

    document.body.click();
    expect(dropdown.classList.contains('show')).toBe(false);
  });

  it('destroy removes the menu from the DOM', () => {
    handle.destroy();
    expect(container.querySelector('.export-menu')).toBeNull();
  });
});
