/**
 * KeyboardNavigationService 单元测试
 * 测试覆盖：焦点管理、键盘导航、编辑模式、边界处理
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KeyboardNavigationService, KeyboardCellPosition, FocusChangeEvent } from './keyboard-navigation.service';
import { ColumnService } from './column.service';
import { Subject } from 'rxjs';

// ========== Mocks ==========

function createMockGridApi() {
  return {
    getDisplayedRowCount: vi.fn(() => 100),
    getRowNode: vi.fn(),
    ensureIndexVisible: vi.fn(),
    ensureColumnVisible: vi.fn(),
    getColumnDef: vi.fn(),
    startEditingCell: vi.fn(),
    getFocusedCell: vi.fn(),
    setFocusedCell: vi.fn(),
  };
}

function createMockColumnService() {
  return {
    getVisibleColumns: vi.fn(() => [
      { colId: 'col0', field: 'field0' },
      { colId: 'col1', field: 'field1' },
      { colId: 'col2', field: 'field2' },
      { colId: 'col3', field: 'field3' },
    ]),
  } as unknown as ColumnService;
}

function createMockGridElement() {
  const cells: any[] = [];
  const element = {
    querySelectorAll: vi.fn((selector: string) => {
      const matches = cells.filter(c => c.matches(selector));
      return {
        forEach: (fn: (el: any) => void) => matches.forEach(fn),
      };
    }),
    querySelector: vi.fn((selector: string) => cells.find(c => c.matches(selector)) || null),
    _cells: cells,
  };
  return element as any;
}

function createMockRowRenderer() {
  return {
    getCellValue: vi.fn(() => 'test-value'),
  };
}

function createKeyboardEvent(key: string, options: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key,
    ctrlKey: options.ctrlKey || false,
    shiftKey: options.shiftKey || false,
    metaKey: options.metaKey || false,
    altKey: options.altKey || false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...options,
  } as KeyboardEvent;
}

// ========== Tests ==========

describe('KeyboardNavigationService', () => {
  let service: KeyboardNavigationService;
  let mockGridApi: ReturnType<typeof createMockGridApi>;
  let mockColumnService: ReturnType<typeof createMockColumnService>;
  let mockGridElement: ReturnType<typeof createMockGridElement>;
  let mockRowRenderer: ReturnType<typeof createMockRowRenderer>;

  beforeEach(() => {
    service = new KeyboardNavigationService();
    mockGridApi = createMockGridApi();
    mockColumnService = createMockColumnService();
    mockGridElement = createMockGridElement();
    mockRowRenderer = createMockRowRenderer();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('setGrid 和初始化', () => {
    it('should initialize with setGrid', () => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
      
      expect(mockColumnService.getVisibleColumns).toHaveBeenCalled();
      const focused = service.getFocusedCell();
      expect(focused).toBeNull(); // 初始无焦点
    });

    it('should build column index cache on setGrid', () => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
      
      // 通过 focusFirstCell 测试缓存是否正确
      service.focusFirstCell();
      const focused = service.getFocusedCell();
      expect(focused).toEqual({ rowIndex: 0, colId: 'col0' });
    });

    it('should handle null columnService gracefully', () => {
      service.setGrid(mockGridApi, mockGridElement, null as any, mockRowRenderer);
      
      const focused = service.getFocusedCell();
      expect(focused).toBeNull();
    });
  });

  describe('refreshColumnCache', () => {
    it('should rebuild column caches', () => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
      
      // 修改返回值
      mockColumnService.getVisibleColumns = vi.fn(() => [
        { colId: 'newCol0' },
        { colId: 'newCol1' },
      ]);
      
      service.refreshColumnCache();
      service.focusFirstCell();
      
      expect(service.getFocusedCell()).toEqual({ rowIndex: 0, colId: 'newCol0' });
    });

    it('should handle empty columns', () => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
      mockColumnService.getVisibleColumns = vi.fn(() => []);
      
      service.refreshColumnCache();
      service.focusFirstCell();
      
      expect(service.getFocusedCell()).toBeNull();
    });
  });

  describe('getFocusedCell / setFocusedCell', () => {
    beforeEach(() => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
    });

    it('should return null when no cell focused', () => {
      expect(service.getFocusedCell()).toBeNull();
    });

    it('should set focused cell', () => {
      service.setFocusedCell(5, 'col1');
      
      const focused = service.getFocusedCell();
      expect(focused).toEqual({ rowIndex: 5, colId: 'col1' });
    });

    it('should emit onFocusChange when setting focus', () => {
      const changes: FocusChangeEvent[] = [];
      service.onFocusChange.subscribe(e => changes.push(e));
      
      service.setFocusedCell(3, 'col2');
      
      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        previous: null,
        current: { rowIndex: 3, colId: 'col2' },
        reason: 'api',
      });
    });

    it('should track previous focus correctly', () => {
      service.setFocusedCell(2, 'col0');
      
      const changes: FocusChangeEvent[] = [];
      service.onFocusChange.subscribe(e => changes.push(e));
      
      service.setFocusedCell(5, 'col1');
      
      expect(changes[0].previous).toEqual({ rowIndex: 2, colId: 'col0' });
      expect(changes[0].current).toEqual({ rowIndex: 5, colId: 'col1' });
    });

    it('should call ensureIndexVisible and ensureColumnVisible', () => {
      service.setFocusedCell(10, 'col2');
      
      expect(mockGridApi.ensureIndexVisible).toHaveBeenCalledWith(10, 'middle');
      expect(mockGridApi.ensureColumnVisible).toHaveBeenCalledWith('col2');
    });

    it('should skip scroll when scrollIntoView=false', () => {
      service.setFocusedCell(10, 'col2', false);
      
      expect(mockGridApi.ensureIndexVisible).not.toHaveBeenCalled();
      expect(mockGridApi.ensureColumnVisible).not.toHaveBeenCalled();
    });
  });

  describe('focusFirstCell', () => {
    beforeEach(() => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
    });

    it('should focus first row and first column', () => {
      service.focusFirstCell();
      
      expect(service.getFocusedCell()).toEqual({ rowIndex: 0, colId: 'col0' });
    });

    it('should do nothing if no columns', () => {
      mockColumnService.getVisibleColumns = vi.fn(() => []);
      service.refreshColumnCache();
      
      service.focusFirstCell();
      
      expect(service.getFocusedCell()).toBeNull();
    });
  });

  describe('handleKeyDown - Arrow keys', () => {
    beforeEach(() => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
      service.setFocusedCell(5, 'col1');
    });

    it('should move focus up with ArrowUp', () => {
      const result = service.handleKeyDown(createKeyboardEvent('ArrowUp'));
      
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.rowIndex).toBe(4);
      expect(service.getFocusedCell()?.colId).toBe('col1');
    });

    it('should move focus down with ArrowDown', () => {
      const result = service.handleKeyDown(createKeyboardEvent('ArrowDown'));
      
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.rowIndex).toBe(6);
    });

    it('should move focus left with ArrowLeft', () => {
      const result = service.handleKeyDown(createKeyboardEvent('ArrowLeft'));
      
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.colId).toBe('col0');
    });

    it('should move focus right with ArrowRight', () => {
      const result = service.handleKeyDown(createKeyboardEvent('ArrowRight'));
      
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.colId).toBe('col2');
    });

    it('should not move up from first row', () => {
      service.setFocusedCell(0, 'col0');
      const result = service.handleKeyDown(createKeyboardEvent('ArrowUp'));
      
      expect(result.consumed).toBe(false);
      expect(service.getFocusedCell()?.rowIndex).toBe(0);
    });

    it('should not move left from first column', () => {
      service.setFocusedCell(5, 'col0');
      const result = service.handleKeyDown(createKeyboardEvent('ArrowLeft'));
      
      expect(result.consumed).toBe(false);
      expect(service.getFocusedCell()?.colId).toBe('col0');
    });

    it('should clamp row index to max', () => {
      mockGridApi.getDisplayedRowCount = vi.fn(() => 10);
      service.setFocusedCell(9, 'col1');
      
      const result = service.handleKeyDown(createKeyboardEvent('ArrowDown'));
      
      expect(result.consumed).toBe(false);
      expect(service.getFocusedCell()?.rowIndex).toBe(9);
    });

    it('should wrap to next row when moving right at last column', () => {
      service.setFocusedCell(5, 'col3');
      const result = service.handleKeyDown(createKeyboardEvent('ArrowRight'));
      
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.rowIndex).toBe(6);
      expect(service.getFocusedCell()?.colId).toBe('col0');
    });

    it('should return consumed=false when no gridApi', () => {
      const noGridService = new KeyboardNavigationService();
      const result = noGridService.handleKeyDown(createKeyboardEvent('ArrowUp'));
      
      expect(result.consumed).toBe(false);
      noGridService.destroy();
    });
  });

  describe('handleKeyDown - Tab navigation', () => {
    beforeEach(() => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
      service.setFocusedCell(5, 'col1');
    });

    it('should move to next column with Tab', () => {
      const result = service.handleKeyDown(createKeyboardEvent('Tab'));
      
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.colId).toBe('col2');
    });

    it('should wrap to next row at last column with Tab', () => {
      service.setFocusedCell(5, 'col3');
      const result = service.handleKeyDown(createKeyboardEvent('Tab'));
      
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.rowIndex).toBe(6);
      expect(service.getFocusedCell()?.colId).toBe('col0');
    });

    it('should move to previous column with Shift+Tab', () => {
      const result = service.handleKeyDown(createKeyboardEvent('Tab', { shiftKey: true }));
      
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.colId).toBe('col0');
    });

    it('should wrap to previous row at first column with Shift+Tab', () => {
      service.setFocusedCell(5, 'col0');
      const result = service.handleKeyDown(createKeyboardEvent('Tab', { shiftKey: true }));
      
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.rowIndex).toBe(4);
      expect(service.getFocusedCell()?.colId).toBe('col3');
    });

    it('should not wrap above row 0 with Shift+Tab', () => {
      service.setFocusedCell(0, 'col0');
      const result = service.handleKeyDown(createKeyboardEvent('Tab', { shiftKey: true }));
      
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.rowIndex).toBe(0);
      expect(service.getFocusedCell()?.colId).toBe('col3');
    });
  });

  describe('handleKeyDown - Page Up/Down', () => {
    beforeEach(() => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
      service.setFocusedCell(50, 'col1');
    });

    it('should move focus up by page size with PageUp', () => {
      service.setRowHeight(30);
      const result = service.handleKeyDown(createKeyboardEvent('PageUp'));
      
      expect(result.consumed).toBe(true);
      // pageSize = max(10, floor(30)) = 30, newRow = 50 - 30 = 20
      expect(service.getFocusedCell()?.rowIndex).toBe(20);
    });

    it('should move focus down by page size with PageDown', () => {
      service.setRowHeight(30);
      const result = service.handleKeyDown(createKeyboardEvent('PageDown'));
      
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.rowIndex).toBe(80);
    });

    it('should not go below 0 with PageUp', () => {
      service.setFocusedCell(5, 'col1');
      service.handleKeyDown(createKeyboardEvent('PageUp'));
      
      expect(service.getFocusedCell()?.rowIndex).toBe(0);
    });

    it('should use default row height if not set', () => {
      const defaultService = new KeyboardNavigationService();
      defaultService.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
      defaultService.setFocusedCell(50, 'col1');
      
      defaultService.handleKeyDown(createKeyboardEvent('PageUp'));
      
      // default rowHeight = 30
      expect(defaultService.getFocusedCell()?.rowIndex).toBe(20);
      defaultService.destroy();
    });
  });

  describe('handleKeyDown - Home/End', () => {
    beforeEach(() => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
      service.setFocusedCell(50, 'col2');
    });

    it('should move to first column with Home', () => {
      const result = service.handleKeyDown(createKeyboardEvent('Home'));
      
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.colId).toBe('col0');
      expect(service.getFocusedCell()?.rowIndex).toBe(50);
    });

    it('should move to first row and first column with Ctrl+Home', () => {
      const result = service.handleKeyDown(createKeyboardEvent('Home', { ctrlKey: true }));
      
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.rowIndex).toBe(0);
      expect(service.getFocusedCell()?.colId).toBe('col0');
    });

    it('should move to last column with End', () => {
      const result = service.handleKeyDown(createKeyboardEvent('End'));
      
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.colId).toBe('col3');
      expect(service.getFocusedCell()?.rowIndex).toBe(50);
    });

    it('should move to last row and last column with Ctrl+End', () => {
      mockGridApi.getDisplayedRowCount = vi.fn(() => 60);
      const result = service.handleKeyDown(createKeyboardEvent('End', { ctrlKey: true }));
      
      expect(result.consumed).toBe(true);
      expect(service.getFocusedCell()?.rowIndex).toBe(59);
      expect(service.getFocusedCell()?.colId).toBe('col3');
    });
  });

  describe('handleKeyDown - Enter', () => {
    beforeEach(() => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
      service.setFocusedCell(5, 'col1');
    });

    it('should emit onEnterKey', () => {
      const positions: KeyboardCellPosition[] = [];
      service.onEnterKey.subscribe(p => positions.push(p));
      
      service.handleKeyDown(createKeyboardEvent('Enter'));
      
      expect(positions).toHaveLength(1);
      expect(positions[0]).toEqual({ rowIndex: 5, colId: 'col1' });
    });

    it('should move focus down with Enter', () => {
      service.handleKeyDown(createKeyboardEvent('Enter'));
      
      expect(service.getFocusedCell()?.rowIndex).toBe(6);
    });

    it('should start editing if cell is editable', () => {
      mockGridApi.getColumnDef = vi.fn(() => ({ editable: true }));
      
      service.handleKeyDown(createKeyboardEvent('Enter'));
      
      expect(mockGridApi.startEditingCell).toHaveBeenCalledWith(5, 'col1', undefined);
      expect(service.editing).toBe(true);
    });

    it('should not start editing if cell is not editable', () => {
      mockGridApi.getColumnDef = vi.fn(() => ({ editable: false }));
      
      service.handleKeyDown(createKeyboardEvent('Enter'));
      
      expect(mockGridApi.startEditingCell).not.toHaveBeenCalled();
      expect(service.editing).toBe(false);
    });

    it('should emit onCellEditStart when editing starts', () => {
      mockGridApi.getColumnDef = vi.fn(() => ({ editable: true }));
      
      const starts: KeyboardCellPosition[] = [];
      service.onCellEditStart.subscribe(p => starts.push(p));
      
      service.handleKeyDown(createKeyboardEvent('Enter'));
      
      expect(starts).toHaveLength(1);
    });
  });

  describe('handleKeyDown - F2', () => {
    beforeEach(() => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
      service.setFocusedCell(5, 'col1');
    });

    it('should start editing with F2', () => {
      mockGridApi.getColumnDef = vi.fn(() => ({ editable: true }));
      
      const result = service.handleKeyDown(createKeyboardEvent('F2'));
      
      expect(result.consumed).toBe(true);
      expect(service.editing).toBe(true);
    });

    it('should not start editing if not editable', () => {
      mockGridApi.getColumnDef = vi.fn(() => ({ editable: false }));
      
      const result = service.handleKeyDown(createKeyboardEvent('F2'));
      
      expect(result.consumed).toBe(true);
      expect(service.editing).toBe(false);
    });
  });

  describe('handleKeyDown - Escape', () => {
    beforeEach(() => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
      service.setFocusedCell(5, 'col1');
    });

    it('should emit onEscapeKey', () => {
      const escapes: void[] = [];
      service.onEscapeKey.subscribe(() => escapes.push(undefined));
      
      service.handleKeyDown(createKeyboardEvent('Escape'));
      
      expect(escapes).toHaveLength(1);
    });

    it('should return consumed=false for Escape (allow default)', () => {
      const result = service.handleKeyDown(createKeyboardEvent('Escape'));
      
      expect(result.consumed).toBe(false);
    });

    it('should stop editing on Escape when editing', () => {
      service.editing = true;
      
      const stops: void[] = [];
      service.onCellEditStop.subscribe(() => stops.push(undefined));
      
      service.handleKeyDown(createKeyboardEvent('Escape'));
      
      expect(service.editing).toBe(false);
      expect(stops).toHaveLength(1);
    });
  });

  describe('handleKeyDown - editing mode', () => {
    beforeEach(() => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
      service.setFocusedCell(5, 'col1');
      service.editing = true;
    });

    it('should stop editing and move down with Enter', () => {
      const result = service.handleKeyDown(createKeyboardEvent('Enter'));
      
      expect(result.consumed).toBe(true);
      expect(service.editing).toBe(false);
      expect(service.getFocusedCell()?.rowIndex).toBe(6);
    });

    it('should stop editing and move to next with Tab', () => {
      const result = service.handleKeyDown(createKeyboardEvent('Tab'));
      
      expect(result.consumed).toBe(true);
      expect(service.editing).toBe(false);
      expect(service.getFocusedCell()?.colId).toBe('col2');
    });

    it('should stop editing and move to prev with Shift+Tab', () => {
      const result = service.handleKeyDown(createKeyboardEvent('Tab', { shiftKey: true }));
      
      expect(result.consumed).toBe(true);
      expect(service.editing).toBe(false);
      expect(service.getFocusedCell()?.colId).toBe('col0');
    });

    it('should cancel editing with Escape', () => {
      const result = service.handleKeyDown(createKeyboardEvent('Escape'));
      
      expect(result.consumed).toBe(true);
      expect(service.editing).toBe(false);
    });

    it('should stop editing and move up with ArrowUp', () => {
      const result = service.handleKeyDown(createKeyboardEvent('ArrowUp'));
      
      expect(result.consumed).toBe(true);
      expect(service.editing).toBe(false);
      expect(service.getFocusedCell()?.rowIndex).toBe(4);
    });

    it('should stop editing and move down with ArrowDown', () => {
      const result = service.handleKeyDown(createKeyboardEvent('ArrowDown'));
      
      expect(result.consumed).toBe(true);
      expect(service.editing).toBe(false);
      expect(service.getFocusedCell()?.rowIndex).toBe(6);
    });

    it('should allow character input in editing mode', () => {
      const result = service.handleKeyDown(createKeyboardEvent('a'));
      
      expect(result.consumed).toBe(false);
      expect(service.editing).toBe(true);
    });
  });

  describe('startEditing / stopEditing', () => {
    beforeEach(() => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
      service.setFocusedCell(5, 'col1');
    });

    it('should start editing', () => {
      service.startEditing(5, 'col1');
      
      expect(service.editing).toBe(true);
      expect(mockGridApi.startEditingCell).toHaveBeenCalled();
    });

    it('should emit onCellEditStart', () => {
      const starts: KeyboardCellPosition[] = [];
      service.onCellEditStart.subscribe(p => starts.push(p));
      
      service.startEditing(5, 'col1');
      
      expect(starts).toHaveLength(1);
      expect(starts[0]).toEqual({ rowIndex: 5, colId: 'col1' });
    });

    it('should stop editing', () => {
      service.startEditing(5, 'col1');
      
      const stops: void[] = [];
      service.onCellEditStop.subscribe(() => stops.push(undefined));
      
      service.stopEditing(true);
      
      expect(service.editing).toBe(false);
      expect(stops).toHaveLength(1);
    });

    it('should do nothing if stopEditing called when not editing', () => {
      const stops: void[] = [];
      service.onCellEditStop.subscribe(() => stops.push(undefined));
      
      service.stopEditing(true);
      
      expect(stops).toHaveLength(0);
    });
  });

  describe('setRowHeight', () => {
    it('should set row height for Page calculations', () => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
      service.setRowHeight(50);
      service.setFocusedCell(100, 'col1');
      
      service.handleKeyDown(createKeyboardEvent('PageUp'));
      
      // pageSize = max(10, floor(50)) = 50, newRow = 100 - 50 = 50
      expect(service.getFocusedCell()?.rowIndex).toBe(50);
    });
  });

  describe('destroy', () => {
    it('should complete all subjects', () => {
      const focusComplete = vi.fn();
      const editStartComplete = vi.fn();
      const editStopComplete = vi.fn();
      const enterComplete = vi.fn();
      const escapeComplete = vi.fn();
      
      service.onFocusChange.subscribe({ complete: focusComplete });
      service.onCellEditStart.subscribe({ complete: editStartComplete });
      service.onCellEditStop.subscribe({ complete: editStopComplete });
      service.onEnterKey.subscribe({ complete: enterComplete });
      service.onEscapeKey.subscribe({ complete: escapeComplete });
      
      service.destroy();
      
      expect(focusComplete).toHaveBeenCalled();
      expect(editStartComplete).toHaveBeenCalled();
      expect(editStopComplete).toHaveBeenCalled();
      expect(enterComplete).toHaveBeenCalled();
      expect(escapeComplete).toHaveBeenCalled();
    });
  });

  describe('isEditable edge cases', () => {
    beforeEach(() => {
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
      service.setFocusedCell(5, 'col1');
    });

    it('should handle colDef.editable as function', () => {
      mockGridApi.getColumnDef = vi.fn(() => ({
        editable: (params: any) => params.rowIndex > 3,
      }));
      
      service.handleKeyDown(createKeyboardEvent('F2'));
      
      expect(service.editing).toBe(true);
    });

    it('should handle colDef.editable function returning false', () => {
      mockGridApi.getColumnDef = vi.fn(() => ({
        editable: (params: any) => params.rowIndex < 3,
      }));
      
      service.handleKeyDown(createKeyboardEvent('F2'));
      
      expect(service.editing).toBe(false);
    });

    it('should handle missing colDef', () => {
      mockGridApi.getColumnDef = vi.fn(() => null);
      
      service.handleKeyDown(createKeyboardEvent('F2'));
      
      expect(service.editing).toBe(false);
    });

    it('should handle colDef.editable = true', () => {
      mockGridApi.getColumnDef = vi.fn(() => ({ editable: true }));
      
      service.handleKeyDown(createKeyboardEvent('F2'));
      
      expect(service.editing).toBe(true);
    });
  });

  describe('column cache with different colId sources', () => {
    it('should use colId from colDef', () => {
      mockColumnService.getVisibleColumns = vi.fn(() => [
        { colId: 'myId', field: 'myField' },
      ]);
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
      
      service.focusFirstCell();
      
      expect(service.getFocusedCell()?.colId).toBe('myId');
    });

    it('should use field as colId if colId missing', () => {
      mockColumnService.getVisibleColumns = vi.fn(() => [
        { field: 'myField' },
      ]);
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
      
      service.focusFirstCell();
      
      expect(service.getFocusedCell()?.colId).toBe('myField');
    });

    it('should use generated colId if both missing', () => {
      mockColumnService.getVisibleColumns = vi.fn(() => [
        {}, // no colId, no field
      ]);
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
      
      service.focusFirstCell();
      
      expect(service.getFocusedCell()?.colId).toBe('col-0');
    });
  });

  describe('highlightFocusedCell', () => {
    it('should add and remove focused class', () => {
      const mockCell = {
        matches: vi.fn((sel: string) => sel.includes('col1')),
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
        },
      };
      const mockRow = {
        matches: vi.fn((sel: string) => sel.includes('data-row-index="5"')),
      };
      
      mockGridElement.querySelectorAll = vi.fn(() => ({
        forEach: (fn: (el: any) => void) => fn(mockCell),
      }));
      mockGridElement.querySelector = vi.fn(() => mockCell);
      
      service.setGrid(mockGridApi, mockGridElement, mockColumnService, mockRowRenderer);
      service.setFocusedCell(5, 'col1');
      
      expect(mockCell.classList.remove).toHaveBeenCalledWith('db-grid-cell-focused');
      expect(mockCell.classList.add).toHaveBeenCalledWith('db-grid-cell-focused');
    });
  });
});
