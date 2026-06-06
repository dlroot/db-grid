import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ColumnPinningService, PinConfig } from '../pinning.service';
import { ColDef } from '../../models';

describe('ColumnPinningService', () => {
  let service: ColumnPinningService;

  const mockColumns: ColDef[] = [
    { field: 'name', colId: 'name', pinnedLeft: true, width: 120 },
    { field: 'age', colId: 'age', width: 80 },
    { field: 'city', colId: 'city', pinnedRight: true, width: 100 },
    { field: 'email', colId: 'email', width: 150 },
  ];

  beforeEach(() => {
    service = new ColumnPinningService();
  });

  // ===== initialize =====
  describe('initialize', () => {
    it('should initialize from column definitions', () => {
      service.initialize(mockColumns);
      expect(service.isPinnedLeft('name')).toBe(true);
      expect(service.isPinnedRight('city')).toBe(true);
      expect(service.isPinned('age')).toBe(false);
    });

    it('should initialize from PinConfig', () => {
      const config: PinConfig = {
        pinnedLeftColumns: ['email'],
        pinnedRightColumns: ['age'],
      };
      service.initialize(mockColumns, config);
      expect(service.isPinnedLeft('email')).toBe(true);
      expect(service.isPinnedRight('age')).toBe(true);
    });

    it('should handle empty columns', () => {
      service.initialize([]);
      expect(service.getPinnedLeftIds()).toEqual([]);
      expect(service.getPinnedRightIds()).toEqual([]);
    });

    it('should clear existing pinned state on re-initialize', () => {
      service.initialize(mockColumns);
      expect(service.isPinned('name')).toBe(true);
      service.initialize([]);
      expect(service.isPinned('name')).toBe(false);
    });

    it('should use field as colId when colId not set', () => {
      const cols: ColDef[] = [{ field: 'id', pinnedLeft: true }];
      service.initialize(cols);
      expect(service.isPinnedLeft('id')).toBe(true);
    });
  });

  // ===== isPinnedLeft / isPinnedRight / isPinned =====
  describe('pinning checks', () => {
    beforeEach(() => {
      service.initialize(mockColumns);
    });

    it('should check isPinnedLeft correctly', () => {
      expect(service.isPinnedLeft('name')).toBe(true);
      expect(service.isPinnedLeft('city')).toBe(false);
      expect(service.isPinnedLeft('missing')).toBe(false);
    });

    it('should check isPinnedRight correctly', () => {
      expect(service.isPinnedRight('city')).toBe(true);
      expect(service.isPinnedRight('name')).toBe(false);
      expect(service.isPinnedRight('missing')).toBe(false);
    });

    it('should check isPinned (either side)', () => {
      expect(service.isPinned('name')).toBe(true);
      expect(service.isPinned('city')).toBe(true);
      expect(service.isPinned('age')).toBe(false);
      expect(service.isPinned('missing')).toBe(false);
    });

    it('should get pinned side', () => {
      expect(service.getPinnedSide('name')).toBe('left');
      expect(service.getPinnedSide('city')).toBe('right');
      expect(service.getPinnedSide('age')).toBeNull();
    });
  });

  // ===== getPinnedLeftIds / getPinnedRightIds =====
  describe('getPinnedIds', () => {
    beforeEach(() => {
      service.initialize(mockColumns);
    });

    it('should return all pinned left column ids', () => {
      const ids = service.getPinnedLeftIds();
      expect(ids).toContain('name');
      expect(ids).not.toContain('city');
    });

    it('should return all pinned right column ids', () => {
      const ids = service.getPinnedRightIds();
      expect(ids).toContain('city');
      expect(ids).not.toContain('name');
    });

    it('should return empty array when nothing pinned', () => {
      service.initialize([{ field: 'a' }, { field: 'b' }]);
      expect(service.getPinnedLeftIds()).toEqual([]);
      expect(service.getPinnedRightIds()).toEqual([]);
    });
  });

  // ===== pinColumn / unpinColumn =====
  describe('pinColumn / unpinColumn', () => {
    beforeEach(() => {
      service.initialize(mockColumns);
    });

    it('should pin column to left', () => {
      service.pinColumn('age', 'left');
      expect(service.isPinnedLeft('age')).toBe(true);
      expect(service.isPinnedRight('age')).toBe(false);
    });

    it('should pin column to right', () => {
      service.pinColumn('age', 'right');
      expect(service.isPinnedRight('age')).toBe(true);
      expect(service.isPinnedLeft('age')).toBe(false);
    });

    it('should move pinned column to different side', () => {
      service.pinColumn('name', 'right'); // already pinned left
      expect(service.isPinnedRight('name')).toBe(true);
      expect(service.isPinnedLeft('name')).toBe(false);
    });

    it('should emit onPinnedChanged when pinning', () => {
      let event: any;
      service.onPinnedChanged(e => { event = e; });
      service.pinColumn('age', 'left');
      expect(event.columnId).toBe('age');
      expect(event.side).toBe('left');
    });

    it('should unpin column', () => {
      service.unpinColumn('name');
      expect(service.isPinned('name')).toBe(false);
    });

    it('should emit onPinnedChanged when unpinning', () => {
      let event: any;
      service.onPinnedChanged(e => { event = e; });
      service.unpinColumn('name');
      expect(event.columnId).toBe('name');
      expect(event.side).toBeNull();
    });

    it('should not emit when unpinning unpinned column', () => {
      let called = false;
      service.onPinnedChanged(() => { called = true; });
      service.unpinColumn('age'); // not pinned
      expect(called).toBe(false);
    });

    it('should unpin from both sides before repinning', () => {
      service.initialize([{ field: 'a', pinnedLeft: true }]);
      service.pinColumn('a', 'right');
      expect(service.isPinnedLeft('a')).toBe(false);
      expect(service.isPinnedRight('a')).toBe(true);
    });
  });

  // ===== moveToPinned =====
  describe('moveToPinned', () => {
    beforeEach(() => {
      service.initialize(mockColumns);
    });

    it('should move column to pinned left', () => {
      service.moveToPinned('email', 'left');
      expect(service.isPinnedLeft('email')).toBe(true);
    });

    it('should move column to pinned right', () => {
      service.moveToPinned('email', 'right');
      expect(service.isPinnedRight('email')).toBe(true);
    });

    it('should move with position parameter', () => {
      service.moveToPinned('email', 'left', 0);
      expect(service.isPinnedLeft('email')).toBe(true);
    });
  });

  // ===== onPinnedChanged =====
  describe('onPinnedChanged', () => {
    it('should receive pin events', () => {
      let events: any[] = [];
      service.onPinnedChanged(e => { events.push(e); });
      service.initialize(mockColumns);
      service.pinColumn('email', 'left');
      service.unpinColumn('name');
      expect(events.length).toBe(2);
      expect(events[0].columnId).toBe('email');
      expect(events[1].columnId).toBe('name');
    });

    it('should receive events for multiple pin operations', () => {
      let count = 0;
      service.onPinnedChanged(() => { count++; });
      service.initialize(mockColumns);
      service.pinColumn('email', 'left');
      service.pinColumn('age', 'left');
      // Both pinColumn calls emit events (email and age)
      expect(count).toBe(2);
    });
  });

  // ===== getPinnedWidth =====
  describe('getPinnedWidth', () => {
    beforeEach(() => {
      service.initialize(mockColumns);
    });

    it('should calculate left pinned width', () => {
      const width = service.getPinnedWidth(mockColumns, 'left');
      expect(width).toBe(120); // only 'name' is pinned left
    });

    it('should calculate right pinned width', () => {
      const width = service.getPinnedWidth(mockColumns, 'right');
      expect(width).toBe(100); // only 'city' is pinned right
    });

    it('should use column width or default 100', () => {
      service.initialize([{ field: 'a', pinnedLeft: true }]);
      const width = service.getPinnedWidth([{ field: 'a' }], 'left');
      expect(width).toBe(100); // no explicit width
    });

    it('should calculate combined width for multiple pinned columns', () => {
      service.initialize([
        { field: 'a', pinnedLeft: true, width: 50 },
        { field: 'b', pinnedLeft: true, width: 80 },
        { field: 'c', width: 100 },
      ]);
      const width = service.getPinnedWidth([
        { field: 'a', width: 50 },
        { field: 'b', width: 80 },
        { field: 'c', width: 100 },
      ], 'left');
      expect(width).toBe(130);
    });

    it('should use field as colId for width calculation', () => {
      service.initialize([{ field: 'colX', pinnedRight: true }]);
      const width = service.getPinnedWidth([{ field: 'colX', width: 75 }], 'right');
      expect(width).toBe(75);
    });
  });

  // ===== destroy =====
  describe('destroy', () => {
    it('should complete observable', () => {
      expect(() => service.destroy()).not.toThrow();
    });
  });

  // ===== Edge cases =====
  describe('edge cases', () => {
    it('should handle column with both pinnedLeft and pinnedRight', () => {
      const cols: ColDef[] = [
        { field: 'a', pinnedLeft: true, pinnedRight: true, width: 100 },
      ];
      service.initialize(cols);
      // pinnedLeft takes precedence
      expect(service.getPinnedSide('a')).toBe('left');
    });

    it('should handle duplicate pinColumn calls', () => {
      service.initialize(mockColumns);
      service.pinColumn('name', 'left');
      service.pinColumn('name', 'left');
      expect(service.isPinnedLeft('name')).toBe(true);
    });

    it('should handle unpin of non-existent column', () => {
      expect(() => service.unpinColumn('non-existent')).not.toThrow();
    });

    it('should handle all columns pinned left', () => {
      const cols: ColDef[] = [
        { field: 'a', pinnedLeft: true },
        { field: 'b', pinnedLeft: true },
        { field: 'c', pinnedLeft: true },
      ];
      service.initialize(cols);
      expect(service.getPinnedLeftIds().length).toBe(3);
    });
  });
});