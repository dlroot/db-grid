/**
 * PDF 导出服务
 * 使用 jsPDF + jspdf-autotable 生成 PDF 表格
 */

import { Injectable } from '@angular/core';
import { ColDef } from '../models';
declare var jsPDF: any;

export interface PdfExportOptions {
  /** 文件名（不含.pdf） */
  fileName?: string;
  /** 页面方向 */
  orientation?: 'portrait' | 'landscape';
  /** 页面大小 */
  pageSize?: 'a4' | 'a3' | 'letter' | 'legal';
  /** 指定要导出的列（按 field 过滤） */
  columnKeys?: string[];
  /** 是否导出所有行（否则只导出选中行） */
  allRows?: boolean;
  /** 标题文字 */
  title?: string;
  /** 页脚文字 */
  footerText?: string;
  /** 是否显示页码 */
  showPageNumber?: boolean;
  /** 表格主题：striped / grid / plain */
  tableTheme?: string;
  /** 斑马纹颜色 [R,G,B] */
  stripeColor?: [number, number, number];
  /** 表头背景色 [R,G,B] */
  headerBackgroundColor?: [number, number, number];
  /** 表头文字颜色 [R,G,B] */
  headerTextColor?: [number, number, number];
}

@Injectable()
export class PdfExportService {
  /** 导出为 PDF 并下载 */
  exportToPdf(
    columnDefs: ColDef[],
    rowData: any[],
    options: PdfExportOptions = {}
  ): void {
    const {
      fileName = 'export.pdf',
      orientation = 'portrait',
      pageSize = 'a4',
      columnKeys,
      allRows = true,
      title,
      footerText,
      showPageNumber = true,
      tableTheme = 'striped',
      stripeColor = [240, 240, 240] as [number, number, number],
      headerBackgroundColor = [66, 133, 244] as [number, number, number],
      headerTextColor = [255, 255, 255] as [number, number, number],
    } = options;

    // 动态导入 jsPDF（避免打包体积膨胀）
    import('jspdf').then((jsPDFModule: any) => {
      const JsPDF = jsPDFModule.default || jsPDFModule.jsPDF || jsPDFModule;
      const doc = new JsPDF({
        orientation,
        unit: 'mm',
        format: pageSize,
      });

      // 动态导入 jspdf-autotable 插件
      import('jspdf-autotable').then(() => {
        // 过滤列
        let exportCols = columnDefs.filter(c => !c.hide && c.field);
        if (columnKeys && columnKeys.length > 0) {
          exportCols = exportCols.filter(c => columnKeys.includes(c.field!));
        }

        // 添加标题
        if (title) {
          doc.setFontSize(16);
          doc.text(title, 14, 22);
        }

        // 准备表头
        const head = [exportCols.map(c => c.headerName || c.field || '')];

        // 准备数据行
        const body = rowData.map(row =>
          exportCols.map(col => {
            let value = this.getCellValue(row, col.field!);
            // 应用 valueFormatter
            if (col.valueFormatter) {
              try {
                value = col.valueFormatter({
                  value,
                  data: row,
                  colDef: col,
                  column: col,
                  api: null,
                  columnApi: null,
                  context: {},
                });
              } catch (e) { /* ignore */ }
            }
            return String(value ?? '');
          })
        );

        // 使用 jspdf-autotable 生成表格
        (doc as any).autoTable({
          head,
          body,
          startY: title ? 30 : 14,
          theme: tableTheme,
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: {
            fillColor: headerBackgroundColor,
            textColor: headerTextColor,
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: stripeColor,
          },
          margin: { top: title ? 30 : 14, right: 14, bottom: 20, left: 14 },
          didDrawPage: (data: any) => {
            const pageCount = (doc as any).internal.getNumberOfPages();
            // 页码
            if (showPageNumber) {
              doc.setFontSize(8);
              doc.text(
                `第 ${data.pageNumber} 页 / 共 ${pageCount} 页`,
                data.settings.margin.left,
                doc.internal.pageSize.height - 10
              );
            }
            // 页脚文字
            if (footerText) {
              doc.setFontSize(8);
              doc.text(
                footerText,
                data.settings.margin.left,
                doc.internal.pageSize.height - 5
              );
            }
          },
        });

        // 下载
        doc.save(fileName);
      });
    }).catch(err => {
      console.error('PDF Export failed: jsPDF 未安装', err);
      alert('PDF 导出失败：请先安装 jspdf 和 jspdf-autotable\n\nnpm install jspdf jspdf-autotable');
    });
  }

  /** 导出为 PDF Blob（不自动下载） */
  exportToPdfBlob(
    columnDefs: ColDef[],
    rowData: any[],
    options: PdfExportOptions = {}
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      import('jspdf').then((jsPDFModule: any) => {
        const JsPDF = jsPDFModule.default || jsPDFModule.jsPDF || jsPDFModule;
        const doc = new JsPDF({
          orientation: options.orientation || 'portrait',
          unit: 'mm',
          format: options.pageSize || 'a4',
        });

        let exportCols = columnDefs.filter(c => !c.hide && c.field);
        if (options.columnKeys && options.columnKeys.length > 0) {
          exportCols = exportCols.filter(c => options.columnKeys!.includes(c.field!));
        }

        const head = [exportCols.map(c => c.headerName || c.field || '')];
        const body = rowData.map(row =>
          exportCols.map(col => String(this.getCellValue(row, col.field!) ?? ''))
        );

        import('jspdf-autotable').then(() => {
          (doc as any).autoTable({
            head,
            body,
            theme: options.tableTheme || 'striped',
          });
          const blob = doc.output('blob');
          resolve(blob);
        }).catch(reject);
      }).catch(reject);
    });
  }

  private getCellValue(row: any, field: string): any {
    if (!field || !row) return null;
    const keys = field.split('.');
    let value = row;
    for (const key of keys) {
      if (value == null) return null;
      value = value[key];
    }
    return value;
  }
}
