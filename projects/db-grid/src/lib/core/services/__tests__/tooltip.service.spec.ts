// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TooltipService } from '../tooltip.service';

describe('TooltipService', () => {
  let service: TooltipService;

  beforeEach(() => {
    service = new TooltipService();
    // Clean up any leftover tooltip elements from previous tests
    document.querySelectorAll('.db-grid-tooltip').forEach(el => el.remove());
  });

  afterEach(() => {
    service.destroy();
    document.querySelectorAll('.db-grid-tooltip').forEach(el => el.remove());
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ===== Show / Hide =====

  it('should show tooltip with cell value as default text', () => {
    const cellElement = document.createElement('div');
    document.body.appendChild(cellElement);
    const rect = cellElement.getBoundingClientRect();

    service.showTooltip({
      value: 'Hello World',
      colDef: { field: 'name' },
      rowIndex: 0,
      column: { field: 'name' },
      cellElement,
    });

    expect(service.isVisible).toBe(true);
    const tooltip = document.querySelector('.db-grid-tooltip');
    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent).toContain('Hello World');

    cellElement.remove();
  });

  it('should show tooltip using tooltipValueGetter', () => {
    const cellElement = document.createElement('div');
    document.body.appendChild(cellElement);

    service.showTooltip({
      value: 'raw',
      colDef: {
        field: 'status',
        tooltipValueGetter: (params) => `Status: ${params.value}`,
      },
      rowIndex: 0,
      column: { field: 'status' },
      cellElement,
    });

    const tooltip = document.querySelector('.db-grid-tooltip');
    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent).toContain('Status: raw');

    cellElement.remove();
  });

  it('should not show tooltip when value is null/empty', () => {
    const cellElement = document.createElement('div');
    document.body.appendChild(cellElement);

    service.showTooltip({
      value: null,
      colDef: { field: 'name' },
      rowIndex: 0,
      column: { field: 'name' },
      cellElement,
    });

    expect(service.isVisible).toBe(false);
    const tooltip = document.querySelector('.db-grid-tooltip');
    expect(tooltip).toBeFalsy();

    cellElement.remove();
  });

  it('should hide tooltip', () => {
    const cellElement = document.createElement('div');
    document.body.appendChild(cellElement);

    service.showTooltip({
      value: 'Test',
      colDef: { field: 'name' },
      rowIndex: 0,
      column: { field: 'name' },
      cellElement,
    });

    expect(service.isVisible).toBe(true);

    service.hideTooltip();
    expect(service.isVisible).toBe(false);

    cellElement.remove();
  });

  // ===== Positioning =====

  it('should position tooltip near target element', () => {
    const cellElement = document.createElement('div');
    // Simulate a positioned cell element
    cellElement.style.position = 'absolute';
    cellElement.style.left = '100px';
    cellElement.style.top = '200px';
    cellElement.style.width = '120px';
    cellElement.style.height = '40px';
    document.body.appendChild(cellElement);

    service.showTooltip({
      value: 'Positioned',
      colDef: { field: 'name' },
      rowIndex: 0,
      column: { field: 'name' },
      cellElement,
    });

    const tooltip = document.querySelector('.db-grid-tooltip') as HTMLElement;
    expect(tooltip).toBeTruthy();
    // Should have explicit left/top set
    expect(tooltip.style.left).toBeTruthy();
    expect(tooltip.style.top).toBeTruthy();

    cellElement.remove();
  });

  it('should position tooltip above target when bottom overflows viewport', () => {
    // Mock window.innerHeight to simulate a small viewport
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });

    // Create a mock DOMRect for an element at the bottom of the viewport
    const mockRect = {
      top: 780,
      bottom: 820,
      left: 100,
      right: 220,
      width: 120,
      height: 40,
      x: 100,
      y: 780,
    } as DOMRect;

    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'db-grid-tooltip';
    tooltipEl.style.position = 'absolute';
    tooltipEl.style.width = '100px';
    tooltipEl.style.height = '50px';
    document.body.appendChild(tooltipEl);

    // Override getBoundingClientRect to return realistic values
    tooltipEl.getBoundingClientRect = () => ({
      top: 820, bottom: 870, left: 100, right: 200,
      width: 100, height: 50, x: 100, y: 820,
    } as DOMRect);

    service.positionTooltip(tooltipEl, mockRect);

    // The tooltip should be positioned above the target
    const tooltipTop = parseInt(tooltipEl.style.top);
    expect(tooltipTop).toBeLessThan(mockRect.top);

    // Restore
    Object.defineProperty(window, 'innerHeight', { value: originalHeight, configurable: true });
    tooltipEl.remove();
  });

  // ===== Auto-hide =====

  it('should auto-hide after delay', async () => {
    const cellElement = document.createElement('div');
    document.body.appendChild(cellElement);

    service.setAutoHideDelay(100); // Short delay for testing

    service.showTooltip({
      value: 'Auto-hide test',
      colDef: { field: 'name' },
      rowIndex: 0,
      column: { field: 'name' },
      cellElement,
    });

    expect(service.isVisible).toBe(true);

    // Wait for auto-hide
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(service.isVisible).toBe(false);

    cellElement.remove();
  });

  // ===== Custom tooltipValueGetter =====

  it('should pass correct params to tooltipValueGetter', () => {
    const cellElement = document.createElement('div');
    document.body.appendChild(cellElement);

    let capturedParams: any = null;
    service.showTooltip({
      value: 42,
      colDef: {
        field: 'age',
        tooltipValueGetter: (params) => {
          capturedParams = params;
          return `Age: ${params.value}`;
        },
      },
      rowIndex: 3,
      column: { field: 'age' },
      cellElement,
    });

    expect(capturedParams).toBeTruthy();
    expect(capturedParams.value).toBe(42);
    expect(capturedParams.colDef.field).toBe('age');

    const tooltip = document.querySelector('.db-grid-tooltip');
    expect(tooltip.textContent).toContain('Age: 42');

    cellElement.remove();
  });

  it('should escape HTML in tooltip text', () => {
    const cellElement = document.createElement('div');
    document.body.appendChild(cellElement);

    service.showTooltip({
      value: '<script>alert("xss")</script>',
      colDef: { field: 'name' },
      rowIndex: 0,
      column: { field: 'name' },
      cellElement,
    });

    const tooltip = document.querySelector('.db-grid-tooltip');
    // The script tag should be escaped, not executed
    expect(tooltip.innerHTML).not.toContain('<script>');
    expect(tooltip.textContent).toContain('<script>');

    cellElement.remove();
  });

  it('should hide previous tooltip when showing a new one', async () => {
    const cellElement1 = document.createElement('div');
    const cellElement2 = document.createElement('div');
    document.body.appendChild(cellElement1);
    document.body.appendChild(cellElement2);

    service.showTooltip({
      value: 'First',
      colDef: { field: 'name' },
      rowIndex: 0,
      column: { field: 'name' },
      cellElement: cellElement1,
    });

    const tooltipsAfterFirst = document.querySelectorAll('.db-grid-tooltip');
    expect(tooltipsAfterFirst.length).toBe(1);

    service.showTooltip({
      value: 'Second',
      colDef: { field: 'name' },
      rowIndex: 1,
      column: { field: 'name' },
      cellElement: cellElement2,
    });

    // The new tooltip should be showing
    const activeTooltip = document.querySelector('.db-grid-tooltip:not(.db-grid-tooltip-fadeout)');
    expect(activeTooltip).toBeTruthy();
    expect(activeTooltip.textContent).toContain('Second');

    // Wait for fadeout animation to complete
    await new Promise(resolve => setTimeout(resolve, 200));

    const tooltipsAfterCleanup = document.querySelectorAll('.db-grid-tooltip');
    expect(tooltipsAfterCleanup.length).toBe(1);

    cellElement1.remove();
    cellElement2.remove();
  });
});
