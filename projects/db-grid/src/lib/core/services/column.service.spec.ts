import { ColumnService } from './column.service';
import { ColDef, ColGroupDef } from '../models';

describe('ColumnService', () => {
  let service: ColumnService;

  beforeEach(() => {
    service = new ColumnService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialize', () => {
    it('should initialize with column definitions', () => {
      const colDefs: ColDef[] = [
        { field: 'name', width: 150 },
        { field: 'age', width: 100 },
      ];
      service.initialize(colDefs);
      expect(service.getVisibleColumns().length).toBe(2);
    });

    it('should use default width when not specified', () => {
      service.initialize([{ field: 'name' }]);
      const state = service.getColumnState({ field: 'name' } as ColDef);
      expect(state?.width).toBe(200);
    });

    it('should respect specified width', () => {
      service.initialize([{ field: 'name', width: 300 }]);
      const state = service.getColumnState({ field: 'name' } as ColDef);
      expect(state?.width).toBe(300);
    });

    it('should handle empty column definitions', () => {
      service.initialize([]);
      expect(service.getVisibleColumns().length).toBe(0);
    });

    it('should flatten ColGroupDef children', () => {
      const colDefs: (ColDef | ColGroupDef)[] = [
        {
          headerName: 'Group',
          children: [
            { field: 'name', width: 150 },
            { field: 'age', width: 100 },
          ]
        }
      ];
      service.initialize(colDefs);
      expect(service.getVisibleColumns().length).toBe(2);
      expect(service.getVisibleColumns()[0].field).toBe('name');
      expect(service.getVisibleColumns()[1].field).toBe('age');
    });

    it('should handle nested ColGroupDef', () => {
      const colDefs: (ColDef | ColGroupDef)[] = [
        {
          headerName: 'Level 1',
          children: [
            {
              headerName: 'Level 2',
              children: [
                { field: 'name', width: 150 },
              ]
            }
          ]
        }
      ];
      service.initialize(colDefs);
      expect(service.getVisibleColumns().length).toBe(1);
    });
  });

  describe('getColumnState', () => {
    it('should return state for column with field', () => {
      service.initialize([{ field: 'name', width: 150 }]);
      const state = service.getColumnState({ field: 'name' } as ColDef);
      expect(state).toBeTruthy();
      expect(state?.width).toBe(150);
    });

    it('should return state for column with colId', () => {
      service.initialize([{ colId: 'custom-id', width: 200 }]);
      const state = service.getColumnState({ colId: 'custom-id' } as ColDef);
      expect(state).toBeTruthy();
      expect(state?.width).toBe(200);
    });

    it('should return undefined for unknown column', () => {
      service.initialize([{ field: 'name' }]);
      const state = service.getColumnState({ field: 'unknown' } as ColDef);
      expect(state).toBeUndefined();
    });
  });

  describe('setColumnWidth', () => {
    it('should update column width', () => {
      service.initialize([{ field: 'name', width: 150 }]);
      service.setColumnWidth('name', 300);
      const state = service.getColumnState({ field: 'name' } as ColDef);
      expect(state?.width).toBe(300);
    });

    it('should enforce minimum column width', () => {
      service.initialize([{ field: 'name' }]);
      service.setColumnWidth('name', 50);
      const state = service.getColumnState({ field: 'name' } as ColDef);
      expect(state?.width).toBe(100);
    });
  });

  describe('setColumnHidden', () => {
    it('should hide column', () => {
      service.initialize([{ field: 'name' }, { field: 'age' }]);
      service.setColumnHidden('name', true);
      expect(service.getVisibleColumns().length).toBe(1);
      expect(service.getVisibleColumns()[0].field).toBe('age');
    });

    it('should show column after hiding', () => {
      service.initialize([{ field: 'name' }]);
      service.setColumnHidden('name', true);
      service.setColumnHidden('name', false);
      expect(service.getVisibleColumns().length).toBe(1);
    });
  });

  describe('setColumnPinned', () => {
    it('should pin column to left', () => {
      service.initialize([{ field: 'name' }]);
      service.setColumnPinned('name', 'left');
      expect(service.getLeftPinnedColumns().length).toBe(1);
      expect(service.getLeftPinnedColumns()[0].field).toBe('name');
    });

    it('should pin column to right', () => {
      service.initialize([{ field: 'name' }]);
      service.setColumnPinned('name', 'right');
      expect(service.getRightPinnedColumns().length).toBe(1);
    });

    it('should unpin column', () => {
      service.initialize([{ field: 'name' }]);
      service.setColumnPinned('name', 'left');
      service.setColumnPinned('name', null);
      expect(service.getLeftPinnedColumns().length).toBe(0);
    });
  });

  describe('getTotalWidth', () => {
    it('should calculate total width of visible columns', () => {
      service.initialize([
        { field: 'name', width: 150 },
        { field: 'age', width: 100 },
      ]);
      expect(service.getTotalWidth()).toBe(250);
    });

    it('should return 0 for no columns', () => {
      service.initialize([]);
      expect(service.getTotalWidth()).toBe(0);
    });
  });

  describe('resetColumnState', () => {
    it('should reset all column states to original', () => {
      service.initialize([{ field: 'name', width: 150 }]);
      service.setColumnWidth('name', 500);
      service.setColumnHidden('name', true);
      service.resetColumnState();
      const state = service.getColumnState({ field: 'name' } as ColDef);
      expect(state?.width).toBe(150);
      expect(state?.hide).toBe(false);
    });
  });

  describe('getColumn', () => {
    it('should find column by field', () => {
      service.initialize([{ field: 'name', width: 150 }]);
      const col = service.getColumn('name');
      expect(col).toBeTruthy();
      expect(col?.width).toBe(150);
    });

    it('should return undefined for unknown field', () => {
      service.initialize([{ field: 'name' }]);
      const col = service.getColumn('unknown');
      expect(col).toBeUndefined();
    });
  });

  describe('getVisibleIndex', () => {
    it('should return correct index for column', () => {
      service.initialize([
        { field: 'name' },
        { field: 'age' },
        { field: 'email' },
      ]);
      expect(service.getVisibleIndex('age')).toBe(1);
    });

    it('should return -1 for unknown column', () => {
      service.initialize([{ field: 'name' }]);
      expect(service.getVisibleIndex('unknown')).toBe(-1);
    });
  });

  describe('hasColumnGroups', () => {
    it('should return false for flat columns', () => {
      service.initialize([{ field: 'name' }]);
      expect(service.hasColumnGroups()).toBe(false);
    });

    it('should return true when ColGroupDef exists', () => {
      service.initialize([
        { headerName: 'Group', children: [{ field: 'name' }] }
      ]);
      expect(service.hasColumnGroups()).toBe(true);
    });
  });

  describe('getGroupDepth', () => {
    it('should return 1 for flat columns', () => {
      service.initialize([{ field: 'name' }]);
      expect(service.getGroupDepth()).toBe(1);
    });

    it('should return 2 for one level of groups', () => {
      service.initialize([
        { headerName: 'Group', children: [{ field: 'name' }] }
      ]);
      expect(service.getGroupDepth()).toBe(2);
    });

    it('should return 3 for nested groups', () => {
      service.initialize([
        {
          headerName: 'L1',
          children: [{
            headerName: 'L2',
            children: [{ field: 'name' }]
          }]
        }
      ]);
      expect(service.getGroupDepth()).toBe(3);
    });
  });

  describe('applyColumnState and getAllColumnState', () => {
    it('should save and restore column state', () => {
      service.initialize([{ field: 'name', width: 150 }]);
      service.setColumnWidth('name', 500);
      const saved = service.getAllColumnState();

      service.initialize([{ field: 'name', width: 150 }]);
      service.applyColumnState(saved);

      const state = service.getColumnState({ field: 'name' } as ColDef);
      expect(state?.width).toBe(500);
    });
  });
});
