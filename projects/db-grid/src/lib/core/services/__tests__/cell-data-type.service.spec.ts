import { CellDataTypeService } from '../cell-data-type.service';

describe('CellDataTypeService', () => {
  let service: CellDataTypeService;

  beforeEach(() => {
    service = new CellDataTypeService();
  });

  describe('BUILTIN_PRESETS', () => {
    it('should have all required column type presets', () => {
      const presets = CellDataTypeService.BUILTIN_PRESETS;
      expect(presets.agTextColumn).toBeDefined();
      expect(presets.agNumberColumn).toBeDefined();
      expect(presets.agDateColumn).toBeDefined();
      expect(presets.agBooleanColumn).toBeDefined();
    });

    it('agTextColumn should have text cellType and left alignment', () => {
      const preset = CellDataTypeService.BUILTIN_PRESETS.agTextColumn;
      expect(preset.cellType).toBe('text');
      expect(preset.cellAlign).toBe('left');
    });

    it('agNumberColumn should have number cellType and right alignment', () => {
      const preset = CellDataTypeService.BUILTIN_PRESETS.agNumberColumn;
      expect(preset.cellType).toBe('number');
      expect(preset.cellAlign).toBe('right');
    });

    it('agBooleanColumn should have center alignment', () => {
      const preset = CellDataTypeService.BUILTIN_PRESETS.agBooleanColumn;
      expect(preset.cellAlign).toBe('center');
    });
  });

  describe('inferColumnTypes', () => {
    it('should return empty array for empty inputs', () => {
      expect(service.inferColumnTypes([], [])).toEqual([]);
      expect(service.inferColumnTypes(null as any, [])).toEqual([]);
    });

    it('should infer number type for numeric data', () => {
      const colDefs = [{ field: 'age' }];
      const rowData = [{ age: 25 }, { age: 30 }];
      const results = service.inferColumnTypes(colDefs, rowData);
      expect(results[0].inferredType).toBe('number');
    });

    it('should infer text type for string data', () => {
      const colDefs = [{ field: 'name' }];
      const rowData = [{ name: 'Alice' }, { name: 'Bob' }];
      const results = service.inferColumnTypes(colDefs, rowData);
      expect(results[0].inferredType).toBe('text');
    });

    it('should infer date type for date strings', () => {
      const colDefs = [{ field: 'birthDate' }];
      const rowData = [{ birthDate: '1990-01-01' }, { birthDate: '1991-02-02' }];
      const results = service.inferColumnTypes(colDefs, rowData);
      expect(results[0].inferredType).toBe('date');
    });

    it('should infer boolean type for boolean values', () => {
      const colDefs = [{ field: 'active' }];
      const rowData = [{ active: true }, { active: false }];
      const results = service.inferColumnTypes(colDefs, rowData);
      expect(results[0].inferredType).toBe('boolean');
    });

    it('should ignore null and empty values', () => {
      const colDefs = [{ field: 'score' }];
      const rowData = [{ score: null }, { score: '' }, { score: 100 }];
      const results = service.inferColumnTypes(colDefs, rowData);
      expect(results[0].inferredType).toBe('number');
    });

    it('should support nested field paths', () => {
      const colDefs = [{ field: 'address.city' }];
      const rowData = [{ address: { city: 'Beijing' } }];
      const results = service.inferColumnTypes(colDefs, rowData);
      expect(results[0].inferredType).toBe('text');
    });

    it('should infer high confidence for homogeneous data', () => {
      const colDefs = [{ field: 'price' }];
      const rowData = Array.from({ length: 20 }, (_, i) => ({ price: i * 10 }));
      const results = service.inferColumnTypes(colDefs, rowData);
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('applyAutoTypes', () => {
    it('should return empty array for empty columnDefs', () => {
      expect(service.applyAutoTypes([], [])).toEqual([]);
    });

    it('should apply columnTypes preset', () => {
      const colDefs = [{ field: 'price', type: 'agNumberColumn' }];
      service.applyAutoTypes(colDefs, []);
      expect(colDefs[0].cellType).toBe('number');
      expect(colDefs[0].cellAlign).toBe('right');
    });

    it('should not override user-specified cellType', () => {
      const colDefs = [{ field: 'price', type: 'agNumberColumn', cellType: 'text' }];
      service.applyAutoTypes(colDefs, []);
      expect(colDefs[0].cellType).toBe('text');
    });

    it('should not override user-specified filter', () => {
      const colDefs = [{ field: 'price', type: 'agNumberColumn', filter: 'custom' }];
      service.applyAutoTypes(colDefs, []);
      expect(colDefs[0].filter).toBe('custom');
    });

    it('should apply defaultColDef to unspecified columns', () => {
      const colDefs = [{ field: 'name' }];
      service.applyAutoTypes(colDefs, [], { defaultColDef: { width: 200, sortable: true } });
      expect(colDefs[0].width).toBe(200);
      expect(colDefs[0].sortable).toBe(true);
    });

    it('should not override explicit properties with defaultColDef', () => {
      const colDefs = [{ field: 'name', width: 150 }];
      service.applyAutoTypes(colDefs, [], { defaultColDef: { width: 200 } });
      expect(colDefs[0].width).toBe(150);
    });

    it('should infer type for columns without specified cellType', () => {
      const colDefs = [{ field: 'age' }];
      const rowData = [{ age: 25 }];
      service.applyAutoTypes(colDefs, rowData);
      expect(colDefs[0].cellType).toBe('number');
    });

    it('should apply custom columnTypes preset', () => {
      const colDefs = [{ field: 'score', type: 'myNumber' }];
      service.applyAutoTypes(colDefs, [], {
        columnTypes: { myNumber: { cellAlign: 'center' } }
      });
      expect(colDefs[0].cellAlign).toBe('center');
    });
  });

  describe('applyColumnTypes', () => {
    it('should apply multiple type presets from array', () => {
      const colDefs = [{ field: 'price', type: ['agNumberColumn'] }];
      service.applyColumnTypes(colDefs, {});
      expect(colDefs[0].cellType).toBe('number');
    });

    it('should not apply preset with enabled=false', () => {
      const colDefs = [{ field: 'price', type: 'agNumberColumn' }];
      service.applyColumnTypes(colDefs, {
        columnTypes: { agNumberColumn: { enabled: false } }
      });
      expect(colDefs[0].cellAlign).toBeUndefined();
    });
  });

  describe('numberFormatter', () => {
    it('should format numbers with locale', () => {
      const result = CellDataTypeService.numberFormatter({ value: 1234567 });
      expect(result).toBe('1,234,567');
    });

    it('should return empty string for null/undefined', () => {
      expect(CellDataTypeService.numberFormatter({ value: null })).toBe('');
      expect(CellDataTypeService.numberFormatter({ value: undefined })).toBe('');
    });

    it('should return string for non-numeric', () => {
      expect(CellDataTypeService.numberFormatter({ value: 'abc' })).toBe('abc');
    });
  });

  describe('dateFormatter', () => {
    it('should format Date object', () => {
      const d = new Date('2023-06-15T00:00:00');
      expect(CellDataTypeService.dateFormatter({ value: d })).toBe('2023-06-15');
    });

    it('should format ISO string', () => {
      expect(CellDataTypeService.dateFormatter({ value: '2023-06-15T10:30:00' })).toBe('2023-06-15');
    });

    it('should return empty for null', () => {
      expect(CellDataTypeService.dateFormatter({ value: null })).toBe('');
    });
  });

  describe('numberComparator', () => {
    it('should compare numbers correctly', () => {
      expect(CellDataTypeService.numberComparator(5, 10)).toBeLessThan(0);
      expect(CellDataTypeService.numberComparator(10, 5)).toBeGreaterThan(0);
      expect(CellDataTypeService.numberComparator(5, 5)).toBe(0);
    });

    it('should handle NaN', () => {
      expect(CellDataTypeService.numberComparator(NaN, 5)).toBeGreaterThan(0);
      expect(CellDataTypeService.numberComparator(5, NaN)).toBeLessThan(0);
    });

    it('should treat strings as numbers', () => {
      expect(CellDataTypeService.numberComparator('5', '10')).toBeLessThan(0);
    });
  });

  describe('dateComparator', () => {
    it('should compare dates correctly', () => {
      const a = new Date('2023-01-01');
      const b = new Date('2023-12-31');
      expect(CellDataTypeService.dateComparator(a, b)).toBeLessThan(0);
    });

    it('should handle string dates', () => {
      expect(CellDataTypeService.dateComparator('2023-01-01', '2023-06-01')).toBeLessThan(0);
    });
  });
});
