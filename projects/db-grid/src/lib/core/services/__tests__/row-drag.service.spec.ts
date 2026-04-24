import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RowDragService } from '../row-drag.service';

describe('RowDragService', () => {
  let service: RowDragService;

  function createMouseEvent(overrides: Partial<MouseEvent> = {}): any {
    return {
      clientX: 100,
      clientY: 200,
      offsetX: 10,
      offsetY: 20,
      ...overrides,
    };
  }

  beforeEach(() => {
    service = new RowDragService();
    service.initialize();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('initialize', () => {
    it('should initialize disabled by default', () => {
      expect(service.isRowDragEnabled()).toBe(false);
      expect(service.getDragState().isDragging).toBe(false);
    });

    it('should initialize with custom config', () => {
      service.initialize({ rowDragEnabled: true, rowDragMultiRow: false });
      expect(service.isRowDragEnabled()).toBe(true);
    });

    it('should initialize with drag type', () => {
      service.initialize({ dragType: 'fullRow' });
      expect(service.getDragType()).toBe('fullRow');
    });
  });

  describe('enable / disable', () => {
    it('should enable', () => {
      service.enable();
      expect(service.isRowDragEnabled()).toBe(true);
    });

    it('should disable', () => {
      service.enable();
      service.disable();
      expect(service.isRowDragEnabled()).toBe(false);
    });

    it('should clear drag state on disable', () => {
      service.enable();
      service.startDrag('row-1', createMouseEvent());
      service.disable();
      expect(service.getDragState().isDragging).toBe(false);
    });
  });

  describe('startDrag', () => {
    it('should start drag with a row ID', () => {
      service.enable();
      service.startDrag('row-1', createMouseEvent(), { id: 1 });
      expect(service.getDragState().isDragging).toBe(true);
      expect(service.getDragState().draggedRowId).toBe('row-1');
    });

    it('should not start drag when disabled', () => {
      service.startDrag('row-1', createMouseEvent());
      expect(service.getDragState().isDragging).toBe(false);
    });

    it('should fire onDragStarted callback', () => {
      service.enable();
      const spy = vi.fn();
      service.onDragStarted(spy);
      service.startDrag('row-1', createMouseEvent(), { id: 1 });
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0].rowId).toBe('row-1');
      expect(spy.mock.calls[0][0].data).toEqual({ id: 1 });
    });

    it('should store ghost row data', () => {
      service.enable();
      service.startDrag('row-1', createMouseEvent({ clientX: 50, clientY: 100 }), { name: 'test' });
      const state = service.getDragState();
      expect(state.ghostRow).toBeDefined();
      expect(state.ghostRow!.rowId).toBe('row-1');
      expect(state.ghostRow!.mouseX).toBe(50);
      expect(state.ghostRow!.mouseY).toBe(100);
    });
  });

  describe('startMultiDrag', () => {
    it('should start multi-row drag', () => {
      service.initialize({ rowDragEnabled: true, rowDragMultiRow: true });
      service.startMultiDrag(['row-1', 'row-2', 'row-3'], createMouseEvent());
      expect(service.getDragState().isDragging).toBe(true);
      expect(service.getDragState().draggedRowIds).toEqual(['row-1', 'row-2', 'row-3']);
    });

    it('should not start multi drag when multi-row is disabled', () => {
      service.enable();
      service.startMultiDrag(['row-1', 'row-2'], createMouseEvent());
      expect(service.getDragState().isDragging).toBe(false);
    });

    it('should not start multi drag when row drag is disabled', () => {
      service.initialize({ rowDragEnabled: false, rowDragMultiRow: true });
      service.startMultiDrag(['row-1', 'row-2'], createMouseEvent());
      expect(service.getDragState().isDragging).toBe(false);
    });
  });

  describe('onDragMove', () => {
    it('should update hover index and ghost position', () => {
      service.enable();
      service.startDrag('row-1', createMouseEvent());
      service.onDragMove(createMouseEvent({ clientX: 150, clientY: 250 }), 3);
      
      const state = service.getDragState();
      expect(state.hoverIndex).toBe(3);
      expect(state.ghostRow!.mouseX).toBe(150);
      expect(state.ghostRow!.mouseY).toBe(250);
    });

    it('should fire onDragMoved callback', () => {
      service.enable();
      service.startDrag('row-1', createMouseEvent());
      const spy = vi.fn();
      service.onDragMoved(spy);
      service.onDragMove(createMouseEvent(), 5);
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0].hoverIndex).toBe(5);
      expect(spy.mock.calls[0][0].rowId).toBe('row-1');
    });
  });

  describe('endDrag', () => {
    it('should end drag and clear state', () => {
      service.enable();
      service.startDrag('row-1', createMouseEvent());
      service.endDrag(3, createMouseEvent());
      expect(service.getDragState().isDragging).toBe(false);
    });

    it('should fire onDragEnded callback', () => {
      service.enable();
      service.startDrag('row-1', createMouseEvent());
      const spy = vi.fn();
      service.onDragEnded(spy);
      service.endDrag(3, createMouseEvent());
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0].rowId).toBe('row-1');
      expect(spy.mock.calls[0][0].toIndex).toBe(3);
    });
  });

  describe('cancelDrag', () => {
    it('should cancel drag and clear state', () => {
      service.enable();
      service.startDrag('row-1', createMouseEvent());
      service.cancelDrag();
      expect(service.getDragState().isDragging).toBe(false);
    });

    it('should fire onDragCancelled callback', () => {
      service.enable();
      service.startDrag('row-1', createMouseEvent());
      const spy = vi.fn();
      service.onDragCancelled(spy);
      service.cancelDrag();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getDragState', () => {
    it('should return empty state when not dragging', () => {
      const state = service.getDragState();
      expect(state.isDragging).toBe(false);
      expect(state.draggedRowId).toBeNull();
      expect(state.draggedRowIds).toEqual([]);
      expect(state.hoverIndex).toBe(-1);
      expect(state.ghostRow).toBeNull();
    });

    it('should return drag state with copied arrays', () => {
      service.enable();
      service.startDrag('row-1', createMouseEvent());
      const state1 = service.getDragState();
      const state2 = service.getDragState();
      expect(state1.draggedRowIds).not.toBe(state2.draggedRowIds);
    });
  });

  describe('isDragHandleCol', () => {
    it('should identify checkbox selection columns as drag handles', () => {
      expect(service.isDragHandleCol({ checkboxSelection: true, field: 'name' })).toBe(true);
    });

    it('should identify __dragHandle__ field as drag handle', () => {
      expect(service.isDragHandleCol({ field: '__dragHandle__' })).toBe(true);
    });

    it('should not identify regular columns as drag handles', () => {
      expect(service.isDragHandleCol({ field: 'name' })).toBe(false);
    });
  });

  describe('getDragType', () => {
    it('should return standard by default', () => {
      expect(service.getDragType()).toBe('standard');
    });

    it('should return configured drag type', () => {
      service.initialize({ dragType: 'fullRow' });
      expect(service.getDragType()).toBe('fullRow');
    });

    it('should return handle drag type', () => {
      service.initialize({ dragType: 'handle' });
      expect(service.getDragType()).toBe('handle');
    });
  });

  describe('isMultiRowDrag', () => {
    it('should return false by default', () => {
      expect(service.isMultiRowDrag()).toBe(false);
    });

    it('should return true when configured', () => {
      service.initialize({ rowDragMultiRow: true });
      expect(service.isMultiRowDrag()).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should clean up drag state and callbacks', () => {
      service.enable();
      service.startDrag('row-1', createMouseEvent());
      service.destroy();
      // destroy clears drag state but does not reset rowDragEnabled
      expect(service.getDragState().isDragging).toBe(false);
      expect(service.getDragState().draggedRowIds).toEqual([]);
    });
  });
});
