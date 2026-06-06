/// <reference types='vitest' />
import { describe, it, expect, beforeEach } from 'vitest';
import { AggregationService, AggregationType, AggregationConfig, GroupAggregations } from '../aggregation.service';
import { RowNode, createEmptyRowNode } from '../../models';

describe('AggregationService', () => {
  let service: AggregationService;

  const createLeafNode = (id: string, data: Record<string, any>): RowNode => {
    const node = createEmptyRowNode();
    node.id = id;
    node.data = data;
    return node;
  };

  const createGroupNode = (id: string): RowNode => {
    const node = createEmptyRowNode();
    node.id = id;
    node.group = true;
    return node;
  };

  beforeEach(() => {
    service = new AggregationService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('registerColumn', () => {
    it('should register a column with string aggregation type', () => {
      service.registerColumn({ field: 'price', aggregation: 'sum' });
      expect(service.hasAggregation('price')).toBe(true);
    });

    it('should register a column with array aggregation types', () => {
      service.registerColumn({ field: 'quantity', aggregation: ['sum', 'avg'] });
      expect(service.hasAggregation('quantity')).toBe(true);
    });

    it('should register a column with AggregationConfig object', () => {
      service.registerColumn({ field: 'amount', aggregation: { type: 'sum', precision: 2 } });
      expect(service.hasAggregation('amount')).toBe(true);
    });

    it('should skip column without aggregation', () => {
      service.registerColumn({ field: 'name' });
      expect(service.hasAggregation('name')).toBe(false);
    });

    it('should skip column without field or colId', () => {
      service.registerColumn({ aggregation: 'sum' } as any);
      expect(service.getAggregationConfigs().size).toBe(0);
    });

    it('should use colId when field is absent', () => {
      service.registerColumn({ colId: 'col1', aggregation: 'count' });
      expect(service.hasAggregation('col1')).toBe(true);
    });

    it('should prefer field over colId', () => {
      service.registerColumn({ field: 'f1', colId: 'c1', aggregation: 'count' });
      expect(service.hasAggregation('f1')).toBe(true);
    });
  });

  describe('registerColumns', () => {
    it('should register multiple columns at once', () => {
      service.registerColumns([
        { field: 'a', aggregation: 'sum' },
        { field: 'b', aggregation: 'avg' },
        { field: 'c', aggregation: ['min', 'max'] },
      ]);
      expect(service.hasAggregation('a')).toBe(true);
      expect(service.hasAggregation('b')).toBe(true);
      expect(service.hasAggregation('c')).toBe(true);
    });

    it('should skip columns without aggregation', () => {
      service.registerColumns([
        { field: 'a', aggregation: 'sum' },
        { field: 'b' },
      ]);
      expect(service.getAggregationConfigs().size).toBe(1);
    });
  });

  describe('calculateAggregations', () => {
    it('should return empty result for empty leaf nodes', () => {
      service.registerColumn({ field: 'price', aggregation: 'sum' });
      const groupNode = createGroupNode('g1');
      const result = service.calculateAggregations(groupNode, []);
      expect(Object.keys(result).length).toBe(0);
    });

    it('should calculate sum aggregation', () => {
      service.registerColumn({ field: 'price', aggregation: 'sum' });
      const groupNode = createGroupNode('g1');
      const leaves = [
        createLeafNode('r1', { price: 10 }),
        createLeafNode('r2', { price: 20 }),
        createLeafNode('r3', { price: 30 }),
      ];
      const result = service.calculateAggregations(groupNode, leaves);
      expect(result.price.sum.value).toBe(60);
    });

    it('should calculate avg aggregation', () => {
      service.registerColumn({ field: 'price', aggregation: 'avg' });
      const groupNode = createGroupNode('g1');
      const leaves = [
        createLeafNode('r1', { price: 10 }),
        createLeafNode('r2', { price: 20 }),
        createLeafNode('r3', { price: 30 }),
      ];
      const result = service.calculateAggregations(groupNode, leaves);
      expect(result.price.avg.value).toBeCloseTo(20);
    });

    it('should calculate count aggregation', () => {
      service.registerColumn({ field: 'price', aggregation: 'count' });
      const groupNode = createGroupNode('g1');
      const leaves = [
        createLeafNode('r1', { price: 10 }),
        createLeafNode('r2', { price: 20 }),
      ];
      const result = service.calculateAggregations(groupNode, leaves);
      expect(result.price.count.value).toBe(2);
    });

    it('should return 0 for count when all values are undefined/null', () => {
      service.registerColumn({ field: 'price', aggregation: 'count' });
      const groupNode = createGroupNode('g1');
      const leaves = [
        createLeafNode('r1', {}),
        createLeafNode('r2', {}),
      ];
      const result = service.calculateAggregations(groupNode, leaves);
      // undefined values are filtered out before count, so count = 0
      expect(result.price.count.value).toBe(0);
    });

    it('should calculate min aggregation', () => {
      service.registerColumn({ field: 'price', aggregation: 'min' });
      const groupNode = createGroupNode('g1');
      const leaves = [
        createLeafNode('r1', { price: 30 }),
        createLeafNode('r2', { price: 10 }),
        createLeafNode('r3', { price: 20 }),
      ];
      const result = service.calculateAggregations(groupNode, leaves);
      expect(result.price.min.value).toBe(10);
    });

    it('should calculate max aggregation', () => {
      service.registerColumn({ field: 'price', aggregation: 'max' });
      const groupNode = createGroupNode('g1');
      const leaves = [
        createLeafNode('r1', { price: 30 }),
        createLeafNode('r2', { price: 10 }),
        createLeafNode('r3', { price: 20 }),
      ];
      const result = service.calculateAggregations(groupNode, leaves);
      expect(result.price.max.value).toBe(30);
    });

    it('should calculate first aggregation', () => {
      service.registerColumn({ field: 'name', aggregation: 'first' });
      const groupNode = createGroupNode('g1');
      const leaves = [
        createLeafNode('r1', { name: 'Alice' }),
        createLeafNode('r2', { name: 'Bob' }),
      ];
      const result = service.calculateAggregations(groupNode, leaves);
      expect(result.name.first.value).toBe('Alice');
    });

    it('should calculate last aggregation', () => {
      service.registerColumn({ field: 'name', aggregation: 'last' });
      const groupNode = createGroupNode('g1');
      const leaves = [
        createLeafNode('r1', { name: 'Alice' }),
        createLeafNode('r2', { name: 'Bob' }),
      ];
      const result = service.calculateAggregations(groupNode, leaves);
      expect(result.name.last.value).toBe('Bob');
    });

    it('should handle multiple aggregation types on same field', () => {
      service.registerColumn({ field: 'price', aggregation: ['sum', 'avg', 'count', 'min', 'max'] });
      const groupNode = createGroupNode('g1');
      const leaves = [
        createLeafNode('r1', { price: 10 }),
        createLeafNode('r2', { price: 20 }),
        createLeafNode('r3', { price: 30 }),
      ];
      const result = service.calculateAggregations(groupNode, leaves);
      expect(result.price.sum.value).toBe(60);
      expect(result.price.avg.value).toBeCloseTo(20);
      expect(result.price.count.value).toBe(3);
      expect(result.price.min.value).toBe(10);
      expect(result.price.max.value).toBe(30);
    });

    it('should apply precision', () => {
      service.registerColumn({ field: 'price', aggregation: { type: 'avg', precision: 2 } });
      const groupNode = createGroupNode('g1');
      const leaves = [
        createLeafNode('r1', { price: 10 }),
        createLeafNode('r2', { price: 20 }),
        createLeafNode('r3', { price: 33 }),
      ];
      const result = service.calculateAggregations(groupNode, leaves);
      expect(result.price.avg.value).toBe(21);
    });

    it('should use custom aggregator when provided', () => {
      service.registerColumn({
        field: 'price',
        aggregation: {
          type: 'sum',
          aggregator: (values) => values.reduce((a, b) => a + b, 0) * 2,
        },
      });
      const groupNode = createGroupNode('g1');
      const leaves = [
        createLeafNode('r1', { price: 10 }),
        createLeafNode('r2', { price: 20 }),
      ];
      const result = service.calculateAggregations(groupNode, leaves);
      expect(result.price.sum.value).toBe(60);
    });

    it('should use custom formatter when provided', () => {
      service.registerColumn({
        field: 'price',
        aggregation: {
          type: 'sum',
          formatter: (value) => `$${value}`,
        },
      });
      const groupNode = createGroupNode('g1');
      const leaves = [
        createLeafNode('r1', { price: 10 }),
        createLeafNode('r2', { price: 20 }),
      ];
      const result = service.calculateAggregations(groupNode, leaves);
      expect(result.price.sum.formatted).toBe('$30');
    });

    it('should filter out null and undefined values for non-count aggregations', () => {
      service.registerColumn({ field: 'price', aggregation: 'sum' });
      const groupNode = createGroupNode('g1');
      const leaves = [
        createLeafNode('r1', { price: 10 }),
        createLeafNode('r2', { price: null }),
        createLeafNode('r3', { price: undefined }),
        createLeafNode('r4', { price: 20 }),
      ];
      const result = service.calculateAggregations(groupNode, leaves);
      expect(result.price.sum.value).toBe(30);
    });

    it('should return null for sum/avg/min/max when all values are null', () => {
      service.registerColumn({ field: 'price', aggregation: ['sum', 'avg', 'min', 'max'] });
      const groupNode = createGroupNode('g1');
      const leaves = [
        createLeafNode('r1', { price: null }),
        createLeafNode('r2', { price: null }),
      ];
      const result = service.calculateAggregations(groupNode, leaves);
      // When all values are null/undefined, they are filtered out entirely.
      // aggregate([]) returns null for all types except count.
      expect(result.price.sum.value).toBeNull();
      expect(result.price.avg.value).toBeNull();
      expect(result.price.min.value).toBeNull();
      expect(result.price.max.value).toBeNull();
    });

    it('should apply prefix and suffix in formatting', () => {
      service.registerColumn({
        field: 'price',
        aggregation: { type: 'sum', prefix: '$', suffix: ' USD' },
      });
      const groupNode = createGroupNode('g1');
      const leaves = [createLeafNode('r1', { price: 100 })];
      const result = service.calculateAggregations(groupNode, leaves);
      expect(result.price.sum.formatted).toContain('$');
      expect(result.price.sum.formatted).toContain('USD');
    });

    it('should return empty formatted string for null value', () => {
      service.registerColumn({ field: 'price', aggregation: 'avg' });
      const groupNode = createGroupNode('g1');
      const leaves = [
        createLeafNode('r1', {}),
        createLeafNode('r2', {}),
      ];
      const result = service.calculateAggregations(groupNode, leaves);
      expect(result.price.avg.formatted).toBe('');
    });

    it('should handle string values that can be coerced to numbers', () => {
      service.registerColumn({ field: 'price', aggregation: 'sum' });
      const groupNode = createGroupNode('g1');
      const leaves = [
        createLeafNode('r1', { price: '10' }),
        createLeafNode('r2', { price: '20' }),
      ];
      const result = service.calculateAggregations(groupNode, leaves);
      expect(result.price.sum.value).toBe(30);
    });
  });

  describe('getAggregations', () => {
    it('should return cached aggregations by nodeId', () => {
      service.registerColumn({ field: 'price', aggregation: 'sum' });
      const groupNode = createGroupNode('g1');
      const leaves = [createLeafNode('r1', { price: 100 })];
      service.calculateAggregations(groupNode, leaves);
      const cached = service.getAggregations('g1');
      expect(cached).toBeDefined();
      expect(cached!.price.sum.value).toBe(100);
    });

    it('should return undefined for unknown nodeId', () => {
      expect(service.getAggregations('unknown')).toBeUndefined();
    });
  });

  describe('getFieldValue', () => {
    it('should get a specific field aggregation value', () => {
      service.registerColumn({ field: 'price', aggregation: 'sum' });
      const groupNode = createGroupNode('g1');
      const leaves = [createLeafNode('r1', { price: 50 }), createLeafNode('r2', { price: 50 })];
      service.calculateAggregations(groupNode, leaves);
      expect(service.getFieldValue('g1', 'price', 'sum')).toBe(100);
    });

    it('should return undefined for unknown field or type', () => {
      service.registerColumn({ field: 'price', aggregation: 'sum' });
      const groupNode = createGroupNode('g1');
      const leaves = [createLeafNode('r1', { price: 50 })];
      service.calculateAggregations(groupNode, leaves);
      expect(service.getFieldValue('g1', 'unknown', 'sum')).toBeUndefined();
      expect(service.getFieldValue('g1', 'price', 'avg')).toBeUndefined();
    });
  });

  describe('getFormattedValue', () => {
    it('should get formatted aggregation value', () => {
      service.registerColumn({ field: 'price', aggregation: 'sum' });
      const groupNode = createGroupNode('g1');
      const leaves = [createLeafNode('r1', { price: 100 })];
      service.calculateAggregations(groupNode, leaves);
      const formatted = service.getFormattedValue('g1', 'price', 'sum');
      expect(formatted).toContain('合计');
      expect(formatted).toContain('100');
    });

    it('should return empty string for unknown key', () => {
      expect(service.getFormattedValue('x', 'y', 'z')).toBe('');
    });
  });

  describe('hasAggregation', () => {
    it('should return true for registered field', () => {
      service.registerColumn({ field: 'price', aggregation: 'sum' });
      expect(service.hasAggregation('price')).toBe(true);
    });

    it('should return false for unregistered field', () => {
      expect(service.hasAggregation('unknown')).toBe(false);
    });
  });

  describe('getAggregationConfigs', () => {
    it('should return all configs', () => {
      service.registerColumns([
        { field: 'a', aggregation: 'sum' },
        { field: 'b', aggregation: 'avg' },
      ]);
      const configs = service.getAggregationConfigs();
      expect(configs.size).toBe(2);
    });
  });

  describe('clearCache', () => {
    it('should clear aggregation cache', () => {
      service.registerColumn({ field: 'price', aggregation: 'sum' });
      const groupNode = createGroupNode('g1');
      const leaves = [createLeafNode('r1', { price: 100 })];
      service.calculateAggregations(groupNode, leaves);
      expect(service.getAggregations('g1')).toBeDefined();
      service.clearCache();
      expect(service.getAggregations('g1')).toBeUndefined();
    });
  });

  describe('destroy', () => {
    it('should clear both configs and cache', () => {
      service.registerColumn({ field: 'price', aggregation: 'sum' });
      const groupNode = createGroupNode('g1');
      const leaves = [createLeafNode('r1', { price: 100 })];
      service.calculateAggregations(groupNode, leaves);
      service.destroy();
      expect(service.getAggregationConfigs().size).toBe(0);
      expect(service.getAggregations('g1')).toBeUndefined();
    });
  });
});
