import { describe, it, expect, beforeEach } from 'vitest';
import { FillHandleService, FillDirection, FillMode, FillResult } from '../fill-handle.service';

describe('FillHandleService', () => {
  let service: FillHandleService;

  beforeEach(() => {
    service = new FillHandleService();
  });

  // ===== fill method =====
  describe('fill', () => {
    it('should return empty array for empty source', () => {
      const result = service.fill([], 'down', 5, 'copy');
      expect(result).toEqual([]);
    });

    it('should return empty array for targetCount <= 0', () => {
      const result = service.fill([[1, 2]], 'down', 0, 'copy');
      expect(result).toEqual([]);
    });

    it('should fill with copy mode (vertical down)', () => {
      const source = [[10, 20]];
      const result = service.fill(source, 'down', 3, 'copy');
      expect(result.length).toBe(3);
      expect(result[0]).toEqual([10, 20]);
      expect(result[1]).toEqual([10, 20]);
      expect(result[2]).toEqual([10, 20]);
    });

    it('should fill with copy mode (horizontal right)', () => {
      const source = [[1, 2, 3]];
      const result = service.fill(source, 'right', 4, 'copy');
      expect(result.length).toBe(4);
      // For direction='right', each result[i] repeats the i%cols source column value
      expect(result[0]).toEqual([1, 1, 1]);
      expect(result[1]).toEqual([2, 2, 2]);
      expect(result[2]).toEqual([3, 3, 3]);
      expect(result[3]).toEqual([1, 1, 1]);
    });

    it('should fill with fillSeries mode (numbers)', () => {
      const source = [[1]];
      const result = service.fill(source, 'down', 5, 'fillSeries');
      // Implementation: offset = i+1, so result[0]=1+1=2, result[1]=1+2=3, etc.
      expect(result[0][0]).toBe(2);
      expect(result[1][0]).toBe(3);
      expect(result[2][0]).toBe(4);
      expect(result[4][0]).toBe(6);
    });

    it('should fill with fillSeries mode (up direction)', () => {
      const source = [[5]];
      const result = service.fill(source, 'up', 3, 'fillSeries');
      // isForward=false for 'up', offset = -(i+1)
      // result[0] = 5 + (-1) = 4
      // result[1] = 5 + (-2) = 3
      // result[2] = 5 + (-3) = 2
      expect(result[0][0]).toBe(4);
      expect(result[1][0]).toBe(3);
      expect(result[2][0]).toBe(2);
    });

    it('should handle multi-column fill', () => {
      const source = [[1, 2], [3, 4]];
      const result = service.fill(source, 'down', 3, 'copy');
      expect(result.length).toBe(3);
      expect(result[0]).toEqual([1, 2]);
      expect(result[1]).toEqual([3, 4]);
      expect(result[2]).toEqual([1, 2]); // cycles back
    });

    it('should handle string numbers in fillSeries', () => {
      const source = [['item-5']];
      const result = service.fill(source, 'down', 3, 'fillSeries');
      // nextValue extracts number 5, adds offset=1,2
      expect(result[0][0]).toBe('item-6');
      expect(result[1][0]).toBe('item-7');
      expect(result[2][0]).toBe('item-8');
    });

    it('should handle date fill mode', () => {
      const source = [['2024-01-01']];
      const result = service.fill(source, 'down', 3, 'date');
      // offset = i+1 for down direction
      expect(result[0][0]).toBe('2024-01-02');
      expect(result[1][0]).toBe('2024-01-03');
      expect(result[2][0]).toBe('2024-01-04');
    });

    it('should handle date fill upward', () => {
      const source = [['2024-01-05']];
      const result = service.fill(source, 'up', 3, 'date');
      // offset = -(i+1) for up direction
      expect(result[0][0]).toBe('2024-01-04');
      expect(result[1][0]).toBe('2024-01-03');
      expect(result[2][0]).toBe('2024-01-02');
    });

    it('should pass through unknown mode as copy', () => {
      const source = [[100]];
      const result = service.fill(source, 'down', 3, 'unknown' as FillMode);
      expect(result[0][0]).toBe(100);
    });

    it('should handle mixed data types', () => {
      const source = [[1, 'text', true]];
      const result = service.fill(source, 'down', 2, 'copy');
      expect(result[0]).toEqual([1, 'text', true]);
      expect(result[1]).toEqual([1, 'text', true]);
    });

    it('should handle null values in source', () => {
      const source = [[null, 2, null]];
      const result = service.fill(source, 'down', 2, 'copy');
      expect(result[0]).toEqual([null, 2, null]);
      expect(result[1]).toEqual([null, 2, null]);
    });

    it('should fill with linear mode', () => {
      const source = [[10]];
      const result = service.fill(source, 'down', 5, 'linear');
      // For single value with linear mode, uses value + offset where offset = i+1
      expect(result[0][0]).toBe(11);
      expect(result[4][0]).toBe(15);
    });
  });

  // ===== linearFill =====
  describe('linearFill', () => {
    it('should return single value for count <= 1', () => {
      const result = service.linearFill([5], 0);
      expect(result).toEqual([5]);
      const result2 = service.linearFill([5], 1);
      expect(result2).toEqual([5]);
    });

    it('should generate sequence from single value', () => {
      const result = service.linearFill([10], 5);
      expect(result).toEqual([10, 11, 12, 13, 14]);
    });

    it('should use step from two values', () => {
      const result = service.linearFill([5, 10], 5);
      expect(result).toEqual([5, 10, 15, 20, 25]);
    });

    it('should handle negative step', () => {
      const result = service.linearFill([100, 95], 4);
      expect(result).toEqual([100, 95, 90, 85]);
    });

    it('should handle fractional step', () => {
      const result = service.linearFill([1, 1.5], 4);
      expect(result[0]).toBeCloseTo(1);
      expect(result[1]).toBeCloseTo(1.5);
      expect(result[2]).toBeCloseTo(2);
      expect(result[3]).toBeCloseTo(2.5);
    });
  });

  // ===== dateFill =====
  describe('dateFill', () => {
    it('should generate date sequence from Date object', () => {
      const result = service.dateFill(new Date('2024-01-15'), 5, 1);
      expect(result.length).toBe(5);
      expect(result[0].getDate()).toBe(15);
      expect(result[1].getDate()).toBe(16);
      expect(result[4].getDate()).toBe(19);
    });

    it('should generate date sequence from string', () => {
      const result = service.dateFill('2024-01-01', 3, 7);
      expect(result.length).toBe(3);
      expect(result[0].toISOString().startsWith('2024-01-01')).toBe(true);
      expect(result[1].toISOString().startsWith('2024-01-08')).toBe(true);
    });

    it('should use custom step days', () => {
      const result = service.dateFill('2024-01-01', 4, 30);
      expect(result.length).toBe(4);
      expect(result[0].toISOString().startsWith('2024-01-01')).toBe(true);
      // Jan 1 + 30 days = Jan 31 (still January)
      expect(result[1].toISOString().startsWith('2024-01-31')).toBe(true);
      // Jan 1 + 60 days = Mar 1
      expect(result[2].toISOString().startsWith('2024-03-01') || result[2].toISOString().startsWith('2024-02-29')).toBe(true);
    });
  });

  // ===== inferMode =====
  describe('inferMode', () => {
    it('should return linear for arithmetic sequence', () => {
      const mode = service.inferMode([1, 2, 3, 4, 5]);
      expect(mode).toBe('linear');
    });

    it('should return fillSeries for non-sequence numbers', () => {
      const mode = service.inferMode([10, 20, 30, 50]); // not consistent step
      expect(mode).toBe('fillSeries');
    });

    it('should return date for date strings', () => {
      const mode = service.inferMode(['2024-01-01', '2024-01-02', '2024-01-03']);
      expect(mode).toBe('date');
    });

    it('should return copy for non-numeric strings', () => {
      const mode = service.inferMode(['apple', 'banana', 'cherry']);
      expect(mode).toBe('copy');
    });

    it('should return copy for empty array', () => {
      const mode = service.inferMode([]);
      expect(mode).toBe('copy');
    });

    it('should return fillSeries for single number', () => {
      const mode = service.inferMode([42]);
      expect(mode).toBe('fillSeries');
    });
  });

  // ===== Edge cases =====
  describe('edge cases', () => {
    it('should handle empty source array', () => {
      const result = service.fill([[]], 'down', 3, 'copy');
      // sourceValues = [[]], length = 1, sourceValues[0] = [], cols = 0
      // result = [[], [], []] (3 empty arrays)
      expect(result).toEqual([[], [], []]);
    });

    it('should handle source with empty rows', () => {
      const source = [[], [], []];
      const result = service.fill(source, 'down', 2, 'copy');
      expect(result.length).toBe(2);
    });

    it('should handle very large targetCount', () => {
      const source = [[1]];
      const result = service.fill(source, 'down', 10000, 'copy');
      expect(result.length).toBe(10000);
    });

    it('should handle undefined in source values', () => {
      const source = [[undefined, 2]];
      const result = service.fill(source, 'down', 2, 'copy');
      expect(result[0][0]).toBeUndefined();
    });

    it('should handle negative numbers in fillSeries', () => {
      const source = [[-5]];
      const result = service.fill(source, 'down', 5, 'fillSeries');
      // offset = i+1: result[i] = -5 + (i+1)
      expect(result[0][0]).toBe(-4);
      expect(result[4][0]).toBe(0);
    });

    it('should handle zero step in linearFill', () => {
      const result = service.linearFill([5, 5], 5);
      expect(result).toEqual([5, 5, 5, 5, 5]);
    });
  });

  // ===== FillResult structure =====
  describe('FillResult structure', () => {
    it('should return result with values, direction and mode', () => {
      const source = [[1, 2]];
      const result = service.fill(source, 'down', 3, 'copy');
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toEqual([1, 2]);
    });
  });
});