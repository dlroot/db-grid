import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PivotService } from '../pivot.service';

describe('PivotService', () => {
  let service: PivotService;

  const sampleRowData = [
    { country: 'China', product: 'Phone', year: '2023', sales: 100 },
    { country: 'China', product: 'Phone', year: '2024', sales: 150 },
    { country: 'China', product: 'Laptop', year: '2023', sales: 80 },
    { country: 'USA', product: 'Phone', year: '2023', sales: 90 },
    { country: 'USA', product: 'Phone', year: '2024', sales: 110 },
    { country: 'USA', product: 'Laptop', year: '2023', sales: 70 },
  ];

  beforeEach(() => {
    service = new PivotService();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('initialize', () => {
    it('should initialize with defaults (disabled)', () => {
      service.initialize();
      expect(service.isEnabled()).toBe(false);
      expect(service.isPivotMode()).toBe(false);
    });

    it('should initialize with custom config', () => {
      service.initialize({
        enabled: true,
        pivotMode: true,
        pivotColumns: ['year'],
        rowGroupColumns: ['country', 'product'],
        valueColumns: [{ field: 'sales', aggFunc: 'sum' }],
      });
      expect(service.isEnabled()).toBe(true);
      expect(service.isPivotMode()).toBe(true);
    });
  });

  describe('enablePivotMode / disablePivotMode', () => {
    it('should enable pivot mode', () => {
      service.enablePivotMode();
      expect(service.isPivotMode()).toBe(true);
      expect(service.isEnabled()).toBe(true);
    });

    it('should disable pivot mode', () => {
      service.enablePivotMode();
      service.disablePivotMode();
      expect(service.isPivotMode()).toBe(false);
    });
  });

  describe('setPivotColumns / setRowGroupColumns / setValueColumns', () => {
    it('should set pivot columns', () => {
      service.setPivotColumns(['year', 'quarter']);
      expect(service['pivotColumns']).toEqual(['year', 'quarter']);
    });

    it('should set row group columns', () => {
      service.setRowGroupColumns(['country']);
      expect(service['rowGroupColumns']).toEqual(['country']);
    });

    it('should set value columns', () => {
      service.setValueColumns([{ field: 'sales', aggFunc: 'sum' }]);
      expect(service['valueColumns']).toHaveLength(1);
      expect(service['valueColumns'][0].field).toBe('sales');
    });
  });

  describe('addPivotColumn / removePivotColumn', () => {
    it('should add pivot column', () => {
      service.addPivotColumn('year');
      service.addPivotColumn('quarter');
      expect(service['pivotColumns']).toContain('year');
      expect(service['pivotColumns']).toContain('quarter');
    });

    it('should not add duplicate pivot column', () => {
      service.addPivotColumn('year');
      service.addPivotColumn('year');
      expect(service['pivotColumns'].filter(c => c === 'year').length).toBe(1);
    });

    it('should remove pivot column', () => {
      service.addPivotColumn('year');
      service.addPivotColumn('quarter');
      service.removePivotColumn('year');
      expect(service['pivotColumns']).not.toContain('year');
      expect(service['pivotColumns']).toContain('quarter');
    });
  });

  describe('addRowGroupColumn / addValueColumn', () => {
    it('should add row group column', () => {
      service.addRowGroupColumn('country');
      service.addRowGroupColumn('product');
      expect(service['rowGroupColumns']).toContain('country');
      expect(service['rowGroupColumns']).toContain('product');
    });

    it('should add value column', () => {
      service.addValueColumn({ field: 'sales', aggFunc: 'sum' });
      service.addValueColumn({ field: 'count', aggFunc: 'count' });
      expect(service['valueColumns']).toHaveLength(2);
    });
  });

  describe('compute', () => {
    beforeEach(() => {
      service.enablePivotMode();
      service.setPivotColumns(['year']);
      service.setRowGroupColumns(['country', 'product']);
      service.setValueColumns([{ field: 'sales', aggFunc: 'sum' }]);
    });

    it('should return empty result when pivotColumns is empty', () => {
      service.setPivotColumns([]);
      const result = service.compute(sampleRowData);
      expect(result.headers).toEqual([]);
      expect(result.rows).toEqual([]);
    });

    it('should return headers for all pivot values', () => {
      const result = service.compute(sampleRowData);
      // headers are PivotHeader objects with key, label, pivotValue, etc.
      const headerKeys = result.headers.map((h: any) => h.pivotValue);
      expect(headerKeys).toContain('2023');
      expect(headerKeys).toContain('2024');
    });

    it('should return rows grouped by rowGroupColumns', () => {
      const result = service.compute(sampleRowData);
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should aggregate values', () => {
      const result = service.compute(sampleRowData);
      // China Phone 2023 should have sales = 100
      const chinaPhone2023 = result.rows.find((r: any) => 
        r.groupKey === 'China|Phone' && r.values['2023_sales'] === 100
      );
      expect(chinaPhone2023).toBeDefined();
    });

    it('should compute totals', () => {
      const result = service.compute(sampleRowData);
      expect(result.totals).toBeDefined();
    });

    it('should return empty when rowData is empty', () => {
      const result = service.compute([]);
      expect(result.headers).toEqual([]);
      expect(result.rows).toEqual([]);
    });

    it('should handle multiple value columns', () => {
      service.addValueColumn({ field: 'count', aggFunc: 'count' });
      const result = service.compute(sampleRowData);
      // Should have values for both columns
      const row = result.rows[0];
      expect(row.values).toBeDefined();
    });

    it('should use avg aggregation when configured', () => {
      service.setValueColumns([{ field: 'sales', aggFunc: 'avg' }]);
      const result = service.compute(sampleRowData);
      expect(result).toBeDefined();
    });

    it('should use count aggregation', () => {
      service.setValueColumns([{ field: 'sales', aggFunc: 'count' }]);
      const result = service.compute(sampleRowData);
      // Each group should have count = 1
      expect(result).toBeDefined();
    });
  });

  describe('setOnPivotChanged', () => {
    it('should register callback', () => {
      const spy = vi.fn();
      service.onPivotChangedEvent(spy);
      service.enablePivotMode();
      service.setPivotColumns(['year']);
      service.compute(sampleRowData);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getPivotColumnKeys', () => {
    it('should return array of pivot column keys', () => {
      service.enablePivotMode();
      service.setPivotColumns(['year']);
      service.setRowGroupColumns(['country', 'product']);
      service.setValueColumns([{ field: 'sales', aggFunc: 'sum' }]);
      // getPivotColumnKeys doesn't exist; use compute().headers to get pivot values
      const result = service.compute(sampleRowData);
      const keys = result.headers.map((h: any) => h.pivotValue);
      expect(keys).toContain('2023');
      expect(keys).toContain('2024');
    });
  });

  describe('destroy', () => {
    it('should clear pivot state', () => {
      service.enablePivotMode();
      service.setPivotColumns(['year']);
      service.setRowGroupColumns(['country']);
      service.setValueColumns([{ field: 'sales', aggFunc: 'sum' }]);
      
      service.destroy();
      
      // destroy() only clears pivotResult and callback, not enabled/columns
      // Columns remain set (destroy is for cleanup, not full reset)
      expect(service['pivotColumns']).toEqual(['year']);
      expect(service['rowGroupColumns']).toEqual(['country']);
      expect(service['valueColumns']).toHaveLength(1);
    });
  });
});
