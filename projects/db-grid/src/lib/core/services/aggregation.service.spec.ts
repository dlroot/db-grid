/**
 * AggregationService 单元测试
 * 测试聚合计算功能：sum/avg/count/min/max/first/last
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AggregationService, AggregationType, AggregationConfig } from './aggregation.service';
import { ColDef, RowNode } from '../models';

describe('AggregationService', () => {
  let service: AggregationService;

  // 辅助函数：创建 mock RowNode
  const createMockNode = (id: string, data: any): RowNode => ({
    id,
    data,
    level: 0,
    children: [],
    expanded: false,
    selected: false,
    visible: true,
    height: 0,
    rowIndex: 0,
    rowTop: 0,
    parent: null,
    firstChild: false,
    lastChild: false,
    childIndex: 0,
    allChildrenCount: 0,
    leafGroup: false,
    group: false,
    rowHeight: 0,
    floating: null,
    detail: false,
  });

  // 创建叶节点数组
  const createLeafNodes = (dataArray: any[]): RowNode[] =>
    dataArray.map((data, i) => createMockNode(`leaf-${i}`, data));

  beforeEach(() => {
    service = new AggregationService();
  });

  describe('registerColumn', () => {
    it('should register column with string aggregation type', () => {
      const colDef: ColDef = { field: 'price', aggregation: 'sum' };
      service.registerColumn(colDef);
      expect(service.hasAggregation('price')).toBe(true);
    });

    it('should register column with array of aggregation types', () => {
      const colDef: ColDef = { field: 'price', aggregation: ['sum', 'avg'] };
      service.registerColumn(colDef);
      expect(service.hasAggregation('price')).toBe(true);
    });

    it('should register column with full config object', () => {
      const colDef: ColDef = {
        field: 'price',
        aggregation: { type: 'sum', precision: 2 },
      };
      service.registerColumn(colDef);
      expect(service.hasAggregation('price')).toBe(true);
    });

    it('should not register column without aggregation', () => {
      const colDef: ColDef = { field: 'name' };
      service.registerColumn(colDef);
      expect(service.hasAggregation('name')).toBe(false);
    });

    it('should not register column without field', () => {
      const colDef: ColDef = { aggregation: 'sum' };
      service.registerColumn(colDef);
      expect(service.hasAggregation('')).toBe(false);
    });

    it('should use colId as fallback when field is missing', () => {
      const colDef: ColDef = { colId: 'myColumn', aggregation: 'sum' };
      service.registerColumn(colDef);
      expect(service.hasAggregation('myColumn')).toBe(true);
    });
  });

  describe('registerColumns', () => {
    it('should register multiple columns', () => {
      const columnDefs: ColDef[] = [
        { field: 'price', aggregation: 'sum' },
        { field: 'quantity', aggregation: 'avg' },
        { field: 'name' },
      ];
      service.registerColumns(columnDefs);
      expect(service.hasAggregation('price')).toBe(true);
      expect(service.hasAggregation('quantity')).toBe(true);
      expect(service.hasAggregation('name')).toBe(false);
    });

    it('should handle empty array', () => {
      service.registerColumns([]);
      expect(service.getAggregationConfigs().size).toBe(0);
    });
  });

  describe('calculateAggregations', () => {
    beforeEach(() => {
      service.registerColumns([
        { field: 'price', aggregation: 'sum' },
        { field: 'quantity', aggregation: ['sum', 'avg'] },
        { field: 'discount', aggregation: { type: 'min', precision: 2 } },
      ]);
    });

    it('should calculate sum aggregation', () => {
      const groupNode = createMockNode('group-1', { name: 'Group A' });
      const leafNodes = createLeafNodes([
        { price: 100, quantity: 10 },
        { price: 200, quantity: 20 },
        { price: 300, quantity: 30 },
      ]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['price']['sum'].value).toBe(600);
    });

    it('should calculate avg aggregation', () => {
      const groupNode = createMockNode('group-1', { name: 'Group A' });
      const leafNodes = createLeafNodes([
        { quantity: 10 },
        { quantity: 20 },
        { quantity: 30 },
      ]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['quantity']['avg'].value).toBe(20);
    });

    it('should calculate count aggregation', () => {
      service.registerColumn({ field: 'items', aggregation: 'count' });
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([{ items: 1 }, { items: 2 }, { items: 3 }]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['items']['count'].value).toBe(3);
    });

    it('should calculate min aggregation', () => {
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([
        { discount: 0.15 },
        { discount: 0.10 },
        { discount: 0.20 },
      ]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['discount']['min'].value).toBe(0.1);
    });

    it('should calculate max aggregation', () => {
      service.registerColumn({ field: 'maxPrice', aggregation: 'max' });
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([
        { maxPrice: 100 },
        { maxPrice: 500 },
        { maxPrice: 300 },
      ]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['maxPrice']['max'].value).toBe(500);
    });

    it('should calculate first aggregation', () => {
      service.registerColumn({ field: 'name', aggregation: 'first' });
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([
        { name: 'Alice' },
        { name: 'Bob' },
        { name: 'Charlie' },
      ]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['name']['first'].value).toBe('Alice');
    });

    it('should calculate last aggregation', () => {
      service.registerColumn({ field: 'name', aggregation: 'last' });
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([
        { name: 'Alice' },
        { name: 'Bob' },
        { name: 'Charlie' },
      ]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['name']['last'].value).toBe('Charlie');
    });

    it('should handle multiple aggregation types on same field', () => {
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([
        { quantity: 10 },
        { quantity: 20 },
      ]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['quantity']['sum'].value).toBe(30);
      expect(result['quantity']['avg'].value).toBe(15);
    });

    it('should apply precision to numeric values', () => {
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([
        { discount: 0.12345 },
        { discount: 0.67890 },
      ]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['discount']['min'].value).toBeCloseTo(0.12, 2);
    });

    it('should return empty result for empty leaf nodes', () => {
      const groupNode = createMockNode('group-1', {});
      const result = service.calculateAggregations(groupNode, []);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle null and undefined values', () => {
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([
        { price: 100 },
        { price: null },
        { price: undefined },
        { price: 200 },
      ]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['price']['sum'].value).toBe(300);
    });

    it('should handle non-numeric values for numeric aggregations', () => {
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([
        { price: 100 },
        { price: 'not a number' },
        { price: 200 },
      ]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['price']['sum'].value).toBe(300);
    });

    it('should return null for avg/min/max with no valid numeric values', () => {
      service.registerColumn({ field: 'invalid', aggregation: ['avg', 'min', 'max'] });
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([
        { invalid: 'text' },
        { invalid: null },
      ]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['invalid']['avg'].value).toBeNull();
      expect(result['invalid']['min'].value).toBeNull();
      expect(result['invalid']['max'].value).toBeNull();
    });

    it('should return 0 for count with no valid values', () => {
      service.registerColumn({ field: 'empty', aggregation: 'count' });
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([{}, {}]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      // count aggregation filters out null/undefined values
      expect(result['empty']['count'].value).toBe(0);
    });
  });

  describe('custom aggregator', () => {
    it('should use custom aggregator function', () => {
      service.registerColumn({
        field: 'score',
        aggregation: {
          type: 'sum',
          aggregator: (values) => values.reduce((a, b) => a + b * 2, 0),
        },
      });

      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([
        { score: 10 },
        { score: 20 },
      ]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['score']['sum'].value).toBe(60);
    });
  });

  describe('formatter', () => {
    it('should use custom formatter function', () => {
      service.registerColumn({
        field: 'price',
        aggregation: {
          type: 'sum',
          formatter: (value) => `$${value.toFixed(2)}`,
        },
      });

      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([
        { price: 100.5 },
        { price: 200.3 },
      ]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['price']['sum'].formatted).toBe('$300.80');
    });

    it('should apply prefix and suffix', () => {
      service.registerColumn({
        field: 'price',
        aggregation: {
          type: 'sum',
          prefix: '$',
          suffix: ' USD',
        },
      });

      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([{ price: 100 }]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['price']['sum'].formatted).toContain('$');
      expect(result['price']['sum'].formatted).toContain('USD');
    });
  });

  describe('formatted value', () => {
    it('should include type label in formatted value', () => {
      service.registerColumn({ field: 'price', aggregation: 'sum' });
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([{ price: 100 }]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['price']['sum'].formatted).toContain('合计');
    });

    it('should return empty string for null value', () => {
      service.registerColumn({ field: 'empty', aggregation: 'avg' });
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([{ empty: null }]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['empty']['avg'].formatted).toBe('');
    });
  });

  describe('caching', () => {
    it('should cache aggregation results', () => {
      service.registerColumn({ field: 'price', aggregation: 'sum' });
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([{ price: 100 }]);

      service.calculateAggregations(groupNode, leafNodes);

      const cached = service.getAggregations('group-1');
      expect(cached).toBeDefined();
      expect(cached!['price']['sum'].value).toBe(100);
    });

    it('should get cached field value', () => {
      service.registerColumn({ field: 'price', aggregation: 'sum' });
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([{ price: 100 }]);

      service.calculateAggregations(groupNode, leafNodes);

      expect(service.getFieldValue('group-1', 'price', 'sum')).toBe(100);
    });

    it('should get cached formatted value', () => {
      service.registerColumn({ field: 'price', aggregation: 'sum' });
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([{ price: 100 }]);

      service.calculateAggregations(groupNode, leafNodes);

      expect(service.getFormattedValue('group-1', 'price', 'sum')).toContain('合计');
    });

    it('should return undefined for non-existent cache key', () => {
      expect(service.getAggregations('non-existent')).toBeUndefined();
      expect(service.getFieldValue('non-existent', 'price', 'sum')).toBeUndefined();
    });

    it('should clear cache', () => {
      service.registerColumn({ field: 'price', aggregation: 'sum' });
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([{ price: 100 }]);

      service.calculateAggregations(groupNode, leafNodes);
      service.clearCache();

      expect(service.getAggregations('group-1')).toBeUndefined();
    });
  });

  describe('getAggregationConfigs', () => {
    it('should return all registered configs', () => {
      service.registerColumns([
        { field: 'price', aggregation: 'sum' },
        { field: 'quantity', aggregation: 'avg' },
      ]);

      const configs = service.getAggregationConfigs();
      expect(configs.size).toBe(2);
    });
  });

  describe('destroy', () => {
    it('should clear all data on destroy', () => {
      service.registerColumn({ field: 'price', aggregation: 'sum' });
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([{ price: 100 }]);

      service.calculateAggregations(groupNode, leafNodes);
      service.destroy();

      expect(service.hasAggregation('price')).toBe(false);
      expect(service.getAggregations('group-1')).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle single value for all aggregations', () => {
      service.registerColumn({
        field: 'value',
        aggregation: ['sum', 'avg', 'count', 'min', 'max', 'first', 'last'],
      });

      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([{ value: 42 }]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['value']['sum'].value).toBe(42);
      expect(result['value']['avg'].value).toBe(42);
      expect(result['value']['count'].value).toBe(1);
      expect(result['value']['min'].value).toBe(42);
      expect(result['value']['max'].value).toBe(42);
      expect(result['value']['first'].value).toBe(42);
      expect(result['value']['last'].value).toBe(42);
    });

    it('should handle negative numbers', () => {
      service.registerColumn({ field: 'value', aggregation: ['sum', 'min', 'max'] });
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([
        { value: -10 },
        { value: 5 },
        { value: -3 },
      ]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['value']['sum'].value).toBe(-8);
      expect(result['value']['min'].value).toBe(-10);
      expect(result['value']['max'].value).toBe(5);
    });

    it('should handle floating point numbers', () => {
      service.registerColumn({ field: 'value', aggregation: 'sum' });
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([
        { value: 0.1 },
        { value: 0.2 },
        { value: 0.3 },
      ]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['value']['sum'].value).toBeCloseTo(0.6, 10);
    });

    it('should handle very large numbers', () => {
      service.registerColumn({ field: 'value', aggregation: 'sum' });
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([
        { value: Number.MAX_SAFE_INTEGER },
        { value: 1 },
      ]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['value']['sum'].value).toBe(Number.MAX_SAFE_INTEGER + 1);
    });

    it('should handle zero values', () => {
      service.registerColumn({ field: 'value', aggregation: ['sum', 'avg', 'min', 'max'] });
      const groupNode = createMockNode('group-1', {});
      const leafNodes = createLeafNodes([
        { value: 0 },
        { value: 0 },
        { value: 0 },
      ]);

      const result = service.calculateAggregations(groupNode, leafNodes);
      expect(result['value']['sum'].value).toBe(0);
      expect(result['value']['avg'].value).toBe(0);
      expect(result['value']['min'].value).toBe(0);
      expect(result['value']['max'].value).toBe(0);
    });
  });
});
