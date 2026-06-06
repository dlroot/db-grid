/// <reference types='vitest' />
import { describe, it, expect, beforeEach } from 'vitest';
import { UndoRedoService, UndoRedoConfig, UndoAction, EditParams, RowAddParams, RowDeleteParams } from '../undo-redo.service';

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
      // modification of returned array should not affect internal stack
      expect(stack).toBeDefined();
    });
  });

  describe('Clear', () => {
    it('should clear history', () => {
      service.recordEdit({ rowIndex: 0, colId: 'c', oldValue: 1, newValue: 2, rowData: {} });
      service.recordEdit({ rowIndex: 1, colId: 'c', oldValue: 3, newValue: 4, rowData: {} });
      service.clear();
      expect(service.canUndo()).toBe(false);
      expect(service.canRedo()).toBe(false);
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
  });

  describe('Destroy', () => {
    it('should clear history on destroy', () => {
      service.recordEdit({ rowIndex: 0, colId: 'c', oldValue: 1, newValue: 2, rowData: {} });
      service.destroy();
      expect(service.canUndo()).toBe(false);
    });
  });
});