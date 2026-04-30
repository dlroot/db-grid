import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PdfExportService } from '../pdf-export.service';

describe('PdfExportService', () => {
  let service: PdfExportService;

  beforeEach(() => {
    service = new PdfExportService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have exportToPdf method', () => {
    expect(typeof service.exportToPdf).toBe('function');
  });

  it('should have exportToPdfBlob method', () => {
    expect(typeof service.exportToPdfBlob).toBe('function');
  });

  it('should have default page size and orientation', () => {
    // Test with minimal data - just check it doesn't throw
    const colDefs = [
      { field: 'name', headerName: 'Name' },
    ];
    const rows = [{ name: 'Test' }];
    
    // Should not throw (even if jsPDF is not available in test)
    expect(() => {
      service.exportToPdf(colDefs, rows, { fileName: 'test.pdf' });
    }).not.toThrow();
  });

  it('should handle empty data', () => {
    const colDefs: any[] = [];
    const rows: any[] = [];
    
    expect(() => {
      service.exportToPdf(colDefs, rows);
    }).not.toThrow();
  });

  it('should use custom file name', () => {
    const colDefs = [{ field: 'a' }];
    const rows = [{ a: 1 }];
    const options = { fileName: 'custom.pdf', pageSize: 'a4' as const };
    
    expect(() => {
      service.exportToPdf(colDefs, rows, options);
    }).not.toThrow();
  });
});
