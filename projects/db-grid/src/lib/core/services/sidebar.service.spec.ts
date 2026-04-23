import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SideBarService, SideBarConfig, ToolPanelInfo } from './sidebar.service';
import { ColDef } from '../models';

describe('SideBarService', () => {
  let service: SideBarService;

  beforeEach(() => {
    service = new SideBarService();
  });

  describe('initialize', () => {
    const columnDefs: ColDef[] = [
      { field: 'id' },
      { field: 'name', hide: true },
      { field: 'age' },
    ];

    it('should initialize with default panels', () => {
      service.initialize(columnDefs);
      const panels = service.getPanels();
      expect(panels.length).toBe(2);
      expect(panels[0].id).toBe('columns');
      expect(panels[1].id).toBe('filters');
    });

    it('should initialize with custom panels', () => {
      const config: SideBarConfig = {
        toolPanels: [
          { id: 'custom', label: 'Custom Panel' },
        ],
      };
      service.initialize(columnDefs, config);
      const panels = service.getPanels();
      expect(panels.length).toBe(1);
      expect(panels[0].id).toBe('custom');
    });

    it('should set defaultToolPanel as active', () => {
      const config: SideBarConfig = {
        defaultToolPanel: 'filters',
      };
      service.initialize(columnDefs, config);
      expect(service.getActivePanel()).toBe('filters');
    });

    it('should be visible when defaultToolPanel is set', () => {
      const config: SideBarConfig = {
        defaultToolPanel: 'columns',
      };
      service.initialize(columnDefs, config);
      expect(service.isVisible()).toBe(true);
    });

    it('should be visible when openByDefault is true', () => {
      const config: SideBarConfig = {
        openByDefault: true,
      };
      service.initialize(columnDefs, config);
      expect(service.isVisible()).toBe(true);
    });

    it('should be hidden when no default config', () => {
      service.initialize(columnDefs, {});
      expect(service.isVisible()).toBe(false);
    });

    it('should initialize column visibility from columnDefs', () => {
      service.initialize(columnDefs);
      expect(service.isColumnVisible('id')).toBe(true);
      expect(service.isColumnVisible('name')).toBe(false);
      expect(service.isColumnVisible('age')).toBe(true);
    });

    it('should initialize column order', () => {
      service.initialize(columnDefs);
      expect(service.getColumnOrder()).toEqual(['id', 'name', 'age']);
    });

    it('should handle colId when field is not present', () => {
      const cols: ColDef[] = [{ colId: 'col1' }];
      service.initialize(cols);
      expect(service.isColumnVisible('col1')).toBe(true);
    });
  });

  describe('show / hide / toggle', () => {
    const columnDefs: ColDef[] = [{ field: 'id' }];

    beforeEach(() => {
      service.initialize(columnDefs);
    });

    it('should show sidebar', () => {
      service.show();
      expect(service.isVisible()).toBe(true);
    });

    it('should show sidebar with specific panel', () => {
      service.show('filters');
      expect(service.isVisible()).toBe(true);
      expect(service.getActivePanel()).toBe('filters');
    });

    it('should hide sidebar', () => {
      service.show();
      service.hide();
      expect(service.isVisible()).toBe(false);
    });

    it('should toggle sidebar visibility', () => {
      expect(service.isVisible()).toBe(false);
      service.toggle();
      expect(service.isVisible()).toBe(true);
      service.toggle();
      expect(service.isVisible()).toBe(false);
    });

    it('should set first panel as active when showing without panelId', () => {
      service.show();
      expect(service.getActivePanel()).toBe('columns');
    });
  });

  describe('setActivePanel', () => {
    const columnDefs: ColDef[] = [{ field: 'id' }];

    beforeEach(() => {
      service.initialize(columnDefs);
    });

    it('should change active panel', () => {
      service.setActivePanel('filters');
      expect(service.getActivePanel()).toBe('filters');
    });

    it('should show sidebar when setting panel', () => {
      service.hide();
      service.setActivePanel('columns');
      expect(service.isVisible()).toBe(true);
    });

    it('should emit panel changed event', () => {
      const callback = vi.fn();
      service.onPanelChangedEvent(callback);
      service.setActivePanel('filters');
      expect(callback).toHaveBeenCalledWith('filters');
    });
  });

  describe('getPanels', () => {
    it('should return copy of panels array', () => {
      service.initialize([{ field: 'id' }]);
      const panels1 = service.getPanels();
      const panels2 = service.getPanels();
      expect(panels1).not.toBe(panels2);
      expect(panels1).toEqual(panels2);
    });
  });

  describe('addPanel', () => {
    beforeEach(() => {
      service.initialize([{ field: 'id' }]);
    });

    it('should add new panel', () => {
      const panel: ToolPanelInfo = { id: 'custom', label: 'Custom' };
      service.addPanel(panel);
      const panels = service.getPanels();
      expect(panels.find(p => p.id === 'custom')).toBeTruthy();
    });

    it('should not add duplicate panel', () => {
      const panel: ToolPanelInfo = { id: 'columns', label: 'Columns' };
      service.addPanel(panel);
      const panels = service.getPanels();
      const columnPanels = panels.filter(p => p.id === 'columns');
      expect(columnPanels.length).toBe(1);
    });
  });

  describe('removePanel', () => {
    beforeEach(() => {
      service.initialize([{ field: 'id' }]);
    });

    it('should remove panel', () => {
      service.removePanel('filters');
      const panels = service.getPanels();
      expect(panels.find(p => p.id === 'filters')).toBeFalsy();
    });

    it('should reset activePanelId when removing active panel', () => {
      service.setActivePanel('filters');
      service.removePanel('filters');
      expect(service.getActivePanel()).toBe('columns');
    });

    it('should handle removing last panel', () => {
      service.removePanel('columns');
      service.removePanel('filters');
      expect(service.getActivePanel()).toBeNull();
    });
  });

  describe('column visibility', () => {
    const columnDefs: ColDef[] = [
      { field: 'id' },
      { field: 'name', hide: true },
      { field: 'age' },
    ];

    beforeEach(() => {
      service.initialize(columnDefs);
    });

    it('isColumnVisible should return correct visibility', () => {
      expect(service.isColumnVisible('id')).toBe(true);
      expect(service.isColumnVisible('name')).toBe(false);
      expect(service.isColumnVisible('age')).toBe(true);
    });

    it('isColumnVisible should return true for unknown columns', () => {
      expect(service.isColumnVisible('unknown')).toBe(true);
    });

    it('setColumnVisible should change visibility', () => {
      service.setColumnVisible('id', false);
      expect(service.isColumnVisible('id')).toBe(false);
    });

    it('setColumnVisible should emit event', () => {
      const callback = vi.fn();
      service.onColumnVisibilityChangedEvent(callback);
      service.setColumnVisible('id', false);
      expect(callback).toHaveBeenCalledWith([{ colId: 'id', visible: false }]);
    });

    it('setColumnsVisibility should batch change visibility', () => {
      service.setColumnsVisibility([
        { colId: 'id', visible: false },
        { colId: 'name', visible: true },
      ]);
      expect(service.isColumnVisible('id')).toBe(false);
      expect(service.isColumnVisible('name')).toBe(true);
    });

    it('showAllColumns should make all columns visible', () => {
      service.setColumnVisible('id', false);
      service.showAllColumns();
      expect(service.isColumnVisible('id')).toBe(true);
      expect(service.isColumnVisible('name')).toBe(true);
      expect(service.isColumnVisible('age')).toBe(true);
    });
  });

  describe('getColumnOrder', () => {
    it('should return copy of column order', () => {
      service.initialize([{ field: 'id' }, { field: 'name' }]);
      const order1 = service.getColumnOrder();
      const order2 = service.getColumnOrder();
      expect(order1).not.toBe(order2);
      expect(order1).toEqual(order2);
    });
  });

  describe('moveColumnInPanel', () => {
    beforeEach(() => {
      service.initialize([{ field: 'id' }, { field: 'name' }, { field: 'age' }]);
    });

    it('should move column to new position', () => {
      service.moveColumnInPanel(0, 2);
      expect(service.getColumnOrder()).toEqual(['name', 'age', 'id']);
    });

    it('should handle moving to same position', () => {
      service.moveColumnInPanel(1, 1);
      expect(service.getColumnOrder()).toEqual(['id', 'name', 'age']);
    });
  });

  describe('column groups', () => {
    it('should build column groups from columnDefs', () => {
      const columnDefs: ColDef[] = [
        {
          headerName: 'Personal',
          children: [
            { field: 'name' },
            { field: 'age' },
          ],
        } as any,
        { field: 'id' },
      ];
      service.initialize(columnDefs);
      const groups = service.getColumnGroups();
      expect(groups.get('Personal')).toEqual(['name', 'age']);
    });

    it('should handle empty children', () => {
      const columnDefs: ColDef[] = [
        {
          headerName: 'Empty',
          children: [],
        } as any,
      ];
      service.initialize(columnDefs);
      const groups = service.getColumnGroups();
      expect(groups.has('Empty')).toBe(false);
    });
  });

  describe('getActiveFilters', () => {
    it('should return columns with active filters', () => {
      const columnDefs: ColDef[] = [
        { field: 'id' },
        { field: 'name', filterActive: true, filterParams: { type: 'text' } },
        { field: 'age', filterActive: true, filterParams: { type: 'number' } },
      ];
      service.initialize(columnDefs);
      const filters = service.getActiveFilters(columnDefs);
      expect(filters.length).toBe(2);
      expect(filters[0].colId).toBe('name');
      expect(filters[1].colId).toBe('age');
    });

    it('should return empty array when no active filters', () => {
      const columnDefs: ColDef[] = [{ field: 'id' }];
      service.initialize(columnDefs);
      const filters = service.getActiveFilters(columnDefs);
      expect(filters).toEqual([]);
    });
  });

  describe('events', () => {
    beforeEach(() => {
      service.initialize([{ field: 'id' }]);
    });

    it('should emit visibility changed on show', () => {
      const callback = vi.fn();
      service.onSideBarVisibilityChanged(callback);
      service.show();
      expect(callback).toHaveBeenCalledWith(true);
    });

    it('should emit visibility changed on hide', () => {
      const callback = vi.fn();
      service.onSideBarVisibilityChanged(callback);
      service.show();
      service.hide();
      expect(callback).toHaveBeenLastCalledWith(false);
    });
  });

  describe('destroy', () => {
    it('should clear all data', () => {
      service.initialize([
        { field: 'id' },
        { field: 'name', hide: true },
      ]);
      service.show();
      service.destroy();
      expect(service.getColumnOrder()).toEqual([]);
      expect(service.getPanels()).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty columnDefs', () => {
      service.initialize([]);
      expect(service.getColumnOrder()).toEqual([]);
      expect(service.getPanels().length).toBe(2);
    });

    it('should handle columnDefs without field or colId', () => {
      service.initialize([{}]);
      expect(service.getColumnOrder()).toEqual(['']);
    });

    it('should handle show when no panels exist', () => {
      service.initialize([], { toolPanels: [] });
      service.show();
      expect(service.getActivePanel()).toBeNull();
    });

    it('should handle multiple initialize calls', () => {
      service.initialize([{ field: 'id' }]);
      service.show();
      service.initialize([{ field: 'name' }]);
      expect(service.isVisible()).toBe(false);
      expect(service.getColumnOrder()).toEqual(['name']);
    });
  });
});
