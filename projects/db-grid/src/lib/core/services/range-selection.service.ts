import { Injectable } from '@angular/core';
import { ColDef, IRowNode } from '../models';

/**
 * 范围选择服务 — 支持单元格区域选择、复制、填充
 * AG Grid 对应功能：Range Selection, Cell Selection, Clipboard
 */
@Injectable({ providedIn: 'root' })
export class RangeSelectionService {
  private enabled = false;
  private cellSelection = false;
  private ranges: CellRange[] = [];
  private activeRange: CellRange | null = null;
  private startCell: CellPosition | null = null;
  private clipboardData: string = '';

  private onRangeChanged: ((ranges: CellRange[]) => void) | null = null;
  private onCellFocused: ((pos: CellPosition) => void) | null = null;

  /** 初始化 */
  initialize(config: { enableRangeSelection?: boolean; enableCellSelection?: boolean } = {}): void {
    this.enabled = config.enableRangeSelection ?? false;
    this.cellSelection = config.enableCellSelection ?? false;
    this.ranges = [];
    this.activeRange = null;
    this.startCell = null;
  }

  /** 是否启用范围选择 */
  isRangeSelectionEnabled(): boolean { return this.enabled; }

  /** 是否启用单元格选择 */
  isCellSelectionEnabled(): boolean { return this.cellSelection; }

  /** 启用范围选择 */
  enableRangeSelection(): void { this.enabled = true; }

  /** 禁用范围选择 */
  disableRangeSelection(): void { this.enabled = false; this.ranges = []; }

  /** 启用单元格选择 */
  enableCellSelection(): void { this.cellSelection = true; }

  /** 禁用单元格选择 */
  disableCellSelection(): void { this.cellSelection = false; }

  /** 开始范围选择（鼠标按下） */
  startRangeSelection(row: number, col: string, event?: MouseEvent): void {
    if (!this.enabled && !this.cellSelection) return;
    const shiftKey = event?.shiftKey ?? false;
    const ctrlKey = (event?.ctrlKey || event?.metaKey) ?? false;

    const pos: CellPosition = { rowIndex: row, colId: col };

    if (shiftKey && this.startCell) {
      // Shift 扩展范围
      this.activeRange = {
        start: { ...this.startCell },
        end: pos
      };
    } else if (ctrlKey) {
      // Ctrl 追加范围
      this.startCell = pos;
      this.activeRange = { start: pos, end: pos };
      this.ranges.push(this.activeRange);
    } else {
      // 新范围
      this.startCell = pos;
      this.ranges = [];
      this.activeRange = { start: pos, end: pos };
      this.ranges.push(this.activeRange);
    }
    this.emitRangeChanged();
  }

  /** 扩展范围（鼠标移动） */
  extendRange(row: number, col: string): void {
    if (!this.activeRange || !this.startCell) return;
    this.activeRange.end = { rowIndex: row, colId: col };
    this.emitRangeChanged();
  }

  /** 结束范围选择（鼠标松开） */
  endRangeSelection(): void {
    // 范围已确定，无需额外操作
  }

  /** 获取所有选择范围 */
  getRanges(): CellRange[] { return [...this.ranges]; }

  /** 获取当前活动范围 */
  getActiveRange(): CellRange | null { return this.activeRange; }

  /** 清除所有范围 */
  clearRanges(): void {
    this.ranges = [];
    this.activeRange = null;
    this.startCell = null;
    this.emitRangeChanged();
  }

  /** 判断单元格是否在某个范围内 */
  isCellInRange(rowIndex: number, colId: string): boolean {
    return this.ranges.some(range => this.isCellInSingleRange(rowIndex, colId, range));
  }

  /** 获取范围内的所有单元格位置 */
  getCellsInRange(range: CellRange): CellPosition[] {
    const cells: CellPosition[] = [];
    const startRow = Math.min(range.start.rowIndex, range.end.rowIndex);
    const endRow = Math.max(range.start.rowIndex, range.end.rowIndex);
    // 需要根据列顺序来遍历，这里简化为 colId 排序
    const colIds = [range.start.colId, range.end.colId].sort();
    for (let r = startRow; r <= endRow; r++) {
      for (const c of colIds) {
        cells.push({ rowIndex: r, colId: c });
      }
    }
    return cells;
  }

