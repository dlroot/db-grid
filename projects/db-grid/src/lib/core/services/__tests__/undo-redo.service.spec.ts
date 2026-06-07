// @ts-nocheck
/// <reference types='vitest' />
import { describe, it, expect, beforeEach } from 'vitest';
import { UndoRedoService, UndoRedoConfig, UndoAction, EditParams, RowAddParams, RowDeleteParams, ColumnResizeParams, ColumnMoveParams, SortChangeParams, FilterChangeParams } from '../undo-redo.service';

describe('UndoRedoService', () => {
  let service: UndoRedoService;

  beforeEach(() => {
    service = new UndoRedoService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with config', () => {
      const config: UndoRedoConfig = { enabled: false, maxStackSize: 50 };
      service.initialize(config);
      expect(service.isEnabled()).toBe(false);
    });

    it('should default to enabled', () => {
      service.initialize({});
      expect(service.isEnabled()).toBe(true);
    });

    it('should default max stack size to 50', () => {
      service.initialize({});
      expect(service.getMaxStackItems()).toBe(50);
    });
  });

  describe('Enable/Disable', () => {
    it('should enable', () => {
      service.disable();
      service.enable();
      expect(service.isEnabled()).toBe(true);
    });

    it('should disable', () => {
      service.disable();
      expect(service.isEnabled()).toBe(false);
    });

    it('should not record when disabled', () => {
      service.disable();
      service.recordEdit({ rowIndex: 0, colId: 'name', oldValue: 'a', newValue: 'b', rowData: {} });
      expect(service.canUndo()).toBe(false);
    });
  });

  describe('Record Edit', () => {
    it('should record edit action', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'Old',
        newValue: 'New',
        rowData: { name: 'New' }
      });
      expect(service.canUndo()).toBe(true);
    });

    it('should clear redo stack on new action', () => {
      service.recordEdit({ rowIndex: 0, colId: 'name', oldValue: 'a', newValue: 'b', rowData: {} });
      service.undo();
      service.recordEdit({ rowIndex: 1, colId: 'name', oldValue: 'c', newValue: 'd', rowData: {} });
      expect(service.canRedo()).toBe(false);
    });

    it('should respect max stack size', () => {
      service.initialize({ maxStackSize: 3 });
      for (let i = 0; i < 5; i++) {
        service.recordEdit({ rowIndex: i, colId: 'col', oldValue: i, newValue: i + 1, rowData: {} });
      }
      expect(service.getUndoStackSize()).toBe(3);
    });

    it('should not record when disabled', () => {
      service.disable();
      service.recordEdit({ rowIndex: 0, colId: 'name', oldValue: 'a', newValue: 'b', rowData: {} });
      expect(service.canUndo()).toBe(false);
    });
  });

  describe('Record Row Add', () => {
    it('should record row add action', () => {
      service.recordRowAdd({
        rowIndex: 0,
        rowData: { name: 'New Row' }
      });
      expect(service.canUndo()).toBe(true);
    });
  });

  describe('Record Row Delete', () => {
    it('should record row delete action', () => {
      service.recordRowDelete({
        rowIndex: 0,
        rowData: { name: 'Deleted Row' }
      });
      expect(service.canUndo()).toBe(true);
    });
  });

  describe('Record Column Resize', () => {
    it('should record column resize action', () => {
      service.recordColumnResize({
        colId: 'name',
        oldWidth: 100,
        newWidth: 200
      });
      expect(service.canUndo()).toBe(true);
      const stack = service.getUndoStack();
      expect(stack[0].type).toBe('columnResize');
      expect(stack[0].colId).toBe('name');
      expect(stack[0].oldWidth).toBe(100);
      expect(stack[0].newWidth).toBe(200);
    });

    it('should not record column resize when disabled', () => {
      service.disable();
      service.recordColumnResize({ colId: 'name', oldWidth: 100, newWidth: 200 });
      expect(service.canUndo()).toBe(false);
    });
  });

  describe('Record Column Move', () => {
    it('should record column move action', () => {
      service.recordColumnMove({
        colId: 'name',
        fromIndex: 0,
        toIndex: 2
      });
      expect(service.canUndo()).toBe(true);
      const stack = service.getUndoStack();
      expect(stack[0].type).toBe('columnMove');
      expect(stack[0].fromIndex).toBe(0);
      expect(stack[0].toIndex).toBe(2);
    });
  });

  describe('Record Sort Change', () => {
    it('should record sort change action', () => {
      service.recordSortChange({
        colId: 'name',
        oldSort: null,
        newSort: 'asc'
      });
      expect(service.canUndo()).toBe(true);
      const stack = service.getUndoStack();
      expect(stack[0].type).toBe('sortChange');
      expect(stack[0].oldSort).toBeNull();
      expect(stack[0].newSort).toBe('asc');
    });

    it('should record sort from asc to desc', () => {
      service.recordSortChange({
        colId: 'age',
        oldSort: 'asc',
        newSort: 'desc'
      });
      const stack = service.getUndoStack();
      expect(stack[0].oldSort).toBe('asc');
      expect(stack[0].newSort).toBe('desc');
    });
  });

  describe('Record Filter Change', () => {
    it('should record filter change action', () => {
      service.recordFilterChange({
        colId: 'name',
        oldFilter: null,
        newFilter: { type: 'contains', filter: 'test' }
      });
      expect(service.canUndo()).toBe(true);
      const stack = service.getUndoStack();
      expect(stack[0].type).toBe('filterChange');
      expect(stack[0].newFilter.type).toBe('contains');
    });
  });

  describe('pushStackItem', () => {
    it('should push item to undo stack via pushStackItem', () => {
      service.pushStackItem({
        type: 'edit',
        rowIndex: 0,
        colId: 'name',
        oldValue: 'a',
        newValue: 'b',
        rowData: {},
        timestamp: Date.now()
      });
      expect(service.canUndo()).toBe(true);
      expect(service.getUndoStackSize()).toBe(1);
    });

    it('should clear redo stack on pushStackItem', () => {
      service.recordEdit({ rowIndex: 0, colId: 'name', oldValue: 'a', newValue: 'b', rowData: {} });
      service.undo();
      expect(service.canRedo()).toBe(true);
      service.pushStackItem({
        type: 'edit',
        rowIndex: 1,
        colId: 'age',
        oldValue: 10,
        newValue: 20,
        rowData: {},
        timestamp: Date.now()
      });
      expect(service.canRedo()).toBe(false);
    });

    it('should not push when disabled', () => {
      service.disable();
      service.pushStackItem({
        type: 'edit',
        rowIndex: 0,
        colId: 'c',
        oldValue: 1,
        newValue: 2,
        rowData: {},
        timestamp: Date.now()
      });
      expect(service.canUndo()).toBe(false);
    });
  });

  describe('Undo', () => {
    it('should undo edit', () => {
      service.recordEdit({ rowIndex: 0, colId: 'name', oldValue: 'Old', newValue: 'New', rowData: {} });
      
      let action: UndoAction | null = null;
      service.onUndoEvent((a) => { action = a; });
      
      const result = service.undo();
      expect(result).not.toBeNull();
      expect(result?.type).toBe('edit');
      expect(action).not.toBeNull();
    });

    it('should undo column resize', () => {
      service.recordColumnResize({ colId: 'name', oldWidth: 100, newWidth: 200 });
      const result = service.undo();
      expect(result).not.toBeNull();
      expect(result?.type).toBe('columnResize');
    });

    it('should undo sort change', () => {
      service.recordSortChange({ colId: 'name', oldSort: null, newSort: 'asc' });
      const result = service.undo();
      expect(result?.type).toBe('sortChange');
      expect(result?.oldSort).toBeNull();
      expect(result?.newSort).toBe('asc');
    });

    it('should return null when nothing to undo', () => {
      const result = service.undo();
      expect(result).toBeNull();
    });

    it('should return null when disabled', () => {
      service.recordEdit({ rowIndex: 0, colId: 'name', oldValue: 'a', newValue: 'b', rowData: {} });
      service.disable();
      const result = service.undo();
      expect(result).toBeNull();
    });

    it('should add to redo stack', () => {
      service.recordEdit({ rowIndex: 0, colId: 'name', oldValue: 'a', newValue: 'b', rowData: {} });
      service.undo();
      expect(service.canRedo()).toBe(true);
    });
  });

  describe('Redo', () => {
    it('should redo edit', () => {
      service.recordEdit({ rowIndex: 0, colId: 'name', oldValue: 'a', newValue: 'b', rowData: {} });
      service.undo();
      
      let action: UndoAction | null = null;
      service.onRedoEvent((a) => { action = a; });
      
      const result = service.redo();
      expect(result).not.toBeNull();
      expect(result?.type).toBe('edit');
      expect(action).not.toBeNull();
    });

    it('should return null when nothing to redo', () => {
      const result = service.redo();
      expect(result).toBeNull();
    });

    it('should return null when disabled', () => {
      service.recordEdit({ rowIndex: 0, colId: 'name', oldValue: 'a', newValue: 'b', rowData: {} });
      service.undo();
      service.disable();
      const result = service.redo();
      expect(result).toBeNull();
    });

    it('should add to undo stack', () => {
      service.recordEdit({ rowIndex: 0, colId: 'name', oldValue: 'a', newValue: 'b', rowData: {} });
      service.undo();
      service.redo();
      expect(service.canUndo()).toBe(true);
    });
  });

  describe('Can Undo/Redo', () => {
    it('should check canUndo', () => {
      expect(service.canUndo()).toBe(false);
      service.recordEdit({ rowIndex: 0, colId: 'c', oldValue: 1, newValue: 2, rowData: {} });
      expect(service.canUndo()).toBe(true);
    });

    it('should check canRedo', () => {
      service.recordEdit({ rowIndex: 0, colId: 'c', oldValue: 1, newValue: 2, rowData: {} });
      service.undo();
      expect(service.canRedo()).toBe(true);
    });

    it('should return false when disabled', () => {
      service.recordEdit({ rowIndex: 0, colId: 'c', oldValue: 1, newValue: 2, rowData: {} });
      service.disable();
      expect(service.canUndo()).toBe(false);
    });
  });

  describe('Stack Size', () => {
    it('should get undo stack size', () => {
      expect(service.getUndoStackSize()).toBe(0);
      service.recordEdit({ rowIndex: 0, colId: 'c', oldValue: 1, newValue: 2, rowData: {} });
      expect(service.getUndoStackSize()).toBe(1);
    });

    it('should get redo stack size', () => {
      expect(service.getRedoStackSize()).toBe(0);
      service.recordEdit({ rowIndex: 0, colId: 'c', oldValue: 1, newValue: 2, rowData: {} });
      service.undo();
      expect(service.getRedoStackSize()).toBe(1);
    });
  });

  describe('Get Stacks', () => {
    it('should get undo stack', () => {
      service.recordEdit({ rowIndex: 0, colId: 'c', oldValue: 1, newValue: 2, rowData: {} });
      const stack = service.getUndoStack();
      expect(stack.length).toBe(1);
    });

    it('should get redo stack', () => {
      service.recordEdit({ rowIndex: 0, colId: 'c', oldValue: 1, newValue: 2, rowData: {} });
      service.undo();
      const stack = service.getRedoStack();
      expect(stack.length).toBe(1);
    });

    it('should return copies of stacks', () => {
      service.recordEdit({ rowIndex: 0, colId: 'c', oldValue: 1, newValue: 2, rowData: {} });
      const stack = service.getUndoStack();
      expect(stack).toBeDefined();
    });
  });

  describe('Clear Stack', () => {
    it('should clear history with clearStack', () => {
      service.recordEdit({ rowIndex: 0, colId: 'c', oldValue: 1, newValue: 2, rowData: {} });
      service.recordEdit({ rowIndex: 1, colId: 'c', oldValue: 3, newValue: 4, rowData: {} });
      service.clearStack();
      expect(service.canUndo()).toBe(false);
      expect(service.canRedo()).toBe(false);
    });

    it('should clear history with clear (alias)', () => {
      service.recordEdit({ rowIndex: 0, colId: 'c', oldValue: 1, newValue: 2, rowData: {} });
      service.clear();
      expect(service.canUndo()).toBe(false);
      expect(service.canRedo()).toBe(false);
    });
  });

  describe('setMaxStackItems', () => {
    it('should set max stack size', () => {
      service.setMaxStackItems(10);
      expect(service.getMaxStackItems()).toBe(10);
    });

    it('should trim existing stacks when reducing max size', () => {
      for (let i = 0; i < 5; i++) {
        service.recordEdit({ rowIndex: i, colId: 'c', oldValue: i, newValue: i + 1, rowData: {} });
      }
      service.setMaxStackItems(2);
      expect(service.getUndoStackSize()).toBe(2);
    });

    it('should trim redo stack when reducing max size', () => {
      for (let i = 0; i < 5; i++) {
        service.recordEdit({ rowIndex: i, colId: 'c', oldValue: i, newValue: i + 1, rowData: {} });
      }
      // Undo 3 items
      service.undo();
      service.undo();
      service.undo();
      expect(service.getRedoStackSize()).toBe(3);
      service.setMaxStackItems(2);
      expect(service.getRedoStackSize()).toBe(2);
    });
  });

  describe('Mixed Operation Types', () => {
    it('should handle mixed operation types in undo/redo', () => {
      service.recordEdit({ rowIndex: 0, colId: 'name', oldValue: 'a', newValue: 'b', rowData: {} });
      service.recordColumnResize({ colId: 'name', oldWidth: 100, newWidth: 200 });
      service.recordSortChange({ colId: 'age', oldSort: null, newSort: 'asc' });
      service.recordFilterChange({ colId: 'name', oldFilter: null, newFilter: { type: 'contains', filter: 'test' } });

      expect(service.getUndoStackSize()).toBe(4);

      // Undo all
      const a1 = service.undo();
      expect(a1.type).toBe('filterChange');
      const a2 = service.undo();
      expect(a2.type).toBe('sortChange');
      const a3 = service.undo();
      expect(a3.type).toBe('columnResize');
      const a4 = service.undo();
      expect(a4.type).toBe('edit');

      // Redo all
      const r1 = service.redo();
      expect(r1.type).toBe('edit');
      const r2 = service.redo();
      expect(r2.type).toBe('columnResize');
      const r3 = service.redo();
      expect(r3.type).toBe('sortChange');
      const r4 = service.redo();
      expect(r4.type).toBe('filterChange');
    });
  });

  describe('Stack Changed Callback', () => {
    it('should call stack changed callback on record', () => {
      let called = false;
      service.onStackChangedEvent(() => { called = true; });
      service.recordEdit({ rowIndex: 0, colId: 'c', oldValue: 1, newValue: 2, rowData: {} });
      expect(called).toBe(true);
    });

    it('should call stack changed callback on undo', () => {
      let called = false;
      service.recordEdit({ rowIndex: 0, colId: 'c', oldValue: 1, newValue: 2, rowData: {} });
      service.onStackChangedEvent(() => { called = true; });
      service.undo();
      expect(called).toBe(true);
    });

    it('should call stack changed callback on setMaxStackItems', () => {
      let called = false;
      service.onStackChangedEvent(() => { called = true; });
      service.setMaxStackItems(20);
      expect(called).toBe(true);
    });
  });

  describe('Destroy', () => {
    it('should clear history on destroy', () => {
      service.recordEdit({ rowIndex: 0, colId: 'c', oldValue: 1, newValue: 2, rowData: {} });
      service.destroy();
      expect(service.canUndo()).toBe(false);
    });
  });
});
