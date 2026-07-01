/**
 * Excel 导出服务
 * 支持 CSV 导出（自动识别 UTF-8 BOM，兼容 Excel 中文显示）
 * 支持真实的 XLSX 导出（基于 SheetJS xlsx 库）
 */

import { Injectable } from '@angular/core';
import { ColDef } from '../models';
import * as XLSX from 'xlsx';

export interface CsvExportOptions {
  fileName?: string;
  columnKeys?: string[];
  skipHeader?: boolean;
  columnSeparator?: string;
  customHeader?: string;
  customFooter?: string;
  allColumns?: boolean;
  includeHeaders?: boolean;
  /** 只导出选中行 */
  onlySelected?: boolean;
  /** 跳过分组行 */
  skipGroups?: boolean;
  /** 跳过行号列 */
  skipRowIndex?: boolean;
  /** 换行符替换 */
  lineDelimiter?: string;
  /** 空值替换 */
  emptyValue?: string;
  /** 编码方式 */
  encoding?: 'utf-8' | 'gbk' | 'gb2312';
}

export interface ExcelExportOptions {
  fileName?: string;
  sheetName?: string;
  exportMode?: 'xlsx' | 'csv';
  /** 指定导出列（按 field 筛选） */
  columnKeys?: string[];
  /** 空值替换文本 */
  emptyValue?: string;
  /** 只导出选中行 */
  onlySelected?: boolean;
  /** 跳过分组行 */
  skipGroups?: boolean;
  /** 跳过行号列 */
  skipRowIndex?: boolean;
  /** 是否包含表头，默认 true */
  includeHeaders?: boolean;
  /** 列宽模式：auto（自动适配）, fixed（固定）, none（不设置） */
  columnWidthMode?: 'auto' | 'fixed' | 'none';
  /** 固定列宽（像素近似值，columnWidthMode=fixed 时生效） */
  fixedColumnWidth?: number;
  /** 是否自动识别数字类型（数字存为 number 而非 string），默认 true */
  autoDetectNumbers?: boolean;
}

/**
 * HTML 导出选项
 */
export interface HtmlExportOptions {
  /** 文件名 */
  fileName?: string;
  /** 表格标题 */
  title?: string;
  /** 包含 CSS 样式 */
  includeStyles?: boolean;
  /** 斑马纹 */
  striped?: boolean;
  /** 边框 */
  bordered?: boolean;
  /** 悬停效果 */
  hoverEffect?: boolean;
  /** 紧凑模式 */
  compact?: boolean;
  /** 响应式（横向滚动） */
  responsive?: boolean;
  /** 指定导出列 */
  columnKeys?: string[];
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

