import { Injectable } from '@angular/core';
import { ColDef } from '../models';

/**
 * 范围选择服务 — 支持单元格区域选择、复制、填充、列选择
 * AG Grid 对应功能：Range Selection, Cell Selection, Clipboard, Column Selection
 */
@Injectable()
export class RangeSelectionService {
  private enabled = false;
  private cellSelection = false;
  private colSelection = false;
  private ranges: CellRange[] = [];
  private activeRange: CellRange | null = null;
  private startCell: CellPosition | null = null;
  private focusedCell: CellPosition | null = null;
  private clipboardData: string = '';
  private columnOrder: string[] = [];

  private onRangeChanged: ((ranges: CellRange[]) => void) | null = null;
  private onCellFocused: ((pos: CellPosition) => void) | null = null;
  private onRangeSelectionStarted: (() => void) | null = null;
  private onRangeSelectionFinished: (() => void) | null = null;

  /** 初始化 */
  initialize(config: { enableRangeSelection?: boolean; enableCellSelection?: boolean; enableColSelection?: boolean } = {}): void {
    this.enabled = config.enableRangeSelection ?? false;
    this.cellSelection = config.enableCellSelection ?? false;
    this.colSelection = config.enableColSelection ?? false;
    this.ranges = [];
    this.activeRange = null;
    this.startCell = null;
  }

  /** 是否启用范围选择 */
  isRangeSelectionEnabled(): boolean { return this.enabled; }

  /** 是否启用单元格选择 */
  isCellSelectionEnabled(): boolean { return this.cellSelection; }

  /** 是否启用列选择 */
  isColSelectionEnabled(): boolean { return this.colSelection; }

  /** 启用范围选择 */
  enableRangeSelection(): void { this.enabled = true; }

  /** 禁用范围选择 */
  disableRangeSelection(): void { this.enabled = false; this.ranges = []; }

  /** 启用单元格选择 */
  enableCellSelection(): void { this.cellSelection = true; }

  /** 禁用单元格选择 */
  disableCellSelection(): void { this.cellSelection = false; }

  /** 启用列选择 */
  enableColSelection(): void { this.colSelection = true; }

