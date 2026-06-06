/**
 * Excel Import Service
 * 支持 xlsx/xls 文件导入，生成 rowData 和 columnDefs
 */

import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

export interface ImportResult {
  rowData: any[];
  columnDefs: any[];
  sheetName: string;
  totalRows: number;
  totalCols: number;
}

export interface ImportOptions {
  sheetIndex?: number;        // Sheet 索引（默认 0）
  headerRow?: number;         // 表头行号（默认 0）
  skipEmptyRows?: boolean;    // 跳过空行（默认 true）
  inferTypes?: boolean;       // 自动推断列类型（默认 true）
}

@Injectable({ providedIn: 'root' })
export class ExcelImportService {

  /**
   * 解析 xlsx 文件，返回 rowData 和 columnDefs
   */
  async parseFile(file: File, options: ImportOptions = {}): Promise<ImportResult> {
    const defaults = { sheetIndex: 0, headerRow: 0, skipEmptyRows: true, inferTypes: true };
    const opts = { ...defaults, ...options };

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    const sheetName = workbook.SheetNames[opts.sheetIndex!];
    const worksheet = workbook.Sheets[sheetName];

    // 转二维数组
    const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 }) as any[][];

    // 分离表头和数据
    const headers = rawData[opts.headerRow!] || [];
    const dataRows = rawData.slice(opts.headerRow! + 1);

    // 生成 columnDefs
    const columnDefs = this.generateColumnDefs(headers);

    // 生成 rowData
    let rowData = dataRows.map(row => {
      const obj: any = {};
      headers.forEach((header, idx) => {
        obj[this.fieldFromHeader(header, idx)] = row[idx];
      });
      return obj;
    });

    // 跳过空行
    if (opts.skipEmptyRows) {
      rowData = rowData.filter(row =>
        Object.values(row).some(v => v != null && v !== '')
      );
    }

    // 推断类型
    if (opts.inferTypes) {
      columnDefs.forEach(col => {
        const values = rowData.slice(0, 20).map(r => r[col.field!]).filter(v => v != null);
        col.cellType = this.inferType(values);
      });
    }

    return {
      rowData,
      columnDefs,
      sheetName,
      totalRows: rowData.length,
      totalCols: headers.length,
    };
  }

  private generateColumnDefs(headers: any[]): any[] {
    return headers.map((header, idx) => ({
      field: this.fieldFromHeader(header, idx),
      headerName: String(header ?? `列${idx + 1}`),
      width: 120,
      sortable: true,
      filter: true,
      resizable: true,
    }));
  }

  private fieldFromHeader(header: any, idx: number): string {
    if (!header) return `col_${Math.random().toString(36).slice(2, 6)}`;
    const str = String(header).trim();
    // 转成驼峰式
    return str
      .replace(/[\s\-_]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
      .replace(/^(.)/, (_, c) => c.toLowerCase())
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
      || `col_${idx}`;
  }

  private inferType(values: any[]): string {
    const nonNull = values.filter(v => v != null && v !== '');
    if (nonNull.length === 0) return 'text';
    const firstNonNull = nonNull[0];
    if (typeof firstNonNull === 'number') return 'number';
    if (typeof firstNonNull === 'boolean') return 'boolean';
    if (typeof firstNonNull === 'object' && firstNonNull instanceof Date) return 'date';
    if (typeof firstNonNull === 'object') return 'text';
    // 尝试解析
    const s = String(firstNonNull);
    if (!isNaN(Number(s))) return 'number';
    if (!isNaN(Date.parse(s))) return 'date';
    return 'text';
  }
}
