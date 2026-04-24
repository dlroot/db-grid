import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FloatingFilterService, FloatingFilterConfig, FloatingFilterModel } from '../floating-filter.service';
import { ColDef } from '../../models';

describe('FloatingFilterService', () => {
  let service: FloatingFilterService;

  const columnDefs: ColDef[] = [
    { field: 'name', filter: true },
    { field: 'age', filter: 'agNumberColumnFilter' },
    { field: 'city', filter: 'agSetColumnFilter' },
    { field: 'noFilter' }, // no filter
  ];

  beforeEach(() => {
    service = new FloatingFilterService();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('initialize', () => {
    it('should initialize with default config', () => {
      service.initialize(columnDefs);
      // Default enabled is false (source: config.enabled ?? false)
      expect(service.isEnabled()).toBe(false);
      expect(service.getHeight()).toBe(40);
    });

    it('should initialize with custom config', () => {
      service.initialize(columnDefs, { enabled: false, height: 50 });
      expect(service.isEnabled()).toBe(false);
      expect(service.getHeight()).toBe(50);
    });

    it('should identify columns with filters', () => {
      service.initialize(columnDefs);
      expect(service.hasFloatingFilter('name')).toBe(true);
      expect(service.hasFloatingFilter('age')).toBe(true);
      expect(service.hasFloatingFilter('city')).toBe(true);
      expect(service.hasFloatingFilter('noFilter')).toBe(false);
    });
  });

  describe('enable/disable', () => {
    it('should enable the service', () => {
      service.initialize(columnDefs, { enabled: false });
      service.enable();
      expect(service.isEnabled()).toBe(true);
    });

    it('should disable the service', () => {
      service.initialize(columnDefs);
      service.disable();
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('setFilterValue / getFilterValue', () => {
    beforeEach(() => {
      service.initialize(columnDefs);
    });

    it('should set and get filter value', () => {
      service.setFilterValue('name', 'John');
      expect(service.getFilterValue('name')).toBe('John');
    });

    it('should return null for unset filter', () => {
      expect(service.getFilterValue('name')).toBeNull();
    });

    it('should not set filter for column without filter', () => {
      service.setFilterValue('noFilter', 'test');
      expect(service.getFilterValue('noFilter')).toBeNull();
    });

    it('should handle number filter values', () => {
      service.setFilterValue('age', 25);
      expect(service.getFilterValue('age')).toBe(25);
    });

    it('should handle object filter models', () => {
      const model = { type: 'contains', filter: 'test' };
      service.setFilterValue('name', model);
      expect(service.getFilterValue('name')).toEqual(model);
    });
  });

  describe('getAllFilterModels', () => {
    beforeEach(() => {
      service.initialize(columnDefs);
    });

    it('should return empty filter values when no filters set', () => {
      const models = service.getAllFilterModels();
      // getAllFilterModels returns all filter columns with null values
      const allNull = Object.values(models).every((m: any) => m.value === null && !m.active);
      expect(allNull).toBe(true);
    });

    it('should return all filter models with values set', () => {
      service.setFilterValue('name', 'John');
      service.setFilterValue('age', 25);
      
      const models = service.getAllFilterModels();
      // getAllFilterModels returns all filter columns, including those with null values
      expect(models['name'].value).toBe('John');
      expect(models['name'].active).toBe(true);
      expect(models['age'].value).toBe(25);
      expect(models['age'].active).toBe(true);
    });
  });

  describe('clearFilter / clearAll', () => {
    beforeEach(() => {
      service.initialize(columnDefs);
    });

    it('should clear a specific filter', () => {
      service.setFilterValue('name', 'John');
      service.setFilterValue('age', 25);
      
      service.clearFilter('name');
      
      expect(service.getFilterValue('name')).toBeNull();
      expect(service.getFilterValue('age')).toBe(25);
    });

    it('should clear all filters', () => {
      service.setFilterValue('name', 'John');
      service.setFilterValue('age', 25);
      
      service.clearAll();
      
      // clearAll resets values to null and active to false, but models still exist
      const models = service.getAllFilterModels();
      const allCleared = Object.values(models).every((m: any) => m.value === null && !m.active);
      expect(allCleared).toBe(true);
    });
  });

  describe('getActiveFilterCount', () => {
    beforeEach(() => {
      service.initialize(columnDefs);
    });

    it('should return 0 when no filters active', () => {
      expect(service.getActiveFilterCount()).toBe(0);
    });

    it('should count active filters', () => {
      service.setFilterValue('name', 'John');
      expect(service.getActiveFilterCount()).toBe(1);
      
      service.setFilterValue('age', 25);
      expect(service.getActiveFilterCount()).toBe(2);
    });

    it('should not count cleared filters', () => {
      service.setFilterValue('name', 'John');
      service.clearFilter('name');
      expect(service.getActiveFilterCount()).toBe(0);
    });
  });

  describe('syncFromMainFilter', () => {
    beforeEach(() => {
      service.initialize(columnDefs);
    });

    it('should sync filter models from main filter', () => {
      const filterModel = {
        name: { type: 'contains', filter: 'test' },
        age: { type: 'equals', filter: 30 },
      };
      
      service.syncFromMainFilter(filterModel);
      
      // syncFromMainFilter extracts filter.filter ?? filter.filterTo from the model
      expect(service.getFilterValue('name')).toBe('test');
      expect(service.getFilterValue('age')).toBe(30);
    });

    it('should not clear filters not in main model', () => {
      service.setFilterValue('name', 'old');
      service.setFilterValue('city', 'Beijing');
      
      // syncFromMainFilter only sets matching columns, does not clear others
      // Note: syncFromMainFilter extracts filter.filter ?? filter.filterTo
      // so we need to pass objects with filter property
      service.syncFromMainFilter({ age: { filter: 25 } });
      
      // name and city remain unchanged (syncFromMainFilter doesn't clear non-matching)
      expect(service.getFilterValue('name')).toBe('old');
      expect(service.getFilterValue('city')).toBe('Beijing');
      expect(service.getFilterValue('age')).toBe(25);
    });
  });

  describe('onFilterChangedEvent', () => {
    beforeEach(() => {
      service.initialize(columnDefs);
    });

    it('should fire event when filter value changes', () => {
      const spy = vi.fn();
      service.onFilterChangedEvent(spy);
      
      service.setFilterValue('name', 'John');
      
      // Callback receives Record<string, FloatingFilterModel>
      expect(spy).toHaveBeenCalled();
      const callArg = spy.mock.calls[0][0];
      expect(callArg['name'].value).toBe('John');
      expect(callArg['name'].active).toBe(true);
    });

    it('should fire event when filter is cleared', () => {
      service.setFilterValue('name', 'John');
      
      const spy = vi.fn();
      service.onFilterChangedEvent(spy);
      
      service.clearFilter('name');
      
      // Callback receives Record<string, FloatingFilterModel>
      expect(spy).toHaveBeenCalled();
      const callArg = spy.mock.calls[0][0];
      expect(callArg['name'].value).toBeNull();
      expect(callArg['name'].active).toBe(false);
    });
  });

  describe('destroy', () => {
    it('should clear all state', () => {
      service.initialize(columnDefs);
      service.setFilterValue('name', 'John');
      
      service.destroy();
      
      expect(service.getAllFilterModels()).toEqual({});
    });
  });
});
