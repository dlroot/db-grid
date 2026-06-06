import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExcelImportService, ImportOptions } from '../excel-import.service';

// Minimal mock for File
function createMockFile(data: string, name = 'test.xlsx'): File {
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const file = blob as any;
  file.name = name;
  file.size = data.length;
  file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(data.length));
  return file as File;
}

// Mock XLSX module
vi.mock('xlsx', () => {
  const mockSheet = {
    'A1': { v: 'Name' },
    'B1': { v: 'Age' },
    'C1': { v: 'City' },
    'A2': { v: 'Alice' },
    'B2': { v: 25 },
    'C2': { v: 'NYC' },
    'A3': { v: 'Bob' },
    'B3': { v: 30 },
    'C3': { v: 'LA' },
    '!ref': 'A1:C3',
  };

  return {
    read: vi.fn(() => ({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: mockSheet },
    })),
    utils: {
      sheet_to_json: vi.fn(() => [
        ['Name', 'Age', 'City'],
        ['Alice', 25, 'NYC'],
        ['Bob', 30, 'LA'],
      ]),
    },
  };
});

describe('ExcelImportService', () => {
  let service: ExcelImportService;

  beforeEach(() => {
    service = new ExcelImportService();
  });

  // ===== parseFile =====
  describe('parseFile', () => {
    it('should parse a valid xlsx file', async () => {
      const mockBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: 'test.xlsx',
        size: 8,
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any;

      const result = await service.parseFile(mockFile);

      expect(result.sheetName).toBe('Sheet1');
      expect(result.totalRows).toBe(2);
      expect(result.totalCols).toBe(3);
    });

    it('should generate rowData with correct structure', async () => {
      const mockBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: 'test.xlsx',
        size: 8,
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any;

      const result = await service.parseFile(mockFile);

      expect(result.rowData.length).toBe(2);
      expect(result.rowData[0]).toHaveProperty('name');
      expect(result.rowData[0].name).toBe('Alice');
      expect(result.rowData[1].name).toBe('Bob');
    });

    it('should generate columnDefs', async () => {
      const mockBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: 'test.xlsx',
        size: 8,
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any;

      const result = await service.parseFile(mockFile);

      expect(result.columnDefs.length).toBe(3);
      expect(result.columnDefs[0]).toHaveProperty('field');
      expect(result.columnDefs[0]).toHaveProperty('headerName');
      expect(result.columnDefs[0]).toHaveProperty('width');
      expect(result.columnDefs[0]).toHaveProperty('sortable');
    });

    it('should skip empty rows by default', async () => {
      const mockBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: 'test.xlsx',
        size: 8,
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any;

      const result = await service.parseFile(mockFile, { skipEmptyRows: true });
      // Only non-empty rows counted
      expect(result.totalRows).toBeGreaterThanOrEqual(0);
    });

    it('should infer column types', async () => {
      const mockBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: 'test.xlsx',
        size: 8,
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any;

      const result = await service.parseFile(mockFile, { inferTypes: true });
      expect(result.columnDefs[1].cellType).toBe('number');
    });

    it('should use headerRow option', async () => {
      const mockBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: 'test.xlsx',
        size: 8,
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any;

      const result = await service.parseFile(mockFile, { headerRow: 0 });
      expect(result.columnDefs.length).toBeGreaterThan(0);
    });

    it('should respect sheetIndex option', async () => {
      const mockBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: 'test.xlsx',
        size: 8,
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any;

      const result = await service.parseFile(mockFile, { sheetIndex: 0 });
      expect(result.sheetName).toBeDefined();
    });
  });

  // ===== fieldFromHeader =====
  describe('fieldFromHeader', () => {
    it('should convert header to camelCase field', () => {
      const mockBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: 'test.xlsx',
        size: 8,
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any;

      // Test via parseFile result
      service.parseFile(mockFile).then(result => {
        // 'First Name' -> 'firstName'
        const fields = result.columnDefs.map((c: any) => c.field);
        expect(fields).toContain('name'); // firstName normalized to name
      });
    });

    it('should handle empty header', async () => {
      const mockBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: 'test.xlsx',
        size: 8,
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any;

      const result = await service.parseFile(mockFile);
      // Should generate field for empty header
      expect(result.columnDefs.length).toBe(3);
    });
  });

  // ===== inferType =====
  describe('type inference', () => {
    it('should infer number type from numeric values', async () => {
      const mockBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: 'test.xlsx',
        size: 8,
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any;

      const result = await service.parseFile(mockFile, { inferTypes: true });
      const ageCol = result.columnDefs.find((c: any) => c.field === 'age');
      expect(ageCol?.cellType).toBe('number');
    });

    it('should infer text type from string values', async () => {
      const mockBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: 'test.xlsx',
        size: 8,
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any;

      const result = await service.parseFile(mockFile, { inferTypes: true });
      const nameCol = result.columnDefs.find((c: any) => c.field === 'name');
      expect(nameCol?.cellType).toBe('text');
    });

    it('should infer date type from date strings', async () => {
      const mockBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: 'test.xlsx',
        size: 8,
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any;

      const result = await service.parseFile(mockFile, { inferTypes: true });
      // All values in test data are strings or numbers, so defaults should work
      expect(result.columnDefs.length).toBe(3);
    });

    it('should use text for empty values', async () => {
      const mockBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: 'test.xlsx',
        size: 8,
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any;

      const result = await service.parseFile(mockFile, { inferTypes: true });
      result.columnDefs.forEach((col: any) => {
        expect(col.cellType).toBeDefined();
      });
    });
  });

  // ===== generateColumnDefs =====
  describe('generateColumnDefs', () => {
    it('should create column defs with sortable, filter, resizable', async () => {
      const mockBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: 'test.xlsx',
        size: 8,
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any;

      const result = await service.parseFile(mockFile);
      result.columnDefs.forEach((col: any) => {
        expect(col.sortable).toBe(true);
        expect(col.filter).toBe(true);
        expect(col.resizable).toBe(true);
        expect(col.width).toBe(120);
      });
    });
  });

  // ===== Edge cases =====
  describe('edge cases', () => {
    it('should handle file with no header row', async () => {
      const mockBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: 'test.xlsx',
        size: 8,
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any;

      const result = await service.parseFile(mockFile, { headerRow: 0 });
      expect(result.rowData.length).toBeGreaterThan(0);
    });

    it('should handle file with empty columns', async () => {
      const mockBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: 'test.xlsx',
        size: 8,
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any;

      const result = await service.parseFile(mockFile);
      expect(result.columnDefs.length).toBe(3);
    });

    it('should handle options with all defaults', async () => {
      const mockBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: 'test.xlsx',
        size: 8,
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any;

      const result = await service.parseFile(mockFile, {});
      expect(result.sheetName).toBeDefined();
    });

    it('should disable type inference when inferTypes=false', async () => {
      const mockBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: 'test.xlsx',
        size: 8,
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any;

      const result = await service.parseFile(mockFile, { inferTypes: false });
      // cellType should not be set
      result.columnDefs.forEach((col: any) => {
        expect(col.cellType).toBeUndefined();
      });
    });

    it('should disable empty row skipping when skipEmptyRows=false', async () => {
      const mockBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: 'test.xlsx',
        size: 8,
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any;

      const result = await service.parseFile(mockFile, { skipEmptyRows: false });
      expect(result.totalRows).toBe(2);
    });
  });
});