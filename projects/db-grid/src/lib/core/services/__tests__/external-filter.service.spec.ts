// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { ExternalFilterService } from '../external-filter.service';

describe('ExternalFilterService', () => {
  let service: ExternalFilterService;

  beforeEach(() => {
    service = new ExternalFilterService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ===== Register / Deregister =====

  it('should register an external filter', () => {
    service.registerExternalFilter('filter1', () => true);
    expect(service.hasExternalFilters()).toBe(true);
  });

  it('should deregister an external filter', () => {
    service.registerExternalFilter('filter1', () => true);
    expect(service.hasExternalFilters()).toBe(true);

    service.deregisterExternalFilter('filter1');
    expect(service.hasExternalFilters()).toBe(false);
  });

  it('should handle deregistering a non-existent filter', () => {
    expect(() => service.deregisterExternalFilter('nonexistent')).not.toThrow();
  });

  it('should support multiple filters', () => {
    service.registerExternalFilter('f1', () => true);
    service.registerExternalFilter('f2', () => true);
    expect(service.hasExternalFilters()).toBe(true);
    expect(service.getFilterIds()).toEqual(['f1', 'f2']);
  });

  it('should replace filter when registering with same id', () => {
    let callCount = 0;
    service.registerExternalFilter('f1', () => { callCount++; return true; });
    service.registerExternalFilter('f1', () => { callCount += 10; return false; });

    const node = { id: '1', data: {} };
    service.passesExternalFilters(node);
    // Should call the second (replacement) filter
    expect(callCount).toBe(10);
  });

  // ===== Passes External Filters =====

  it('should pass when no external filters are registered', () => {
    const node = { id: '1', data: {} };
    expect(service.passesExternalFilters(node)).toBe(true);
  });

  it('should pass when all filters return true', () => {
    service.registerExternalFilter('f1', (node) => true);
    service.registerExternalFilter('f2', (node) => true);

    const node = { id: '1', data: { name: 'Test' } };
    expect(service.passesExternalFilters(node)).toBe(true);
  });

  it('should fail when any filter returns false', () => {
    service.registerExternalFilter('f1', (node) => true);
    service.registerExternalFilter('f2', (node) => false);

    const node = { id: '1', data: { name: 'Test' } };
    expect(service.passesExternalFilters(node)).toBe(false);
  });

  it('should pass rowNode data to filter callbacks', () => {
    let receivedNode = null;
    service.registerExternalFilter('f1', (node) => {
      receivedNode = node;
      return true;
    });

    const node = { id: '1', data: { name: 'Alice', age: 30 } };
    service.passesExternalFilters(node);

    expect(receivedNode).toBe(node);
    expect(receivedNode.data.name).toBe('Alice');
  });

  it('should filter based on row data', () => {
    // Filter that only passes rows with age > 25
    service.registerExternalFilter('ageFilter', (node) => node.data.age > 25);

    const youngNode = { id: '1', data: { name: 'Young', age: 20 } };
    const oldNode = { id: '2', data: { name: 'Old', age: 30 } };

    expect(service.passesExternalFilters(youngNode)).toBe(false);
    expect(service.passesExternalFilters(oldNode)).toBe(true);
  });

  // ===== Clear All =====

  it('should clear all filters', () => {
    service.registerExternalFilter('f1', () => true);
    service.registerExternalFilter('f2', () => true);
    expect(service.hasExternalFilters()).toBe(true);

    service.clearAll();
    expect(service.hasExternalFilters()).toBe(false);
    expect(service.getFilterIds()).toEqual([]);
  });

  // ===== Get Filter IDs =====

  it('should return all registered filter IDs', () => {
    service.registerExternalFilter('alpha', () => true);
    service.registerExternalFilter('beta', () => true);
    service.registerExternalFilter('gamma', () => true);

    expect(service.getFilterIds()).toEqual(['alpha', 'beta', 'gamma']);
  });

  // ===== Destroy =====

  it('should clear filters on destroy', () => {
    service.registerExternalFilter('f1', () => true);
    service.destroy();
    expect(service.hasExternalFilters()).toBe(false);
  });
});
