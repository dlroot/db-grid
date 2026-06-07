// @ts-nocheck
/// <reference types='vitest' />
import { describe, it, expect, beforeEach } from 'vitest';
import { SideBarService, SideBarConfig, ToolPanelInfo } from '../sidebar.service';
import { ColDef } from '../models';

describe('SideBarService', () => {
  let service: SideBarService;

  const mockColumnDefs: ColDef[] = [
    { field: 'id', headerName: 'ID' },
    { field: 'name', headerName: 'Name' },
    { field: 'age', headerName: 'Age', hide: true },
  ];

  beforeEach(() => {
    service = new SideBarService();
    service.initialize(mockColumnDefs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with default panels', () => {
      const panels = service.getPanels();
      expect(panels.length).toBeGreaterThan(0);
    });

    it('should accept custom config', () => {
      const config: SideBarConfig = {
        toolPanels: [
          { id: 'custom', label: 'Custom', icon: '🔧', default: true }
        ],
        defaultToolPanel: 'custom',
        openByDefault: true
      };
      service.initialize(mockColumnDefs, config);
      expect(service.isVisible()).toBe(true);
      expect(service.getActivePanel()).toBe('custom');
    });
  });

  describe('Show/Hide', () => {
    it('should show sidebar', () => {
      service.show();
      expect(service.isVisible()).toBe(true);
    });

    it('should hide sidebar', () => {
      service.show();
      service.hide();
      expect(service.isVisible()).toBe(false);
    });

    it('should toggle sidebar', () => {
      service.hide();
      service.toggle();
      expect(service.isVisible()).toBe(true);
      service.toggle();
      expect(service.isVisible()).toBe(false);
    });

    it('should show with specific panel', () => {
      service.show('columns');
      expect(service.getActivePanel()).toBe('columns');
    });
  });

  describe('Panel Management', () => {
    it('should get active panel', () => {
      service.show();
      expect(service.getActivePanel()).toBeDefined();
    });

    it('should set active panel', () => {
      service.setActivePanel('filters');
      expect(service.getActivePanel()).toBe('filters');
      expect(service.isVisible()).toBe(true);
    });

    it('should get all panels', () => {
      const panels = service.getPanels();
      expect(panels).toHaveLength(2); // default panels
    });

    it('should add custom panel', () => {
      const newPanel: ToolPanelInfo = {
        id: 'stats',
        label: 'Statistics',
        icon: '📊'
      };
      service.addPanel(newPanel);
      const panels = service.getPanels();
      expect(panels.find(p => p.id === 'stats')).toBeDefined();
    });

    it('should not add duplicate panel', () => {
      const panel: ToolPanelInfo = { id: 'columns', label: 'Columns' };
      const initialLen = service.getPanels().length;
      service.addPanel(panel);
      expect(service.getPanels().length).toBe(initialLen);
    });

    it('should remove panel', () => {
      service.removePanel('filters');
      expect(service.getPanels().find(p => p.id === 'filters')).toBeUndefined();
    });
  });

  describe('Column Visibility', () => {
    it('should get column visibility', () => {
      expect(service.isColumnVisible('id')).toBe(true);
      expect(service.isColumnVisible('age')).toBe(false);
    });

    it('should set column visibility', () => {
      service.setColumnVisible('age', true);
      expect(service.isColumnVisible('age')).toBe(true);
    });

    it('should handle unknown column', () => {
      expect(service.isColumnVisible('unknown')).toBe(true); // defaults to true
    });

    it('should batch set column visibility', () => {
      service.setColumnsVisibility([
        { colId: 'id', visible: false },
        { colId: 'name', visible: false }
      ]);
      expect(service.isColumnVisible('id')).toBe(false);
      expect(service.isColumnVisible('name')).toBe(false);
    });

    it('should show all columns', () => {
      service.setColumnsVisibility([
        { colId: 'id', visible: false },
        { colId: 'name', visible: false }
      ]);
      service.showAllColumns();
      expect(service.isColumnVisible('id')).toBe(true);
      expect(service.isColumnVisible('name')).toBe(true);
    });
  });

  describe('Column Order', () => {
    it('should get column order', () => {
      const order = service.getColumnOrder();
      expect(order).toContain('id');
      expect(order).toContain('name');
    });

    it('should move column in panel', () => {
      service.moveColumnInPanel(0, 2);
      const order = service.getColumnOrder();
      expect(order).toBeDefined();
    });
  });

  describe('Column Groups', () => {
    it('should get column groups', () => {
      const groups = service.getColumnGroups();
      expect(groups).toBeInstanceOf(Map);
    });

    it('should build groups from grouped columns', () => {
      const groupedDefs: ColDef[] = [
        {
          headerName: 'Person Info',
          children: [
            { field: 'firstName', headerName: 'First Name' },
            { field: 'lastName', headerName: 'Last Name' },
          ],
        },
      ];
      service.initialize(groupedDefs);
      const groups = service.getColumnGroups();
      expect(groups.size).toBe(1);
    });
  });

  describe('Active Filters', () => {
    it('should get active filters', () => {
      const filters = service.getActiveFilters(mockColumnDefs);
      expect(filters).toEqual([]);
    });
  });

  describe('Destroy', () => {
    it('should cleanup on destroy', () => {
      service.destroy();
      expect(service.getColumnOrder()).toEqual([]);
    });
  });
});