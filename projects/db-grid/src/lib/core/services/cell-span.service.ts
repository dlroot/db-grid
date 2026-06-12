/**
 * 单元格合并服务
 * 支持 colspan 和 rowspan 的单元格合并
 */

import { Injectable } from '@angular/core';
import { ColDef, RowNode } from '../models';

export interface CellSpan {
  rowIndex: number;
  colId: string;
  colspan: number;
  rowspan: number;
  isSpanStart: boolean;
}

export interface SpanConfig {
  spanRules?: SpanRule[];
  autoMerge?: boolean;
  mergeColumns?: string[];
  /**
   * 行跨行回调函数（AG Grid Enterprise 功能）
   * 返回 true 表示当前行与前一行合并
   */
  spanRows?: SpanRowsCallback;
  /**
   * 自动高度模式（根据内容计算行高）
   */
  autoHeight?: boolean;
  /**
   * 自动换行模式
   */
  wrapText?: boolean;
  /**
   * 深度合并（非连续行合并）
   */
  deepMerge?: boolean;
}

export interface SpanRule {
  colId: string;
  shouldMerge?: (currentValue: any, previousValue: any, currentRow: any, previousRow: any) => boolean;
}

/**
 * spanRows 回调函数类型
 * @param params 行数据参数
 * @returns true 表示合并，false 表示不合并
 */
export type SpanRowsCallback = (params: SpanRowsParams) => boolean;

export interface SpanRowsParams {
  /** 当前行数据 */
  rowNode: RowNode;
  /** 前一行节点（同一组） */
  previousRowNode: RowNode | null;
  /** 当前行数据对象 */
  currentData: any;
  /** 前一行数据对象 */
  previousData: any | null;
  /** 分组字段名 */
  column: ColDef;
  /** 列 ID */
  colId: string;
  /** 当前行的值 */
  currentValue: any;
  /** 前一行的值 */
  previousValue: any;
}

/**
 * 单元格自动高度信息
 */
export interface CellAutoHeight {
  rowIndex: number;
  colId: string;
  calculatedHeight: number;
}

@Injectable()
export class CellSpanService {
  private spanMap: Map<string, CellSpan> = new Map();
  private config: SpanConfig | null = null;
  private colIdToIndex: Map<string, number> = new Map();
  private rowCount = 0;

  initialize(columnDefs: ColDef[], rowData: any[], config: SpanConfig = {}): void {
    this.config = config;
    this.spanMap.clear();
    this.rowCount = rowData.length;

    this.colIdToIndex.clear();
    columnDefs.forEach((col, index) => {
      const colId = col.colId || col.field || `col-${index}`;
      this.colIdToIndex.set(colId, index);
    });

    this.calculateSpans(columnDefs, rowData);
  }

  private calculateSpans(columnDefs: ColDef[], rowData: any[]): void {
    if (rowData.length === 0) return;
    const cols = columnDefs.filter(c => !c.hide && (c.field || c.colId));
    cols.forEach((col, colIdx) => {
      const colId = col.colId || col.field!;
      for (let rowIdx = 0; rowIdx < rowData.length; rowIdx++) {
        this.setSpan(rowIdx, colId, 1, 1, true);
      }
    });

    if (this.config?.autoMerge && this.config?.mergeColumns?.length) {
      this.autoMergeColumns(columnDefs, rowData);
    }

    if (this.config?.spanRules?.length) {
      this.applySpanRules(columnDefs, rowData);
    }
  }

  private autoMergeColumns(columnDefs: ColDef[], rowData: any[]): void {
    if (!this.config?.mergeColumns?.length) return;

    this.config.mergeColumns.forEach(field => {
      const col = columnDefs.find(c => c.field === field);
      if (!col) return;
      const colId = col.colId || field;

      let spanStart = 0;
      for (let i = 1; i <= rowData.length; i++) {
        const currentValue = i < rowData.length ? this.getCellValue(rowData[i], field) : null;
        const previousValue = this.getCellValue(rowData[spanStart], field);
        const shouldContinue = currentValue !== null && currentValue === previousValue && previousValue !== null && previousValue !== undefined;

        if (!shouldContinue && i > spanStart) {
          const mergeCount = i - spanStart;
          if (mergeCount > 1) {
            this.setSpan(spanStart, colId, mergeCount, 1, true);
            for (let j = spanStart + 1; j < i; j++) this.setSpan(j, colId, 0, 1, false);
          }
          spanStart = i;
        } else if (!shouldContinue) {
          spanStart = i;
        }
      }
    });
  }

  private applySpanRules(columnDefs: ColDef[], rowData: any[]): void {
    if (!this.config?.spanRules?.length) return;
    this.config.spanRules.forEach(rule => {
      for (let rowIdx = 1; rowIdx < rowData.length; rowIdx++) {
        if (!this.isSpanStart(rowIdx - 1, rule.colId)) return;
        const currentValue = this.getCellValue(rowData[rowIdx], rule.colId);
        const previousValue = this.getCellValue(rowData[rowIdx - 1], rule.colId);
        if (rule.shouldMerge?.(currentValue, previousValue, rowData[rowIdx], rowData[rowIdx - 1])) {
          const prevSpan = this.getSpan(rowIdx - 1, rule.colId);
          if (prevSpan) {
            this.setSpan(rowIdx - 1, rule.colId, prevSpan.rowspan, prevSpan.colspan + 1, true);
            this.setSpan(rowIdx, rule.colId, 0, 1, false);
          }
        }
      }
    });
  }

