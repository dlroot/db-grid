import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CellEditService, CellEditParams, CellEditorConfig } from './edit.service';

describe('CellEditService', () => {
  let service: CellEditService;

  beforeEach(() => {
    service = new CellEditService();
  });

  describe('initialize', () => {
    it('should initialize with default values when no config provided', () => {
      service.initialize();
      expect(service.isEnabled()).toBe(false);
      expect(service.isEditOnDoubleClick()).toBe(true);
      expect(service.isEditOnClick()).toBe(false);
      expect(service.isSingleClickEdit()).toBe(false);
    });

    it('should initialize with custom config', () => {
      const config: CellEditorConfig = {
        enableCellEdit: true,
        editOnDoubleClick: false,
        editOnClick: true,
        singleClickEdit: true,
      };
      service.initialize(config);
      expect(service.isEnabled()).toBe(true);
      expect(service.isEditOnDoubleClick()).toBe(false);
      expect(service.isEditOnClick()).toBe(true);
      expect(service.isSingleClickEdit()).toBe(true);
    });

    it('should use partial config with defaults', () => {
      const config: CellEditorConfig = {
        enableCellEdit: true,
      };
      service.initialize(config);
      expect(service.isEnabled()).toBe(true);
      expect(service.isEditOnDoubleClick()).toBe(true);
      expect(service.isEditOnClick()).toBe(false);
      expect(service.isSingleClickEdit()).toBe(false);
    });

    it('should handle undefined config properties', () => {
      const config: CellEditorConfig = {};
      service.initialize(config);
      expect(service.isEnabled()).toBe(false);
      expect(service.isEditOnDoubleClick()).toBe(true);
    });
  });

  describe('enableEditing / disableEditing', () => {
    it('should enable editing', () => {
      service.enableEditing();
      expect(service.isEnabled()).toBe(true);
    });

    it('should disable editing', () => {
      service.enableEditing();
      service.disableEditing();
      expect(service.isEnabled()).toBe(false);
    });

    it('should toggle editing state', () => {
      expect(service.isEnabled()).toBe(false);
      service.enableEditing();
      expect(service.isEnabled()).toBe(true);
      service.disableEditing();
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('getter methods', () => {
    beforeEach(() => {
      service.initialize({
        enableCellEdit: true,
        editOnDoubleClick: false,
        editOnClick: true,
        singleClickEdit: true,
      });
    });

    it('isEnabled should return true', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('isEditOnDoubleClick should return false', () => {
      expect(service.isEditOnDoubleClick()).toBe(false);
    });

    it('isEditOnClick should return true', () => {
      expect(service.isEditOnClick()).toBe(true);
    });

    it('isSingleClickEdit should return true', () => {
      expect(service.isSingleClickEdit()).toBe(true);
    });
  });

  describe('onCellValueChanged', () => {
    it('should subscribe to value changes', () => {
      const callback = vi.fn();
      service.onCellValueChanged(callback);
      const params: CellEditParams = {
        rowIndex: 0,
        colDef: { field: 'name' },
        oldValue: 'old',
        newValue: 'new',
      };
      service.emitCellValueChanged(params);
      expect(callback).toHaveBeenCalledWith(params);
    });

    it('should emit to multiple subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      service.onCellValueChanged(callback1);
      service.onCellValueChanged(callback2);
      const params: CellEditParams = {
        rowIndex: 0,
        colDef: { field: 'name' },
        oldValue: 'old',
        newValue: 'new',
      };
      service.emitCellValueChanged(params);
      expect(callback1).toHaveBeenCalledWith(params);
      expect(callback2).toHaveBeenCalledWith(params);
    });

    it('should emit multiple value changes', () => {
      const callback = vi.fn();
      service.onCellValueChanged(callback);
      service.emitCellValueChanged({
        rowIndex: 0,
        colDef: { field: 'name' },
        oldValue: 'a',
        newValue: 'b',
      });
      service.emitCellValueChanged({
        rowIndex: 1,
        colDef: { field: 'age' },
        oldValue: 10,
        newValue: 20,
      });
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('getDefaultEditors', () => {
    it('should return object with text, number, select, boolean editors', () => {
      const editors = service.getDefaultEditors();
      expect(editors).toHaveProperty('text');
      expect(editors).toHaveProperty('number');
      expect(editors).toHaveProperty('select');
      expect(editors).toHaveProperty('boolean');
    });

    describe('text editor', () => {
      it('should create text input element', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.text.createEditor({
          value: 'test value',
          colDef: { field: 'name' },
        });
        expect(editor.editorElement.tagName).toBe('INPUT');
        expect((editor.editorElement as HTMLInputElement).type).toBe('text');
        expect(editor.getValue()).toBe('test value');
      });

      it('should handle empty value', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.text.createEditor({
          value: null,
          colDef: { field: 'name' },
        });
        expect(editor.getValue()).toBe('');
      });

      it('should set value', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.text.createEditor({ value: 'old', colDef: {} });
        editor.setValue('new value');
        expect(editor.getValue()).toBe('new value');
      });

      it('should focus and select', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.text.createEditor({ value: 'test', colDef: {} });
        const input = editor.editorElement as HTMLInputElement;
        const focusSpy = vi.spyOn(input, 'focus');
        const selectSpy = vi.spyOn(input, 'select');
        editor.focus();
        expect(focusSpy).toHaveBeenCalled();
        expect(selectSpy).toHaveBeenCalled();
      });

      it('should destroy element', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.text.createEditor({ value: 'test', colDef: {} });
        document.body.appendChild(editor.editorElement);
        expect(document.body.contains(editor.editorElement)).toBe(true);
        editor.destroy();
        expect(document.body.contains(editor.editorElement)).toBe(false);
      });

      it('isPopup should return false', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.text.createEditor({ value: 'test', colDef: {} });
        expect(editor.isPopup()).toBe(false);
      });

      it('isCancelBeforeStart and isCancelAfterEnd should return false', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.text.createEditor({ value: 'test', colDef: {} });
        expect(editor.isCancelBeforeStart()).toBe(false);
        expect(editor.isCancelAfterEnd()).toBe(false);
      });
    });

    describe('number editor', () => {
      it('should create number input element', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.number.createEditor({
          value: 42,
          colDef: { field: 'age' },
        });
        expect(editor.editorElement.tagName).toBe('INPUT');
        expect((editor.editorElement as HTMLInputElement).type).toBe('number');
        expect(editor.getValue()).toBe(42);
      });

      it('should return null for empty string', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.number.createEditor({
          value: null,
          colDef: { field: 'age' },
        });
        expect(editor.getValue()).toBe(null);
      });

      it('should convert string to number', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.number.createEditor({ value: 10, colDef: {} });
        const input = editor.editorElement as HTMLInputElement;
        input.value = '123.45';
        expect(editor.getValue()).toBe(123.45);
      });

      it('should handle zero', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.number.createEditor({ value: 0, colDef: {} });
        expect(editor.getValue()).toBe(0);
      });

      it('should set numeric value', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.number.createEditor({ value: 0, colDef: {} });
        editor.setValue(99.9);
        expect(editor.getValue()).toBe(99.9);
      });
    });

    describe('select editor', () => {
      it('should create select element with options', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.select.createEditor({
          value: 'option1',
          colDef: {
            field: 'status',
            cellEditorParams: {
              values: ['option1', 'option2', 'option3'],
            },
          },
        });
        expect(editor.editorElement.tagName).toBe('SELECT');
        expect(editor.getValue()).toBe('option1');
      });

      it('should handle object options with label/value', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.select.createEditor({
          value: 'val2',
          colDef: {
            field: 'status',
            cellEditorParams: {
              values: [
                { label: 'Label 1', value: 'val1' },
                { label: 'Label 2', value: 'val2' },
              ],
            },
          },
        });
        expect(editor.getValue()).toBe('val2');
        const select = editor.editorElement as HTMLSelectElement;
        expect(select.options[0].textContent).toBe('Label 1');
        expect(select.options[1].textContent).toBe('Label 2');
      });

      it('should handle empty options array', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.select.createEditor({
          value: null,
          colDef: {
            field: 'status',
            cellEditorParams: { values: [] },
          },
        });
        const select = editor.editorElement as HTMLSelectElement;
        expect(select.options.length).toBe(0);
      });

      it('should set selected value', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.select.createEditor({
          value: 'a',
          colDef: {
            cellEditorParams: { values: ['a', 'b', 'c'] },
          },
        });
        editor.setValue('c');
        expect(editor.getValue()).toBe('c');
      });

      it('should handle no cellEditorParams', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.select.createEditor({
          value: null,
          colDef: {},
        });
        const select = editor.editorElement as HTMLSelectElement;
        expect(select.options.length).toBe(0);
      });
    });

    describe('boolean editor', () => {
      it('should create checkbox element', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.boolean.createEditor({
          value: true,
          colDef: { field: 'active' },
        });
        expect(editor.editorElement.tagName).toBe('DIV');
        const checkbox = editor.editorElement.querySelector('input[type="checkbox"]');
        expect(checkbox).toBeTruthy();
        expect(editor.getValue()).toBe(true);
      });

      it('should handle false value', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.boolean.createEditor({
          value: false,
          colDef: { field: 'active' },
        });
        expect(editor.getValue()).toBe(false);
      });

      it('should handle truthy/falsy values', () => {
        const editors = service.getDefaultEditors();
        const editor1 = editors.boolean.createEditor({ value: 1, colDef: {} });
        expect(editor1.getValue()).toBe(true);
        const editor2 = editors.boolean.createEditor({ value: 0, colDef: {} });
        expect(editor2.getValue()).toBe(false);
        const editor3 = editors.boolean.createEditor({ value: null, colDef: {} });
        expect(editor3.getValue()).toBe(false);
      });

      it('should set value', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.boolean.createEditor({ value: false, colDef: {} });
        editor.setValue(true);
        expect(editor.getValue()).toBe(true);
      });

      it('should focus checkbox', () => {
        const editors = service.getDefaultEditors();
        const editor = editors.boolean.createEditor({ value: true, colDef: {} });
        const checkbox = editor.editorElement.querySelector('input') as HTMLInputElement;
        const focusSpy = vi.spyOn(checkbox, 'focus');
        editor.focus();
        expect(focusSpy).toHaveBeenCalled();
      });
    });
  });

  describe('destroy', () => {
    it('should complete the subject', () => {
      const callback = vi.fn();
      service.onCellValueChanged(callback);
      service.destroy();
      service.emitCellValueChanged({
        rowIndex: 0,
        colDef: {},
        oldValue: 'a',
        newValue: 'b',
      });
      // After complete, the callback should not be called
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle initialize called multiple times', () => {
      service.initialize({ enableCellEdit: true });
      expect(service.isEnabled()).toBe(true);
      service.initialize({ enableCellEdit: false });
      expect(service.isEnabled()).toBe(false);
    });

    it('should handle value change with complex objects', () => {
      const callback = vi.fn();
      service.onCellValueChanged(callback);
      const complexOldValue = { nested: { value: 'old' } };
      const complexNewValue = { nested: { value: 'new' } };
      service.emitCellValueChanged({
        rowIndex: 0,
        colDef: { field: 'data' },
        oldValue: complexOldValue,
        newValue: complexNewValue,
      });
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          oldValue: complexOldValue,
          newValue: complexNewValue,
        })
      );
    });

    it('should handle undefined value in text editor', () => {
      const editors = service.getDefaultEditors();
      const editor = editors.text.createEditor({ value: undefined, colDef: {} });
      expect(editor.getValue()).toBe('');
    });

    it('should handle undefined value in number editor', () => {
      const editors = service.getDefaultEditors();
      const editor = editors.number.createEditor({ value: undefined, colDef: {} });
      const input = editor.editorElement as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });
});
