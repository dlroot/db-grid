import { describe, it, expect, beforeEach } from 'vitest';
import { FilterService, FilterType } from './filter.service';

describe('FilterService', () => {
  let service: FilterService;

  beforeEach(() => {
    service = new FilterService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Filter Model Management', () => {
    it('should set and get filter model', () => {
      const model = {
        name: { filterType: 'text' as const, type: 'contains' as const, filter: 'test' }
      };
      service.setFilterModel(model);
      expect(service.getFilterModel()).toEqual(model);
    });

    it('should set column filter', () => {
      service.setColumnFilter('name', { filterType: 'text', type: 'contains', filter: 'test' });
      const model = service.getFilterModel();
      expect(model['name']).toBeDefined();
    });

    it('should get column filter', () => {
      service.setColumnFilter('name', { filterType: 'text', type: 'contains', filter: 'test' });
      const colFilter = service.getColumnFilter('name');
      expect(colFilter).toBeDefined();
      expect(colFilter?.filter).toBe('test');
    });

    it('should clear column filter', () => {
      service.setColumnFilter('name', { filterType: 'text', type: 'contains', filter: 'test' });
      service.setColumnFilter('name', null);
      const model = service.getFilterModel();
      expect(model['name']).toBeUndefined();
    });

    it('should check if filter is active', () => {
      expect(service.isFilterActive()).toBe(false);
      service.setColumnFilter('name', { filterType: 'text', type: 'contains', filter: 'test' });
      expect(service.isFilterActive()).toBe(true);
    });

    it('should clear all filters', () => {
      service.setColumnFilter('name', { filterType: 'text', type: 'contains', filter: 'test' });
      service.setColumnFilter('age', { filterType: 'number', type: 'equals', filter: 25 });
      service.clearAllFilters();
      expect(service.isFilterActive()).toBe(false);
    });
  });

  describe('Quick Filter', () => {
    it('should set and get quick filter', () => {
      service.setQuickFilter('test');
      expect(service.getQuickFilter()).toBe('test');
    });

    it('should get empty quick filter initially', () => {
      expect(service.getQuickFilter()).toBe('');
    });
  });

  describe('Column Filter Pass', () => {
    it('should pass when cell value matches text contains', () => {
      const model = { filterType: 'text' as const, type: 'contains' as const, filter: 'test' };
      expect(service.passesColumnFilter('test value', model)).toBe(true);
      expect(service.passesColumnFilter('no match', model)).toBe(false);
    });

    it('should pass when cell value matches text equals', () => {
      const model = { filterType: 'text' as const, type: 'equals' as const, filter: 'exact' };
      expect(service.passesColumnFilter('exact', model)).toBe(true);
      expect(service.passesColumnFilter('Exact', model)).toBe(true);
      expect(service.passesColumnFilter('exactly', model)).toBe(false);
    });

    it('should pass when cell value matches text startsWith', () => {
      const model = { filterType: 'text' as const, type: 'startsWith' as const, filter: 'start' };
      expect(service.passesColumnFilter('start here', model)).toBe(true);
      expect(service.passesColumnFilter('end start', model)).toBe(false);
    });

    it('should pass when cell value matches text endsWith', () => {
      const model = { filterType: 'text' as const, type: 'endsWith' as const, filter: 'end' };
      expect(service.passesColumnFilter('the end', model)).toBe(true);
      expect(service.passesColumnFilter('end the', model)).toBe(false);
    });

    it('should pass when number equals', () => {
      const model = { filterType: 'number' as const, type: 'equals' as const, filter: 100 };
      expect(service.passesColumnFilter(100, model)).toBe(true);
      expect(service.passesColumnFilter(99, model)).toBe(false);
    });

    it('should pass when number greaterThan', () => {
      const model = { filterType: 'number' as const, type: 'greaterThan' as const, filter: 50 };
      expect(service.passesColumnFilter(51, model)).toBe(true);
      expect(service.passesColumnFilter(50, model)).toBe(false);
    });

    it('should pass when number lessThan', () => {
      const model = { filterType: 'number' as const, type: 'lessThan' as const, filter: 50 };
      expect(service.passesColumnFilter(49, model)).toBe(true);
      expect(service.passesColumnFilter(50, model)).toBe(false);
    });

    it('should pass when number inRange', () => {
      const model = { filterType: 'number' as const, type: 'inRange' as const, filter: 10, filterTo: 20 };
      expect(service.passesColumnFilter(15, model)).toBe(true);
      expect(service.passesColumnFilter(9, model)).toBe(false);
    });

    it('should pass when date equals', () => {
      const model = { filterType: 'date' as const, type: 'equals' as const, dateFrom: '2024-01-15' };
      expect(service.passesColumnFilter('2024-01-15', model)).toBe(true);
      expect(service.passesColumnFilter('2024-01-16', model)).toBe(false);
    });

    it('should pass when date inRange', () => {
      const model = { filterType: 'date' as const, type: 'inRange' as const, dateFrom: '2024-01-01', dateTo: '2024-01-31' };
      expect(service.passesColumnFilter('2024-01-15', model)).toBe(true);
      expect(service.passesColumnFilter('2024-01-00', model)).toBe(false);
    });

    it('should pass when set includes value', () => {
      const model = { filterType: 'set' as const, values: ['A', 'B', 'C'] };
      expect(service.passesColumnFilter('A', model)).toBe(true);
      expect(service.passesColumnFilter('D', model)).toBe(false);
    });

    it('should pass all when set values is empty', () => {
      const model = { filterType: 'set' as const, values: [] };
      expect(service.passesColumnFilter('anything', model)).toBe(true);
    });

    it('should pass when boolean matches', () => {
      const model = { filterType: 'boolean' as const, value: true };
      expect(service.passesColumnFilter(true, model)).toBe(true);
      expect(service.passesColumnFilter(false, model)).toBe(false);
    });
  });

  describe('Filter Type Inference', () => {
    it('should infer number type from filter property', () => {
      expect(service.inferFilterType({ filter: 'agNumberColumnFilter' } as any)).toBe('number');
    });

    it('should infer date type from filter property', () => {
      expect(service.inferFilterType({ filter: 'agDateColumnFilter' } as any)).toBe('date');
    });

    it('should infer set type', () => {
      expect(service.inferFilterType({ filter: 'agSetColumnFilter' } as any)).toBe('set');
    });

    it('should infer boolean type', () => {
      expect(service.inferFilterType({ filter: 'agBooleanColumnFilter' } as any)).toBe('boolean');
    });

    it('should default to text type', () => {
      expect(service.inferFilterType({ field: 'name' } as any)).toBe('text');
    });
  });

  describe('Filter Options', () => {
    it('should get text filter options', () => {
      const options = service.getFilterOptions('text');
      expect(options).toContain('contains');
      expect(options).toContain('equals');
      expect(options).toContain('startsWith');
      expect(options).toContain('endsWith');
    });

    it('should get number filter options', () => {
      const options = service.getFilterOptions('number');
      expect(options).toContain('equals');
      expect(options).toContain('greaterThan');
      expect(options).toContain('lessThan');
      expect(options).toContain('inRange');
    });

    it('should get date filter options', () => {
      const options = service.getFilterOptions('date');
      expect(options).toContain('equals');
      expect(options).toContain('greaterThan');
      expect(options).toContain('inRange');
    });

    it('should get set filter options', () => {
      const options = service.getFilterOptions('set');
      expect(options).toContain('in');
      expect(options).toContain('notIn');
    });
  });

  describe('Set Filter Values', () => {
    it('should extract unique values for set filter', () => {
      const data = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 },
        { name: 'Alice', age: 35 }
      ];
      const values = service.getSetFilterValues(data, 'name');
      expect(values).toContain('Alice');
      expect(values).toContain('Bob');
    });
  });
});
