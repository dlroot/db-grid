import { describe, it, expect, beforeEach } from '@angular/core/testing';
import { DataService } from './data.service';
import { FilterService } from './filter.service';

describe('DataService', () => {
  let service: DataService;

  beforeEach(() => {
    service = new DataService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with row data', () => {
      const data = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
      service.initialize(data);
      expect(service.getRowCount()).toBe(2);
    });

    it('should get row data by index', () => {
      const data = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
      service.initialize(data);
      expect(service.getRowData(0)).toEqual(data[0]);
      expect(service.getRowData(1)).toEqual(data[1]);
    });

    it('should return null for out of range index', () => {
      service.initialize([{ id: 1, name: 'Alice' }]);
      expect(service.getRowData(99)).toBeNull();
    });
  });

  describe('Sorting', () => {
    beforeEach(() => {
      const data = [
        { id: 1, name: 'Charlie', age: 30 },
        { id: 2, name: 'Alice', age: 25 },
        { id: 3, name: 'Bob', age: 35 }
      ];
      const colDefs = [
        { field: 'name', sortable: true },
        { field: 'age', sortable: true }
      ];
      service.initialize(data, {}, colDefs);
    });

    it('should toggle sort ascending', () => {
      const colDefs = [{ field: 'name', sortable: true }];
      service.setColDefs(colDefs);
      service.toggleSort('name', false);

      const rows = service.getVisibleRows();
      expect(rows[0].name).toBe('Alice');
      expect(rows[1].name).toBe('Bob');
      expect(rows[2].name).toBe('Charlie');
    });

    it('should toggle sort descending', () => {
      const colDefs = [{ field: 'name', sortable: true }];
      service.setColDefs(colDefs);
      service.toggleSort('name', false);
      service.toggleSort('name', false);

      const rows = service.getVisibleRows();
      expect(rows[0].name).toBe('Charlie');
      expect(rows[1].name).toBe('Bob');
      expect(rows[2].name).toBe('Alice');
    });

    it('should clear sort on third toggle', () => {
      const colDefs = [{ field: 'name', sortable: true }];
      service.setColDefs(colDefs);
      service.toggleSort('name', false);
      service.toggleSort('name', false);
      service.toggleSort('name', false);

      const state = service.getColumnSortState('name');
      expect(state.sort).toBeNull();
    });

    it('should sort numbers correctly', () => {
      const colDefs = [{ field: 'age', sortable: true }];
      service.setColDefs(colDefs);
      service.toggleSort('age', false);

      const rows = service.getVisibleRows();
      expect(rows[0].age).toBe(25);
      expect(rows[1].age).toBe(30);
      expect(rows[2].age).toBe(35);
    });
  });

  describe('Multi Column Sort', () => {
    beforeEach(() => {
      const data = [
        { id: 1, department: 'Tech', name: 'Charlie', age: 30 },
        { id: 2, department: 'HR', name: 'Alice', age: 25 },
        { id: 3, department: 'Tech', name: 'Bob', age: 35 },
        { id: 4, department: 'HR', name: 'David', age: 28 }
      ];
      const colDefs = [
        { field: 'department', sortable: true },
        { field: 'name', sortable: true },
        { field: 'age', sortable: true }
      ];
      service.initialize(data, {}, colDefs);
    });

    it('should add secondary sort with multiSort', () => {
      service.toggleSort('department', false);
      service.toggleSort('name', true);

      const rows = service.getVisibleRows();
      expect(rows[0].department).toBe('HR');
      expect(rows[0].name).toBe('Alice');
      expect(rows[1].department).toBe('HR');
      expect(rows[1].name).toBe('David');
      expect(rows[2].department).toBe('Tech');
    });

    it('should replace sort without multiSort', () => {
      service.toggleSort('department', false);
      service.toggleSort('name', false);

      const sortModel = service.getSortModel();
      expect(sortModel.length).toBe(1);
      expect(sortModel[0].colId).toBe('name');
    });

    it('should set sort model directly', () => {
      service.setSortModel([
        { colId: 'department', sort: 'asc' },
        { colId: 'age', sort: 'desc' }
      ]);

      const sortModel = service.getSortModel();
      expect(sortModel.length).toBe(2);
      expect(sortModel[0].colId).toBe('department');
      expect(sortModel[0].sort).toBe('asc');
      expect(sortModel[1].colId).toBe('age');
      expect(sortModel[1].sort).toBe('desc');
    });

    it('should clear all sorts', () => {
      service.toggleSort('department', false);
      service.toggleSort('name', true);
      service.clearSort();

      const sortModel = service.getSortModel();
      expect(sortModel.length).toBe(0);
    });
  });

  describe('Row Selection', () => {
    beforeEach(() => {
      const data = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
        { id: '3', name: 'Charlie' }
      ];
      service.initialize(data);
    });

    it('should get selected nodes initially empty', () => {
      expect(service.getSelectedNodes().length).toBe(0);
    });

    it('should update node selection', () => {
      service.updateNodeSelection('1', true);
      service.updateNodeSelection('2', true);
      const selected = service.getSelectedNodes();

      expect(selected.length).toBe(2);
    });

    it('should select all nodes', () => {
      service.selectAll();
      const selected = service.getSelectedNodes();
      expect(selected.length).toBe(3);
    });

    it('should clear selection', () => {
      service.updateNodeSelection('1', true);
      service.updateNodeSelection('2', true);
      service.clearSelection();
      expect(service.getSelectedNodes().length).toBe(0);
    });
  });

  describe('Row Management', () => {
    beforeEach(() => {
      const data = [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }];
      service.initialize(data);
    });

    it('should add row', () => {
      service.addRow({ id: '3', name: 'Charlie' });
      expect(service.getRowCount()).toBe(3);
    });

    it('should add row at specific index', () => {
      service.addRow({ id: '3', name: 'Charlie' }, 1);
      const rows = service.getVisibleRows();
      expect(rows[1].name).toBe('Charlie');
    });

    it('should remove row', () => {
      service.removeRow('1');
      expect(service.getRowCount()).toBe(1);
    });

    it('should update row', () => {
      service.updateRow('1', { id: '1', name: 'Alice Updated' });
      const row = service.getRowData(0);
      expect(row.name).toBe('Alice Updated');
    });
  });

  describe('Virtual Scroll', () => {
    beforeEach(() => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        id: String(i + 1),
        name: `Item ${i + 1}`
      }));
      service.initialize(data, { rowHeight: 40 });
    });

    it('should calculate total height', () => {
      expect(service.getTotalHeight()).toBe(4000);
    });

    it('should get row height', () => {
      expect(service.getRowHeight()).toBe(40);
    });

    it('should get visible rows', () => {
      service.setScrollConfig({ viewportHeight: 400 });
      service.setScrollTop(0);
      const viewport = service.getViewportInfo();
      expect(viewport.startIndex).toBe(0);
    });
  });

  describe('Row Node', () => {
    it('should get row node by id', () => {
      service.initialize([{ id: '1', name: 'Alice' }]);
      const node = service.getRowNode('1');
      expect(node).toBeTruthy();
      expect(node?.data.name).toBe('Alice');
    });

    it('should return undefined for non-existent node', () => {
      service.initialize([{ id: '1', name: 'Alice' }]);
      const node = service.getRowNode('999');
      expect(node).toBeUndefined();
    });
  });

  describe('Filter Integration', () => {
    it('should accept filter service', () => {
      const filterService = new FilterService();
      service.setFilterService(filterService);
    });
  });
});
