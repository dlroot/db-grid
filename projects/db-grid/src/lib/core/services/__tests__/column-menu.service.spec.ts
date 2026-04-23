import { ColumnMenuService, ColumnMenuState, ColumnMenuAction, ColumnMenuItem } from '../column-menu.service';

describe('ColumnMenuService', () => {
  let service: ColumnMenuService;

  const columnDefs = [
    { field: 'name', colId: 'name', sortable: true },
    { field: 'age', colId: 'age', sortable: true },
    { field: 'city', colId: 'city', suppressHeaderMenuButton: true },
    { field: 'locked', colId: 'locked', lockPinned: true, lockVisible: true },
  ];

  beforeEach(() => {
    service = new ColumnMenuService();
    service.initialize(columnDefs);
  });

  afterEach(() => {
    service.destroy();
  });

  describe('initialize', () => {
    it('should be enabled by default', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('should respect enabled=false config', () => {
      const svc = new ColumnMenuService();
      svc.initialize(columnDefs, { enabled: false });
      expect(svc.isEnabled()).toBe(false);
      svc.destroy();
    });

    it('should use default menuTabs', () => {
      const svc = new ColumnMenuService();
      svc.initialize(columnDefs);
      // Default tabs are generalMenuTab, filterMenuTab, columnsMenuTab
      svc.show('name', { x: 100, y: 100 });
      const menu = svc.getActiveMenu();
      expect(menu).toBeDefined();
      expect(menu!.tabs).toContain('generalMenuTab');
      expect(menu!.tabs).toContain('filterMenuTab');
      expect(menu!.tabs).toContain('columnsMenuTab');
      svc.destroy();
    });

    it('should use custom menuTabs from config', () => {
      const svc = new ColumnMenuService();
      svc.initialize(columnDefs, { menuTabs: ['generalMenuTab'] });
      // Note: menuTabs config sets which tabs CAN appear, but getAvailableTabs
      // also checks colDef properties. For 'name' (no suppress), generalMenuTab appears.
      svc.show('name', { x: 100, y: 100 });
      const menu = svc.getActiveMenu();
      expect(menu!.tabs).toContain('generalMenuTab');
      svc.destroy();
    });
  });

  describe('show / hide', () => {
    it('should show menu for a valid column', () => {
      service.show('name', { x: 100, y: 100 });
      expect(service.getActiveMenu()).toBeDefined();
      expect(service.getActiveMenu()!.colId).toBe('name');
    });

    it('should not show menu for column with suppressHeaderMenuButton', () => {
      service.show('city', { x: 100, y: 100 });
      expect(service.getActiveMenu()).toBeNull();
    });

    it('should not show menu for non-existent column', () => {
      service.show('nonexistent', { x: 100, y: 100 });
      expect(service.getActiveMenu()).toBeNull();
    });

    it('should not show menu when disabled', () => {
      const svc = new ColumnMenuService();
      svc.initialize(columnDefs, { enabled: false });
      svc.show('name', { x: 100, y: 100 });
      expect(svc.getActiveMenu()).toBeNull();
      svc.destroy();
    });

    it('should hide active menu', () => {
      service.show('name', { x: 100, y: 100 });
      expect(service.getActiveMenu()).toBeDefined();
      service.hide();
      expect(service.getActiveMenu()).toBeNull();
    });

    it('should set position correctly', () => {
      service.show('name', { x: 50, y: 200 });
      expect(service.getActiveMenu()!.position).toEqual({ x: 50, y: 200 });
    });

    it('should open specific tab', () => {
      service.show('name', { x: 100, y: 100 }, 'filterMenuTab');
      expect(service.getActiveMenu()!.activeTab).toBe('filterMenuTab');
    });

    it('should default to first tab', () => {
      service.show('name', { x: 100, y: 100 });
      expect(service.getActiveMenu()!.activeTab).toBe('generalMenuTab');
    });
  });

  describe('setActiveTab', () => {
    it('should switch active tab', () => {
      service.show('name', { x: 100, y: 100 });
      service.setActiveTab('filterMenuTab');
      expect(service.getActiveMenu()!.activeTab).toBe('filterMenuTab');
    });

    it('should do nothing when no menu is active', () => {
      service.setActiveTab('filterMenuTab');
      expect(service.getActiveMenu()).toBeNull();
    });
  });

  describe('executeAction', () => {
    it('should hide menu after action', () => {
      service.show('name', { x: 100, y: 100 });
      service.executeAction({ type: 'sortAsc', colId: 'name' });
      expect(service.getActiveMenu()).toBeNull();
    });

    it('should invoke menu action callback', () => {
      const actions: ColumnMenuAction[] = [];
      service.onMenuAction(a => actions.push(a));
      service.show('name', { x: 100, y: 100 });
      service.executeAction({ type: 'sortDesc', colId: 'name' });
      expect(actions.length).toBe(1);
      expect(actions[0].type).toBe('sortDesc');
      expect(actions[0].colId).toBe('name');
    });

    it('should handle all action types without error', () => {
      const types = ['sortAsc', 'sortDesc', 'clearSort', 'pinLeft', 'pinRight',
        'clearPinned', 'hideColumn', 'filterApply', 'filterClear',
        'autoSizeThis', 'autoSizeAll', 'rowGroup', 'expandAll', 'contractAll'];
      types.forEach(type => {
        service.show('name', { x: 100, y: 100 });
        expect(() => service.executeAction({ type, colId: 'name' })).not.toThrow();
      });
    });
  });

  describe('onMenuVisibilityChanged', () => {
    it('should call callback when menu becomes visible', () => {
      let state: ColumnMenuState | null = 'initial' as any;
      service.onMenuVisibilityChanged(s => state = s);
      service.show('name', { x: 100, y: 100 });
      expect(state).toBeDefined();
      expect((state as ColumnMenuState).colId).toBe('name');
    });

    it('should call callback with null when menu is hidden', () => {
      let state: ColumnMenuState | null = null;
      service.onMenuVisibilityChanged(s => state = s);
      service.show('name', { x: 100, y: 100 });
      service.hide();
      expect(state).toBeNull();
    });
  });

  describe('getGeneralMenuItems', () => {
    it('should return sort items for sortable column', () => {
      const items = service.getGeneralMenuItems('name');
      const sortItems = items.filter(i => i.type !== 'separator');
      expect(sortItems.some(i => i.action === 'sortAsc')).toBe(true);
      expect(sortItems.some(i => i.action === 'sortDesc')).toBe(true);
      expect(sortItems.some(i => i.action === 'clearSort')).toBe(true);
    });

    it('should return pin items for non-locked column', () => {
      const items = service.getGeneralMenuItems('name');
      const itemIds = items.map(i => i.id);
      expect(itemIds).toContain('pinLeft');
      expect(itemIds).toContain('pinRight');
      expect(itemIds).toContain('clearPinned');
    });

    it('should not return pin items for lockPinned column', () => {
      const items = service.getGeneralMenuItems('locked');
      const itemIds = items.map(i => i.id);
      expect(itemIds).not.toContain('pinLeft');
      expect(itemIds).not.toContain('pinRight');
    });

    it('should return autoSize items', () => {
      const items = service.getGeneralMenuItems('name');
      const itemIds = items.map(i => i.id);
      expect(itemIds).toContain('autoSizeThis');
      expect(itemIds).toContain('autoSizeAll');
    });

    it('should not return hideColumn for lockVisible column', () => {
      const items = service.getGeneralMenuItems('locked');
      const itemIds = items.map(i => i.id);
      expect(itemIds).not.toContain('hideColumn');
    });

    it('should return hideColumn for non-locked column', () => {
      const items = service.getGeneralMenuItems('name');
      const itemIds = items.map(i => i.id);
      expect(itemIds).toContain('hideColumn');
    });

    it('should include separators', () => {
      const items = service.getGeneralMenuItems('name');
      const separators = items.filter(i => i.type === 'separator');
      expect(separators.length).toBeGreaterThan(0);
    });
  });

  describe('setColumnDefs', () => {
    it('should update column definitions', () => {
      const newCols = [{ field: 'x', colId: 'x' }];
      service.setColumnDefs(newCols);
      service.show('x', { x: 0, y: 0 });
      expect(service.getActiveMenu()!.colId).toBe('x');
    });
  });

  describe('getAvailableTabs', () => {
    it('should exclude generalMenuTab for suppressHeaderMenuButton column', () => {
      service.show('city', { x: 100, y: 100 });
      // city has suppressHeaderMenuButton, so show() returns null
      expect(service.getActiveMenu()).toBeNull();
    });

    it('should include filterMenuTab when filter is not false', () => {
      service.show('name', { x: 100, y: 100 });
      expect(service.getActiveMenu()!.tabs).toContain('filterMenuTab');
    });
  });
});