  /** 禁用列选择 */
  disableColSelection(): void { this.colSelection = false; }

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
    this.focusedCell = null;
    this.emitRangeChanged();
  }

  /** 获取焦点单元格 */
  getFocusedCell(): CellPosition | null { return this.focusedCell; }

  /** 设置焦点单元格 */
  setFocusedCell(rowIndex: number, colId: string): void {
    this.focusedCell = { rowIndex, colId };
    if (this.onCellFocused) {
      this.onCellFocused(this.focusedCell);
    }
  }

  /** 处理键盘导航 (Shift + 方向键) */
  handleShiftArrowKey(event: KeyboardEvent, totalRows: number, columns: ColDef[]): boolean {
    if (!this.enabled && !this.cellSelection) return false;
    if (!event.shiftKey) return false;

    const visibleCols = columns.filter(c => !c.hide);
    if (!this.focusedCell || visibleCols.length === 0) return false;

    const currentColIdx = visibleCols.findIndex(c => (c.field || c.colId) === this.focusedCell!.colId);
    if (currentColIdx < 0) return false;

    let newRow = this.focusedCell.rowIndex;
    let newColIdx = currentColIdx;

    switch (event.key) {
      case 'ArrowUp':
        newRow = Math.max(0, newRow - 1);
        break;
      case 'ArrowDown':
        newRow = Math.min(totalRows - 1, newRow + 1);
        break;
      case 'ArrowLeft':
        newColIdx = Math.max(0, newColIdx - 1);
        break;
      case 'ArrowRight':
        newColIdx = Math.min(visibleCols.length - 1, newColIdx + 1);
        break;
      default:
        return false;
    }

    event.preventDefault();
    const newColId = visibleCols[newColIdx].field || visibleCols[newColIdx].colId || '';
    
    // 扩展选择范围
    if (!this.startCell) {
      this.startCell = { ...this.focusedCell };
    }

    this.activeRange = {
      start: { ...this.startCell },
      end: { rowIndex: newRow, colId: newColId }
    };

    // 更新 ranges 数组
    if (this.ranges.length === 0) {
      this.ranges.push(this.activeRange);
    } else {
      this.ranges[this.ranges.length - 1] = this.activeRange;
    }

    this.setFocusedCell(newRow, newColId);
    this.emitRangeChanged();
    return true;
  }

  /** 全选所有单元格 */
  selectAll(totalRows: number, columns: ColDef[]): void {
    const visibleCols = columns.filter(c => !c.hide);
    if (visibleCols.length === 0 || totalRows === 0) return;

    const startColId = visibleCols[0].field || visibleCols[0].colId || '';
    const endColId = visibleCols[visibleCols.length - 1].field || visibleCols[visibleCols.length - 1].colId || '';

    this.ranges = [{
      start: { rowIndex: 0, colId: startColId },
      end: { rowIndex: totalRows - 1, colId: endColId }
    }];
    this.activeRange = this.ranges[0];
    this.startCell = { ...this.ranges[0].start };
    this.emitRangeChanged();
  }

  /** 获取列索引 */
  getColumnIndex(colId: string): number {
    return this._columnOrder.indexOf(colId);
  }

  /** 根据索引获取列ID */
  getColumnId(index: number): string {
    return this._columnOrder[index] || '';
  }

  /** 判断单元格是否在某个范围内 */
  isCellInRange(rowIndex: number, colId: string): boolean {
    return this.ranges.some(range => this.isCellInSingleRange(rowIndex, colId, range));
  }

  /**
   * 获取单元格在某范围中的边界类型
   * 返回该单元格相对于指定 range 的边界位置（top/right/bottom/left）
   * 用于给选中区域的外边框添加高亮样式
   */
  getCellRangeEdge(rowIndex: number, colId: string, range: CellRange): RangeEdge {
    const minRow = Math.min(range.start.rowIndex, range.end.rowIndex);
    const maxRow = Math.max(range.start.rowIndex, range.end.rowIndex);

    // 行范围判断
    if (rowIndex < minRow || rowIndex > maxRow) {
      return { top: false, right: false, bottom: false, left: false };
    }

    // 列范围判断
    const startIdx = this._columnOrder.indexOf(range.start.colId);
    const endIdx = this._columnOrder.indexOf(range.end.colId);
    const colIdx = this._columnOrder.indexOf(colId);

    if (startIdx < 0 || endIdx < 0 || colIdx < 0) {
      return { top: false, right: false, bottom: false, left: false };
    }

    const minCol = Math.min(startIdx, endIdx);
    const maxCol = Math.max(startIdx, endIdx);

    if (colIdx < minCol || colIdx > maxCol) {
      return { top: false, right: false, bottom: false, left: false };
    }

    // 单元格在范围内，计算边界
    return {
      top: rowIndex === minRow,
      right: colIdx === maxCol,
      bottom: rowIndex === maxRow,
      left: colIdx === minCol,
    };
  }

  /**
   * 获取单元格在所有范围中的合并边界
   * 如果单元格在多个范围中都处于某一侧边界，则该边界为 true
   */
  getCellMergedEdge(rowIndex: number, colId: string): RangeEdge {
    const merged: RangeEdge = { top: false, right: false, bottom: false, left: false };
    for (const range of this.ranges) {
      const edge = this.getCellRangeEdge(rowIndex, colId, range);
      merged.top = merged.top || edge.top;
      merged.right = merged.right || edge.right;
      merged.bottom = merged.bottom || edge.bottom;
      merged.left = merged.left || edge.left;
    }
    return merged;
  }

  /**
   * 选择整列
   * @param colId 列ID
   * @param totalRows 总行数
   * @param event 鼠标事件（用于判断 Ctrl/Shift）
   */
  selectColumn(colId: string, totalRows: number, event?: MouseEvent): void {
    if (!this.colSelection && !this.enabled) return;
    if (totalRows <= 0) return;

    const ctrlKey = (event?.ctrlKey || event?.metaKey) ?? false;
    const shiftKey = event?.shiftKey ?? false;

    if (shiftKey && this._lastSelectedColId) {
      // Shift 点击：选择从上次选中列到当前列的范围
      const startIdx = this._columnOrder.indexOf(this._lastSelectedColId);
      const endIdx = this._columnOrder.indexOf(colId);
      if (startIdx >= 0 && endIdx >= 0) {
        const minIdx = Math.min(startIdx, endIdx);
        const maxIdx = Math.max(startIdx, endIdx);
        const startColId = this._columnOrder[minIdx];
        const endColId = this._columnOrder[maxIdx];
        this.ranges = [{
          start: { rowIndex: 0, colId: startColId },
          end: { rowIndex: totalRows - 1, colId: endColId },
          type: 'column'
        }];
        this.activeRange = this.ranges[0];
        this.startCell = { rowIndex: 0, colId };
      }
    } else if (ctrlKey) {
      // Ctrl 点击：追加列选择
      const newRange: CellRange = {
        start: { rowIndex: 0, colId },
        end: { rowIndex: totalRows - 1, colId },
        type: 'column'
      };
      // 检查该列是否已在选中范围中，如果是则取消
      const existingIdx = this.ranges.findIndex(r =>
        this.isColumnInRange(colId, r)
      );
      if (existingIdx >= 0) {
        this.ranges.splice(existingIdx, 1);
        this.activeRange = this.ranges[this.ranges.length - 1] || null;
      } else {
        this.ranges.push(newRange);
        this.activeRange = newRange;
      }
      this._lastSelectedColId = colId;
    } else {
      // 普通点击：选择单列
      this.ranges = [{
        start: { rowIndex: 0, colId },
        end: { rowIndex: totalRows - 1, colId },
        type: 'column'
      }];
      this.activeRange = this.ranges[0];
      this.startCell = { rowIndex: 0, colId };
      this._lastSelectedColId = colId;
    }
    this.emitRangeChanged();
  }

  /** 判断某列是否在选择范围内 */
  private isColumnInRange(colId: string, range: CellRange): boolean {
    const startIdx = this._columnOrder.indexOf(range.start.colId);
    const endIdx = this._columnOrder.indexOf(range.end.colId);
    const colIdx = this._columnOrder.indexOf(colId);
    if (startIdx < 0 || endIdx < 0 || colIdx < 0) return false;
    const minCol = Math.min(startIdx, endIdx);
    const maxCol = Math.max(startIdx, endIdx);
    return colIdx >= minCol && colIdx <= maxCol;
  }

  private _lastSelectedColId: string | null = null;

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

  private _columnOrder: string[] = [];

  /** 设置可见列的顺序（供 isCellInRange 列范围判断使用） */
  setColumnOrder(colIds: string[]): void {
    this._columnOrder = colIds;
  }

  private isCellInSingleRange(rowIndex: number, colId: string, range: CellRange): boolean {
    const minRow = Math.min(range.start.rowIndex, range.end.rowIndex);
    const maxRow = Math.max(range.start.rowIndex, range.end.rowIndex);
    if (rowIndex < minRow || rowIndex > maxRow) return false;
    // 列匹配：需要知道列的顺序才能判断 colId 是否在 start~end 范围内
    if (this._columnOrder.length === 0) {
      // 降级：只匹配起止列
      return colId === range.start.colId || colId === range.end.colId;
    }
    const startIdx = this._columnOrder.indexOf(range.start.colId);
    const endIdx = this._columnOrder.indexOf(range.end.colId);
    const colIdx = this._columnOrder.indexOf(colId);
    if (startIdx < 0 || endIdx < 0 || colIdx < 0) return false;
    const minCol = Math.min(startIdx, endIdx);
    const maxCol = Math.max(startIdx, endIdx);
    return colIdx >= minCol && colIdx <= maxCol;
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
  /** 范围类型: 'cell' 表示普通单元格区域选择, 'column' 表示整列选择 */
  type?: 'cell' | 'column';
}

/** 单元格在范围中的边界信息 */
export interface RangeEdge {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}