  /** 获取范围内的所有值（二维数组） */
  getRangeValues(range: CellRange, data: any[], columns: ColDef[]): any[][] {
    const startRow = Math.min(range.start.rowIndex, range.end.rowIndex);
    const endRow = Math.max(range.start.rowIndex, range.end.rowIndex);
    const startColIdx = columns.findIndex(c => c.field === range.start.colId || c.colId === range.start.colId) || 0;
    const endColIdx = columns.findIndex(c => c.field === range.end.colId || c.colId === range.end.colId) || columns.length - 1;
    const minCol = Math.min(startColIdx, endColIdx);
    const maxCol = Math.max(startColIdx, endColIdx);

    const values: any[][] = [];
    for (let r = startRow; r <= endRow; r++) {
      const row: any[] = [];
      const rowData = data[r];
      for (let c = minCol; c <= maxCol; c++) {
        const col = columns[c];
        row.push(rowData?.[col.field ?? ''] ?? null);
      }
      values.push(row);
    }
    return values;
  }

  /** 复制选中范围到剪贴板 */
  copyToClipboard(data: any[], columns: ColDef[]): void {
    if (this.ranges.length === 0) return;
    const allValues: string[] = [];
    for (const range of this.ranges) {
      const values = this.getRangeValues(range, data, columns);
      for (const row of values) {
        allValues.push(row.map(v => String(v ?? '')).join('\t'));
      }
    }
    this.clipboardData = allValues.join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(this.clipboardData).catch(() => {
        this.fallbackCopy(this.clipboardData);
      });
    } else {
      this.fallbackCopy(this.clipboardData);
    }
  }

  /** 剪切到剪贴板 */
  cutToClipboard(data: any[], columns: ColDef[]): string {
    this.copyToClipboard(data, columns);
    return this.clipboardData;
  }

  /** 从剪贴板粘贴 */
  async pasteFromClipboard(): Promise<string[][]> {
    try {
      const text = await navigator.clipboard.readText();
      return this.parseClipboardText(text);
    } catch {
      return this.parseClipboardText(this.clipboardData);
    }
  }

  /** 解析剪贴板文本为二维数组 */
  parseClipboardText(text: string): string[][] {
    if (!text) return [];
    return text.split('\n').map(line => line.split('\t'));
  }

  /** 范围变更事件注册 */
  onRangeSelectionChanged(callback: (ranges: CellRange[]) => void): void {
    this.onRangeChanged = callback;
  }

  /** 单元格聚焦事件注册 */
  onCellFocusChanged(callback: (pos: CellPosition) => void): void {
    this.onCellFocused = callback;
  }

  /** 聚焦单元格 */
  setFocusedCell(rowIndex: number, colId: string): void {
    if (this.onCellFocused) {
      this.onCellFocused({ rowIndex, colId });
    }
  }

  /** 全选 */
  selectAllCells(totalRows: number, columns: ColDef[]): void {
    const visibleCols = columns.filter(c => !c.hide);
    if (visibleCols.length === 0 || totalRows === 0) return;
    this.ranges = [{
      start: { rowIndex: 0, colId: visibleCols[0].field ?? visibleCols[0].colId ?? '0' },
      end: { rowIndex: totalRows - 1, colId: visibleCols[visibleCols.length - 1].field ?? visibleCols[visibleCols.length - 1].colId ?? String(visibleCols.length - 1) }
    }];
    this.activeRange = this.ranges[0];
    this.emitRangeChanged();
  }

  private isCellInSingleRange(rowIndex: number, colId: string, range: CellRange): boolean {
    const minRow = Math.min(range.start.rowIndex, range.end.rowIndex);
    const maxRow = Math.max(range.start.rowIndex, range.end.rowIndex);
    return rowIndex >= minRow && rowIndex <= maxRow &&
           (colId === range.start.colId || colId === range.end.colId);
  }

  private emitRangeChanged(): void {
    if (this.onRangeChanged) {
      this.onRangeChanged([...this.ranges]);
    }
  }

  private fallbackCopy(text: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  destroy(): void {
    this.ranges = [];
    this.activeRange = null;
    this.startCell = null;
    this.onRangeChanged = null;
    this.onCellFocused = null;
  }
}

/** 单元格位置 */
export interface CellPosition {
  rowIndex: number;
  colId: string;
}

/** 单元格范围 */
export interface CellRange {
  start: CellPosition;
  end: CellPosition;
}
