import { describe, it, expect, beforeEach } from 'vitest';
import { ChartsService } from '../charts.service';

describe('ChartsService', () => {
  let service: ChartsService;

  beforeEach(() => {
    service = new ChartsService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should createChart method exists', () => {
    expect(typeof service.createChart).toBe('function');
  });

  it('should destroyChart method exists', () => {
    expect(typeof service.destroyChart).toBe('function');
  });

  it('should have chartConfigFromGridData method', () => {
    expect(typeof (service as any).chartConfigFromGridData).toBe('function');
  });

  it('should generate chart config from grid data', () => {
    const columns = [
      { field: 'month', headerName: '月份' },
      { field: 'sales', headerName: '销售额' },
    ];
    const rows = [
      { month: '一月', sales: 1000 },
      { month: '二月', sales: 1500 },
    ];

    const config = (service as any).chartConfigFromGridData(columns, rows, 'month', 'sales', 'bar');
    expect(config.type).toBe('bar');
    expect(config.data?.labels).toEqual(['一月', '二月']);
    expect(config.data?.datasets?.[0]?.data).toEqual([1000, 1500]);
  });

  it('should handle empty data', () => {
    const config = (service as any).chartConfigFromGridData([], [], 'month', 'sales', 'bar');
    expect(config.data?.labels?.length).toBe(0);
  });
});
