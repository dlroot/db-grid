import { ContextMenuService, MenuItem, MenuActionParams } from '../context-menu.service';

describe('ContextMenuService', () => {
  let service: ContextMenuService;

  beforeEach(() => {
    service = new ContextMenuService();
    service.initialize();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('initialize', () => {
    it('should accept initial menu items', () => {
      const items: MenuItem[] = [
        { id: 'copy', label: 'Copy', action: () => {} },
      ];
      const svc = new ContextMenuService();
      svc.initialize(items);
      expect(svc.getMenuItems().length).toBe(1);
      svc.destroy();
    });
  });

  describe('addMenuItem / removeMenuItem', () => {
    it('should add a menu item', () => {
      service.addMenuItem({ id: 'copy', label: 'Copy', action: () => {} });
      const items = service.getMenuItems();
      expect(items.some(i => i.id === 'copy')).toBe(true);
    });

    it('should add menu item at specific position', () => {
      service.addMenuItem({ id: 'first', label: 'First', action: () => {} });
      service.addMenuItem({ id: 'second', label: 'Second', action: () => {} }, 0);
      const items = service.getMenuItems();
      expect(items[0].id).toBe('second');
    });

    it('should remove a menu item by id', () => {
      service.addMenuItem({ id: 'copy', label: 'Copy', action: () => {} });
      service.removeMenuItem('copy');
      const items = service.getMenuItems();
      expect(items.some(i => i.id === 'copy')).toBe(false);
    });

    it('should handle removing non-existent item', () => {
      expect(() => service.removeMenuItem('nonexistent')).not.toThrow();
    });

    it('should add separator item', () => {
      service.addMenuItem({ id: 'sep1', label: '', separator: true });
      const items = service.getMenuItems();
      expect(items.some(i => i.separator === true)).toBe(true);
    });
  });

  describe('updateMenuItem', () => {
    it('should update existing menu item properties', () => {
      service.addMenuItem({ id: 'copy', label: 'Copy', action: () => {} });
      service.updateMenuItem('copy', { label: 'Copy Cell', disabled: true });
      const items = service.getMenuItems();
      const item = items.find(i => i.id === 'copy');
      expect(item!.label).toBe('Copy Cell');
      expect(item!.disabled).toBe(true);
    });

    it('should do nothing for non-existent item', () => {
      expect(() => service.updateMenuItem('nonexistent', { label: 'X' })).not.toThrow();
    });
  });

  describe('setMenuItems', () => {
    it('should replace all menu items', () => {
      service.addMenuItem({ id: 'old', label: 'Old', action: () => {} });
      service.setMenuItems([{ id: 'new', label: 'New', action: () => {} }]);
      const items = service.getMenuItems();
      expect(items.length).toBe(1);
      expect(items[0].id).toBe('new');
    });
  });

  describe('show / hide', () => {
    it('should show context menu at position', () => {
      service.show({ x: 100, y: 200 }, { menuItemId: 'test' });
      expect(service.isVisible()).toBe(true);
      const state = service.getCurrentState();
      expect(state.position).toEqual({ x: 100, y: 200 });
    });

    it('should hide context menu', () => {
      service.show({ x: 100, y: 200 }, { menuItemId: 'test' });
      service.hide();
      expect(service.isVisible()).toBe(false);
    });

    it('should store context info on show', () => {
      service.show({ x: 0, y: 0 }, {
        menuItemId: 'test',
        rowData: { name: 'Alice' },
        rowIndex: 5,
      });
      const state = service.getCurrentState();
      expect(state.context.rowData).toEqual({ name: 'Alice' });
      expect(state.context.rowIndex).toBe(5);
    });
  });

  describe('triggerMenuItem', () => {
    it('should invoke action callback on menu item', () => {
      let actionCalled = false;
      service.addMenuItem({
        id: 'copy',
        label: 'Copy',
        action: () => { actionCalled = true; },
      });
      service.triggerMenuItem({ menuItemId: 'copy' });
      expect(actionCalled).toBe(true);
    });

    it('should hide menu after trigger', () => {
      service.addMenuItem({ id: 'copy', label: 'Copy', action: () => {} });
      service.show({ x: 0, y: 0 }, { menuItemId: 'copy' });
      service.triggerMenuItem({ menuItemId: 'copy' });
      expect(service.isVisible()).toBe(false);
    });

    it('should not invoke action for disabled item', () => {
      let actionCalled = false;
      service.addMenuItem({
        id: 'copy',
        label: 'Copy',
        disabled: true,
        action: () => { actionCalled = true; },
      });
      service.triggerMenuItem({ menuItemId: 'copy' });
      expect(actionCalled).toBe(false);
    });

    it('should still emit to onMenuItemClicked for disabled item', () => {
      let clicked = false;
      service.addMenuItem({ id: 'copy', label: 'Copy', disabled: true, action: () => {} });
      service.onMenuItemClicked(() => { clicked = true; });
      service.triggerMenuItem({ menuItemId: 'copy' });
      expect(clicked).toBe(true);
    });

    it('should pass params to action', () => {
      let receivedParams: MenuActionParams | null = null;
      service.addMenuItem({
        id: 'copy',
        label: 'Copy',
        action: (p) => { receivedParams = p; },
      });
      service.triggerMenuItem({ menuItemId: 'copy', rowIndex: 3 });
      expect(receivedParams!.menuItemId).toBe('copy');
      expect(receivedParams!.rowIndex).toBe(3);
    });
  });

  describe('onMenuItemClicked', () => {
    it('should register callback for any menu item click', () => {
      const clicks: MenuActionParams[] = [];
      service.addMenuItem({ id: 'a', label: 'A', action: () => {} });
      service.onMenuItemClicked(p => clicks.push(p));
      service.triggerMenuItem({ menuItemId: 'a' });
      expect(clicks.length).toBe(1);
      expect(clicks[0].menuItemId).toBe('a');
    });
  });

  describe('getState / getCurrentState', () => {
    it('should return observable state', () => {
      const states: any[] = [];
      service.getState().subscribe(s => states.push(s));
      service.show({ x: 10, y: 20 }, { menuItemId: 'test' });
      expect(states.length).toBeGreaterThanOrEqual(1);
    });

    it('should return current state snapshot', () => {
      service.show({ x: 10, y: 20 }, { menuItemId: 'test' });
      const state = service.getCurrentState();
      expect(state.isVisible).toBe(true);
    });
  });

  describe('getDefaultMenuItems', () => {
    it('should return grid context items', () => {
      const items = service.getDefaultMenuItems('grid');
      expect(items.length).toBeGreaterThan(0);
      expect(items.some(i => i.id === 'export-csv')).toBe(true);
    });

    it('should return row context items', () => {
      const items = service.getDefaultMenuItems('row');
      expect(items.some(i => i.id === 'copy-row')).toBe(true);
    });

    it('should return cell context items', () => {
      const items = service.getDefaultMenuItems('cell');
      expect(items.some(i => i.id === 'copy-cell')).toBe(true);
    });

    it('should return column context items', () => {
      const items = service.getDefaultMenuItems('column');
      expect(items.some(i => i.id === 'sort-asc')).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should complete subjects', () => {
      service.destroy();
      // After destroy, getCurrentState should still return last value
      expect(service.getCurrentState().isVisible).toBe(false);
    });
  });
});
