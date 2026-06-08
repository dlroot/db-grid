// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CrossGridDragService, CrossGridDragCallbacks, CrossGridDragOptions } from '../cross-grid-drag.service';

describe('CrossGridDragService', () => {
  let service: CrossGridDragService;
  let grid1Callbacks: CrossGridDragCallbacks;
  let grid2Callbacks: CrossGridDragCallbacks;
  let grid1Data: any[];
  let grid2Data: any[];

  beforeEach(() => {
    service = new CrossGridDragService();

    grid1Data = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ];

    grid2Data = [
      { id: 101, name: 'Dave' },
      { id: 102, name: 'Eve' },
    ];

    grid1Callbacks = {
      getContainerElement: () => null,
      getRowTop: (i) => i * 40,
      getRowHeight: () => 40,
      getRowCount: () => grid1Data.length,
      addRowAt: (index, data) => grid1Data.splice(index, 0, data),
      removeRowData: (data) => {
        const idx = grid1Data.findIndex(d => d.id === data.id);
        if (idx >= 0) grid1Data.splice(idx, 1);
      },
    };

    grid2Callbacks = {
      getContainerElement: () => null,
      getRowTop: (i) => i * 40,
      getRowHeight: () => 40,
      getRowCount: () => grid2Data.length,
      addRowAt: (index, data) => grid2Data.splice(index, 0, data),
      removeRowData: (data) => {
        const idx = grid2Data.findIndex(d => d.id === data.id);
        if (idx >= 0) grid2Data.splice(idx, 1);
      },
    };
  });

  describe('Registration', () => {
    it('should register a grid', () => {
      service.registerGrid('grid1', grid1Callbacks);
      expect(service.isRegistered('grid1')).toBe(true);
    });

    it('should unregister a grid', () => {
      service.registerGrid('grid1', grid1Callbacks);
      service.unregisterGrid('grid1');
      expect(service.isRegistered('grid1')).toBe(false);
    });

    it('should list registered grid IDs', () => {
      service.registerGrid('grid1', grid1Callbacks);
      service.registerGrid('grid2', grid2Callbacks);
      expect(service.getRegisteredGridIds()).toEqual(['grid1', 'grid2']);
    });

    it('should return false for unregistered grid', () => {
      expect(service.isRegistered('nonexistent')).toBe(false);
    });
  });

  describe('Drag Lifecycle', () => {
    beforeEach(() => {
      service.registerGrid('grid1', grid1Callbacks);
      service.registerGrid('grid2', grid2Callbacks);
    });

    it('should start drag', () => {
      const events: any[] = [];
      service.onDragEvent(events.push.bind(events));

      const rowNodes = [{ data: grid1Data[0] }];
      service.startCrossGridDrag('grid1', rowNodes);

      expect(service.isCurrentlyDragging()).toBe(true);
      expect(service.getDragSourceGridId()).toBe('grid1');
      expect(service.getDragData()).toEqual([grid1Data[0]]);
      expect(events[0].type).toBe('dragStart');
    });

    it('should handle drag enter on target', () => {
      const events: any[] = [];
      service.onDragEvent(events.push.bind(events));

      service.startCrossGridDrag('grid1', [{ data: grid1Data[0] }]);
      const mockEvent = { dataTransfer: { dropEffect: '' } } as DragEvent;
      service.onDragEnterTarget('grid2', mockEvent);

      const enterEvent = events.find(e => e.type === 'dragEnter');
      expect(enterEvent).toBeDefined();
      expect(enterEvent.targetGridId).toBe('grid2');
    });

    it('should not allow drag to self', () => {
      const events: any[] = [];
      service.onDragEvent(events.push.bind(events));

      service.startCrossGridDrag('grid1', [{ data: grid1Data[0] }]);
      service.onDragEnterTarget('grid1', {} as DragEvent);

      const enterEvent = events.find(e => e.type === 'dragEnter');
      expect(enterEvent).toBeUndefined();
    });

    it('should handle drag leave', () => {
      const events: any[] = [];
      service.onDragEvent(events.push.bind(events));

      service.startCrossGridDrag('grid1', [{ data: grid1Data[0] }]);
      service.onDragLeaveTarget('grid2');

      const leaveEvent = events.find(e => e.type === 'dragLeave');
      expect(leaveEvent).toBeDefined();
    });

    it('should handle drop and move data', () => {
      const events: any[] = [];
      service.onDragEvent(events.push.bind(events));

      service.startCrossGridDrag('grid1', [{ data: grid1Data[0] }]);
      const mockEvent = {
        preventDefault: () => {},
        dataTransfer: { getData: () => '', dropEffect: '' },
        clientX: 100,
        clientY: 50,
      } as any as DragEvent;

      const result = service.onDropTarget('grid2', mockEvent, 0);
      expect(result).toBe(true);

      // Check data was moved
      expect(grid1Data.length).toBe(2); // removed from grid1
      expect(grid2Data.length).toBe(3); // added to grid2
      expect(grid2Data[0].id).toBe(1);

      const dropEvent = events.find(e => e.type === 'drop');
      expect(dropEvent).toBeDefined();
      expect(dropEvent.targetGridId).toBe('grid2');
    });

    it('should drop without removing when removeOnDrag is false', () => {
      const events: any[] = [];
      service.onDragEvent(events.push.bind(events));

      service.startCrossGridDrag('grid1', [{ data: grid1Data[0] }], undefined, {
        removeOnDrag: false,
      });

      const mockEvent = {
        preventDefault: () => {},
        dataTransfer: { getData: () => '', dropEffect: '' },
        clientX: 100,
        clientY: 50,
      } as any as DragEvent;

      service.onDropTarget('grid2', mockEvent, 0);

      expect(grid1Data.length).toBe(3); // not removed
      expect(grid2Data.length).toBe(3); // added (copy)
    });

    it('should end drag and clean up state', () => {
      const events: any[] = [];
      service.onDragEvent(events.push.bind(events));

      service.startCrossGridDrag('grid1', [{ data: grid1Data[0] }]);
      service.endCrossGridDrag();

      expect(service.isCurrentlyDragging()).toBe(false);
      expect(service.getDragSourceGridId()).toBeNull();
      expect(service.getDragData()).toEqual([]);

      const endEvent = events.find(e => e.type === 'dragEnd');
      expect(endEvent).toBeDefined();
    });

    it('should not end drag if not dragging', () => {
      const events: any[] = [];
      service.onDragEvent(events.push.bind(events));
      service.endCrossGridDrag();
      expect(events.length).toBe(0);
    });

    it('should return false when dropping to unregistered grid', () => {
      service.startCrossGridDrag('grid1', [{ data: grid1Data[0] }]);
      const result = service.onDropTarget('nonexistent', {} as DragEvent);
      expect(result).toBe(false);
    });

    it('should clamp target row index', () => {
      // Reset data since prior tests may have modified them
      grid1Data.length = 0;
      grid1Data.push(
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      );
      grid2Data.length = 0;
      grid2Data.push(
        { id: 101, name: 'Dave' },
        { id: 102, name: 'Eve' },
      );

      const mockEvent = {
        preventDefault: () => {},
        dataTransfer: { getData: () => '', dropEffect: '' },
      } as any as DragEvent;

      service.startCrossGridDrag('grid1', [{ data: grid1Data[0] }]);

      // Negative index should clamp to 0
      service.onDropTarget('grid2', mockEvent, -5);
      expect(grid2Data[0].id).toBe(1);

      // Index beyond range should clamp to end
      const dataBefore = grid2Data.length;
      // After first drop removed Alice, grid1Data[0] is now Bob
      service.startCrossGridDrag('grid1', [{ data: grid1Data[0] }]);
      service.onDropTarget('grid2', mockEvent, 999);
      expect(grid2Data.length).toBe(dataBefore + 1);
      expect(grid2Data[grid2Data.length - 1].name).toBe('Bob');
    });
  });

  describe('Options', () => {
    it('should accept custom options', () => {
      service.registerGrid('grid1', grid1Callbacks);
      service.startCrossGridDrag('grid1', [], undefined, {
        cursorStyle: 'copy',
        removeOnDrag: false,
        showPreview: false,
      });
      // No error means options are accepted
      service.endCrossGridDrag();
    });
  });

  describe('Destroy', () => {
    it('should destroy without error', () => {
      service.registerGrid('grid1', grid1Callbacks);
      expect(() => service.destroy()).not.toThrow();
      expect(service.isRegistered('grid1')).toBe(false);
    });
  });
});
