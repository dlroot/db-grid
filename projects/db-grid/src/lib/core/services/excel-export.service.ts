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
