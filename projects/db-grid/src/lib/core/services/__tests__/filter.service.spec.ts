import { describe, it, expect, beforeEach } from 'vitest';
import { FilterService, FilterModel, ColumnFilterModel } from '../filter.service';

describe('FilterService', () => {
  let service: FilterService;

  beforeEach(() => {
    service = new FilterService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ===== Filter Model Management =====
  it('should set and get filter model', () => {
    const model: FilterModel = {
      'name': { filterType: 'text', filter: 'Tom' },
      'age': { filterType: 'number', filter: 25 },
    };
    service.setFilterModel(model);
    const retrieved = service.getFilterModel();
    expect(retrieved['name']?.filter).toBe('Tom');
    expect(retrieved['age']?.filter).toBe(25);
  });

  it('should clear all filters', () => {
    const model: FilterModel = {
      'name': { filterType: 'text', filter: 'Tom' },
    };
    service.setFilterModel(model);
    expect(service.isFilterActive()).toBe(true);
    
    service.clearAllFilters();
    expect(service.isFilterActive()).toBe(false);
    expect(Object.keys(service.getFilterModel()).length).toBe(0);
  });

  // ===== Column Filter Management =====
  it('should set and get column filter', () => {
    const colFilter: ColumnFilterModel = { filterType: 'text', filter: 'John' };
    service.setColumnFilter('name', colFilter);
    const retrieved = service.getColumnFilter('name');
    expect(retrieved?.filter).toBe('John');
  });

  it('should remove column filter when setting null', () => {
    service.setColumnFilter('name', { filterType: 'text', filter: 'Test' });
    expect(service.isFilterActive()).toBe(true);
    
    service.setColumnFilter('name', null);
    expect(service.getColumnFilter('name')).toBeNull();
    expect(service.isFilterActive()).toBe(false);
  });

  // ===== Quick Filter =====
  it('should set and get quick filter', () => {
    service.setQuickFilter('test');
    expect(service.getQuickFilter()).toBe('test');
  });

  it('should detect active filter', () => {
    expect(service.isFilterActive()).toBe(false);
    service.setQuickFilter('test');
    expect(service.isFilterActive()).toBe(true);
  });

  // ===== Passes Filters =====
  it('should pass all filters when none set', () => {
    const data = { name: 'Tom', age: 25 };
    const colDefs = [
      { field: 'name', filter: 'text' },
      { field: 'age', filter: 'number' },
    ];
    expect(service.passesAllFilters(data, colDefs)).toBe(true);
  });

  it('should filter by text', () => {
    service.setQuickFilter('Tom');
    const colDefs = [{ field: 'name', filter: 'text' }];
    
    expect(service.passesAllFilters({ name: 'Tom' }, colDefs)).toBe(true);
    expect(service.passesAllFilters({ name: 'John' }, colDefs)).toBe(false);
  });
});
