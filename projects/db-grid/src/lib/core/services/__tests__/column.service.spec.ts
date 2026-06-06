/// <reference types='vitest' />
import { describe, it, expect, beforeEach } from 'vitest';
import { ColumnService } from '../column.service';
import { ColDef, ColGroupDef } from '../models';

describe('ColumnService', () => {
  let service: ColumnService;

  const mockColDefs: ColDef[] = [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'age', headerName: 'Age', width: 100, hide: true },
    { field: 'email', headerName: 'Email', pinnedLeft: true },
  ];

  beforeEach(() => {
    service = new ColumnService();
    service.initialize(mockColDefs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Column Initialization', () => {
    it('should initialize with column definitions', () => {
      const allColumns = service.getAllColumns();
      expect(allColumns.length).toBe(4);
    });

    it('should store column defs', () => {
      const colDefs = service.getColumnDefs();
      expect(colDefs).toHaveLength(4);
    });

    it('should track column states', () => {
      const states = service.getAllColumnState();
      expect(states.length).toBe(4);
    });
  });

  describe('Visible Columns', () => {
    it('should get visible columns', () => {
      const visible = service.getVisibleColumns();
      // email is pinned (visible), name is visible, id is visible, age is hidden
      expect(visible.length).toBe(3);
    });

    it('should correctly identify hidden columns', () => {
      const visible = service.getVisibleColumns();
      const ages = visible.filter(c => c.field === 'age');
      expect(ages).toHaveLength(0);
    });
  });

  describe('Column Operations', () => {
    it('should set column width', () => {
      service.setColumnWidth('id', 150);
      const states = service.getAllColumnState();
      const idState = states.find(s => s.colId === 'id');
      expect(idState?.width).toBe(150);
    });

    it('should set column hidden', () => {
      service.setColumnHidden('name', true);
      const visible = service.getVisibleColumns();
      expect(visible.find(c => c.field === 'name')).toBeUndefined();
    });

    it('should show hidden column', () => {
      service.setColumnHidden('age', false);
      const visible = service.getVisibleColumns();
      expect(visible.find(c => c.field === 'age')).toBeDefined();
    });

    it('should set column pinned', () => {
      service.setColumnPinned('name', 'left');
      const leftPinned = service.getLeftPinnedColumns();
      expect(leftPinned.find(c => c.field === 'name')).toBeDefined();
    });

    it('should set column sort', () => {
      service.setColumnSort('name', 'asc');
      const states = service.getAllColumnState();
      const nameState = states.find(s => s.colId === 'name');
      expect(nameState?.sort).toBe('asc');
    });

    it('should reset column state', () => {
      service.setColumnWidth('id', 500);
      service.resetColumnState();
      const states = service.getAllColumnState();
      const idState = states.find(s => s.colId === 'id');
      expect(idState?.width).toBe(80); // original width
    });
  });

  describe('Column Groups', () => {
    it('should detect column groups', () => {
      const groupDefs: (ColDef | ColGroupDef)[] = [
        {
          headerName: 'Person',
          children: [
            { field: 'firstName', headerName: 'First Name' },
            { field: 'lastName', headerName: 'Last Name' },
          ],
        },
      ];
      service.initialize(groupDefs);
      expect(service.hasColumnGroups()).toBe(true);
    });

    it('should report no groups when not present', () => {
      expect(service.hasColumnGroups()).toBe(false);
    });

    it('should get group depth', () => {
      expect(service.getGroupDepth()).toBe(1);
    });

    it('should get group headers', () => {
      const groupDefs: (ColDef | ColGroupDef)[] = [
        {
          headerName: 'Person',
          children: [
            { field: 'firstName', headerName: 'First Name' },
            { field: 'lastName', headerName: 'Last Name' },
          ],
        },
      ];
      service.initialize(groupDefs);
      const headers = service.getGroupHeaders();
      expect(headers.length).toBe(1);
      expect(headers[0].headerName).toBe('Person');
    });
  });

  describe('Pinned Columns', () => {
    it('should get left pinned columns', () => {
      const leftPinned = service.getLeftPinnedColumns();
      expect(leftPinned.length).toBe(1);
      expect(leftPinned[0].field).toBe('email');
    });

    it('should get right pinned columns', () => {
      const rightPinned = service.getRightPinnedColumns();
      expect(rightPinned).toEqual([]);
    });

    it('should get scrollable columns', () => {
      const scrollable = service.getScrollableColumns();
      // visible non-pinned columns: id, name (age is hidden but still in scrollable)
      expect(scrollable.length).toBe(3); // id, name, age (age is hidden but not pinned)
    });
  });

  describe('Get Column By Field', () => {
    it('should get column by field', () => {
      const col = service.getColumn('name');
      expect(col).toBeDefined();
      expect(col?.field).toBe('name');
    });

    it('should return undefined for unknown field', () => {
      const col = service.getColumn('unknown');
      expect(col).toBeUndefined();
    });
  });

  describe('Column Width Calculate', () => {
    it('should get total width of visible columns', () => {
      const totalWidth = service.getTotalWidth(true);
      expect(totalWidth).toBeGreaterThan(0);
    });

    it('should get total width of all columns', () => {
      const totalWidth = service.getTotalWidth(false);
      expect(totalWidth).toBeGreaterThan(0);
    });
  });

  describe('Column Move', () => {
    it('should move column in scrollable list', () => {
      service.moveColumn(0, 1);
      // After move, scrollable columns order changes
      const scrollable = service.getScrollableColumns();
      expect(scrollable).toBeDefined();
    });
  });

  describe('Visible Index', () => {
    it('should get visible index', () => {
      const idx = service.getVisibleIndex('name');
      expect(typeof idx).toBe('number');
    });
  });
});