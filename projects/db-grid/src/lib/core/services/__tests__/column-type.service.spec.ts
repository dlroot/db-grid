// @ts-nocheck
/// <reference types='vitest' />
import { describe, it, expect, beforeEach } from 'vitest';
import { ColumnTypeService } from '../column-type.service';

describe('ColumnTypeService', () => {
  let service: ColumnTypeService;

  beforeEach(() => {
    service = new ColumnTypeService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Built-in Column Types', () => {
    it('should have textColumn type', () => {
      const type = service.getColumnType('textColumn');
      expect(type).toBeDefined();
      expect(type.filter).toBe('text');
      expect(type.editable).toBe(true);
      expect(type.sortable).toBe(true);
      expect(type.resizable).toBe(true);
    });

    it('should have numberColumn type', () => {
      const type = service.getColumnType('numberColumn');
      expect(type).toBeDefined();
      expect(type.filter).toBe('number');
      expect(type.editable).toBe(true);
      expect(type.cellAlign).toBe('right');
    });

    it('should have dateColumn type', () => {
      const type = service.getColumnType('dateColumn');
      expect(type).toBeDefined();
      expect(type.filter).toBe('date');
      expect(type.cellRenderer).toBe('dateRenderer');
    });

    it('should have booleanColumn type', () => {
      const type = service.getColumnType('booleanColumn');
      expect(type).toBeDefined();
      expect(type.filter).toBe('boolean');
      expect(type.cellRenderer).toBe('booleanRenderer');
    });

    it('should have largeTextColumn type', () => {
      const type = service.getColumnType('largeTextColumn');
      expect(type).toBeDefined();
      expect(type.cellEditor).toBe('textarea');
    });

    it('should have percentageColumn type', () => {
      const type = service.getColumnType('percentageColumn');
      expect(type).toBeDefined();
      expect(type.filter).toBe('number');
      expect(type.cellAlign).toBe('right');
      expect(type.valueFormatter).toBeDefined();
    });

    it('should return undefined for unknown type', () => {
      expect(service.getColumnType('unknown')).toBeUndefined();
    });
  });

  describe('Register Custom Types', () => {
    it('should register a custom column type', () => {
      service.registerColumnType('currencyColumn', {
        filter: 'number',
        editable: true,
        cellAlign: 'right',
        valueFormatter: (params) => '$' + params.value,
      });
      const type = service.getColumnType('currencyColumn');
      expect(type).toBeDefined();
      expect(type.filter).toBe('number');
      expect(type.cellAlign).toBe('right');
    });

    it('should override a built-in type', () => {
      service.registerColumnType('textColumn', { filter: 'text', editable: false });
      const type = service.getColumnType('textColumn');
      expect(type.editable).toBe(false);
    });

    it('should register multiple types at once', () => {
      service.registerColumnTypes({
        customA: { filter: 'text', sortable: true },
        customB: { filter: 'number', cellAlign: 'right' },
      });
      expect(service.getColumnType('customA')).toBeDefined();
      expect(service.getColumnType('customB')).toBeDefined();
    });
  });

  describe('Type Name Queries', () => {
    it('should list all type names', () => {
      const names = service.getTypeNames();
      expect(names).toContain('textColumn');
      expect(names).toContain('numberColumn');
      expect(names).toContain('dateColumn');
    });

    it('should list builtin type names', () => {
      const names = service.getBuiltinTypeNames();
      expect(names.length).toBe(6);
    });

    it('should include custom types in getTypeNames', () => {
      service.registerColumnType('myType', { filter: 'text' });
      const names = service.getTypeNames();
      expect(names).toContain('myType');
    });

    it('should check hasColumnType', () => {
      expect(service.hasColumnType('textColumn')).toBe(true);
      expect(service.hasColumnType('nonExistent')).toBe(false);
    });
  });

  describe('applyColumnTypes', () => {
    it('should apply defaultColDef to all columns', () => {
      const cols = [
        { field: 'name', headerName: 'Name' },
        { field: 'age', headerName: 'Age' },
      ];
      const defaultColDef = { sortable: true, resizable: true };
      const result = service.applyColumnTypes(cols, defaultColDef);

      expect(result[0].sortable).toBe(true);
      expect(result[0].resizable).toBe(true);
      expect(result[1].sortable).toBe(true);
      expect(result[1].resizable).toBe(true);
    });

    it('should apply column type to columns with type property', () => {
      const cols = [
        { field: 'name', headerName: 'Name', type: 'textColumn' },
        { field: 'age', headerName: 'Age', type: 'numberColumn' },
      ];
      const result = service.applyColumnTypes(cols);

      expect(result[0].filter).toBe('text');
      expect(result[0].editable).toBe(true);
      expect(result[1].filter).toBe('number');
      expect(result[1].cellAlign).toBe('right');
    });

    it('should support type as array', () => {
      const cols = [
        { field: 'name', headerName: 'Name', type: ['textColumn'] },
      ];
      const result = service.applyColumnTypes(cols);
      expect(result[0].filter).toBe('text');
    });

    it('should support cellType property', () => {
      const cols = [
        { field: 'name', headerName: 'Name', cellType: 'textColumn' },
      ];
      const result = service.applyColumnTypes(cols);
      expect(result[0].filter).toBe('text');
    });

    it('should merge defaultColDef + columnType + individual overrides', () => {
      const cols = [
        { field: 'name', headerName: 'Name', type: 'textColumn', editable: false },
      ];
      const defaultColDef = { sortable: false, resizable: true, width: 150 };
      const result = service.applyColumnTypes(cols, defaultColDef);

      // defaultColDef: sortable=false, resizable=true, width=150
      // textColumn: filter='text', editable=true, sortable=true, resizable=true
      // individual: editable=false (overrides textColumn's editable=true)
      expect(result[0].filter).toBe('text');       // from type
      expect(result[0].sortable).toBe(true);       // type overrides defaultColDef
      expect(result[0].resizable).toBe(true);       // both have it
      expect(result[0].width).toBe(150);            // from defaultColDef
      expect(result[0].editable).toBe(false);       // individual overrides type
    });

    it('should return original array if no defaultColDef and no types', () => {
      const cols = [
        { field: 'name', headerName: 'Name' },
      ];
      const result = service.applyColumnTypes(cols);
      expect(result).toBe(cols); // same reference
    });

    it('should return original array if empty', () => {
      expect(service.applyColumnTypes([])).toEqual([]);
    });

    it('should use custom column types registered on the service', () => {
      service.registerColumnType('currencyColumn', {
        filter: 'number',
        cellAlign: 'right',
        valueFormatter: (params) => '$' + params.value,
      });
      const cols = [
        { field: 'price', headerName: 'Price', type: 'currencyColumn' },
      ];
      const result = service.applyColumnTypes(cols);
      expect(result[0].filter).toBe('number');
      expect(result[0].cellAlign).toBe('right');
    });

    it('should preserve individual colDef properties that are not in type or default', () => {
      const cols = [
        { field: 'name', headerName: 'Name', type: 'textColumn', headerAlign: 'center' },
      ];
      const result = service.applyColumnTypes(cols);
      expect(result[0].headerAlign).toBe('center');
    });
  });

  describe('clearCustomTypes', () => {
    it('should clear custom types', () => {
      service.registerColumnType('myType', { filter: 'text' });
      expect(service.hasColumnType('myType')).toBe(true);
      service.clearCustomTypes();
      expect(service.hasColumnType('myType')).toBe(false);
      // Built-in types should still exist
      expect(service.hasColumnType('textColumn')).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should clear custom types on destroy', () => {
      service.registerColumnType('myType', { filter: 'text' });
      service.destroy();
      expect(service.hasColumnType('myType')).toBe(false);
    });
  });
});