  /**
   * 使用 SheetJS 导出真实的 XLSX 文件（二进制 OpenXML 格式）
   * 支持列宽自适应、数字类型自动识别、自定义表头等
   */
  exportAsXlsx(columnDefs: ColDef[], rowData: any[], options: ExcelExportOptions = {}): Blob {
    const {
      sheetName = 'Sheet1',
      columnKeys,
      emptyValue = '',
      includeHeaders = true,
      columnWidthMode = 'auto',
      fixedColumnWidth = 12,
      autoDetectNumbers = true,
    } = options;

    // 筛选导出列
    let exportCols = columnDefs.filter(c => !c.hide && c.field);
    if (columnKeys && columnKeys.length > 0) {
      exportCols = exportCols.filter(c => columnKeys!.includes(c.field!));
    }

    // 构建二维数据
    const wsData: any[][] = [];

    // 表头行
    if (includeHeaders) {
      wsData.push(exportCols.map(c => c.headerName || c.field || ''));
    }

    // 数据行
    rowData.forEach(row => {
      const values = exportCols.map(col => {
        let value = this.getNestedValue(row, col.field!);
        if (col.valueFormatter) {
          try {
            value = col.valueFormatter({ value, data: row, colDef: col, column: col, api: null, columnApi: null, context: {} });
          } catch (e) { /* ignore */ }
        }
        if (value == null || value === '') return emptyValue || null;
        // 如果启用数字自动识别，将纯数字字符串转为 number
        if (autoDetectNumbers && typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
          const num = Number(value);
          if (isFinite(num)) return num;
        }
        return value;
      });
      wsData.push(values);
    });

    // 创建工作表
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 设置列宽
    if (columnWidthMode !== 'none' && wsData.length > 0) {
      const colWidths = exportCols.map((col, i) => {
        if (columnWidthMode === 'fixed') {
          return { wch: fixedColumnWidth };
        }
        // auto：根据内容自适应
        let maxLen = (col.headerName || col.field || '').length;
        for (let r = 0; r < wsData.length; r++) {
          const cellVal = wsData[r][i];
          const strLen = cellVal != null ? String(cellVal).length : 0;
          // 中文字符宽度约2倍
          const chineseCount = (String(cellVal ?? '').match(/[\u4e00-\u9fff\u3000-\u30ff\uff00-\uffef]/g) || []).length;
          maxLen = Math.max(maxLen, strLen + chineseCount);
        }
        return { wch: Math.min(Math.max(maxLen + 2, 8), 80) };
      });
      ws['!cols'] = colWidths;
    }

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // 生成 xlsx 二进制数组
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array', bookSST: false });
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /**
   * 下载为 XLSX 文件（真实 Excel 格式）
   */
  downloadAsXlsx(columnDefs: ColDef[], rowData: any[], options: ExcelExportOptions = {}): void {
    const fileName = options.fileName || 'export.xlsx';
    const blob = this.exportAsXlsx(columnDefs, rowData, options);
    this.saveBlob(blob, fileName);
  }

  /**
   * 统一 Blob 下载方法
   */
  private saveBlob(blob: Blob, fileName: string): void {
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

  // ============ HTML 导出（Phase 6.4）============
  
  /**
   * 导出为 HTML 表格
   * 可用于打印或嵌入到其他页面
   */
  exportAsHtml(
    columnDefs: ColDef[], 
    rowData: any[], 
    options: HtmlExportOptions = {}
  ): string {
    const {
      title = '数据导出',
      includeStyles = true,
      striped = true,
      bordered = true,
      hoverEffect = true,
      compact = false,
      responsive = true,
    } = options;


    let exportCols = columnDefs.filter(c => !c.hide && c.field);
    if (options.columnKeys && options.columnKeys.length > 0) {
      exportCols = exportCols.filter(c => options.columnKeys!.includes(c.field!));
    }

    const cellPadding = compact ? '4px 8px' : '8px 12px';
    const fontSize = compact ? '12px' : '14px';

    const styles = includeStyles ? `
      <style>
        .db-grid-html-table {
          width: 100%;
          border-collapse: collapse;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: ${fontSize};
        }
        .db-grid-html-table th {
          background: #f8f9fa;
          font-weight: 600;
          text-align: left;
          padding: ${cellPadding};
          border: 1px solid #dee2e6;
          white-space: nowrap;
        }
        .db-grid-html-table td {
          padding: ${cellPadding};
          border: 1px solid #dee2e6;
          vertical-align: top;
        }
        ${striped ? '.db-grid-html-table tr:nth-child(even) td { background: #f8f9fa; }' : ''}
        ${hoverEffect ? '.db-grid-html-table tbody tr:hover td { background: #e3f2fd; }' : ''}
        ${bordered ? '.db-grid-html-table { border: 1px solid #dee2e6; }' : ''}
        ${responsive ? '.db-grid-html-wrapper { overflow-x: auto; max-width: 100%; }' : ''}
        .db-grid-html-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #333;
        }
        .db-grid-html-date {
          font-size: 12px;
          color: #666;
          margin-top: 8px;
        }
      </style>
    ` : '';

    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${styles}
</head>
<body>
  <div class="db-grid-html-wrapper">
    ${title ? `<div class="db-grid-html-title">${title}</div>` : ''}
    <table class="db-grid-html-table">
      <thead>
        <tr>
          ${exportCols.map(c => `<th>${c.headerName || c.field || ''}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
`;

    rowData.forEach(row => {
      html += '        <tr>\n';
      exportCols.forEach(col => {
        let value = this.getNestedValue(row, col.field!);
        if (col.valueFormatter) {
          try { 
            value = col.valueFormatter({ value, data: row, colDef: col, column: col, api: null, columnApi: null, context: {} }); 
          } catch (e) { /* ignore */ }
        }
        html += `          <td>${this.escapeHtml(String(value ?? ''))}</td>\n`;
      });
      html += '        </tr>\n';
    });


    html += `      </tbody>
    </table>
    <div class="db-grid-html-date">导出时间: ${new Date().toLocaleString('zh-CN')}</div>
  </div>
</body>
</html>`;

    return html;
  }


  /**
   * 下载为 HTML 文件
   */
  downloadAsHtml(
    columnDefs: ColDef[], 
    rowData: any[], 
    options: HtmlExportOptions & { fileName?: string } = {}
  ): void {
    const fileName = options.fileName || 'export.html';
    const html = this.exportAsHtml(columnDefs, rowData, options);
    this.downloadFile(fileName, html, 'text/html;charset=utf-8');
  }

  /**
   * 获取纯文本（无格式）
   */
  getDataAsText(columnDefs: ColDef[], rowData: any[]): string {
    const exportCols = columnDefs.filter(c => !c.hide && c.field);
    const lines: string[] = [];

    // Header
    lines.push(exportCols.map(c => c.headerName || c.field || '').join('\t'));


    // Data
    rowData.forEach(row => {
      const values = exportCols.map(col => {
        let value = this.getNestedValue(row, col.field!);
        if (col.valueFormatter) {
          try { value = col.valueFormatter({ value, data: row, colDef: col, column: col, api: null, columnApi: null, context: {} }); }
          catch (e) { /* ignore */ }
        }
        return String(value ?? '');
      });
      lines.push(values.join('\t'));
    });

    return lines.join('\n');
  }


  /**
   * 转义 HTML 特殊字符
   */
  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
