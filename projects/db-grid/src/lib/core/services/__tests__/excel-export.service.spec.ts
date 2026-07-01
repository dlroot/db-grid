import * as XLSX from 'xlsx';
import { ExcelExportService, CsvExportOptions, ExcelExportOptions } from '../excel-export.service';

describe('ExcelExportService', () => {
  let service: ExcelExportService;

  const columnDefs = [
    { field: 'name', headerName: 'Name' },
    { field: 'age', headerName: 'Age' },
    { field: 'city', headerName: 'City' },
  ];

  const rowData = [
    { name: 'Alice', age: 25, city: 'Beijing' },
    { name: 'Bob', age: 30, city: 'Shanghai' },
  ];

  beforeEach(() => {
    service = new ExcelExportService();
  });

  // Note: ExcelExportService does not have a destroy method

  describe('exportAsCsv', () => {
    it('should export data as CSV string with headers', () => {
      const csv = service.exportAsCsv(columnDefs, rowData);
      expect(csv).toContain('Name,Age,City');
      expect(csv).toContain('Alice,25,Beijing');
      expect(csv).toContain('Bob,30,Shanghai');
    });

    it('should use field as header when headerName is missing', () => {
      const cols = [{ field: 'name' }];
      const rows = [{ name: 'Test' }];
      const csv = service.exportAsCsv(cols, rows);
      expect(csv).toContain('name');
    });

    it('should handle empty data', () => {
      const csv = service.exportAsCsv(columnDefs, []);
      expect(csv).toContain('Name,Age,City');
    });

    it('should escape values with commas', () => {
      const cols = [{ field: 'desc', headerName: 'Description' }];
      const rows = [{ desc: 'hello, world' }];
      const csv = service.exportAsCsv(cols, rows);
      expect(csv).toContain('"hello, world"');
    });

    it('should escape values with double quotes', () => {
      const cols = [{ field: 'desc', headerName: 'Description' }];
      const rows = [{ desc: 'say "hello"' }];
      const csv = service.exportAsCsv(cols, rows);
      expect(csv).toContain('""hello""');
    });

    it('should escape values with newlines', () => {
      const cols = [{ field: 'desc', headerName: 'Desc' }];
      const rows = [{ desc: 'line1\nline2' }];
      const csv = service.exportAsCsv(cols, rows);
      expect(csv).toContain('"line1\nline2"');
    });

    it('should handle null and undefined values', () => {
      const cols = [{ field: 'val', headerName: 'Value' }];
      const rows = [{ val: null }, { val: undefined }];
      const csv = service.exportAsCsv(cols, rows);
      expect(csv).toBeDefined();
      // null/undefined should be treated as empty string
      const lines = csv.split('\n');
      expect(lines.length).toBe(3); // header + 2 rows
    });

    it('should skip header when skipHeader=true', () => {
      const csv = service.exportAsCsv(columnDefs, rowData, { skipHeader: true });
      expect(csv).not.toContain('Name,Age,City');
      expect(csv).toContain('Alice');
    });

    it('should skip header when includeHeaders=false', () => {
      const csv = service.exportAsCsv(columnDefs, rowData, { includeHeaders: false });
      expect(csv).not.toContain('Name,Age,City');
    });

    it('should use custom separator', () => {
      const cols = [{ field: 'a', headerName: 'A' }, { field: 'b', headerName: 'B' }];
      const rows = [{ a: 1, b: 2 }];
      const csv = service.exportAsCsv(cols, rows, { columnSeparator: ';' });
      expect(csv).toContain('A;B');
      expect(csv).toContain('1;2');
    });

    it('should add custom header', () => {
      const csv = service.exportAsCsv(columnDefs, rowData, { customHeader: '# My Data' });
      expect(csv.startsWith('# My Data')).toBe(true);
    });

    it('should add custom footer', () => {
      const csv = service.exportAsCsv(columnDefs, rowData, { customFooter: '# End' });
      expect(csv.endsWith('# End')).toBe(true);
    });

    it('should filter columns by columnKeys', () => {
      const csv = service.exportAsCsv(columnDefs, rowData, { columnKeys: ['name'] });
      expect(csv).toContain('Name');
      expect(csv).not.toContain('Age');
      expect(csv).not.toContain('City');
    });

    it('should skip hidden columns', () => {
      const cols = [
        { field: 'name', headerName: 'Name' },
        { field: 'secret', headerName: 'Secret', hide: true },
      ];
      const rows = [{ name: 'Alice', secret: '123' }];
      const csv = service.exportAsCsv(cols, rows);
      expect(csv).not.toContain('Secret');
      expect(csv).not.toContain('123');
    });

    it('should apply valueFormatter', () => {
      const cols = [{
        field: 'price',
        headerName: 'Price',
        valueFormatter: (params: any) => `$${params.value}`,
      }];
      const rows = [{ price: 100 }];
      const csv = service.exportAsCsv(cols, rows);
      expect(csv).toContain('$100');
    });

    it('should handle nested field values', () => {
      const cols = [{ field: 'address.city', headerName: 'City' }];
      const rows = [{ address: { city: 'Beijing' } }];
      const csv = service.exportAsCsv(cols, rows);
      expect(csv).toContain('Beijing');
    });
  });

  describe('exportAsXlsx', () => {
    it('should return a Blob with correct MIME type', () => {
      const blob = service.exportAsXlsx(columnDefs, rowData);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('should produce a valid xlsx that can be read back', () => {
      const blob = service.exportAsXlsx(columnDefs, rowData);
      const reader = new FileReader();

      return new Promise<void>((resolve, reject) => {
        reader.onload = () => {
          try {
            const arrayBuf = reader.result as ArrayBuffer;
            const wb = XLSX.read(arrayBuf, { type: 'array' });

            // Verify sheet name
            expect(wb.SheetNames).toContain('Sheet1');

            // Verify data
            const sheet = wb.Sheets['Sheet1'];
            const data = XLSX.utils.sheet_to_json(sheet) as any[];
            expect(data.length).toBe(2);
            expect(data[0].Name).toBe('Alice');
            expect(data[0].Age).toBe(25);
            expect(data[0].City).toBe('Beijing');
            expect(data[1].Name).toBe('Bob');
            expect(data[1].Age).toBe(30);
            expect(data[1].City).toBe('Shanghai');

            resolve();
          } catch (e) {
            reject(e);
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });
    });

    it('should respect custom sheet name', () => {
      const blob = service.exportAsXlsx(columnDefs, rowData, { sheetName: 'MyData' });

      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const wb = XLSX.read(reader.result as ArrayBuffer, { type: 'array' });
            expect(wb.SheetNames).toContain('MyData');
            resolve();
          } catch (e) { reject(e); }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });
    });

    it('should store numbers as numbers not strings', () => {
      const blob = service.exportAsXlsx(columnDefs, rowData);

      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const wb = XLSX.read(reader.result as ArrayBuffer, { type: 'array', raw: true });
            const sheet = wb.Sheets['Sheet1'];
            const ref = XLSX.utils.decode_range(sheet['!ref']!);

            // Check age cell (row 1 is header, row 2 data, col index 1 = Age)
            const ageCell = sheet[XLSX.utils.encode_cell({ r: 1, c: 1 })];
            expect(typeof ageCell.v).toBe('number');
            expect(ageCell.v).toBe(25);

            const ageCell2 = sheet[XLSX.utils.encode_cell({ r: 2, c: 1 })];
            expect(typeof ageCell2.v).toBe('number');
            expect(ageCell2.v).toBe(30);

            resolve();
          } catch (e) { reject(e); }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });
    });

    it('should handle empty data', () => {
      const blob = service.exportAsXlsx(columnDefs, []);

      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const wb = XLSX.read(reader.result as ArrayBuffer, { type: 'array' });
            const data = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']);
            expect(data.length).toBe(0);
            resolve();
          } catch (e) { reject(e); }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });
    });

    it('should filter columns by columnKeys', () => {
      const blob = service.exportAsXlsx(columnDefs, rowData, { columnKeys: ['name'] });

      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const wb = XLSX.read(reader.result as ArrayBuffer, { type: 'array' });
            const data = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']) as any[];
            expect(data[0].Name).toBe('Alice');
            expect(data[0].Age).toBeUndefined();
            expect(data[0].City).toBeUndefined();
            resolve();
          } catch (e) { reject(e); }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });
    });

    it('should apply valueFormatter', () => {
      const cols = [{
        field: 'price',
        headerName: 'Price',
        valueFormatter: (params: any) => `$${params.value}`,
      }];
      const rows = [{ price: 100 }];
      const blob = service.exportAsXlsx(cols, rows);

      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const wb = XLSX.read(reader.result as ArrayBuffer, { type: 'array' });
            const data = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']) as any[];
            expect(data[0].Price).toBe('$100');
            resolve();
          } catch (e) { reject(e); }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });
    });

    it('should have column widths set', () => {
      const blob = service.exportAsXlsx(columnDefs, rowData);

      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const wb = XLSX.read(reader.result as ArrayBuffer, { type: 'array' });
            const sheet = wb.Sheets['Sheet1'];
            expect(sheet['!cols']).toBeDefined();
            expect(sheet['!cols']!.length).toBe(3);
            // Each column width should be at least 8
            sheet['!cols']!.forEach((col: any) => {
              expect(col.wch).toBeGreaterThanOrEqual(8);
            });
            resolve();
          } catch (e) { reject(e); }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });
    });

    it('should skip columns marked as hidden', () => {
      const cols = [
        { field: 'name', headerName: 'Name' },
        { field: 'secret', headerName: 'Secret', hide: true },
      ];
      const rows = [{ name: 'Alice', secret: 'hidden123' }];
      const blob = service.exportAsXlsx(cols, rows);

      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const wb = XLSX.read(reader.result as ArrayBuffer, { type: 'array' });
            const data = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']) as any[];
            expect(data[0].Name).toBe('Alice');
            expect(data[0].Secret).toBeUndefined();
            resolve();
          } catch (e) { reject(e); }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });
    });

    it('should handle nested field values', () => {
      const cols = [{ field: 'address.city', headerName: 'City' }];
      const rows = [{ address: { city: 'Beijing' } }];
      const blob = service.exportAsXlsx(cols, rows);

      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const wb = XLSX.read(reader.result as ArrayBuffer, { type: 'array' });
            const data = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']) as any[];
            expect(data[0].City).toBe('Beijing');
            resolve();
          } catch (e) { reject(e); }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });
    });

    it('should skip header when includeHeaders=false', () => {
      const blob = service.exportAsXlsx(columnDefs, rowData, { includeHeaders: false });

      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const wb = XLSX.read(reader.result as ArrayBuffer, { type: 'array' });
            const data = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']) as any[];
            // Without headers, SheetJS uses first row as header
            // So data[0] should contain "Alice" as key for the first column
            expect(data.length).toBe(2);
            resolve();
          } catch (e) { reject(e); }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });
    });

    it('should handle null and undefined values', () => {
      const cols = [{ field: 'val', headerName: 'Value' }];
      const rows = [{ val: null }, { val: undefined }];
      const blob = service.exportAsXlsx(cols, rows);

      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const wb = XLSX.read(reader.result as ArrayBuffer, { type: 'array' });
            const data = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']) as any[];
            expect(data.length).toBe(2);
            expect(data[0].Value).toBe('');
            expect(data[1].Value).toBe('');
            resolve();
          } catch (e) { reject(e); }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });
    });

    it('should use provided file name in download', () => {
      // spy on createObjectURL
      const createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
      const appendChildSpy = spyOn(document.body, 'appendChild');
      const removeChildSpy = spyOn(document.body, 'removeChild');
      const revokeSpy = spyOn(URL, 'revokeObjectURL');

      service.downloadAsXlsx(columnDefs, rowData, { fileName: 'my-report.xlsx' });

      expect(appendChildSpy).toHaveBeenCalled();
      const link = appendChildSpy.calls.mostRecent().args[0] as HTMLAnchorElement;
      expect(link.download).toBe('my-report.xlsx');
    });
  });

  describe('importCsv', () => {
    it('should parse CSV string to array of objects', () => {
      const csv = 'Name,Age,City\nAlice,25,Beijing\nBob,30,Shanghai';
      const result = service.importCsv(csv);
      expect(result.length).toBe(2);
      expect(result[0].Name).toBe('Alice');
      expect(result[0].Age).toBe('25');
      expect(result[1].City).toBe('Shanghai');
    });

    it('should handle quoted values with commas', () => {
      const csv = 'Name,Desc\nTest,"hello, world"';
      const result = service.importCsv(csv);
      expect(result[0].Desc).toBe('hello, world');
    });

    it('should handle escaped double quotes', () => {
      const csv = 'Name,Desc\nTest,"say ""hello"""';
      const result = service.importCsv(csv);
      expect(result[0].Desc).toBe('say "hello"');
    });

    it('should handle empty CSV', () => {
      const result = service.importCsv('');
      expect(result).toEqual([]);
    });

    it('should handle header-only CSV', () => {
      const csv = 'Name,Age';
      const result = service.importCsv(csv);
      expect(result).toEqual([]);
    });

    it('should use custom separator', () => {
      const csv = 'Name;Age\nAlice;25';
      const result = service.importCsv(csv, { separator: ';' });
      expect(result[0].Name).toBe('Alice');
      expect(result[0].Age).toBe('25');
    });

    it('should parse without header when hasHeader=false', () => {
      const csv = 'Alice,25\nBob,30';
      const result = service.importCsv(csv, { hasHeader: false });
      expect(result.length).toBe(2);
      expect(Array.isArray(result[0])).toBe(true);
      expect(result[0][0]).toBe('Alice');
    });
  });

  describe('cleanup', () => {
    it('should not have a destroy method', () => {
      expect((service as any).destroy).toBeUndefined();
    });
  });
});
