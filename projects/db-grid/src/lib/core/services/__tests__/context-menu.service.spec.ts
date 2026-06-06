/// <reference types='vitest' />
import { describe, it, expect, beforeEach } from 'vitest';
import { ContextMenuService, MenuItem, MenuActionParams, ContextMenuState } from '../context-menu.service';

describe('ContextMenuService', () => {
  let service: ContextMenuService;

  beforeEach(() => {
    service = new ContextMenuService();
    service.initialize();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Menu Initialization', () => {
    it('should initialize with menu items', () => {
      const items: MenuItem[] = [{ id: 'test', label: 'Test' }];
      service.initialize(items);
      expect(service.getMenuItems()).toHaveLength(1);
    });
  });

  describe('Menu Items Management', () => {
    it('should set menu items', () => {
      const items: MenuItem[] = [
        { id: 'copy', label: 'Copy', icon: '📋' },
        { id: 'paste', label: 'Paste', icon: '📝' },
      ];
      service.setMenuItems(items);
      expect(service.getMenuItems()).toHaveLength(2);
    });

    it('should add menu item', () => {
      service.addMenuItem({ id: 'new', label: 'New Item' });
      expect(service.getMenuItems()).toHaveLength(1);
    });

    it('should add menu item at position', () => {
      service.setMenuItems([
        { id: 'a', label: 'A' },
        { id: 'c', label: 'C' },
      ]);
      service.addMenuItem({ id: 'b', label: 'B' }, 1);
      const items = service.getMenuItems();
      expect(items[1].id).toBe('b');
    });

    it('should remove menu item', () => {
      service.setMenuItems([
        { id: 'keep', label: 'Keep' },
        { id: 'remove', label: 'Remove' },
      ]);
      service.removeMenuItem('remove');
      expect(service.getMenuItems()).toHaveLength(1);
      expect(service.getMenuItems()[0].id).toBe('keep');
    });

    it('should update menu item', () => {
      service.setMenuItems([{ id: 'item', label: 'Original' }]);
      service.updateMenuItem('item', { label: 'Updated' });
      expect(service.getMenuItems()[0].label).toBe('Updated');
    });
  });

  describe('Show/Hide Menu', () => {
    it('should show menu', () => {
      const context: MenuActionParams = { menuItemId: '', rowData: { id: 1 } };
      service.show({ x: 100, y: 200 }, context);
      expect(service.isVisible()).toBe(true);
      
      const state = service.getCurrentState();
      expect(state.isVisible).toBe(true);
      expect(state.position).toEqual({ x: 100, y: 200 });
      expect(state.context.rowData).toEqual({ id: 1 });
    });

    it('should hide menu', () => {
      const context: MenuActionParams = { menuItemId: '', rowData: { id: 1 } };
      service.show({ x: 100, y: 200 }, context);
      service.hide();
      expect(service.isVisible()).toBe(false);
    });

    it('should clear context on hide', () => {
      const context: MenuActionParams = { menuItemId: '', rowData: { id: 1 }, rowIndex: 0 };
      service.show({ x: 100, y: 200 }, context);
      service.hide();
      const state = service.getCurrentState();
      expect(state.context.rowData).toBeUndefined();
    });
  });

  describe('Menu Item Click', () => {
    it('should trigger menu item action', () => {
      let triggered = false;
      let receivedParams: MenuActionParams | null = null;
      
      const items: MenuItem[] = [
        { 
          id: 'action', 
          label: 'Action',
          action: (params) => { 
            triggered = true;
            receivedParams = params;
          }
        },
      ];
      service.setMenuItems(items);
      
      service.triggerMenuItem({ menuItemId: 'action', rowData: { val: 42 }, rowIndex: 5 });
      
      expect(triggered).toBe(true);
      expect(receivedParams?.rowData?.val).toBe(42);
    });

    it('should not trigger disabled item', () => {
      let triggered = false;
      service.setMenuItems([
        { id: 'disabled', label: 'Disabled', disabled: true, action: () => { triggered = true; } }
      ]);
      
      service.triggerMenuItem({ menuItemId: 'disabled' });
      expect(triggered).toBe(false);
    });

    it('should publish menu item click event', () => {
      let clicked = false;
      service.onMenuItemClicked(() => { clicked = true; });
      service.triggerMenuItem({ menuItemId: 'test' });
      expect(clicked).toBe(true);
    });
  });

  describe('Default Menus', () => {
    it('should get grid default menu items', () => {
      const items = service.getDefaultMenuItems('grid');
      expect(items.length).toBeGreaterThan(0);
      expect(items.find(i => i.id === 'export-csv')).toBeDefined();
    });

    it('should get row default menu items', () => {
      const items = service.getDefaultMenuItems('row');
      expect(items.find(i => i.id === 'copy-row')).toBeDefined();
      expect(items.find(i => i.id === 'delete-row')).toBeDefined();
    });

    it('should get cell default menu items', () => {
      const items = service.getDefaultMenuItems('cell');
      expect(items.find(i => i.id === 'copy-cell')).toBeDefined();
    });

    it('should get column default menu items', () => {
      const items = service.getDefaultMenuItems('column');
      expect(items.find(i => i.id === 'sort-asc')).toBeDefined();
      expect(items.find(i => i.id === 'pin-left')).toBeDefined();
    });
  });

  describe('State Observable', () => {
    it('should provide state observable', () => {
      const obs = service.getState();
      expect(obs).toBeDefined();
    });

    it('should emit state changes', async () => {
      const promise = new Promise<void>((resolve) => {
        service.getState().subscribe((state: ContextMenuState) => {
          if (state.isVisible) {
            resolve();
          }
        });
      });
      service.show({ x: 0, y: 0 }, { menuItemId: '' });
      await promise;
    });
  });

  describe('Destroy', () => {
    it('should clean up resources', () => {
      service.show({ x: 100, y: 200 }, { menuItemId: '', rowData: {} });
      service.destroy();
      expect(service.isVisible()).toBe(false);
    });
  });
});