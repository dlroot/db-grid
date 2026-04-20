import { Injectable } from '@angular/core';
import { ColDef } from '../models';

/**
 * 列宽自适应服务 — 自动调整列宽以适应内容或容器
 * AG Grid 对应功能：Auto-size Columns, Size Columns to Fit
 */
@Injectable({ providedIn: 'root' })
export class AutoSizeService {
  private autoSizeOnLoad = false;
  private skipHeader = false;
  private charWidth = 10; // 估算的每字符宽度
  private headerCharWidth = 10;
  private padding = 20;   // 列内边距
  private columnDefs: ColDef[] = [];

  /** 初始化 */
  initialize(config: AutoSizeConfig = {}): void {
    this.autoSizeOnLoad = config.autoSizeOnLoad ?? false;
    this.skipHeader = config.skipHeader ?? false;
    this.charWidth = config.charWidth ?? 10;
    this.headerCharWidth = config.headerCharWidth ?? 10;
    this.padding = config.padding ?? 20;
  }

  /** 自适应单列宽度 */
  autoSizeColumn(colId: string, columnDefs: ColDef[], rowData: any[], options: AutoSizeOptions = {}): number {
    const col = columnDefs.find(c => c.field === colId || c.colId === colId);
    if (!col || col.suppressAutoSize) return col?.width ?? 100;

    const field = col.field ?? '';
    let maxWidth = 0;

    // 基于表头文本估算
    if (!options.skipHeader && !this.skipHeader) {
      const headerText = col.headerName ?? field;
      maxWidth = headerText.length * this.headerCharWidth + this.padding;
    }

    // 基于数据内容估算
    const sampleSize = options.sampleSize ?? Math.min(rowData.length, 100);
    for (let i = 0; i < sampleSize && i < rowData.length; i++) {
      const value = this.getDisplayValue(rowData[i], col);
      const text = value !== null && value !== undefined ? String(value) : '';
      const width = text.length * this.charWidth + this.padding;
      if (width > maxWidth) maxWidth = width;
    }

    // 应用 min/max 限制
    if (col.minWidth && maxWidth < col.minWidth) maxWidth = col.minWidth;
    if (col.maxWidth && maxWidth > col.maxWidth) maxWidth = col.maxWidth;

    return Math.ceil(maxWidth);
  }

  /** 自适应所有列 */
  autoSizeAllColumns(columnDefs: ColDef[], rowData: any[], options: AutoSizeOptions = {}): Map<string, number> {
    const result = new Map<string, number>();
    for (const col of columnDefs) {
      if (col.hide) continue;
      const colId = col.field ?? col.colId ?? '';
      const width = this.autoSizeColumn(colId, columnDefs, rowData, options);
      result.set(colId, width);
    }
    return result;
  }

  /** 列宽适应容器（sizeColumnsToFit） */
  sizeColumnsToFit(
    containerWidth: number,
    columnDefs: ColDef[],
    options: SizeToFitOptions = {}
  ): Map<string, number> {
    const visibleCols = columnDefs.filter(c => !c.hide);
    if (visibleCols.length === 0) return new Map();

    const result = new Map<string, number>();
    const totalMinWidth = visibleCols.reduce((sum, c) => sum + (c.minWidth ?? 50), 0);

    // 如果最小宽度已经超过容器，按比例缩放
    if (totalMinWidth >= containerWidth) {
      for (const col of visibleCols) {
        const colId = col.field ?? col.colId ?? '';
        const minW = col.minWidth ?? 50;
        const ratio = minW / totalMinWidth;
        result.set(colId, Math.floor(containerWidth * ratio));
      }
      return result;
    }

    // 先分配 flex 列
    const totalFlex = visibleCols.reduce((sum, c) => sum + (c.flex ?? 0), 0);
    const fixedCols = visibleCols.filter(c => !c.flex && c.width);
    const flexCols = visibleCols.filter(c => c.flex && c.flex > 0);
    const autoCols = visibleCols.filter(c => !c.flex && !c.width);

    let remainingWidth = containerWidth;

    // 分配固定宽度列
    for (const col of fixedCols) {
      const colId = col.field ?? col.colId ?? '';
      let w = col.width!;
      if (col.minWidth && w < col.minWidth) w = col.minWidth;
      if (col.maxWidth && w > col.maxWidth) w = col.maxWidth;
      result.set(colId, w);
      remainingWidth -= w;
    }

    // 分配自适应列
    for (const col of autoCols) {
      const colId = col.field ?? col.colId ?? '';
      const w = col.minWidth ?? 100;
      result.set(colId, w);
      remainingWidth -= w;
    }

    // 分配 flex 列
    if (flexCols.length > 0 && totalFlex > 0) {
      for (const col of flexCols) {
        const colId = col.field ?? col.colId ?? '';
        const ratio = col.flex! / totalFlex;
        let w = Math.floor(remainingWidth * ratio);
        if (col.minWidth && w < col.minWidth) w = col.minWidth;
        if (col.maxWidth && w > col.maxWidth) w = col.maxWidth;
        result.set(colId, w);
      }
    } else if (autoCols.length > 0 && remainingWidth > 0) {
      // 无 flex 列时，均分剩余空间给 auto 列
      const perCol = remainingWidth / autoCols.length;
      for (const col of autoCols) {
        const colId = col.field ?? col.colId ?? '';
        let w = perCol;
        if (col.minWidth && w < col.minWidth) w = col.minWidth;
        if (col.maxWidth && w > col.maxWidth) w = col.maxWidth;
        result.set(colId, Math.floor(w));
      }
    }

    return result;
  }

  /** 估算文本渲染宽度（用于精确 autoSize） */
  estimateTextWidth(text: string, fontSize: number = 13, fontFamily: string = 'Arial'): number {
    // 简单估算：中文 2x，英文 1x
    let width = 0;
    for (const char of text) {
      const code = char.charCodeAt(0);
      width += code > 127 ? fontSize : fontSize * 0.6;
    }
    return Math.ceil(width + this.padding);
  }

  private getDisplayValue(row: any, col: ColDef): any {
    if (col.valueGetter) {
      return col.valueGetter({ data: row });
    }
    if (col.valueFormatter) {
      const raw = row[col.field ?? ''];
      return (col.valueFormatter as Function)({ value: raw, data: row, colDef: col, column: null, api: null, columnApi: null, context: null });
    }
    return row[col.field ?? ''];
  }

  destroy(): void {}
}

/** 自适应配置 */
export interface AutoSizeConfig {
  autoSizeOnLoad?: boolean;
  skipHeader?: boolean;
  charWidth?: number;
  headerCharWidth?: number;
  padding?: number;
}

/** 自适应选项 */
export interface AutoSizeOptions {
  skipHeader?: boolean;
  sampleSize?: number;
}

/** 适应容器选项 */
export interface SizeToFitOptions {
  minimumColWidth?: number;
}
