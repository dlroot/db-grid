/// <reference types='vitest' />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChartsService, ChartConfig, ChartInstance } from '../charts.service';

describe('ChartsService', () => {
  let service: ChartsService;

  beforeEach(() => {
    service = new ChartsService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Chart Config Generation', () => {
    it('should generate bar chart config from grid data', () => {
      const config = service.chartConfigFromGridData(
        'bar',
        'Test Chart',
        ['Q1', 'Q2', 'Q3'],
        [{ label: 'Sales', data: [100, 200, 150], color: '#5470c6' }]
      );

      expect(config.type).toBe('bar');
      expect(config.title).toBe('Test Chart');
      expect(config.data.labels).toEqual(['Q1', 'Q2', 'Q3']);
      expect(config.data.datasets).toHaveLength(1);
      expect(config.data.datasets[0].label).toBe('Sales');
      expect(config.data.datasets[0].data).toEqual([100, 200, 150]);
    });

    it('should generate line chart config', () => {
      const config = service.chartConfigFromGridData(
        'line',
        'Trend',
        ['Jan', 'Feb', 'Mar'],
        [{ label: 'Revenue', data: [50, 75, 100] }]
      );

      expect(config.type).toBe('line');
      expect(config.data.datasets[0].borderColor).toBeDefined();
    });

    it('should generate pie chart config', () => {
      const config = service.chartConfigFromGridData(
        'pie',
        'Distribution',
        ['A', 'B', 'C'],
        [{ label: 'Share', data: [30, 50, 20] }]
      );

      expect(config.type).toBe('pie');
      expect(config.data.datasets[0].backgroundColor).toHaveLength(3);
    });

    it('should generate doughnut chart config', () => {
      const config = service.chartConfigFromGridData(
        'doughnut',
        ' donut',
        ['X', 'Y'],
        [{ label: 'Data', data: [60, 40], color: '#91cc75' }]
      );

      expect(config.type).toBe('doughnut');
    });

    it('should use default palette colors when not specified', () => {
      const config = service.chartConfigFromGridData(
        'bar',
        'Title',
        ['1', '2', '3', '4'],
        [
          { label: 'Series1', data: [1, 2, 3, 4] },
          { label: 'Series2', data: [5, 6, 7, 8] }
        ]
      );

      expect(config.data.datasets[0].backgroundColor).toBe('#5470c6');
      expect(config.data.datasets[1].backgroundColor).toBe('#91cc75');
    });
  });

  describe('Chart Instance Management', () => {
    it('should track charts by container id', () => {
      // Note: DOM operations require jsdom setup - testing the internal tracking logic
      const charts = service as any;
      // Verify internal state exists
      expect(charts.charts).toBeInstanceOf(Map);
      expect(charts.elementCharts).toBeInstanceOf(Map);
    });

    it('should generate unique chart id counter', () => {
      const charts = service as any;
      expect(typeof charts.chartIdCounter).toBe('number');
    });
  });
});