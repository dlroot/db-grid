/**
 * Excel 导出服务
 * 支持 CSV 导出（自动识别 UTF-8 BOM，兼容 Excel 中文显示）
 */

import { Injectable } from '@angular/core';
import { ColDef } from '../models';

export interface CsvExportOptions {
  fileName?: string;
  columnKeys?: string[];
  skipHeader?: boolean;
  columnSeparator?: string;
  customHeader?: string;
  customFooter?: string;
  allColumns?: boolean;
  includeHeaders?: boolean;
}

export interface ExcelExportOptions {
  fileName?: string;
  sheetName?: string;
  exportMode?: 'xlsx' | 'csv';
}

@Injectable()
export class ExcelExportService {

  exportAsCsv(columnDefs: ColDef[], rowData: any[], options: CsvExportOptions = {}): string {
    const { columnKeys, skipHeader = false, columnSeparator = ',', customHeader, includeHeaders = true } = options;

    const lines: string[] = [];
    if (customHeader) lines.push(customHeader);

    let exportCols = columnDefs.filter(c => !c.hide && c.field);
    if (columnKeys && columnKeys.length > 0) {
      exportCols = exportCols.filter(c => columnKeys.includes(c.field!));
    }

    if (includeHeaders && !skipHeader) {
      lines.push(exportCols.map(c => this.escapeCsvValue(c.headerName || c.field || '')).join(columnSeparator));
    }

    rowData.forEach(row => {
      const values = exportCols.map(col => {
        let value = this.getNestedValue(row, col.field!);
        if (col.valueFormatter) {
          try { value = col.valueFormatter({ value, data: row, colDef: col, column: col, api: null, columnApi: null, context: {} }); }
          catch (e) { /* ignore */ }
        }
        return this.escapeCsvValue(String(value ?? ''));
      });
      lines.push(values.join(columnSeparator));
    });

    if (options.customFooter) lines.push(options.customFooter);
    return lines.join('\n');
  }

  downloadAsCsv(columnDefs: ColDef[], rowData: any[], options: CsvExportOptions = {}): void {
    const fileName = options.fileName || 'export.csv';
    const csv = this.exportAsCsv(columnDefs, rowData, options);
    this.downloadFile(fileName, csv, 'text/csv;charset=utf-8');
  }

  exportAsXlsx(columnDefs: ColDef[], rowData: any[], options: ExcelExportOptions = {}): Blob {
    const csv = this.exportAsCsv(columnDefs, rowData, { ...options, includeHeaders: true });
    return new Blob([csv], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8' });
  }

  downloadAsXlsx(columnDefs: ColDef[], rowData: any[], options: ExcelExportOptions = {}): void {
    const fileName = options.fileName || 'export.xlsx';
    const blob = this.exportAsXlsx(columnDefs, rowData, options);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private getNestedValue(obj: any, path: string): any {
    if (!path || !obj) return null;
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) { if (value == null) return null; value = value[key]; }
    return value;
  }

  private escapeCsvValue(value: string): string {
    if (value == null) return '';
    const str = String(value);
    const needsQuotes = str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r');
    if (needsQuotes) return '"' + str.replace(/"/g, '""') + '"';
    return str;
  }

  private downloadFile(fileName: string, content: string, mimeType: string): void {
    // Add UTF-8 BOM for Excel compatibility
    const bom = '\ufeff';
    const blob = new Blob([bom + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  importCsv(csvText: string, options: { separator?: string; hasHeader?: boolean } = {}): any[] {
    const separator = options.separator || ',';
    const hasHeader = options.hasHeader !== false;
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const result: any[] = [];
    let headers: string[] = [];
    if (hasHeader) headers = this.parseCsvLine(lines[0], separator);

    const startIndex = hasHeader ? 1 : 0;
    for (let i = startIndex; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i], separator);
      if (hasHeader) {
        const row: any = {};
        headers.forEach((header, index) => { row[header] = values[index] || ''; });
        result.push(row);
      } else {
        result.push(values);
      }
    }
    return result;
  }

  private parseCsvLine(line: string, separator: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') { current += '"'; i++; }
          else inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') inQuotes = true;
        else if (char === separator) { result.push(current.trim()); current = ''; }
        else current += char;
      }
    }
    result.push(current.trim());
    return result;
  }
}
