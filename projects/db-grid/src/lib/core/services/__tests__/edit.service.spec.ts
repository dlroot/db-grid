/// <reference types='vitest' />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CellEditService, CellEditParams, CellEditorConfig } from '../edit.service';

describe('CellEditService', () => {
  let service: CellEditService;

  beforeEach(() => {
    service = new CellEditService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialize', () => {
    it('should initialize with default config when no config provided', () => {
      service.initialize();
      expect(service.isEnabled()).toBe(false);
      expect(service.isEditOnDoubleClick()).toBe(true);
      expect(service.isEditOnClick()).toBe(false);
      expect(service.isSingleClickEdit()).toBe(false);
    });

    it('should initialize with enableCellEdit true', () => {
      service.initialize({ enableCellEdit: true });
      expect(service.isEnabled()).toBe(true);
    });

    it('should initialize with enableCellEdit false', () => {
      service.initialize({ enableCellEdit: false });
      expect(service.isEnabled()).toBe(false);
    });

    it('should initialize with editOnDoubleClick false', () => {
      service.initialize({ editOnDoubleClick: false });
      expect(service.isEditOnDoubleClick()).toBe(false);
    });

    it('should initialize with editOnClick true', () => {
      service.initialize({ editOnClick: true });
      expect(service.isEditOnClick()).toBe(true);
    });

    it('should initialize with singleClickEdit true', () => {
      service.initialize({ singleClickEdit: true });
      expect(service.isSingleClickEdit()).toBe(true);
    });

    it('should initialize with full config', () => {
      service.initialize({
        enableCellEdit: true,
        editOnDoubleClick: false,
        editOnClick: true,
        singleClickEdit: true,
      });
      expect(service.isEnabled()).toBe(true);
      expect(service.isEditOnDoubleClick()).toBe(false);
      expect(service.isEditOnClick()).toBe(true);
      expect(service.isSingleClickEdit()).toBe(true);
    });
  });

  describe('isEnabled', () => {
    it('should return false by default', () => {
      expect(service.isEnabled()).toBe(false);
    });

    it('should return true after enableEditing', () => {
      service.enableEditing();
      expect(service.isEnabled()).toBe(true);
    });

    it('should return false after disableEditing', () => {
      service.enableEditing();
      service.disableEditing();
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('enableEditing / disableEditing', () => {
    it('should toggle enabled state', () => {
      service.enableEditing();
      expect(service.isEnabled()).toBe(true);
      service.disableEditing();
      expect(service.isEnabled()).toBe(false);
    });

    it('should be idempotent', () => {
      service.enableEditing();
      service.enableEditing();
      expect(service.isEnabled()).toBe(true);
      service.disableEditing();
      service.disableEditing();
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('onCellValueChanged / emitCellValueChanged', () => {
    it('should emit cell value change events', () => {
      const callback = vi.fn();
      service.onCellValueChanged(callback);

      const params: CellEditParams = {
        rowIndex: 0,
        colDef: { field: 'name' },
        oldValue: 'Alice',
        newValue: 'Bob',
      };

      service.emitCellValueChanged(params);
      expect(callback).toHaveBeenCalledWith(params);
    });

    it('should notify multiple subscribers', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      service.onCellValueChanged(cb1);
      service.onCellValueChanged(cb2);

      const params: CellEditParams = {
        rowIndex: 0,
        colDef: { field: 'name' },
        oldValue: 'A',
        newValue: 'B',
      };

      service.emitCellValueChanged(params);
      expect(cb1).toHaveBeenCalledWith(params);
      expect(cb2).toHaveBeenCalledWith(params);
    });

    it('should emit events with various param values', () => {
      const callback = vi.fn();
      service.onCellValueChanged(callback);

      service.emitCellValueChanged({
        rowIndex: 5,
        colDef: { field: 'price' },
        oldValue: 100,
        newValue: 200,
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          rowIndex: 5,
          oldValue: 100,
          newValue: 200,
        }),
      );
    });
  });

  describe('getDefaultEditors', () => {
    it('should return an object with text, number, select, and boolean editors', () => {
      const editors = service.getDefaultEditors();
      expect(editors.text).toBeDefined();
      expect(editors.number).toBeDefined();
      expect(editors.select).toBeDefined();
      expect(editors.boolean).toBeDefined();
    });

    describe('text editor', () => {
      it('should create a text input editor', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.text.createEditor({ value: 'hello' });

        expect(editor.editorElement).toBeDefined();
        expect(editor.editorElement.tagName).toBe('INPUT');
        expect((editor.editorElement as HTMLInputElement).type).toBe('text');
        expect(editor.getValue()).toBe('hello');
      });

      it('should handle empty value', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.text.createEditor({ value: '' });
        expect(editor.getValue()).toBe('');
      });

      it('should handle undefined value', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.text.createEditor({ value: undefined });
        expect(editor.getValue()).toBe('');
      });

      it('should set value', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.text.createEditor({ value: '' });
        editor.setValue('new value');
        expect(editor.getValue()).toBe('new value');
      });

      it('should set null value as empty string', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.text.createEditor({ value: 'test' });
        editor.setValue(null);
        expect(editor.getValue()).toBe('');
      });

      it('should have isPopup return false', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.text.createEditor({ value: '' });
        expect(editor.isPopup()).toBe(false);
      });

      it('should have isCancelBeforeStart return false', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.text.createEditor({ value: '' });
        expect(editor.isCancelBeforeStart()).toBe(false);
      });

      it('should have isCancelAfterEnd return false', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.text.createEditor({ value: '' });
        expect(editor.isCancelAfterEnd()).toBe(false);
      });

      it('should focus and select', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.text.createEditor({ value: 'test' });
        // Should not throw
        expect(() => editor.focus()).not.toThrow();
      });

      it('should destroy editor element', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.text.createEditor({ value: '' });
        expect(() => editor.destroy()).not.toThrow();
      });
    });

    describe('number editor', () => {
      it('should create a number input editor', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.number.createEditor({ value: 42 });
        expect(editor.editorElement.tagName).toBe('INPUT');
        expect((editor.editorElement as HTMLInputElement).type).toBe('number');
        expect(editor.getValue()).toBe(42);
      });

      it('should return null for empty input', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.number.createEditor({ value: '' });
        expect(editor.getValue()).toBeNull();
      });

      it('should return Number for numeric string', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.number.createEditor({ value: '123' });
        // The input value will be set as '123', getValue parses it
        expect(editor.getValue()).toBe(123);
      });

      it('should handle undefined value', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.number.createEditor({ value: undefined });
        expect(editor.getValue()).toBeNull();
      });

      it('should set value', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.number.createEditor({ value: 0 });
        editor.setValue(99);
        expect(editor.getValue()).toBe(99);
      });
    });

    describe('select editor', () => {
      it('should create a select editor with options', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.select.createEditor({
          value: 'a',
          colDef: { cellEditorParams: { values: ['a', 'b', 'c'] } },
        });
        expect(editor.editorElement.tagName).toBe('SELECT');
        expect(editor.getValue()).toBe('a');
      });

      it('should handle object options', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.select.createEditor({
          value: '1',
          colDef: {
            cellEditorParams: {
              values: [
                { value: '1', label: 'One' },
                { value: '2', label: 'Two' },
              ],
            },
          },
        });
        expect(editor.editorElement.tagName).toBe('SELECT');
        expect(editor.getValue()).toBe('1');
      });

      it('should handle empty options', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.select.createEditor({
          value: '',
          colDef: { cellEditorParams: { values: [] } },
        });
        expect(editor.editorElement.tagName).toBe('SELECT');
      });

      it('should handle missing cellEditorParams', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.select.createEditor({
          value: '',
          colDef: {},
        });
        expect(editor.editorElement.tagName).toBe('SELECT');
      });

      it('should set value', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.select.createEditor({
          value: 'a',
          colDef: { cellEditorParams: { values: ['a', 'b', 'c'] } },
        });
        editor.setValue('b');
        expect(editor.getValue()).toBe('b');
      });

      it('should set null/undefined value as empty string', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.select.createEditor({
          value: 'a',
          colDef: { cellEditorParams: { values: ['a', 'b'] } },
        });
        editor.setValue(null);
        expect(editor.getValue()).toBe('');
      });
    });

    describe('boolean editor', () => {
      it('should create a checkbox editor with true value', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.boolean.createEditor({ value: true });
        expect(editor.getValue()).toBe(true);
      });

      it('should create a checkbox editor with false value', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.boolean.createEditor({ value: false });
        expect(editor.getValue()).toBe(false);
      });

      it('should create a checkbox editor with falsy value', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.boolean.createEditor({ value: 0 });
        expect(editor.getValue()).toBe(false);
      });

      it('should set value', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.boolean.createEditor({ value: false });
        editor.setValue(true);
        expect(editor.getValue()).toBe(true);
      });

      it('should set value with truthy', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.boolean.createEditor({ value: false });
        editor.setValue(1);
        expect(editor.getValue()).toBe(true);
      });

      it('should have isPopup return false', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.boolean.createEditor({ value: true });
        expect(editor.isPopup()).toBe(false);
      });

      it('should focus without error', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.boolean.createEditor({ value: true });
        expect(() => editor.focus()).not.toThrow();
      });

      it('should destroy without error', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.boolean.createEditor({ value: true });
        expect(() => editor.destroy()).not.toThrow();
      });
    });
  });

  describe('destroy', () => {
    it('should complete the onCellValueChanged subject', () => {
      const callback = vi.fn();
      service.onCellValueChanged(callback);
      service.destroy();
      // After destroy, emitting should not call callback (subject completed)
      expect(() => service.emitCellValueChanged({
        rowIndex: 0,
        colDef: {},
        oldValue: null,
        newValue: null,
      })).not.toThrow();
    });
  });
});
