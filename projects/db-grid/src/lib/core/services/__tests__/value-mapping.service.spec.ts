// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { ValueMappingService } from '../value-mapping.service';

describe('ValueMappingService', () => {
  let service: ValueMappingService;

  beforeEach(() => {
    service = new ValueMappingService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ===== getDisplayValue =====

  it('should return original value when no refData provided', () => {
    expect(service.getDisplayValue('hello')).toBe('hello');
  });

  it('should return original value when refData is empty', () => {
    expect(service.getDisplayValue('hello', {})).toBe('hello');
  });

  it('should return empty string for null/undefined value without refData', () => {
    expect(service.getDisplayValue(null)).toBe('');
    expect(service.getDisplayValue(undefined)).toBe('');
  });

  it('should return empty string for null/undefined value with refData', () => {
    expect(service.getDisplayValue(null, { '1': 'Active' })).toBe('');
    expect(service.getDisplayValue(undefined, { '1': 'Active' })).toBe('');
  });

  it('should map value using refData', () => {
    const refData = { '1': 'Active', '2': 'Inactive', '3': 'Pending' };
    expect(service.getDisplayValue('1', refData)).toBe('Active');
    expect(service.getDisplayValue('2', refData)).toBe('Inactive');
    expect(service.getDisplayValue('3', refData)).toBe('Pending');
  });

  it('should map numeric values using refData (converted to string key)', () => {
    const refData = { '1': 'Active', '2': 'Inactive' };
    expect(service.getDisplayValue(1, refData)).toBe('Active');
    expect(service.getDisplayValue(2, refData)).toBe('Inactive');
  });

  it('should return original value as string when not found in refData', () => {
    const refData = { '1': 'Active', '2': 'Inactive' };
    expect(service.getDisplayValue('99', refData)).toBe('99');
  });

  it('should handle boolean values in refData', () => {
    const refData = { 'true': 'Yes', 'false': 'No' };
    expect(service.getDisplayValue(true, refData)).toBe('Yes');
    expect(service.getDisplayValue(false, refData)).toBe('No');
  });

  // ===== getMappedValues =====

  it('should return empty array when refData is null/undefined', () => {
    expect(service.getMappedValues(null)).toEqual([]);
    expect(service.getMappedValues(undefined)).toEqual([]);
  });

  it('should return all mapped display values', () => {
    const refData = { '1': 'Active', '2': 'Inactive', '3': 'Pending' };
    const values = service.getMappedValues(refData);
    expect(values).toEqual(['Active', 'Inactive', 'Pending']);
  });

  it('should return empty array for empty refData', () => {
    expect(service.getMappedValues({})).toEqual([]);
  });

  // ===== reverseLookup =====

  it('should find the original key from display text', () => {
    const refData = { '1': 'Active', '2': 'Inactive', '3': 'Pending' };
    expect(service.reverseLookup('Active', refData)).toBe('1');
    expect(service.reverseLookup('Inactive', refData)).toBe('2');
    expect(service.reverseLookup('Pending', refData)).toBe('3');
  });

  it('should return undefined when display text not found', () => {
    const refData = { '1': 'Active', '2': 'Inactive' };
    expect(service.reverseLookup('Unknown', refData)).toBeUndefined();
  });

  it('should return undefined when refData is null/undefined', () => {
    expect(service.reverseLookup('Active', null)).toBeUndefined();
    expect(service.reverseLookup('Active', undefined)).toBeUndefined();
  });

  it('should return the first matching key when multiple keys have same display text', () => {
    const refData = { '1': 'Active', '2': 'Active' };
    const result = service.reverseLookup('Active', refData);
    expect(result).toBe('1');
  });

  // ===== Integration scenarios =====

  it('should support typical status column scenario', () => {
    const statusRefData = {
      '0': 'Draft',
      '1': 'Submitted',
      '2': 'Approved',
      '3': 'Rejected',
    };

    // Display value mapping
    expect(service.getDisplayValue('0', statusRefData)).toBe('Draft');
    expect(service.getDisplayValue('1', statusRefData)).toBe('Submitted');
    expect(service.getDisplayValue(2, statusRefData)).toBe('Approved');

    // Set filter values
    const filterValues = service.getMappedValues(statusRefData);
    expect(filterValues).toContain('Draft');
    expect(filterValues).toContain('Submitted');
    expect(filterValues.length).toBe(4);

    // Reverse lookup
    expect(service.reverseLookup('Draft', statusRefData)).toBe('0');
    expect(service.reverseLookup('Rejected', statusRefData)).toBe('3');
  });

  // ===== Destroy =====

  it('should handle destroy (no-op for stateless service)', () => {
    expect(() => service.destroy()).not.toThrow();
  });
});
