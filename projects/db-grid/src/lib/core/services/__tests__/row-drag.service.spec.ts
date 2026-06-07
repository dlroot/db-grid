// @ts-nocheck
/// <reference types='vitest' />
import { describe, it, expect, beforeEach } from 'vitest';
import { RowDragService, RowDragConfig, RowDragStartEvent, RowDragMoveEvent, RowDragEndEvent, RowDragState } from '../row-drag.service';
import { ColDef } from '../models';

describe('RowDragService', () => {
  let service: RowDragService;

  beforeEach(() => {
    service = new RowDragService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with config', () => {
      const config: RowDragConfig = {
        rowDragEnabled: true,
        rowDragMultiRow: true,
        dragType: 'handle'
      };
      service.initialize(config);
      expect(service.isRowDragEnabled()).toBe(true);
      expect(service.isMultiRowDrag()).toBe(true);
      expect(service.getDragType()).toBe('handle');
    });

    it('should default to disabled', () => {
      service.initialize({});
      expect(service.isRowDragEnabled()).toBe(false);
    });
  });

  describe('Enable/Disable', () => {
    it('should enable row drag', () => {
      service.enable();
      expect(service.isRowDragEnabled()).toBe(true);
    });

    it('should disable row drag', () => {
      service.enable();
      service.disable();
      expect(service.isRowDragEnabled()).toBe(false);
    });
  });

  describe('Row Drag Operations', () => {
    it('should start drag', () => {
      service.enable();
      const mockEvent = { offsetX: 10, offsetY: 5, clientX: 100, clientY: 200 } as MouseEvent;
      const rowData = { id: 1, name: 'Test' };
      
      let started = false;
      service.onDragStarted(() => { started = true; });
      
      service.startDrag('row-1', mockEvent, rowData);
      
      const state = service.getDragState();
      expect(state.isDragging).toBe(true);
      expect(state.draggedRowId).toBe('row-1');
      expect(state.ghostRow?.data).toEqual(rowData);
    });

    it('should not start when disabled', () => {
      const mockEvent = { offsetX: 0, offsetY: 0, clientX: 100, clientY: 200 } as MouseEvent;
      service.startDrag('row-1', mockEvent, {});
      expect(service.getDragState().isDragging).toBe(false);
    });

    it('should start multi drag', () => {
      service.initialize({ rowDragEnabled: true, rowDragMultiRow: true });
      const mockEvent = { offsetX: 0, offsetY: 0, clientX: 100, clientY: 200 } as MouseEvent;
      
      service.startMultiDrag(['row-1', 'row-2', 'row-3'], mockEvent);
      
      const state = service.getDragState();
      expect(state.draggedRowIds).toHaveLength(3);
    });

    it('should handle drag move', () => {
      service.enable();
      service.startDrag('row-1', { offsetX: 0, offsetY: 0, clientX: 0, clientY: 0 } as MouseEvent);
      
      let moved = false;
      service.onDragMoved(() => { moved = true; });
      
      const moveEvent = { clientX: 150, clientY: 250 } as MouseEvent;
      service.onDragMove(moveEvent, 5);
      
      expect(moved).toBe(true);
      expect(service.getDragState().hoverIndex).toBe(5);
    });

    it('should end drag', () => {
      service.enable();
      service.startDrag('row-1', { offsetX: 0, offsetY: 0, clientX: 0, clientY: 0 } as MouseEvent);
      
      let ended = false;
      service.onDragEnded(() => { ended = true; });
      
      const endEvent = { clientX: 100, clientY: 200 } as MouseEvent;
      service.endDrag(3, endEvent);
      
      expect(ended).toBe(true);
      expect(service.getDragState().isDragging).toBe(false);
    });

    it('should cancel drag', () => {
      service.enable();
      service.startDrag('row-1', { offsetX: 0, offsetY: 0, clientX: 0, clientY: 0 } as MouseEvent);
      
      let cancelled = false;
      service.onDragCancelled(() => { cancelled = true; });
      
      service.cancelDrag();
      
      expect(cancelled).toBe(true);
      expect(service.getDragState().isDragging).toBe(false);
    });
  });

  describe('Drag State', () => {
    it('should return drag state', () => {
      service.enable();
      service.startDrag('row-1', { offsetX: 0, offsetY: 0, clientX: 100, clientY: 200 } as MouseEvent);
      
      const state = service.getDragState();
      expect(state.isDragging).toBe(true);
      expect(state.draggedRowId).toBe('row-1');
    });

    it('should return empty state when not dragging', () => {
      const state = service.getDragState();
      expect(state.isDragging).toBe(false);
      expect(state.draggedRowId).toBeNull();
      expect(state.draggedRowIds).toEqual([]);
    });
  });

  describe('Drag Handle Column', () => {
    it('should identify checkbox selection as drag handle', () => {
      const col: ColDef = { checkboxSelection: true };
      expect(service.isDragHandleCol(col)).toBe(true);
    });

    it('should identify __dragHandle__ field as drag handle', () => {
      const col: ColDef = { field: '__dragHandle__' };
      expect(service.isDragHandleCol(col)).toBe(true);
    });

    it('should return false for regular column', () => {
      const col: ColDef = { field: 'name' };
      expect(service.isDragHandleCol(col)).toBe(false);
    });
  });

  describe('Destroy', () => {
    it('should clean up on destroy', () => {
      service.enable();
      service.startDrag('row-1', { offsetX: 0, offsetY: 0, clientX: 0, clientY: 0 } as MouseEvent);
      service.destroy();
      expect(service.getDragState().isDragging).toBe(false);
    });
  });
});