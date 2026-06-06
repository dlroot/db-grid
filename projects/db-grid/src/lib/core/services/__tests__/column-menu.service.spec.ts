/// <reference types='vitest' />
import { describe, it, expect, beforeEach } from 'vitest';
import { ColumnMenuService, ColumnMenuConfig, ColumnMenuState, ColumnMenuItem } from '../column-menu.service';

describe('ColumnMenuService', () => {
  let service: ColumnMenuService;

  const mockColumnDefs = [
    { field: 'name', headerName: 'Name', sortable: true },
    { field: 'age', headerName: 'Age', lockPinned: false },
    { field: 'email', headerName: 'Email', suppressHeaderMenuButton: false },
  ];

  beforeEach(() => {
    service = new ColumnMenuService();
    service.initialize(mockColumnDefs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with column defs', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('should accept custom config', () => {
      const config: ColumnMenuConfig = { enabled: false, menuTabs: ['generalMenuTab'] };
      service.initialize(mockColumnDefs, config);
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('Show/Hide Menu', () => {
    it('should show column menu', () => {
      service.show('name', { x: 100, y: 200 });
      const state = service.getActiveMenu();
      expect(state).not.toBeNull();
      expect(state?.colId).toBe('name');
      expect(state?.position).toEqual({ x: 100, y: 200 });
    });

    it('should not show when disabled', () => {
      service.initialize(mockColumnDefs, { enabled: false });
      service.show('name', { x: 100, y: 200 });
      expect(service.getActiveMenu()).toBeNull();
    });

    it('should hide column menu', () => {
      service.show('name', { x: 100, y: 200 });
      service.hide();
      expect(service.getActiveMenu()).toBeNull();
    });

    it('should not show for suppressed column', () => {
      service.initialize([{ field: 'hidden', suppressHeaderMenuButton: true } as any]);
      service.show('hidden', { x: 100, y: 200 });
      expect(service.getActiveMenu()).toBeNull();
    });
  });

  describe('Menu Tabs', () => {
    it('should set active tab', () => {
      service.show('name', { x: 100, y: 200 });
      service.setActiveTab('filterMenuTab');
      const state = service.getActiveMenu();
      expect(state?.activeTab).toBe('filterMenuTab');
    });
  });

  describe('Menu Items', () => {
    it('should get general menu items for column', () => {
      const items = service.getGeneralMenuItems('name');
      expect(items.length).toBeGreaterThan(0);
      expect(items.find(i => i.id === 'sortAsc')).toBeDefined();
      expect(items.find(i => i.id === 'sortDesc')).toBeDefined();
      expect(items.find(i => i.id === 'clearSort')).toBeDefined();
    });

    it('should include pin options when not locked', () => {
      const items = service.getGeneralMenuItems('age');
      expect(items.find(i => i.id === 'pinLeft')).toBeDefined();
      expect(items.find(i => i.id === 'pinRight')).toBeDefined();
    });

    it('should include auto size options', () => {
      const items = service.getGeneralMenuItems('name');
      expect(items.find(i => i.id === 'autoSizeThis')).toBeDefined();
      expect(items.find(i => i.id === 'autoSizeAll')).toBeDefined();
    });

    it('should include hide option when not locked visible', () => {
      const items = service.getGeneralMenuItems('name');
      expect(items.find(i => i.id === 'hideColumn')).toBeDefined();
    });
  });

  describe('Actions', () => {
    it('should execute menu action', () => {
      let actionExecuted = false;
      service.onMenuAction((action) => {
        actionExecuted = true;
        expect(action.type).toBe('sortAsc');
      });
      service.show('name', { x: 100, y: 200 });
      service.executeAction({ type: 'sortAsc', colId: 'name' });
      expect(actionExecuted).toBe(true);
      expect(service.getActiveMenu()).toBeNull(); // hides after action
    });
  });

  describe('Callbacks', () => {
    it('should register visibility callback', () => {
      let visibleState: ColumnMenuState | null = null;
      service.onMenuVisibilityChanged((state) => {
        visibleState = state;
      });
      service.show('name', { x: 100, y: 200 });
      expect(visibleState).not.toBeNull();
    });
  });

  describe('Destroy', () => {
    it('should clean up on destroy', () => {
      service.show('name', { x: 100, y: 200 });
      service.destroy();
      expect(service.getActiveMenu()).toBeNull();
    });
  });
});