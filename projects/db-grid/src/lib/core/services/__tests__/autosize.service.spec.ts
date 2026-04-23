import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AutoSizeService, AutoSizeConfig, AutoSizeOptions } from '../autosize.service';
import { ColDef } from '../../models';

describe('AutoSizeService', () => {
  let service: AutoSizeService;

  beforeEach(() => {
    service = new AutoSizeService();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('initialize', () => {
    it('should initialize with default values', () => {
      service.initialize();
      // Verify defaults through autoSizeColumn behavior
      const colDefs: ColDef[] = [{ field: 'name' }];
      const rowData = [{ name: 'Test' }];
      const width = service.autoSizeColumn('name', colDefs, rowData);
      expect(width).toBeGreaterThan(0);
    });

    it('should initialize with custom config', () => {
      service.initialize({
        autoSizeOnLoad: true,
        skipHeader: true,
        charWidth: 8,
        headerCharWidth: 12,
        padding: 30,
      });
      
      const colDefs: ColDef[] = [{ field: 'name', headerName: 'Name' }];
      const rowData = [{ name: 'Test' }];
      const width = service.autoSizeColumn('name', colDefs, rowData);
      expect(width).toBeGreaterThan(0);
    });
  });

  describe('autoSizeColumn', () => {
    beforeEach(() => {
      service.initialize({ charWidth: 10, headerCharWidth: 10, padding: 20 });
    });

    it('should return default width for missing column', () => {
      const width = service.autoSizeColumn('missing', [], []);
      expect(width).toBe(100);
    });

    it('should return existing width for suppressAutoSize column', () => {
      const colDefs: ColDef[] = [{ field: 'name', suppressAutoSize: true, width: 150 }];
      const width = service.autoSizeColumn('name', colDefs, []);
      expect(width).toBe(150);
    });

    it('should calculate width based on header text', () => {
      const colDefs: ColDef[] = [{ field: 'name', headerName: 'Name Column' }];
      const rowData = [{ name: 'A' }];
      
      const width = service.autoSizeColumn('name', colDefs, rowData);
      // 'Name Column' = 11 chars * 10 + 20 padding = 130
      expect(width).toBeGreaterThanOrEqual(110);
    });

    it('should calculate width based on data content', () => {
      const colDefs: ColDef[] = [{ field: 'name', headerName: 'N' }];
      const rowData = [{ name: 'Very Long Content Here' }];
      
      const width = service.autoSizeColumn('name', colDefs, rowData);
      // Content is 23 chars * 10 + 20 = 250, header is 1 char * 10 + 20 = 30
      expect(width).toBeGreaterThanOrEqual(230);
    });

    it('should respect minWidth', () => {
      const colDefs: ColDef[] = [{ field: 'name', minWidth: 200 }];
      const rowData = [{ name: 'Short' }];
      
      const width = service.autoSizeColumn('name', colDefs, rowData);
      expect(width).toBeGreaterThanOrEqual(200);
    });

    it('should respect maxWidth', () => {
      const colDefs: ColDef[] = [{ field: 'name', maxWidth: 100 }];
      const rowData = [{ name: 'Very Very Long Content' }];
      
      const width = service.autoSizeColumn('name', colDefs, rowData);
      expect(width).toBeLessThanOrEqual(100);
    });

    it('should skip header when skipHeader option is true', () => {
      const colDefs: ColDef[] = [{ field: 'name', headerName: 'Very Long Header' }];
      const rowData = [{ name: 'X' }];
      
      const width = service.autoSizeColumn('name', colDefs, rowData, { skipHeader: true });
      // Only data 'X' = 1 char * 10 + 20 = 30
      expect(width).toBeLessThanOrEqual(40);
    });

    it('should use sampleSize option', () => {
      const colDefs: ColDef[] = [{ field: 'name' }];
      const rowData = [
        { name: 'A' },
        { name: 'VeryLongContent' },
        { name: 'C' },
      ];
      
      const width1 = service.autoSizeColumn('name', colDefs, rowData, { sampleSize: 1 });
      const width2 = service.autoSizeColumn('name', colDefs, rowData, { sampleSize: 3 });
      
      expect(width2).toBeGreaterThanOrEqual(width1);
    });

    it('should find column by colId', () => {
      const colDefs: ColDef[] = [{ colId: 'customId', field: 'name' }];
      const rowData = [{ name: 'Test' }];
      
      const width = service.autoSizeColumn('customId', colDefs, rowData);
      expect(width).toBeGreaterThan(0);
    });

    it('should handle hidden columns', () => {
      const colDefs: ColDef[] = [{ field: 'name', hide: true }];
      // autoSizeAllColumns should skip hidden
      const result = service.autoSizeAllColumns(colDefs, []);
      expect(result.size).toBe(0);
    });
  });

  describe('autoSizeAllColumns', () => {
    beforeEach(() => {
      service.initialize({ charWidth: 10, headerCharWidth: 10, padding: 20 });
    });

    it('should return width map for all columns', () => {
      const colDefs: ColDef[] = [
        { field: 'name', headerName: 'Name' },
        { field: 'age', headerName: 'Age' },
      ];
      const rowData = [{ name: 'John Doe', age: 25 }];
      
      const result = service.autoSizeAllColumns(colDefs, rowData);
      
      expect(result.size).toBe(2);
      expect(result.has('name')).toBe(true);
      expect(result.has('age')).toBe(true);
      expect(result.get('name')).toBeGreaterThan(0);
      expect(result.get('age')).toBeGreaterThan(0);
    });

    it('should skip hidden columns', () => {
      const colDefs: ColDef[] = [
        { field: 'name' },
        { field: 'hidden', hide: true },
      ];
      const rowData = [{ name: 'Test', hidden: 'X' }];
      
      const result = service.autoSizeAllColumns(colDefs, rowData);
      
      expect(result.size).toBe(1);
      expect(result.has('name')).toBe(true);
      expect(result.has('hidden')).toBe(false);
    });
  });

  describe('sizeColumnsToFit', () => {
    beforeEach(() => {
      service.initialize({ padding: 20 });
    });

    it('should return empty map when no columns', () => {
      const result = service.sizeColumnsToFit(500, []);
      expect(result.size).toBe(0);
    });

    it('should distribute width proportionally when minWidth exceeds container', () => {
      const colDefs: ColDef[] = [
        { field: 'a', minWidth: 100 },
        { field: 'b', minWidth: 100 },
      ];
      
      const result = service.sizeColumnsToFit(100, colDefs);
      
      // Total minWidth = 200, container = 100
      // Each gets 50 (proportionally scaled down)
      expect(result.get('a')).toBe(50);
      expect(result.get('b')).toBe(50);
    });

    it('should allocate fixed width columns first', () => {
      const colDefs: ColDef[] = [
        { field: 'fixed', width: 150 },
        { field: 'flexible', flex: 1 },
      ];
      
      const result = service.sizeColumnsToFit(500, colDefs);
      
      expect(result.get('fixed')).toBe(150);
      expect(result.get('flexible')).toBe(350);
    });

    it('should respect flex ratio', () => {
      const colDefs: ColDef[] = [
        { field: 'a', flex: 2 },
        { field: 'b', flex: 1 },
      ];
      
      const result = service.sizeColumnsToFit(300, colDefs);
      
      // a gets 2/3 = 200, b gets 1/3 = 100
      expect(result.get('a')).toBe(200);
      expect(result.get('b')).toBe(100);
    });

    it('should apply minWidth to flex columns', () => {
      const colDefs: ColDef[] = [
        { field: 'a', flex: 1, minWidth: 200 },
        { field: 'b', flex: 1 },
      ];
      
      const result = service.sizeColumnsToFit(300, colDefs);
      
      // a gets at least 200
      expect(result.get('a')).toBeGreaterThanOrEqual(200);
    });

    it('should apply maxWidth to flex columns', () => {
      const colDefs: ColDef[] = [
        { field: 'a', flex: 1, maxWidth: 100 },
        { field: 'b', flex: 1 },
      ];
      
      const result = service.sizeColumnsToFit(500, colDefs);
      
      expect(result.get('a')).toBeLessThanOrEqual(100);
    });

    it('should use minWidth for auto columns', () => {
      const colDefs: ColDef[] = [
        { field: 'a', minWidth: 80 },
        { field: 'b', minWidth: 100 }, // auto column with minWidth
      ];
      
      const result = service.sizeColumnsToFit(200, colDefs);
      
      expect(result.get('a')).toBeGreaterThanOrEqual(80);
      expect(result.get('b')).toBeGreaterThanOrEqual(50);
    });

    it('should apply min/max to fixed columns', () => {
      const colDefs: ColDef[] = [
        { field: 'a', width: 50, minWidth: 100 },
        { field: 'b', width: 500, maxWidth: 200 },
      ];
      
      const result = service.sizeColumnsToFit(500, colDefs);
      
      expect(result.get('a')).toBeGreaterThanOrEqual(100);
      expect(result.get('b')).toBeLessThanOrEqual(200);
    });

    it('should distribute remaining to auto columns when no flex', () => {
      const colDefs: ColDef[] = [
        { field: 'fixed', width: 100 },
        { field: 'auto1' },
        { field: 'auto2' },
      ];
      
      const result = service.sizeColumnsToFit(300, colDefs);
      
      // fixed = 100, remaining = 200, auto1 + auto2 share
      expect(result.get('fixed')).toBe(100);
      const remaining = result.get('auto1') + result.get('auto2');
      expect(remaining).toBe(200);
    });
  });

  describe('estimateTextWidth', () => {
    it('should estimate width for English text', () => {
      service.initialize({ padding: 20 });
      const width = service.estimateTextWidth('Hello', 13);
      // 5 chars * 13 * 0.6 = 39 + 20 padding = 59
      expect(width).toBeGreaterThanOrEqual(50);
    });

    it('should estimate width for Chinese text', () => {
      service.initialize({ padding: 20 });
      const width = service.estimateTextWidth('你好', 13);
      // 2 Chinese chars * 13 (fontSize for Chinese) + 20 padding
      expect(width).toBeGreaterThanOrEqual(40); // Implementation uses fontSize for Chinese chars
    });

    it('should handle mixed content', () => {
      service.initialize({ padding: 20 });
      const width = service.estimateTextWidth('Hello你好', 13);
      // English: 5 * 13 * 0.6 = 39, Chinese: 2 * 13 = 26, total = 65 + 20
      expect(width).toBeGreaterThanOrEqual(80);
    });
  });

  describe('destroy', () => {
    it('should be callable without error', () => {
      service.destroy();
      expect(() => service.destroy()).not.toThrow();
    });
  });
});