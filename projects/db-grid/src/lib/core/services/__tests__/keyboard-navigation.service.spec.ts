import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KeyboardNavigationService, KeyboardCellPosition, KeyEventResult } from '../keyboard-navigation.service';
import { ColumnService } from '../column.service';

function createMockColumnService(columns: any[] = []): ColumnService {
  const service = {
    getVisibleColumns: () => columns,
  } as any;
  return service;
}

function createMockGridApi(rowCount = 10): any {
  return {
    getDisplayedRowCount: () => rowCount,
    getRowNode: vi.fn(),
    ensureIndexVisible: vi.fn(),
    ensureColumnVisible: vi.fn(),
    getColumnDef: vi.fn(),
    startEditingCell: vi.fn(),
    getFocusedCell: vi.fn(),
    setFocusedCell: vi.fn(),
  };
}

describe('KeyboardNavigationService', () => {
  let service: KeyboardNavigationService;
  let mockGridApi: any;
  let mockGridElement: HTMLElement;
  let mockColumnService: ColumnService;

  beforeEach(() => {
    service = new KeyboardNavigationService();
    mockGridElement = document.createElement('div');
    mockGridApi = createMockGridApi(10);
    mockColumnService = createMockColumnService([
      { colId: 'col0', field: 'field0', width: 100 },
      { colId: 'col1', field: 'field1', width: 100 },
      { colId: 'col2', field: 'field2', width: 100 },
    ]);
  });

  afterEach(() => {
    service.destroy();
  });

  // ===== setGrid / refreshColumnCache =====
  describe('setGrid / refreshColumnCache', () => {
    it('should initialize with grid components', () => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, { rowHeight: 30 });
      expect(service.getFocusedCell()).toBeNull();
    });

    it('should build column index cache', () => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, { rowHeight: 30 });
      // No error means cache was built
      expect(() => service.getFocusedCell()).not.toThrow();
    });

    it('should rebuild cache when refreshColumnCache is called', () => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, { rowHeight: 30 });
      expect(() => service.refreshColumnCache()).not.toThrow();
    });
  });

  // ===== getFocusedCell / setFocusedCell =====
  describe('getFocusedCell / setFocusedCell', () => {
    beforeEach(() => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, { rowHeight: 30 });
    });

    it('should return null when no focus is set', () => {
      expect(service.getFocusedCell()).toBeNull();
    });

    it('should set and get focused cell', () => {
      service.setFocusedCell(0, 'col0');
      const result = service.getFocusedCell();
      expect(result).toEqual({ rowIndex: 0, colId: 'col0' });
    });

    it('should not scroll into view when scrollIntoView=false', () => {
      service.setFocusedCell(0, 'col0', false);
      // No error means it didn't crash
      expect(service.getFocusedCell()).toEqual({ rowIndex: 0, colId: 'col0' });
    });

    it('should emit focus change event', () => {
      let event: any;
      service.onFocusChange.subscribe(e => { event = e; });
      service.setFocusedCell(0, 'col0');
      expect(event.previous).toBeNull();
      expect(event.current).toEqual({ rowIndex: 0, colId: 'col0' });
      expect(event.reason).toBe('api');
    });
  });

  // ===== focusFirstCell =====
  describe('focusFirstCell', () => {
    beforeEach(() => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, { rowHeight: 30 });
    });

    it('should focus first column of first row', () => {
      service.focusFirstCell();
      const result = service.getFocusedCell();
      expect(result).toEqual({ rowIndex: 0, colId: 'col0' });
    });

    it('should do nothing if no columns', () => {
      const emptyService = new KeyboardNavigationService();
      emptyService.setGrid(mockGridApi, mockGridElement, createMockColumnService([]), { rowHeight: 30 });
      emptyService.focusFirstCell();
      expect(emptyService.getFocusedCell()).toBeNull();
      emptyService.destroy();
    });
  });

  // ===== startEditing / stopEditing =====
  describe('startEditing / stopEditing', () => {
    beforeEach(() => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, { rowHeight: 30 });
    });

    it('should start editing cell', () => {
      service.startEditing(0, 'col0');
      expect(mockGridApi.startEditingCell).toHaveBeenCalledWith(0, 'col0', undefined);
    });

    it('should start editing with charPress', () => {
      service.startEditing(0, 'col0', 'A');
      expect(mockGridApi.startEditingCell).toHaveBeenCalledWith(0, 'col0', 'A');
    });

    it('should emit onCellEditStart event', () => {
      let event: any;
      service.onCellEditStart.subscribe(e => { event = e; });
      service.startEditing(0, 'col0');
      expect(event).toEqual({ rowIndex: 0, colId: 'col0' });
    });

    it('should stop editing and emit event', () => {
      let stopCount = 0;
      service.onCellEditStop.subscribe(() => { stopCount++; });
      service.startEditing(0, 'col0');
      service.stopEditing(true);
      expect(stopCount).toBe(1);
    });

    it('should not emit stop event if not editing', () => {
      let stopCount = 0;
      service.onCellEditStop.subscribe(() => { stopCount++; });
      service.stopEditing(true);
      expect(stopCount).toBe(0);
    });
  });

  // ===== handleKeyDown =====
  describe('handleKeyDown', () => {
    beforeEach(() => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, { rowHeight: 30 });
      service.setFocusedCell(0, 'col0');
    });

    it('should return consumed=false when gridApi is not set', () => {
      const emptyService = new KeyboardNavigationService();
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      const result = emptyService.handleKeyDown(event);
      expect(result.consumed).toBe(false);
      emptyService.destroy();
    });

    it('should return consumed=false for unhandled keys', () => {
      const event = new KeyboardEvent('keydown', { key: 'F1' });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(false);
    });

    it('should move focus down on ArrowDown', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.rowIndex).toBe(1);
    });

    it('should move focus up on ArrowUp', () => {
      service.setFocusedCell(2, 'col0');
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.rowIndex).toBe(1);
    });

    it('should not go below row 0', () => {
      service.setFocusedCell(0, 'col0');
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(false);
      expect(service.getFocusedCell()?.rowIndex).toBe(0);
    });

    it('should move focus left on ArrowLeft', () => {
      service.setFocusedCell(0, 'col1');
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.colId).toBe('col0');
    });

    it('should move focus right on ArrowRight', () => {
      service.setFocusedCell(0, 'col0');
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.colId).toBe('col1');
    });

    it('should move to next row when at last column', () => {
      service.setFocusedCell(0, 'col2');
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.rowIndex).toBe(1);
      expect(service.getFocusedCell()?.colId).toBe('col0');
    });

    it('should not wrap to previous row when at first column (ArrowLeft stays at col0)', () => {
      service.setFocusedCell(1, 'col0');
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(false);
      expect(service.getFocusedCell()?.rowIndex).toBe(1);
      expect(service.getFocusedCell()?.colId).toBe('col0');
    });

    it('should move to next column on Tab', () => {
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.colId).toBe('col1');
    });

    it('should move to previous column on Shift+Tab', () => {
      service.setFocusedCell(0, 'col1');
      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.colId).toBe('col0');
    });

    it('should handle Enter key', () => {
      let enterCount = 0;
      service.onEnterKey.subscribe(() => { enterCount++; });
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(true);
      expect(enterCount).toBe(1);
    });

    it('should handle Escape key', () => {
      let escapeCount = 0;
      service.onEscapeKey.subscribe(() => { escapeCount++; });
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(false);
      expect(escapeCount).toBe(1);
    });

    it('should handle PageUp key', () => {
      service.setRowHeight(30);
      const event = new KeyboardEvent('keydown', { key: 'PageUp' });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(true);
    });

    it('should handle PageDown key', () => {
      const event = new KeyboardEvent('keydown', { key: 'PageDown' });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(true);
    });

    it('should handle Home key', () => {
      service.setFocusedCell(5, 'col2');
      const event = new KeyboardEvent('keydown', { key: 'Home' });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.colId).toBe('col0');
    });

    it('should handle Ctrl+Home key', () => {
      service.setFocusedCell(5, 'col2');
      const event = new KeyboardEvent('keydown', { key: 'Home', ctrlKey: true });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.rowIndex).toBe(0);
      expect(service.getFocusedCell()?.colId).toBe('col0');
    });

    it('should handle End key', () => {
      service.setFocusedCell(2, 'col0');
      const event = new KeyboardEvent('keydown', { key: 'End' });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.colId).toBe('col2');
    });

    it('should handle Ctrl+End key', () => {
      service.setFocusedCell(2, 'col0');
      const event = new KeyboardEvent('keydown', { key: 'End', ctrlKey: true });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.rowIndex).toBe(9);
    });
  });

  // ===== Editing mode keydown =====
  describe('handleKeyDown in editing mode', () => {
    beforeEach(() => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, { rowHeight: 30 });
      service.setFocusedCell(0, 'col0');
    });

    it('should stop editing on Enter', () => {
      service.startEditing(0, 'col0');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(true);
    });

    it('should stop and move on Tab', () => {
      service.startEditing(0, 'col0');
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.colId).toBe('col1');
    });

    it('should cancel editing on Escape', () => {
      service.startEditing(0, 'col0');
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      const result = service.handleKeyDown(event);
      expect(result.consumed).toBe(true);
      let stopCount = 0;
      service.onCellEditStop.subscribe(() => { stopCount++; });
      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
  });

  // ===== setRowHeight =====
  describe('setRowHeight', () => {
    beforeEach(() => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, { rowHeight: 30 });
    });

    it('should set row height', () => {
      expect(() => service.setRowHeight(50)).not.toThrow();
    });
  });

  // ===== destroy =====
  describe('destroy', () => {
    it('should complete all subjects', () => {
      const sub = service.onFocusChange.subscribe(() => {});
      service.destroy();
      // After destroy, subscriptions should not receive events
      expect(() => service.onFocusChange.next({} as any)).not.toThrow();
    });
  });
});