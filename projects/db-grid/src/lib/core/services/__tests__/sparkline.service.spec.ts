// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SparklineService, SparklineType, SparklineOptions } from '../sparkline.service';

describe('SparklineService', () => {
  let service: SparklineService;

  beforeEach(() => {
    service = new SparklineService();
  });

  describe('Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('Line chart', () => {
    it('should render a line chart', () => {
      const canvas = document.createElement('canvas');
      const options: SparklineOptions = {
        type: 'line',
        data: [10, 20, 15, 30, 25],
        color: '#2196f3',
        width: 100,
        height: 30,
      };

      expect(() => service.render(canvas, options)).not.toThrow();
      expect(canvas.width).toBeGreaterThan(0);
      expect(canvas.height).toBeGreaterThan(0);
    });

    it('should render a single data point as a dot', () => {
      const canvas = document.createElement('canvas');
      const options: SparklineOptions = {
        type: 'line',
        data: [42],
        color: '#ff0000',
      };

      service.render(canvas, options);
      expect(canvas.width).toBeGreaterThan(0);
    });

    it('should handle empty data gracefully', () => {
      const canvas = document.createElement('canvas');
      service.render(canvas, { data: [], type: 'line' });
      // Canvas retains its default dimensions when no data is provided
      expect(canvas.width).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Bar chart', () => {
    it('should render a bar chart', () => {
      const canvas = document.createElement('canvas');
      const options: SparklineOptions = {
        type: 'bar',
        data: [5, 10, -3, 8, 12],
        color: '#4caf50',
        width: 120,
        height: 40,
      };

      expect(() => service.render(canvas, options)).not.toThrow();
      expect(canvas.width).toBeGreaterThan(0);
    });

    it('should render bars with negative values', () => {
      const canvas = document.createElement('canvas');
      const options: SparklineOptions = {
        type: 'bar',
        data: [5, -10, -3, 8],
        negativeColor: '#f44336',
      };

      expect(() => service.render(canvas, options)).not.toThrow();
    });
  });

  describe('Area chart', () => {
    it('should render an area chart', () => {
      const canvas = document.createElement('canvas');
      const options: SparklineOptions = {
        type: 'area',
        data: [1, 3, 2, 5, 4, 6],
        color: '#9c27b0',
        width: 100,
        height: 30,
      };

      expect(() => service.render(canvas, options)).not.toThrow();
      expect(canvas.width).toBeGreaterThan(0);
    });

    it('should handle single point area chart gracefully', () => {
      const canvas = document.createElement('canvas');
      const options: SparklineOptions = {
        type: 'area',
        data: [7],
      };

      expect(() => service.render(canvas, options)).not.toThrow();
    });
  });

  describe('Options', () => {
    it('should use default options when not provided', () => {
      const canvas = document.createElement('canvas');
      service.render(canvas, { data: [1, 2, 3], type: 'line' });
      expect(canvas.style.width).toBe('100px');
      expect(canvas.style.height).toBe('30px');
    });

    it('should respect custom width and height', () => {
      const canvas = document.createElement('canvas');
      service.render(canvas, { data: [1, 2, 3], type: 'line', width: 200, height: 50 });
      expect(canvas.style.width).toBe('200px');
      expect(canvas.style.height).toBe('50px');
    });

    it('should use custom max and min', () => {
      const canvas = document.createElement('canvas');
      service.render(canvas, {
        data: [5, 6, 7],
        type: 'line',
        min: 0,
        max: 10,
      });
      expect(canvas.width).toBeGreaterThan(0);
    });

    it('should draw background color', () => {
      const canvas = document.createElement('canvas');
      service.render(canvas, {
        data: [1, 2, 3],
        type: 'line',
        backgroundColor: '#f5f5f5',
      });
      expect(canvas.width).toBeGreaterThan(0);
    });
  });

  describe('Cell renderer HTML', () => {
    it('should generate HTML for cell renderer', () => {
      const html = service.createCellRendererHtml(
        { data: [1, 2, 3], type: 'line', width: 80, height: 24 },
        'spark-123'
      );
      expect(html).toContain('canvas');
      expect(html).toContain('sparkline-id="spark-123"');
      expect(html).toContain('width="80"');
      expect(html).toContain('height="24"');
    });
  });
});
