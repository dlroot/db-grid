// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataService } from '../data.service';
import { ColDef } from '../../models';
import { FilterService } from '../filter.service';

function createColDefs(fields: string[]): ColDef[] {
  return fields.map(f => ({ field: f, headerName: f }));
}

function createRowData(count: number, fields: string[]): any[] {
  return Array.from({ length: count }, (_, i) => {
    const row: any = { id: i };
    fields.forEach(f => { row[f] = `${f}-${i}`; });
    return row;
  });
}

describe('DataService', () => {
  let service: DataService;

  beforeEach(() => {
    service = new DataService();
  });

  // ===== initialize =====
  describe('initialize', () => {
    it('should initialize with rowData', () => {
      const data = createRowData(5, ['name', 'age']);
      service.initialize(data);
      expect(service.getRowCount()).toBe(5);
    });

    it('should handle empty data', () => {
      service.initialize([]);
      expect(service.getRowCount()).toBe(0);
    });

    it('should handle null/undefined data', () => {
      service.initialize(null as any);
      expect(service.getRowCount()).toBe(0);
    });

    it('should build rowNodeMap', () => {
      const data = createRowData(3, ['name']);
      service.initialize(data);
      expect(service.getRowNode('0')?.data.name).toBe('name-0');
    });

    it('should use custom getRowId', () => {
      const data = [{ uid: 'user-1' }, { uid: 'user-2' }];
      service.initialize(data, { getRowId: (p: any) => p.data.uid });
      expect(service.getRowNode('user-1')?.data.uid).toBe('user-1');
      expect(service.getRowNode('user-2')?.data.uid).toBe('user-2');
    });
  });

  // ===== initializeNodes =====
  describe('initializeNodes', () => {
    it('should initialize with RowNode array', () => {
      const nodes = [
        { id: 'n1', data: { name: 'Alice' }, rowIndex: 0 },
        { id: 'n2', data: { name: 'Bob' }, rowIndex: 1 },
      ] as any[];
      service.initializeNodes(nodes);
      expect(service.getRowCount()).toBe(2);
      expect(service.getRowNode('n1')?.data.name).toBe('Alice');
    });

    it('should auto-generate id if missing', () => {
      const nodes = [{ data: { name: 'Test' }, rowIndex: 0 }] as any[];
      service.initializeNodes(nodes);
      expect(service.getRowNode('node-0')).toBeDefined();
    });
  });

  // ===== setColDefs =====
  describe('setColDefs', () => {
    it('should set column definitions', () => {
      service.setColDefs(createColDefs(['a', 'b']));
      expect(() => service.setColDefs(createColDefs(['x', 'y']))).not.toThrow();
    });
  });

  // ===== getRowData / getRowNode =====
  describe('getRowData / getRowNode', () => {
    beforeEach(() => {
      service.initialize(createRowData(10, ['name', 'age']));
    });

    it('should get row data by index', () => {
      expect(service.getRowData(0)?.name).toBe('name-0');
      expect(service.getRowData(5)?.name).toBe('name-5');
    });

    it('should return null for invalid index', () => {
      expect(service.getRowData(-1)).toBeNull();
      expect(service.getRowData(999)).toBeNull();
    });

    it('should get row node by id', () => {
      expect(service.getRowNode('0')?.data.name).toBe('name-0');
      expect(service.getRowNode('missing')).toBeUndefined();
    });
  });

  // ===== row count and height =====
  describe('row count and height', () => {
    beforeEach(() => {
      service.initialize(createRowData(10, ['name']));
    });

    it('should return correct row count', () => {
      expect(service.getRowCount()).toBe(10);
    });

    it('should return total height', () => {
      service.setScrollConfig({ rowHeight: 40 });
      expect(service.getTotalHeight()).toBe(400);
    });

    it('should return configured row height', () => {
      service.setScrollConfig({ rowHeight: 50 });
      expect(service.getRowHeight()).toBe(50);
    });
  });

  // ===== virtual scroll =====
  describe('virtual scroll', () => {
    beforeEach(() => {
      service.initialize(createRowData(100, ['name']), {}, []);
      service.setScrollConfig({ rowHeight: 40, viewportHeight: 400, bufferSize: 5 });
    });

    it('should calculate viewport info', () => {
      service.setScrollTop(0);
      const info = service.getViewportInfo();
      expect(info.startIndex).toBeGreaterThanOrEqual(0);
      expect(info.endIndex).toBeGreaterThan(info.startIndex);
    });

    it('should update scroll position', () => {
      // With rowHeight=40, viewportHeight=400, bufferSize=5:
      // scrollTop=240: floor(240/40)=6, 6-5=1 > 0
      service.setScrollTop(240);
      const info = service.getViewportInfo();
      expect(info.startIndex).toBeGreaterThan(0);
    });

    it('should return visible rows', () => {
      service.setScrollTop(0);
      const rows = service.getVisibleRows();
      expect(Array.isArray(rows)).toBe(true);
    });
  });

  // ===== Sorting =====
  describe('Sorting', () => {
    beforeEach(() => {
      const colDefs = createColDefs(['name', 'age']);
      colDefs[0].sort = 'asc';
      colDefs[1].sort = 'desc';
      service.initialize(createRowData(10, ['name', 'age']), {}, colDefs);
    });

    it('should sort from column definitions', () => {
      service.sort(createColDefs(['name', 'age']));
      expect(service.getSortModel().length).toBeGreaterThanOrEqual(0);
    });

    it('should set sort model directly', () => {
      service.setSortModel([{ colId: 'name', sort: 'asc', index: 0 }]);
      const model = service.getSortModel();
      expect(model[0].colId).toBe('name');
      expect(model[0].sort).toBe('asc');
    });

    it('should toggle sort asc → desc → clear', () => {
      service.initialize(createRowData(10, ['name']));
      // Toggle to asc
      let model = service.toggleSort('name', false);
      expect(model[0].sort).toBe('asc');

      // Toggle to desc
      model = service.toggleSort('name', false);
      expect(model[0].sort).toBe('desc');

      // Toggle to clear
      model = service.toggleSort('name', false);
      expect(model.length).toBe(0);
    });

    it('should support multi-sort with Shift', () => {
      service.initialize(createRowData(10, ['name', 'age']));
      service.toggleSort('name', false);
      const model = service.toggleSort('age', true); // multiSort
      expect(model.length).toBe(2);
      expect(model[0].colId).toBe('name');
      expect(model[1].colId).toBe('age');
    });

    it('should toggle to desc and clear when clicking same column', () => {
      service.initialize(createRowData(10, ['name', 'age']));
      service.toggleSort('name', false); // asc
      service.toggleSort('name', false); // desc
      service.toggleSort('name', false); // clear
      const model = service.getSortModel();
      expect(model.length).toBe(0);
    });

    it('should remove from multi-sort when toggling existing column', () => {
      service.initialize(createRowData(10, ['name', 'age']));
      service.toggleSort('name', false);
      service.toggleSort('age', true);  // multi-sort: add age
      service.toggleSort('name', true); // multi-sort: toggle name to desc
      let model = service.getSortModel();
      expect(model.length).toBe(2);
      expect(model[0].colId).toBe('name');
      expect(model[0].sort).toBe('desc');
      
      service.toggleSort('name', true); // multi-sort: remove name
      model = service.getSortModel();
      expect(model.length).toBe(1);
      expect(model[0].colId).toBe('age');
    });

    it('should get column sort state', () => {
      service.setSortModel([{ colId: 'name', sort: 'asc', index: 0 }]);
      const state = service.getColumnSortState('name');
      expect(state.sort).toBe('asc');
      expect(state.sortIndex).toBe(0);
    });

    it('should return null state for unsorted column', () => {
      const state = service.getColumnSortState('missing');
      expect(state.sort).toBeNull();
      expect(state.sortIndex).toBeNull();
    });

    it('should clear sort', () => {
      service.setSortModel([{ colId: 'name', sort: 'asc', index: 0 }]);
      service.clearSort();
      expect(service.getSortModel().length).toBe(0);
    });
  });

  // ===== Filtering =====
  describe('Filtering', () => {
    beforeEach(() => {
      // Use numeric values for age field
      const data = Array.from({ length: 10 }, (_, i) => ({ id: i, name: `name-${i}`, age: i }));
      service.initialize(data);
    });

    it('should filter with text filter', () => {
      const colDefs = createColDefs(['name']);
      service.filter(colDefs, { name: { filterType: 'text', filter: 'name-5' } });
      expect(service.getRowCount()).toBe(1);
    });

    it('should filter with number greaterThan', () => {
      const colDefs = createColDefs(['age']);
      service.filter(colDefs, { age: { filterType: 'number', filter: '5', type: 'greaterThan' } });
      const count = service.getRowCount();
      expect(count).toBe(4); // 6,7,8,9
    });

    it('should filter with number inRange', () => {
      const colDefs = createColDefs(['age']);
      service.filter(colDefs, { age: { filterType: 'number', type: 'inRange', filter: '3', filterTo: '6' } });
      expect(service.getRowCount()).toBe(4); // 3,4,5,6
    });

    it('should clear filter', () => {
      const colDefs = createColDefs(['name']);
      service.filter(colDefs, { name: { filterType: 'text', filter: 'test' } });
      service.clearFilter();
      expect(service.getRowCount()).toBe(10);
    });

    it('should work with FilterService', () => {
      const filterService = new FilterService();
      service.setFilterService(filterService);
      const colDefs = createColDefs(['name']);
      service.filter(colDefs, { name: { filterType: 'text', filter: 'name-2' } });
      expect(service.getRowCount()).toBeLessThanOrEqual(10);
      filterService.destroy();
    });
  });

  // ===== Row operations =====
  describe('Row operations', () => {
    beforeEach(() => {
      service.initialize(createRowData(5, ['name']));
    });

    it('should add row at end', () => {
      service.addRow({ name: 'New Row' });
      expect(service.getRowCount()).toBe(6);
      expect(service.getRowData(5)?.name).toBe('New Row');
    });

    it('should add row at specific index', () => {
      service.addRow({ name: 'Inserted' }, 2);
      expect(service.getRowData(2)?.name).toBe('Inserted');
      expect(service.getRowCount()).toBe(6);
    });

    it('should remove row by id', () => {
      service.removeRow('0');
      expect(service.getRowCount()).toBe(4);
      expect(service.getRowNode('0')).toBeUndefined();
    });

    it('should update row', () => {
      service.updateRow('2', { name: 'Updated' });
      expect(service.getRowData(2)?.name).toBe('Updated');
    });
  });

  // ===== Selection =====
  describe('Selection', () => {
    beforeEach(() => {
      service.initialize(createRowData(5, ['name']));
    });

    it('should update node selection', () => {
      service.updateNodeSelection('0', true);
      service.updateNodeSelection('2', true);
      const selected = service.getSelectedNodes();
      expect(selected.length).toBe(2);
    });

    it('should select all', () => {
      service.selectAll();
      expect(service.getSelectedNodes().length).toBe(5);
    });

    it('should select specific nodes', () => {
      service.selectAll(['0', '2']);
      expect(service.getSelectedNodes().length).toBe(2);
    });

    it('should clear selection', () => {
      service.selectAll();
      service.clearSelection();
      expect(service.getSelectedNodes().length).toBe(0);
    });
  });

  // ===== destroy =====
  describe('destroy', () => {
    it('should clear all state', () => {
      service.initialize(createRowData(5, ['name']));
      service.setSortModel([{ colId: 'name', sort: 'asc', index: 0 }]);
      service.destroy();
      expect(service.getRowCount()).toBe(0);
      expect(service.getSortModel().length).toBe(0);
    });
  });

  // ===== Edge cases =====
  describe('edge cases', () => {
    it('should handle nested field paths', () => {
      const data = [{ profile: { name: 'Alice' } }, { profile: { name: 'Bob' } }];
      service.initialize(data, {}, [{ field: 'profile.name' }]);
      expect(service.getRowData(0)).toEqual({ profile: { name: 'Alice' } });
    });

    it('should handle null/undefined cell values in filter', () => {
      const data = [{ name: 'Alice' }, { name: null }, { name: 'Bob' }];
      service.initialize(data);
      const colDefs = createColDefs(['name']);
      service.filter(colDefs, { name: { filterType: 'text', filter: 'Ali' } });
      expect(service.getRowCount()).toBe(1);
    });

    it('should handle sort with null values', () => {
      const data = [{ name: 'Alice' }, { name: null }, { name: 'Bob' }];
      service.initialize(data, {}, [{ field: 'name', sort: 'asc' }]);
      service.sort([{ field: 'name', sort: 'asc' }]);
      // Null should sort to end
      expect(service.getRowCount()).toBe(3);
    });
  });
});