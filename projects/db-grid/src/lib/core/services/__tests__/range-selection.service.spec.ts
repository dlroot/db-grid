/// <reference types='vitest' />
import { describe, it, expect, beforeEach } from 'vitest';
import { RangeSelectionService, CellPosition, CellRange, RangeEdge } from '../range-selection.service';
import { ClipboardService } from '../clipboard.service';

describe('RangeSelectionService', () => {
  let service: RangeSelectionService;
  let clipboardService: ClipboardService;

  beforeEach(() => {
    clipboardService = new ClipboardService();
    service = new RangeSelectionService(clipboardService as any);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with config', () => {
      service.initialize({ 
        enableRangeSelection: true, 
        enableCellSelection: true,
        enableColSelection: true 
      });
      expect(service.isRangeSelectionEnabled()).toBe(true);
      expect(service.isCellSelectionEnabled()).toBe(true);
      expect(service.isColSelectionEnabled()).toBe(true);
    });

    it('should default to disabled', () => {
      service.initialize({});
      expect(service.isRangeSelectionEnabled()).toBe(false);
    });
  });

  describe('Enable/Disable', () => {
    it('should enable range selection', () => {
      service.enableRangeSelection();
      expect(service.isRangeSelectionEnabled()).toBe(true);
    });

    it('should disable range selection', () => {
      service.enableRangeSelection();
      service.disableRangeSelection();
      expect(service.isRangeSelectionEnabled()).toBe(false);
      expect(service.getRanges()).toHaveLength(0);
    });

    it('should enable cell selection', () => {
      service.enableCellSelection();
      expect(service.isCellSelectionEnabled()).toBe(true);
    });

    it('should enable column selection', () => {
      service.enableColSelection();
      expect(service.isColSelectionEnabled()).toBe(true);
    });
  });

  describe('Range Selection', () => {
    beforeEach(() => {
      service.initialize({ enableRangeSelection: true });
      service.setColumnOrder(['col1', 'col2', 'col3', 'col4']);
    });

    it('should start range selection', () => {
      service.startRangeSelection(0, 'col1');
      expect(service.getActiveRange()).not.toBeNull();
    });

    it('should extend range', () => {
      service.startRangeSelection(0, 'col1');
      service.extendRange(5, 'col3');
      const range = service.getActiveRange();
      expect(range?.end.rowIndex).toBe(5);
      expect(range?.end.colId).toBe('col3');
    });

    it('should handle shift key to extend', () => {
      service.startRangeSelection(0, 'col1');
      service.startRangeSelection(3, 'col3', { shiftKey: true } as MouseEvent);
      const range = service.getActiveRange();
      expect(range).not.toBeNull();
    });

    it('should handle ctrl key to add range', () => {
      service.startRangeSelection(0, 'col1');
      service.startRangeSelection(2, 'col3', { ctrlKey: true } as MouseEvent);
      expect(service.getRanges()).toHaveLength(2);
    });

    it('should get all ranges', () => {
      service.startRangeSelection(0, 'col1');
      expect(service.getRanges()).toHaveLength(1);
    });

    it('should clear ranges', () => {
      service.startRangeSelection(0, 'col1');
      service.clearRanges();
      expect(service.getRanges()).toHaveLength(0);
      expect(service.getActiveRange()).toBeNull();
    });
  });

  describe('Column Selection', () => {
    beforeEach(() => {
      service.initialize({ enableColSelection: true });
      service.setColumnOrder(['col1', 'col2', 'col3']);
    });

    it('should select column', () => {
      service.selectColumn('col1', 10);
      expect(service.getRanges()).toHaveLength(1);
      expect(service.getActiveRange()?.type).toBe('column');
    });

    it('should handle ctrl click to toggle column', () => {
      service.selectColumn('col1', 10);
      service.selectColumn('col1', 10, { ctrlKey: true } as MouseEvent);
      // Toggle off when same column
      expect(service.getRanges()).toHaveLength(0);
    });

    it('should handle shift click for column range', () => {
      service.selectColumn('col3', 10);
      service.selectColumn('col1', 10, { shiftKey: true } as MouseEvent);
      // Should create range from col1 to col3
      expect(service.getRanges().length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Focused Cell', () => {
    it('should set focused cell', () => {
      service.setFocusedCell(5, 'col2');
      expect(service.getFocusedCell()).toEqual({ rowIndex: 5, colId: 'col2' });
    });
  });

  describe('Range Values', () => {
    beforeEach(() => {
      service.initialize({ enableRangeSelection: true });
      service.setColumnOrder(['id', 'name', 'age']);
    });

    it('should get range values', () => {
      const data = [
        { id: 1, name: 'Alice', age: 25 },
        { id: 2, name: 'Bob', age: 30 },
        { id: 3, name: 'Charlie', age: 35 },
      ];
      const columns = [
        { field: 'id' },
        { field: 'name' },
        { field: 'age' },
      ] as any;
      
      service.startRangeSelection(0, 'id');
      service.extendRange(1, 'age');
      const range = service.getActiveRange();
      expect(range).not.toBeNull();
      
      const values = service.getRangeValues(range!, data, columns);
      expect(values.length).toBe(2);
    });

    it('should parse clipboard text', () => {
      const text = 'a\tb\tc\nd\te\tf';
      const parsed = service.parseClipboardText(text);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual(['a', 'b', 'c']);
    });
  });

  describe('Cell Range Edge', () => {
    beforeEach(() => {
      service.initialize({ enableRangeSelection: true });
      service.setColumnOrder(['col1', 'col2', 'col3']);
    });

    it('should detect cell in range', () => {
      service.startRangeSelection(0, 'col1');
      service.extendRange(2, 'col3');
      expect(service.isCellInRange(1, 'col2')).toBe(true);
    });

    it('should detect cell outside range', () => {
      service.startRangeSelection(0, 'col1');
      service.extendRange(2, 'col3');
      expect(service.isCellInRange(5, 'col2')).toBe(false);
    });

    it('should get cell range edge', () => {
      const range: CellRange = {
        start: { rowIndex: 0, colId: 'col1' },
        end: { rowIndex: 2, colId: 'col3' }
      };
      
      const edge = service.getCellRangeEdge(0, 'col1', range);
      expect(edge.top).toBe(true);
      expect(edge.left).toBe(true);
      
      const edge2 = service.getCellRangeEdge(2, 'col3', range);
      expect(edge2.bottom).toBe(true);
      expect(edge2.right).toBe(true);
    });
  });

  describe('Full Select', () => {
    beforeEach(() => {
      service.initialize({ enableRangeSelection: true });
      service.setColumnOrder(['col1', 'col2', 'col3']);
    });

    it('should select all cells', () => {
      service.selectAllCells(10, [
        { field: 'col1' },
        { field: 'col2' },
        { field: 'col3' },
      ] as any);
      expect(service.getRanges()).toHaveLength(1);
    });
  });

  describe('Destroy', () => {
    it('should clean up', () => {
      service.initialize({ enableRangeSelection: true });
      service.destroy();
      expect(service.getRanges()).toHaveLength(0);
    });
  });
});