  private getCellValue(row: any, field: string): any {
    if (!row || !field) return null;
    const keys = field.split('.');
    let value: any = row;
    for (const key of keys) { value = value?.[key]; }
    return value;
  }

  private setSpan(rowIndex: number, colId: string, rowspan: number, colspan: number, isSpanStart: boolean): void {
    this.spanMap.set(`${rowIndex}:${colId}`, { rowIndex, colId, colspan, rowspan, isSpanStart });
  }

  getSpan(rowIndex: number, colId: string): CellSpan | null {
    return this.spanMap.get(`${rowIndex}:${colId}`) || null;
  }

  isSpanStart(rowIndex: number, colId: string): boolean {
    const span = this.getSpan(rowIndex, colId);
    return span?.isSpanStart ?? true;
  }

  isSwappedOut(rowIndex: number, colId: string): boolean {
    const span = this.getSpan(rowIndex, colId);
    return span != null && !span.isSpanStart && (span.colspan === 0 || span.rowspan === 0);
  }

  getColSpan(rowIndex: number, colId: string): number {
    return this.getSpan(rowIndex, colId)?.colspan ?? 1;
  }

  getRowSpan(rowIndex: number, colId: string): number {
    return this.getSpan(rowIndex, colId)?.rowspan ?? 1;
  }

  setManualSpan(rowIndex: number, colId: string, colspan: number, rowspan: number): void {
    if (colspan <= 1 && rowspan <= 1) return;
    this.setSpan(rowIndex, colId, rowspan, colspan, true);
    for (let r = rowIndex; r < rowIndex + rowspan; r++) {
      for (let c = 0; c < this.colIdToIndex.size; c++) {
        const colIdByIndex = this.getColIdByIndex(c);
        if (r === rowIndex && colIdByIndex === colId) continue;
        const colIdx = this.colIdToIndex.get(colIdByIndex)!;
        const startColIdx = this.colIdToIndex.get(colId)!;
        const isInSpan = colIdx >= startColIdx && colIdx < startColIdx + colspan;
        if (isInSpan && (r !== rowIndex || colIdx !== startColIdx)) {
          this.setSpan(r, colIdByIndex, 0, 1, false);
        }
      }
    }
  }

  private getColIdByIndex(index: number): string {
    for (const [colId, idx] of this.colIdToIndex.entries()) {
      if (idx === index) return colId;
    }
    return `col-${index}`;
  }

  getRowCount(): number { return this.rowCount; }
  getAllSpans(): CellSpan[] { return Array.from(this.spanMap.values()).filter(s => s.isSpanStart); }
  clearSpans(): void { this.spanMap.clear(); }

  /**
   * 使用 spanRows 回调函数进行跨行合并
   * Phase 6.2 增强功能
   */
  applySpanRowsCallback(columnDefs: ColDef[], rowNodes: RowNode[]): void {
    if (!this.config?.spanRows) return;

    const cols = columnDefs.filter(c => !c.hide && (c.field || c.colId));
    
    cols.forEach(col => {
      const colId = col.colId || col.field!;
      let currentSpanStart = 0;

      for (let rowIdx = 1; rowIdx < rowNodes.length; rowIdx++) {
        const currentNode = rowNodes[rowIdx];
        const previousNode = rowNodes[currentSpanStart];
        const currentValue = this.getCellValue(currentNode.data, col.field || colId);
        const previousValue = this.getCellValue(previousNode.data, col.field || colId);

        const params: SpanRowsParams = {
          rowNode: currentNode,
          previousRowNode: previousNode,
          currentData: currentNode.data,
          previousData: previousNode.data,
          column: col,
          colId,
          currentValue,
          previousValue,
        };

        const shouldMerge = this.config!.spanRows!(params);

        if (!shouldMerge && rowIdx > currentSpanStart) {
          const mergeCount = rowIdx - currentSpanStart;
          if (mergeCount > 1) {
            this.setSpan(currentSpanStart, colId, mergeCount, 1, true);
            for (let j = currentSpanStart + 1; j < rowIdx; j++) {
              this.setSpan(j, colId, 0, 1, false);
            }
          }
          currentSpanStart = rowIdx;
        } else if (!shouldMerge) {
          currentSpanStart = rowIdx;
        }
      }
    });
  }

  /**
   * 计算单元格自动高度
   */
  calculateAutoHeights(rowData: any[], defaultRowHeight: number = 40): Map<string, number> {
    const heights = new Map<string, number>();
    rowData.forEach((_, rowIdx) => {
      heights.set(`row-${rowIdx}`, defaultRowHeight);
    });
    return heights;
  }

  isAutoHeightEnabled(): boolean {
    return this.config?.autoHeight ?? false;
  }

  isWrapTextEnabled(): boolean {
    return this.config?.wrapText ?? false;
  }

  destroy(): void {
    this.spanMap.clear();
    this.colIdToIndex.clear();
  }
}
