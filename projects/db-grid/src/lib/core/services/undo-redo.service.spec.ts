/**
 * UndoRedoService 单元测试
 * 测试撤销/重做功能：编辑历史、行操作、栈管理
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UndoRedoService, UndoRedoConfig, UndoAction } from './undo-redo.service';

describe('UndoRedoService', () => {
  let service: UndoRedoService;

  beforeEach(() => {
    service = new UndoRedoService();
    service.initialize();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      expect(service.isEnabled()).toBe(true);
      expect(service.getUndoStackSize()).toBe(0);
      expect(service.getRedoStackSize()).toBe(0);
    });

    it('should initialize with custom config', () => {
      const config: UndoRedoConfig = {
        enabled: false,
        maxStackSize: 50,
      };
      service.initialize(config);
      expect(service.isEnabled()).toBe(false);
    });

    it('should clear stacks on initialize', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });
      expect(service.getUndoStackSize()).toBe(1);

      service.initialize();
      expect(service.getUndoStackSize()).toBe(0);
    });
  });

  describe('enable/disable', () => {
    it('should be enabled by default', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('should disable', () => {
      service.disable();
      expect(service.isEnabled()).toBe(false);
    });

    it('should enable', () => {
      service.disable();
      service.enable();
      expect(service.isEnabled()).toBe(true);
    });

    it('should not record when disabled', () => {
      service.disable();
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });
      expect(service.getUndoStackSize()).toBe(0);
    });

    it('should not undo when disabled', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });
      service.disable();
      const result = service.undo();
      expect(result).toBeNull();
    });

    it('should not redo when disabled', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });
      service.undo();
      service.disable();
      const result = service.redo();
      expect(result).toBeNull();
    });
  });

  describe('recordEdit', () => {
    it('should record edit action', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });

      expect(service.getUndoStackSize()).toBe(1);
      expect(service.canUndo()).toBe(true);
    });

    it('should clear redo stack on new edit', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });
      service.undo();

      expect(service.getRedoStackSize()).toBe(1);

      service.recordEdit({
        rowIndex: 1,
        colId: 'name',
        oldValue: 'C',
        newValue: 'D',
        rowData: { name: 'D' },
      });

      expect(service.getRedoStackSize()).toBe(0);
    });

    it('should record multiple edits', () => {
      for (let i = 0; i < 5; i++) {
        service.recordEdit({
          rowIndex: i,
          colId: 'name',
          oldValue: `old${i}`,
          newValue: `new${i}`,
          rowData: { name: `new${i}` },
        });
      }

      expect(service.getUndoStackSize()).toBe(5);
    });

    it('should limit stack size', () => {
      service.initialize({ maxStackSize: 3 });

      for (let i = 0; i < 5; i++) {
        service.recordEdit({
          rowIndex: i,
          colId: 'name',
          oldValue: `old${i}`,
          newValue: `new${i}`,
          rowData: { name: `new${i}` },
        });
      }

      expect(service.getUndoStackSize()).toBe(3);
    });
  });

  describe('recordRowAdd', () => {
    it('should record row add action', () => {
      service.recordRowAdd({
        rowIndex: 0,
        rowData: { id: 1, name: 'New Row' },
      });

      expect(service.getUndoStackSize()).toBe(1);
      const stack = service.getUndoStack();
      expect(stack[0].type).toBe('rowAdd');
    });

    it('should include timestamp', () => {
      service.recordRowAdd({
        rowIndex: 0,
        rowData: { id: 1 },
      });

      const stack = service.getUndoStack();
      expect(stack[0].timestamp).toBeDefined();
      expect(typeof stack[0].timestamp).toBe('number');
    });
  });

  describe('recordRowDelete', () => {
    it('should record row delete action', () => {
      service.recordRowDelete({
        rowIndex: 0,
        rowData: { id: 1, name: 'Deleted Row' },
      });

      expect(service.getUndoStackSize()).toBe(1);
      const stack = service.getUndoStack();
      expect(stack[0].type).toBe('rowDelete');
    });
  });

  describe('undo', () => {
    it('should return null when nothing to undo', () => {
      const result = service.undo();
      expect(result).toBeNull();
    });

    it('should return action on undo', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });

      const action = service.undo();
      expect(action).toBeDefined();
      expect(action?.type).toBe('edit');
      expect(action?.oldValue).toBe('A');
      expect(action?.newValue).toBe('B');
    });

    it('should move action to redo stack', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });

      service.undo();

      expect(service.getUndoStackSize()).toBe(0);
      expect(service.getRedoStackSize()).toBe(1);
    });

    it('should undo multiple actions in LIFO order', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });
      service.recordEdit({
        rowIndex: 1,
        colId: 'name',
        oldValue: 'C',
        newValue: 'D',
        rowData: { name: 'D' },
      });

      const action1 = service.undo();
      expect(action1?.rowIndex).toBe(1);

      const action2 = service.undo();
      expect(action2?.rowIndex).toBe(0);
    });
  });

  describe('redo', () => {
    it('should return null when nothing to redo', () => {
      const result = service.redo();
      expect(result).toBeNull();
    });

    it('should return action on redo', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });
      service.undo();

      const action = service.redo();
      expect(action).toBeDefined();
      expect(action?.type).toBe('edit');
    });

    it('should move action back to undo stack', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });
      service.undo();
      service.redo();

      expect(service.getUndoStackSize()).toBe(1);
      expect(service.getRedoStackSize()).toBe(0);
    });

    it('should redo multiple actions in LIFO order', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });
      service.recordEdit({
        rowIndex: 1,
        colId: 'name',
        oldValue: 'C',
        newValue: 'D',
        rowData: { name: 'D' },
      });
      service.undo();
      service.undo();

      const action1 = service.redo();
      expect(action1?.rowIndex).toBe(0);

      const action2 = service.redo();
      expect(action2?.rowIndex).toBe(1);
    });
  });

  describe('canUndo/canRedo', () => {
    it('should return false when stacks are empty', () => {
      expect(service.canUndo()).toBe(false);
      expect(service.canRedo()).toBe(false);
    });

    it('should return true when undo stack has items', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });
      expect(service.canUndo()).toBe(true);
    });

    it('should return true when redo stack has items', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });
      service.undo();
      expect(service.canRedo()).toBe(true);
    });

    it('should return false when disabled', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });
      service.disable();
      expect(service.canUndo()).toBe(false);
      service.undo();
      expect(service.canRedo()).toBe(false);
    });
  });

  describe('callbacks', () => {
    it('should emit onUndo callback', () => {
      const callback = vi.fn();
      service.onUndoEvent(callback);

      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });
      service.undo();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'edit',
          rowIndex: 0,
        })
      );
    });

    it('should emit onRedo callback', () => {
      const callback = vi.fn();
      service.onRedoEvent(callback);

      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });
      service.undo();
      service.redo();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'edit',
        })
      );
    });

    it('should emit onStackChanged callback', () => {
      const callback = vi.fn();
      service.onStackChangedEvent(callback);

      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });

      expect(callback).toHaveBeenCalled();
    });

    it('should emit stackChanged on undo', () => {
      const callback = vi.fn();
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });

      service.onStackChangedEvent(callback);
      service.undo();

      expect(callback).toHaveBeenCalled();
    });

    it('should emit stackChanged on redo', () => {
      const callback = vi.fn();
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });
      service.undo();

      service.onStackChangedEvent(callback);
      service.redo();

      expect(callback).toHaveBeenCalled();
    });

    it('should emit stackChanged on clear', () => {
      const callback = vi.fn();
      service.onStackChangedEvent(callback);
      service.clear();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('getUndoStack/getRedoStack', () => {
    it('should return copy of undo stack', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });

      const stack1 = service.getUndoStack();
      const stack2 = service.getUndoStack();

      expect(stack1).not.toBe(stack2); // Different references
      expect(stack1).toEqual(stack2); // Same content
    });

    it('should return copy of redo stack', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });
      service.undo();

      const stack1 = service.getRedoStack();
      const stack2 = service.getRedoStack();

      expect(stack1).not.toBe(stack2);
      expect(stack1).toEqual(stack2);
    });
  });

  describe('clear', () => {
    it('should clear both stacks', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });
      service.undo();

      service.clear();

      expect(service.getUndoStackSize()).toBe(0);
      expect(service.getRedoStackSize()).toBe(0);
    });
  });

  describe('destroy', () => {
    it('should clear stacks and callbacks', () => {
      const callback = vi.fn();
      service.onUndoEvent(callback);

      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });
      service.destroy();

      expect(service.getUndoStackSize()).toBe(0);
      // Callback should be cleared
    });
  });

  describe('mixed actions', () => {
    it('should handle edit, rowAdd, rowDelete together', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });
      service.recordRowAdd({
        rowIndex: 1,
        rowData: { id: 2 },
      });
      service.recordRowDelete({
        rowIndex: 2,
        rowData: { id: 3 },
      });

      expect(service.getUndoStackSize()).toBe(3);

      const deleteAction = service.undo();
      expect(deleteAction?.type).toBe('rowDelete');

      const addAction = service.undo();
      expect(addAction?.type).toBe('rowAdd');

      const editAction = service.undo();
      expect(editAction?.type).toBe('edit');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined values', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: undefined,
        newValue: 'B',
        rowData: { name: 'B' },
      });

      const action = service.undo();
      expect(action?.oldValue).toBeUndefined();
    });

    it('should handle null values', () => {
      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: null,
        newValue: 'B',
        rowData: { name: 'B' },
      });

      const action = service.undo();
      expect(action?.oldValue).toBeNull();
    });

    it('should handle complex rowData objects', () => {
      const complexData = {
        id: 1,
        nested: { a: 1, b: { c: 2 } },
        array: [1, 2, 3],
      };

      service.recordEdit({
        rowIndex: 0,
        colId: 'data',
        oldValue: null,
        newValue: complexData,
        rowData: complexData,
      });

      const action = service.undo();
      expect(action?.newValue).toEqual(complexData);
    });

    it('should handle max stack size of 1', () => {
      service.initialize({ maxStackSize: 1 });

      service.recordEdit({
        rowIndex: 0,
        colId: 'name',
        oldValue: 'A',
        newValue: 'B',
        rowData: { name: 'B' },
      });
      service.recordEdit({
        rowIndex: 1,
        colId: 'name',
        oldValue: 'C',
        newValue: 'D',
        rowData: { name: 'D' },
      });

      expect(service.getUndoStackSize()).toBe(1);
      const action = service.undo();
      expect(action?.rowIndex).toBe(1);
    });
  });
});
