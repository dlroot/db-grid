import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ColumnPinningService, PinConfig } from './pinning.service';
import { ColDef } from '../models';

describe('ColumnPinningService', () => {
  let service: ColumnPinningService;

  beforeEach(() => {
    service = new ColumnPinningService();
  });

  describe('initialize', () => {
    it('should initialize with empty sets', () => {
      const columns: ColDef[] = [];
      service.initialize(columns);
      expect(service.getPinnedLeftIds()).toEqual([]);
      expect(service.getPinnedRightIds()).toEqual([]);
    });

    it('should read pinnedLeft from column definitions', () => {
      const columns: ColDef[] = [
        { field: 'id', pinnedLeft: true },
        { field: 'name' },
        { field: 'age' },
      ];
      service.initialize(columns);
      expect(service.isPinnedLeft('id')).toBe(true);
      expect(service.getPinnedLeftIds()).toEqual(['id']);
    });

    it('should read pinnedRight from column definitions', () => {
      const columns: ColDef[] = [
        { field: 'id' },
        { field: 'name' },
        { field: 'actions', pinnedRight: true },
      ];
      service.initialize(columns);
      expect(service.isPinnedRight('actions')).toBe(true);
      expect(service.getPinnedRightIds()).toEqual(['actions']);
    });

    it('should read both pinnedLeft and pinnedRight', () => {
      const columns: ColDef[] = [
        { field: 'id', pinnedLeft: true },
        { field: 'name' },
        { field: 'actions', pinnedRight: true },
      ];
      service.initialize(columns);
      expect(service.getPinnedLeftIds()).toEqual(['id']);
      expect(service.getPinnedRightIds()).toEqual(['actions']);
    });

    it('should use colId when field is not present', () => {
      const columns: ColDef[] = [
        { colId: 'col1', pinnedLeft: true },
      ];
      service.initialize(columns);
      expect(service.isPinnedLeft('col1')).toBe(true);
    });

    it('should prefer colId over field', () => {
      const columns: ColDef[] = [
        { field: 'name', colId: 'userName', pinnedLeft: true },
      ];
      service.initialize(columns);
      expect(service.isPinnedLeft('userName')).toBe(true);
      expect(service.isPinnedLeft('name')).toBe(false);
    });

    it('should read from config', () => {
      const columns: ColDef[] = [
        { field: 'id' },
        { field: 'name' },
        { field: 'age' },
      ];
      const config: PinConfig = {
        pinnedLeftColumns: ['id'],
        pinnedRightColumns: ['age'],
      };
      service.initialize(columns, config);
      expect(service.isPinnedLeft('id')).toBe(true);
      expect(service.isPinnedRight('age')).toBe(true);
    });

    it('should merge column defs and config', () => {
      const columns: ColDef[] = [
        { field: 'id', pinnedLeft: true },
        { field: 'name' },
      ];
      const config: PinConfig = {
        pinnedRightColumns: ['name'],
      };
      service.initialize(columns, config);
      expect(service.isPinnedLeft('id')).toBe(true);
      expect(service.isPinnedRight('name')).toBe(true);
    });

    it('should clear previous state on reinitialize', () => {
      const columns1: ColDef[] = [
        { field: 'id', pinnedLeft: true },
      ];
      service.initialize(columns1);
      expect(service.isPinnedLeft('id')).toBe(true);

      const columns2: ColDef[] = [
        { field: 'name', pinnedRight: true },
      ];
      service.initialize(columns2);
      expect(service.isPinnedLeft('id')).toBe(false);
      expect(service.isPinnedRight('name')).toBe(true);
    });
  });

  describe('isPinnedLeft / isPinnedRight / isPinned', () => {
    beforeEach(() => {
      const columns: ColDef[] = [
        { field: 'id', pinnedLeft: true },
        { field: 'name' },
        { field: 'actions', pinnedRight: true },
      ];
      service.initialize(columns);
    });

    it('isPinnedLeft should return true for left-pinned columns', () => {
      expect(service.isPinnedLeft('id')).toBe(true);
      expect(service.isPinnedLeft('name')).toBe(false);
      expect(service.isPinnedLeft('actions')).toBe(false);
    });

    it('isPinnedRight should return true for right-pinned columns', () => {
      expect(service.isPinnedRight('actions')).toBe(true);
      expect(service.isPinnedRight('name')).toBe(false);
      expect(service.isPinnedRight('id')).toBe(false);
    });

    it('isPinned should return true for any pinned column', () => {
      expect(service.isPinned('id')).toBe(true);
      expect(service.isPinned('actions')).toBe(true);
      expect(service.isPinned('name')).toBe(false);
    });
  });

  describe('getPinnedSide', () => {
    beforeEach(() => {
      const columns: ColDef[] = [
        { field: 'id', pinnedLeft: true },
        { field: 'name' },
        { field: 'actions', pinnedRight: true },
      ];
      service.initialize(columns);
    });

    it('should return "left" for left-pinned columns', () => {
      expect(service.getPinnedSide('id')).toBe('left');
    });

    it('should return "right" for right-pinned columns', () => {
      expect(service.getPinnedSide('actions')).toBe('right');
    });

    it('should return null for non-pinned columns', () => {
      expect(service.getPinnedSide('name')).toBeNull();
    });
  });

  describe('getPinnedLeftIds / getPinnedRightIds', () => {
    it('should return array of pinned column IDs', () => {
      const columns: ColDef[] = [
        { field: 'id', pinnedLeft: true },
        { field: 'name', pinnedLeft: true },
        { field: 'age' },
        { field: 'actions', pinnedRight: true },
      ];
      service.initialize(columns);
      expect(service.getPinnedLeftIds()).toEqual(['id', 'name']);
      expect(service.getPinnedRightIds()).toEqual(['actions']);
    });

    it('should return empty array when no pinned columns', () => {
      service.initialize([{ field: 'name' }]);
      expect(service.getPinnedLeftIds()).toEqual([]);
      expect(service.getPinnedRightIds()).toEqual([]);
    });
  });

  describe('pinColumn', () => {
    beforeEach(() => {
      service.initialize([{ field: 'id' }, { field: 'name' }]);
    });

    it('should pin column to left', () => {
      service.pinColumn('id', 'left');
      expect(service.isPinnedLeft('id')).toBe(true);
    });

    it('should pin column to right', () => {
      service.pinColumn('id', 'right');
      expect(service.isPinnedRight('id')).toBe(true);
    });

    it('should unpin from other side when pinning', () => {
      service.pinColumn('id', 'left');
      service.pinColumn('id', 'right');
      expect(service.isPinnedLeft('id')).toBe(false);
      expect(service.isPinnedRight('id')).toBe(true);
    });

    it('should emit pinned changed event', () => {
      const callback = vi.fn();
      service.onPinnedChanged(callback);
      service.pinColumn('id', 'left');
      expect(callback).toHaveBeenCalledWith({ columnId: 'id', side: 'left' });
    });
  });

  describe('unpinColumn', () => {
    beforeEach(() => {
      const columns: ColDef[] = [
        { field: 'id', pinnedLeft: true },
        { field: 'actions', pinnedRight: true },
      ];
      service.initialize(columns);
    });

    it('should unpin left-pinned column', () => {
      service.unpinColumn('id');
      expect(service.isPinned('id')).toBe(false);
    });

    it('should unpin right-pinned column', () => {
      service.unpinColumn('actions');
      expect(service.isPinned('actions')).toBe(false);
    });

    it('should emit null side when unpinning', () => {
      const callback = vi.fn();
      service.onPinnedChanged(callback);
      service.unpinColumn('id');
      expect(callback).toHaveBeenCalledWith({ columnId: 'id', side: null });
    });

    it('should not emit when column was not pinned', () => {
      const callback = vi.fn();
      service.onPinnedChanged(callback);
      service.unpinColumn('nonexistent');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('moveToPinned', () => {
    beforeEach(() => {
      service.initialize([{ field: 'id' }]);
    });

    it('should pin column to specified side', () => {
      service.moveToPinned('id', 'left');
      expect(service.isPinnedLeft('id')).toBe(true);
    });

    it('should ignore position parameter (current implementation)', () => {
      service.moveToPinned('id', 'right', 0);
      expect(service.isPinnedRight('id')).toBe(true);
    });
  });

  describe('onPinnedChanged', () => {
    it('should subscribe to pin changes', () => {
      const callback = vi.fn();
      service.onPinnedChanged(callback);
      service.initialize([{ field: 'id' }]);
      service.pinColumn('id', 'left');
      expect(callback).toHaveBeenCalled();
    });

    it('should allow multiple subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      service.onPinnedChanged(callback1);
      service.onPinnedChanged(callback2);
      service.initialize([{ field: 'id' }]);
      service.pinColumn('id', 'left');
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('getPinnedWidth', () => {
    it('should calculate total width of left-pinned columns', () => {
      const columns: ColDef[] = [
        { field: 'id', width: 50, pinnedLeft: true },
        { field: 'name', width: 100, pinnedLeft: true },
        { field: 'age', width: 80 },
      ];
      service.initialize(columns);
      expect(service.getPinnedWidth(columns, 'left')).toBe(150);
    });

    it('should calculate total width of right-pinned columns', () => {
      const columns: ColDef[] = [
        { field: 'id', width: 50 },
        { field: 'name', width: 100 },
        { field: 'actions', width: 80, pinnedRight: true },
      ];
      service.initialize(columns);
      expect(service.getPinnedWidth(columns, 'right')).toBe(80);
    });

    it('should use default width 100 when not specified', () => {
      const columns: ColDef[] = [
        { field: 'id', pinnedLeft: true },
      ];
      service.initialize(columns);
      expect(service.getPinnedWidth(columns, 'left')).toBe(100);
    });

    it('should return 0 when no columns pinned', () => {
      const columns: ColDef[] = [
        { field: 'id', width: 50 },
        { field: 'name', width: 100 },
      ];
      service.initialize(columns);
      expect(service.getPinnedWidth(columns, 'left')).toBe(0);
      expect(service.getPinnedWidth(columns, 'right')).toBe(0);
    });
  });

  describe('destroy', () => {
    it('should complete the subject', () => {
      const callback = vi.fn();
      service.onPinnedChanged(callback);
      service.destroy();
      // After destroy, callbacks should not receive new events
      service.pinColumn('test', 'left');
      // Subject is completed, so no error should be thrown
    });
  });

  describe('edge cases', () => {
    it('should handle empty column array', () => {
      service.initialize([]);
      expect(service.getPinnedLeftIds()).toEqual([]);
      expect(service.getPinnedRightIds()).toEqual([]);
    });

    it('should handle undefined pinnedLeft/pinnedRight', () => {
      const columns: ColDef[] = [
        { field: 'id', pinnedLeft: undefined },
        { field: 'name', pinnedRight: undefined },
      ];
      service.initialize(columns);
      expect(service.isPinned('id')).toBe(false);
      expect(service.isPinned('name')).toBe(false);
    });

    it('should handle falsy pinned values', () => {
      const columns: ColDef[] = [
        { field: 'id', pinnedLeft: false },
        { field: 'name', pinnedRight: false },
      ];
      service.initialize(columns);
      expect(service.isPinned('id')).toBe(false);
      expect(service.isPinned('name')).toBe(false);
    });

    it('should handle pinning non-existent column', () => {
      service.initialize([{ field: 'id' }]);
      service.pinColumn('nonexistent', 'left');
      expect(service.isPinnedLeft('nonexistent')).toBe(true);
    });

    it('should handle unpinning non-existent column', () => {
      service.initialize([]);
      service.unpinColumn('nonexistent');
      expect(service.isPinned('nonexistent')).toBe(false);
    });

    it('should handle empty config', () => {
      service.initialize([{ field: 'id' }], {});
      expect(service.isPinned('id')).toBe(false);
    });

    it('should handle config with empty arrays', () => {
      service.initialize([{ field: 'id' }], {
        pinnedLeftColumns: [],
        pinnedRightColumns: [],
      });
      expect(service.isPinned('id')).toBe(false);
    });
  });
});
