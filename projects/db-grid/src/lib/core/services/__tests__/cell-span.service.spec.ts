import { describe, it, expect, beforeEach } from 'vitest';
import { CellSpanService, SpanConfig, SpanRule, CellSpan } from '../cell-span.service';
import { ColDef } from '../../models';

function createColDefs(fields: string[]): ColDef[] {
  return fields.map((f, i) => ({ field: f, colId: f, headerName: f, width: 100 }));
}

function createRowData(count: number, fields: string[]): any[] {
  return Array.from({ length: count }, (_, i) => {
    const row: any = { id: i };
    fields.forEach(f => { row[f] = `${f}-${i}`; });
    return row;
  });
}

describe('CellSpanService', () => {
  let service: CellSpanService;

  beforeEach(() => {
    service = new CellSpanService();
  });

  // ===== initialize =====
  describe('initialize', () => {
    it('should initialize with columns and data', () => {
      const colDefs = createColDefs(['name', 'age']);
      const rowData = createRowData(5, ['name', 'age']);
      service.initialize(colDefs, rowData);
      expect(service.getRowCount()).toBe(5);
    });

    it('should handle empty row data', () => {
      const colDefs = createColDefs(['name', 'age']);
      service.initialize(colDefs, []);
      expect(service.getRowCount()).toBe(0);
    });

    it('should handle autoMerge config', () => {
      const colDefs = createColDefs(['name', 'age']);
      const rowData = [
        { name: 'Alice', age: 25 },
        { name: 'Alice', age: 26 },
        { name: 'Bob', age: 30 },
      ];
      const config: SpanConfig = {
        autoMerge: true,
        mergeColumns: ['name'],
      };
      service.initialize(colDefs, rowData, config);
      const span = service.getSpan(0, 'name');
      expect(span?.colspan).toBe(1);
    });

    it('should rebuild on reinitialize', () => {
      service.initialize(createColDefs(['a']), [{ a: 1 }]);
      service.initialize(createColDefs(['b']), [{ b: 2 }]);
      expect(service.getRowCount()).toBe(1);
    });
  });

  // ===== getSpan / isSpanStart / isSwappedOut =====
  describe('getSpan / isSpanStart / isSwappedOut', () => {
    beforeEach(() => {
      const colDefs = createColDefs(['name', 'age', 'city']);
      const rowData = createRowData(5, ['name', 'age', 'city']);
      service.initialize(colDefs, rowData);
    });

    it('should return default span (1,1) for cells', () => {
      const span = service.getSpan(0, 'name');
      expect(span?.colspan).toBe(1);
      expect(span?.rowspan).toBe(1);
      expect(span?.isSpanStart).toBe(true);
    });

    it('should check isSpanStart', () => {
      expect(service.isSpanStart(0, 'name')).toBe(true);
    });

    it('should check isSwappedOut', () => {
      expect(service.isSwappedOut(0, 'name')).toBe(false);
    });

    it('should return null for unknown column', () => {
      const span = service.getSpan(0, 'unknown');
      expect(span).toBeNull();
    });
  });

  // ===== getColSpan / getRowSpan =====
  describe('getColSpan / getRowSpan', () => {
    beforeEach(() => {
      const colDefs = createColDefs(['name', 'age']);
      const rowData = createRowData(5, ['name', 'age']);
      service.initialize(colDefs, rowData);
    });

    it('should return colspan', () => {
      expect(service.getColSpan(0, 'name')).toBe(1);
    });

    it('should return rowspan', () => {
      expect(service.getRowSpan(0, 'name')).toBe(1);
    });

    it('should return 1 for unknown cell', () => {
      expect(service.getColSpan(0, 'missing')).toBe(1);
      expect(service.getRowSpan(0, 'missing')).toBe(1);
    });
  });

  // ===== setManualSpan =====
  describe('setManualSpan', () => {
    beforeEach(() => {
      const colDefs = createColDefs(['name', 'age', 'city']);
      const rowData = createRowData(5, ['name', 'age', 'city']);
      service.initialize(colDefs, rowData);
    });

    it('should set colspan > 1', () => {
      service.setManualSpan(0, 'name', 2, 1);
      const span = service.getSpan(0, 'name');
      expect(span?.colspan).toBe(2);
      expect(span?.isSpanStart).toBe(true);
    });

    it('should set rowspan > 1', () => {
      service.setManualSpan(0, 'name', 1, 3);
      const span = service.getSpan(0, 'name');
      expect(span?.rowspan).toBe(3);
    });

    it('should swap out covered cells', () => {
      service.setManualSpan(0, 'name', 2, 1);
      // The cell at (0, 'age') should be swapped out (rowspan=0)
      const ageSpan = service.getSpan(0, 'age');
      expect(ageSpan?.isSpanStart).toBe(false);
      expect(ageSpan?.rowspan).toBe(0);
    });

    it('should ignore span of 1x1', () => {
      const initialCount = service.getAllSpans().length;
      service.setManualSpan(0, 'name', 1, 1);
      // Should not add a new span entry
      expect(service.getAllSpans().length).toBe(initialCount);
    });

    it('should handle vertical spanning', () => {
      service.setManualSpan(0, 'name', 1, 2);
      const span = service.getSpan(0, 'name');
      expect(span?.rowspan).toBe(2);
    });
  });

  // ===== autoMerge =====
  describe('autoMerge', () => {
    it('should merge cells with same value in mergeColumns', () => {
      const colDefs = createColDefs(['name', 'age']);
      const rowData = [
        { name: 'Alice', age: 25 },
        { name: 'Alice', age: 26 },
        { name: 'Bob', age: 30 },
      ];
      service.initialize(colDefs, rowData, {
        autoMerge: true,
        mergeColumns: ['name'],
      });
      // First two rows should have merged name cells
      const span0 = service.getSpan(0, 'name');
      const span1 = service.getSpan(1, 'name');
      expect(span0?.isSpanStart).toBe(true);
      expect(span1?.isSpanStart).toBe(false);
    });

    it('should not merge when values differ', () => {
      const colDefs = createColDefs(['name']);
      const rowData = [
        { name: 'Alice' },
        { name: 'Bob' },
      ];
      service.initialize(colDefs, rowData, {
        autoMerge: true,
        mergeColumns: ['name'],
      });
      expect(service.isSpanStart(0, 'name')).toBe(true);
      expect(service.isSpanStart(1, 'name')).toBe(true);
    });

    it('should handle multiple merge columns', () => {
      const colDefs = createColDefs(['dept', 'name']);
      const rowData = [
        { dept: 'IT', name: 'Alice' },
        { dept: 'IT', name: 'Alice' },
        { dept: 'HR', name: 'Bob' },
      ];
      service.initialize(colDefs, rowData, {
        autoMerge: true,
        mergeColumns: ['dept', 'name'],
      });
      expect(service.isSpanStart(0, 'dept')).toBe(true);
    });
  });

  // ===== span rules =====
  describe('span rules', () => {
    it('should apply custom span rule', () => {
      const colDefs = createColDefs(['name', 'age']);
      const rowData = [
        { name: 'Alice', age: 25 },
        { name: 'Alice', age: 26 },
        { name: 'Bob', age: 30 },
      ];
      const rule: SpanRule = {
        colId: 'name',
        shouldMerge: (curr, prev) => curr === prev && curr === 'Alice',
      };
      service.initialize(colDefs, rowData, {
        spanRules: [rule],
      });
      const span = service.getSpan(0, 'name');
      expect(span?.isSpanStart).toBe(true);
    });
  });

  // ===== getRowCount / getAllSpans / clearSpans =====
  describe('metadata methods', () => {
    beforeEach(() => {
      const colDefs = createColDefs(['name', 'age']);
      const rowData = createRowData(5, ['name', 'age']);
      service.initialize(colDefs, rowData);
    });

    it('should return row count', () => {
      expect(service.getRowCount()).toBe(5);
    });

    it('should return all span starts', () => {
      service.setManualSpan(0, 'name', 2, 1);
      const allSpans = service.getAllSpans();
      const nameSpans = allSpans.filter(s => s.colId === 'name');
      expect(nameSpans.length).toBeGreaterThanOrEqual(1);
    });

    it('should clear all spans', () => {
      service.setManualSpan(0, 'name', 2, 1);
      service.clearSpans();
      // After clearSpans, getSpan returns null (no entries in spanMap)
      const span = service.getSpan(0, 'name');
      expect(span).toBeNull();
    });
  });

  // ===== destroy =====
  describe('destroy', () => {
    it('should clear all data', () => {
      service.initialize(createColDefs(['name']), [{ name: 'Test' }]);
      service.destroy();
      expect(() => service.getRowCount()).not.toThrow();
    });
  });

  // ===== Edge cases =====
  describe('edge cases', () => {
    it('should handle nested field paths', () => {
      const colDefs: ColDef[] = [{ field: 'profile.name', colId: 'profile.name' }];
      const rowData = [{ profile: { name: 'Alice' } }];
      service.initialize(colDefs, rowData);
      expect(service.getRowCount()).toBe(1);
    });

    it('should handle column with colId but no field', () => {
      const colDefs: ColDef[] = [{ colId: 'custom', headerName: 'Custom' }];
      const rowData = [{ custom: 'value' }];
      service.initialize(colDefs, rowData);
      expect(service.getRowCount()).toBe(1);
    });

    it('should handle span that extends beyond row count', () => {
      const colDefs = createColDefs(['name', 'age']);
      const rowData = [{ name: 'A' }, { name: 'B' }];
      service.initialize(colDefs, rowData);
      service.setManualSpan(0, 'name', 1, 10); // rows only 2
      // Should not crash
      expect(service.getSpan(0, 'name')?.rowspan).toBe(10);
    });
  });
});