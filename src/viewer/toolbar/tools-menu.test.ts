import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createToolsMenu } from './tools-menu.ts';

function createContainer(): HTMLElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createToolsMenu', () => {
  it('appends panel to container', () => {
    const container = createContainer();
    createToolsMenu(container, {});

    expect(container.querySelector('.tools-menu')).not.toBeNull();
  });

  it('renders a "Tools" toggle button', () => {
    const container = createContainer();
    createToolsMenu(container, {});

    const btn = container.querySelector('.tools-menu-toggle') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.textContent).toBe('Tools');
  });

  it('toggle button is disabled when no callbacks provided', () => {
    const container = createContainer();
    createToolsMenu(container, {});

    const btn = container.querySelector('.tools-menu-toggle') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('toggle button is enabled when at least one callback is provided', () => {
    const container = createContainer();
    createToolsMenu(container, { onOrderContigs: vi.fn() });

    const btn = container.querySelector('.tools-menu-toggle') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('renders "Order Contigs" action when onOrderContigs is provided', () => {
    const container = createContainer();
    createToolsMenu(container, { onOrderContigs: vi.fn() });

    const actionBtns = container.querySelectorAll('.tools-menu-action-btn');
    const labels = Array.from(actionBtns).map((b) => b.textContent);
    expect(labels).toContain('Order Contigs');
  });

  it('does not render action buttons when no callbacks provided', () => {
    const container = createContainer();
    createToolsMenu(container, {});

    const actionBtns = container.querySelectorAll('.tools-menu-action-btn');
    expect(actionBtns.length).toBe(0);
  });

  it('dropdown is hidden initially', () => {
    const container = createContainer();
    createToolsMenu(container, { onOrderContigs: vi.fn() });

    const dropdown = container.querySelector('.tools-menu-dropdown') as HTMLDivElement;
    expect(dropdown.classList.contains('show')).toBe(false);
  });

  it('clicking toggle shows dropdown', () => {
    const container = createContainer();
    createToolsMenu(container, { onOrderContigs: vi.fn() });

    const btn = container.querySelector('.tools-menu-toggle') as HTMLButtonElement;
    btn.click();

    const dropdown = container.querySelector('.tools-menu-dropdown') as HTMLDivElement;
    expect(dropdown.classList.contains('show')).toBe(true);
  });

  it('clicking toggle again hides dropdown', () => {
    const container = createContainer();
    createToolsMenu(container, { onOrderContigs: vi.fn() });

    const btn = container.querySelector('.tools-menu-toggle') as HTMLButtonElement;
    btn.click();
    btn.click();

    const dropdown = container.querySelector('.tools-menu-dropdown') as HTMLDivElement;
    expect(dropdown.classList.contains('show')).toBe(false);
  });

  it('clicking outside hides dropdown', () => {
    const container = createContainer();
    createToolsMenu(container, { onOrderContigs: vi.fn() });

    const btn = container.querySelector('.tools-menu-toggle') as HTMLButtonElement;
    btn.click();

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const dropdown = container.querySelector('.tools-menu-dropdown') as HTMLDivElement;
    expect(dropdown.classList.contains('show')).toBe(false);
  });

  it('clicking "Order Contigs" invokes callback', () => {
    const onOrderContigs = vi.fn();
    const container = createContainer();
    createToolsMenu(container, { onOrderContigs });

    const btn = container.querySelector('.tools-menu-toggle') as HTMLButtonElement;
    btn.click();

    const actionBtn = container.querySelector('.tools-menu-action-btn') as HTMLButtonElement;
    actionBtn.click();

    expect(onOrderContigs).toHaveBeenCalledOnce();
  });

  it('clicking action closes dropdown', () => {
    const container = createContainer();
    createToolsMenu(container, { onOrderContigs: vi.fn() });

    const btn = container.querySelector('.tools-menu-toggle') as HTMLButtonElement;
    btn.click();

    const actionBtn = container.querySelector('.tools-menu-action-btn') as HTMLButtonElement;
    actionBtn.click();

    const dropdown = container.querySelector('.tools-menu-dropdown') as HTMLDivElement;
    expect(dropdown.classList.contains('show')).toBe(false);
  });

  it('destroy() removes panel from DOM', () => {
    const container = createContainer();
    const handle = createToolsMenu(container, { onOrderContigs: vi.fn() });

    handle.destroy();

    expect(container.querySelector('.tools-menu')).toBeNull();
  });

  it('destroy() removes document click listener', () => {
    const container = createContainer();
    const handle = createToolsMenu(container, { onOrderContigs: vi.fn() });

    const btn = container.querySelector('.tools-menu-toggle') as HTMLButtonElement;
    btn.click();

    handle.destroy();

    // After destroy, document click should not error
    expect(() => document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
  });

  it('returns element reference to panel', () => {
    const container = createContainer();
    const handle = createToolsMenu(container, {});

    expect(handle.element).toBe(container.querySelector('.tools-menu'));
  });
});
