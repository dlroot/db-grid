import { describe, it, expect, beforeEach } from '@angular/core/testing';
import { EditorService } from './editor.service';
import { ColDef } from '../models';

describe('EditorService', () => {
  let service: EditorService;

  beforeEach(() => {
    service = new EditorService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Editor Type Resolution', () => {
    it('should resolve text editor', () => {
      const colDef: ColDef = { field: 'name', cellEditor: 'text' };
      expect(service.resolveEditorType(colDef)).toBe('agTextCellEditor');
    });

    it('should resolve number editor', () => {
      const colDef: ColDef = { field: 'age', cellEditor: 'number' };
      expect(service.resolveEditorType(colDef)).toBe('agNumberCellEditor');
    });

    it('should resolve select editor', () => {
      const colDef: ColDef = { field: 'status', cellEditor: 'select' };
      expect(service.resolveEditorType(colDef)).toBe('agSelectCellEditor');
    });

    it('should resolve date editor', () => {
      const colDef: ColDef = { field: 'date', cellEditor: 'date' };
      expect(service.resolveEditorType(colDef)).toBe('agDateCellEditor');
    });

    it('should resolve checkbox editor', () => {
      const colDef: ColDef = { field: 'active', cellEditor: 'checkbox' };
      expect(service.resolveEditorType(colDef)).toBe('agCheckboxCellEditor');
    });

    it('should resolve textarea editor', () => {
      const colDef: ColDef = { field: 'notes', cellEditor: 'largeText' };
      expect(service.resolveEditorType(colDef)).toBe('agLargeTextCellEditor');
    });

    it('should resolve richSelect editor', () => {
      const colDef: ColDef = { field: 'category', cellEditor: 'richSelect' };
      expect(service.resolveEditorType(colDef)).toBe('agRichSelectCellEditor');
    });

    it('should default to text editor', () => {
      const colDef: ColDef = { field: 'name' };
      expect(service.resolveEditorType(colDef)).toBe('agTextCellEditor');
    });
  });

  describe('Editor Session', () => {
    it('should start editing session when cell is editable', () => {
      const colDef: ColDef = { field: 'name', cellEditor: 'text', editable: true };
      const session = service.startEditing('row-1', colDef, 'test value');

      expect(session).toBeTruthy();
      expect(session?.editorType).toBe('agTextCellEditor');
      expect(session?.originalValue).toBe('test value');
    });

    it('should return null when cell is not editable', () => {
      const colDef: ColDef = { field: 'name', cellEditor: 'text' };
      const session = service.startEditing('row-1', colDef, 'value');

      expect(session).toBeNull();
    });

    it('should return null when starting edit on already editing cell', () => {
      const colDef: ColDef = { field: 'name', cellEditor: 'text', editable: true };
      service.startEditing('row-1', colDef, 'value1');
      const session2 = service.startEditing('row-1', colDef, 'value2');

      expect(session2).toBeNull();
    });

    it('should update value during editing', () => {
      const colDef: ColDef = { field: 'name', cellEditor: 'text', editable: true };
      service.startEditing('row-1', colDef, 'initial');
      service.updateValue('updated');

      expect(service.getActiveSession()?.currentValue).toBe('updated');
    });

    it('should commit editing', () => {
      const colDef: ColDef = { field: 'name', cellEditor: 'text', editable: true };
      service.startEditing('row-1', colDef, 'value');
      service.updateValue('new value');
      const result = service.commitEdit();

      expect(result).toBeTruthy();
      expect(result?.newValue).toBe('new value');
      expect(service.isEditing()).toBe(false);
    });

    it('should cancel editing', () => {
      const colDef: ColDef = { field: 'name', cellEditor: 'text', editable: true };
      service.startEditing('row-1', colDef, 'value');
      service.updateValue('new value');
      service.cancelEdit();

      expect(service.isEditing()).toBe(false);
    });
  });

  describe('Value Parsing', () => {
    it('should parse number value', () => {
      expect(service.parseValue('25', 'agNumberCellEditor')).toBe(25);
      expect(service.parseValue('25.5', 'agNumberCellEditor')).toBe(25.5);
      expect(service.parseValue('', 'agNumberCellEditor')).toBeNull();
    });

    it('should parse boolean value', () => {
      expect(service.parseValue('true', 'agCheckboxCellEditor')).toBe(true);
      expect(service.parseValue(true, 'agCheckboxCellEditor')).toBe(true);
      expect(service.parseValue('false', 'agCheckboxCellEditor')).toBe(false);
      expect(service.parseValue(false, 'agCheckboxCellEditor')).toBe(false);
    });

    it('should return string for text editor', () => {
      expect(service.parseValue('hello', 'agTextCellEditor')).toBe('hello');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should start edit on character key', () => {
      expect(service.shouldStartEditOnKey('a')).toBe(true);
      expect(service.shouldStartEditOnKey('1')).toBe(true);
    });

    it('should start edit on Enter and F2', () => {
      expect(service.shouldStartEditOnKey('Enter')).toBe(true);
      expect(service.shouldStartEditOnKey('F2')).toBe(true);
    });

    it('should not start edit on Escape', () => {
      expect(service.shouldStartEditOnKey('Escape')).toBe(false);
    });

    it('should commit on Enter and Tab', () => {
      expect(service.shouldCommitOnKey('Enter')).toBe(true);
      expect(service.shouldCommitOnKey('Tab')).toBe(true);
    });

    it('should cancel on Escape', () => {
      expect(service.shouldCancelOnKey('Escape')).toBe(true);
      expect(service.shouldCancelOnKey('Enter')).toBe(false);
    });
  });

  describe('Editing State', () => {
    it('should track editing state', () => {
      const colDef: ColDef = { field: 'name', cellEditor: 'text', editable: true };

      expect(service.isEditing()).toBe(false);
      service.startEditing('row-1', colDef, 'value');
      expect(service.isEditing()).toBe(true);
      service.commitEdit();
      expect(service.isEditing()).toBe(false);
    });

    it('should get active session', () => {
      const colDef: ColDef = { field: 'name', cellEditor: 'text', editable: true };
      service.startEditing('row-1', colDef, 'value');

      expect(service.getActiveSession()).toBeTruthy();
      service.commitEdit();
      expect(service.getActiveSession()).toBeNull();
    });
  });

  describe('Builtin Editors', () => {
    it('should return list of builtin editors', () => {
      const editors = service.getBuiltinEditors();
      expect(editors).toContain('agTextCellEditor');
      expect(editors).toContain('agNumberCellEditor');
      expect(editors).toContain('agSelectCellEditor');
    });
  });
});
