/**
 * Keyboard Navigation Service
 * 完整键盘操作支持：Tab / Enter / Arrow / Escape / 编辑快捷键
 * 支持 AG Grid 兼容的快捷键：
 *   - Ctrl+Home/End: 跳转到首/末单元格
 *   - Ctrl+方向键: 跳转到数据边缘
 *   - Shift+方向键: 扩展选择区域
 *   - Ctrl+Shift+方向键: 扩展选择到边缘
 *
 * 用法：
 *   const kb = new KeyboardNavigationService();
 *   kb.setGrid(this.gridApi, this.gridElement, this.columnService, this.rowRenderer);
 *   kb.onFocusChange.subscribe(info => {...});
 */

import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { ColumnService } from '../services/column.service';
import { DataService } from '../services/data.service';

export interface KeyboardCellPosition {
  rowIndex: number;
  colId: string;
}

export interface FocusChangeEvent {
  previous: KeyboardCellPosition | null;
  current: KeyboardCellPosition;
  reason: 'arrow' | 'tab' | 'enter' | 'click' | 'api';
}

export interface KeyEventResult {
  consumed: boolean;
  defaultPrevented?: boolean;
}

/** Grid API（Keyboard Service 需要的子集） */
interface GridFocusApi {
  getDisplayedRowCount(): number;
  getRowNode(id: string): any;
  ensureIndexVisible(index: number, align?: string): void;
  ensureColumnVisible(colId: string): void;
  getColumnDef(colId: string): any;
  startEditingCell(rowIndex: number, colId: string, charPress?: string): void;
  getFocusedCell(): { rowIndex: number; colId: string } | null;
  setFocusedCell(rowIndex: number, colId: string, force?: boolean): void;
}

@Injectable()
export class KeyboardNavigationService {
  // ========== 状态 ==========

  private gridApi: GridFocusApi | null = null;
  private columnService: ColumnService | null = null;
  private rowRenderer: any = null;
  private gridElement: HTMLElement | null = null;
  private rangeSelectionService: any = null; // RangeSelectionService reference
  private undoRedoService: any = null; // UndoRedoService reference

  /** 当前焦点单元格 */
  private _focusedRowIndex = -1;
  private _focusedColId = '';

  /** 焦点列索引缓存 */
  private _colIdToIndexCache: Map<string, number> = new Map();
  private _indexToColIdCache: Map<number, string> = new Map();

  /** 行数据引用（用于查找数据边缘） */
  private rowData: any[] = [];

  // ========== 事件发射器 ==========

  readonly onFocusChange = new Subject<FocusChangeEvent>();
  readonly onCellEditStart = new Subject<KeyboardCellPosition>();
  readonly onCellEditStop = new Subject<void>();
  readonly onEnterKey = new Subject<KeyboardCellPosition>();
  readonly onEscapeKey = new Subject<void>();

  // ========== 配置 ==========

  /** 是否启用单元格编辑模式 */
  editing = false;
  /** 编辑取消时的原始值 */
  private _editOriginalValue: any = null;
  private _editRowIndex = -1;
  private _editColId = '';

  // ========== 初始化 ==========

  setGrid(
    gridApi: GridFocusApi,
    gridElement: HTMLElement,
    columnService: ColumnService,
    rowRenderer: any,
    rowData?: any[]
  ): void {
    this.gridApi = gridApi;
    this.gridElement = gridElement;
    this.columnService = columnService;
    this.rowRenderer = rowRenderer;
    if (rowData) {
      this.rowData = rowData;
    }
    this.refreshColumnCache();
  }

  /** 设置 RangeSelectionService 引用（用于 Shift+方向键扩展选择） */
  setRangeSelectionService(service: any): void {
    this.rangeSelectionService = service;
  }

  /** 设置 UndoRedoService 引用（用于 Ctrl+Z / Ctrl+Y） */
  setUndoRedoService(service: any): void {
    this.undoRedoService = service;
  }

  /** 设置行数据（用于 Ctrl+方向键查找数据边缘） */
  setRowData(rowData: any[]): void {
    this.rowData = rowData;
  }

  /** 刷新列索引缓存（列定义变化时调用） */
  refreshColumnCache(): void {
    this._colIdToIndexCache.clear();
    this._indexToColIdCache.clear();
    if (!this.columnService) return;

    const columns = this.columnService.getVisibleColumns();
    columns.forEach((col, index) => {
      const colId = col.colId || col.field || `col-${index}`;
      this._colIdToIndexCache.set(colId, index);
      this._indexToColIdCache.set(index, colId);
    });
  }

  // ========== 公共 API ==========

  /** 获取当前焦点位置 */
  getFocusedCell(): KeyboardCellPosition | null {
    if (this._focusedRowIndex < 0 || !this._focusedColId) return null;
    return { rowIndex: this._focusedRowIndex, colId: this._focusedColId };
  }

  /** 设置焦点到指定单元格 */
  setFocusedCell(rowIndex: number, colId: string, scrollIntoView = true): void {
    const prev = this.getFocusedCell();
    this._focusedRowIndex = rowIndex;
    this._focusedColId = colId;

    if (scrollIntoView) {
      // 使用 'auto' 对齐：仅在目标行不可见时才滚动
      this.gridApi?.ensureIndexVisible(rowIndex, 'auto');
      this.gridApi?.ensureColumnVisible(colId);
    }

    this.highlightFocusedCell(rowIndex, colId);

    this.onFocusChange.next({
      previous: prev,
      current: { rowIndex, colId },
      reason: 'api',
    });
  }

  /** 焦点移动到第一个单元格 */
  focusFirstCell(): void {
    const firstColId = this._indexToColIdCache.get(0);
    if (firstColId) this.setFocusedCell(0, firstColId);
  }

  /** 开始编辑指定单元格 */
  startEditing(rowIndex: number, colId: string, charPress?: string): void {
    this._editOriginalValue = this.getCellValue(rowIndex, colId);
    this._editRowIndex = rowIndex;
    this._editColId = colId;
    this.editing = true;
    this.gridApi?.startEditingCell(rowIndex, colId, charPress);
    this.onCellEditStart.next({ rowIndex, colId });
  }

  /** 停止编辑并提交值 */
  stopEditing(commit: boolean): void {
    if (!this.editing) return;
    const value = this.getCellValue(this._editRowIndex, this._editColId);
    this.editing = false;
    this.onCellEditStop.next();
    // 实际提交由 gridApi 处理
  }

  /** 处理键盘事件（由 grid 主组件调用） */
  handleKeyDown(event: KeyboardEvent): KeyEventResult {
    if (!this.gridApi || !this.gridElement) {
      return { consumed: false };
    }

    const key = event.key;
    const ctrl = event.ctrlKey || event.metaKey;
    const shift = event.shiftKey;

    // 编辑模式下的按键处理
    if (this.editing) {
      return this.handleEditingKeyDown(event);
    }

    // 普通模式
    switch (key) {
      // ===== 焦点移动 =====
      case 'ArrowUp':
        if (ctrl && shift) {
          // Ctrl+Shift+Up: 扩展选择到当前列第一个单元格
          this.extendSelectionToEdge('top');
          return { consumed: true };
        }
        if (ctrl) {
          // Ctrl+Up: 跳转到当前列的第一个单元格
          return this.jumpToDataEdge('up');
        }
        return this.moveFocus('up', shift);

      case 'ArrowDown':
        if (ctrl && shift) {
          // Ctrl+Shift+Down: 扩展选择到当前列最后一个单元格
          this.extendSelectionToEdge('bottom');
          return { consumed: true };
        }
        if (ctrl) {
          // Ctrl+Down: 跳转到当前列的最后一个单元格
          return this.jumpToDataEdge('down');
        }
        return this.moveFocus('down', shift);

      case 'ArrowLeft':
        if (ctrl && shift) {
          // Ctrl+Shift+Left: 扩展选择到当前行第一个单元格
          this.extendSelectionToEdge('left');
          return { consumed: true };
        }
        if (ctrl) {
          // Ctrl+Left: 跳转到当前行的第一个单元格
          return this.jumpToDataEdge('left');
        }
        return this.moveFocus('left', shift);

      case 'ArrowRight':
        if (ctrl && shift) {
          // Ctrl+Shift+Right: 扩展选择到当前行最后一个单元格
          this.extendSelectionToEdge('right');
          return { consumed: true };
        }
        if (ctrl) {
          // Ctrl+Right: 跳转到当前行的最后一个单元格
          return this.jumpToDataEdge('right');
        }
        return this.moveFocus('right', shift);

      // ===== Tab 导航 =====
      case 'Tab':
        return shift ? this.moveFocus('prev', false) : this.moveFocus('next', false);

      // ===== 编辑触发 =====
      case 'Enter':
        return this.handleEnterKey();

      case 'F2':
        return this.handleF2Key();

      case 'Backspace':
      case 'Delete':
        if (!ctrl) return { consumed: false };
        // 清空单元格值
        return { consumed: false }; // 传递给 grid 处理

      // ===== Escape 取消焦点 =====
      case 'Escape':
        return this.handleEscapeKey();

      // ===== Page Up/Down =====
      case 'PageUp':
        return this.moveFocusByPage(-1);

      case 'PageDown':
        return this.moveFocusByPage(1);

      // ===== Home/End =====
      case 'Home':
        return this.handleHomeKey(ctrl, shift);

      case 'End':
        return this.handleEndKey(ctrl, shift);

      // ===== Undo/Redo =====
      case 'z':
      case 'Z':
        if (ctrl && !shift) {
          // Ctrl+Z: Undo
          if (this.undoRedoService && this.undoRedoService.canUndo()) {
            this.undoRedoService.undo();
          }
          return { consumed: true };
        }
        return { consumed: false };

      case 'y':
      case 'Y':
        if (ctrl) {
          // Ctrl+Y: Redo
          if (this.undoRedoService && this.undoRedoService.canRedo()) {
            this.undoRedoService.redo();
          }
          return { consumed: true };
        }
        return { consumed: false };

      default:
        return { consumed: false };
    }
  }

  // ========== 内部方法 ==========

  /** 跳转到第一个单元格（Ctrl+Home）*/
  private jumpToFirstCell(): KeyEventResult {
    const firstColId = this._indexToColIdCache.get(0);
    if (!firstColId) return { consumed: false };
    this.setFocusedCell(0, firstColId);
    return { consumed: true };
  }

  /** 跳转到最后一个单元格（Ctrl+End）*/
  private jumpToLastCell(): KeyEventResult {
    const maxRow = (this.gridApi?.getDisplayedRowCount() ?? 1) - 1;
    const lastColIndex = this._indexToColIdCache.size - 1;
    const lastColId = this._indexToColIdCache.get(lastColIndex);
    if (!lastColId) return { consumed: false };
    this.setFocusedCell(maxRow, lastColId);
    return { consumed: true };
  }

  /** 跳转到数据边缘（Ctrl+方向键）
   *  - Up: 跳转到当前列的第一个非空单元格
   *  - Down: 跳转到当前列的最后一个非空单元格
   *  - Left: 跳转到当前行的第一个单元格
   *  - Right: 跳转到当前行的最后一个单元格
   */
  private jumpToDataEdge(direction: 'up' | 'down' | 'left' | 'right'): KeyEventResult {
    const current = this.getFocusedCell();
    if (!current) {
      this.focusFirstCell();
      return { consumed: true };
    }

    let { rowIndex, colId } = current;
    const colIndex = this._colIdToIndexCache.get(colId) ?? 0;
    const maxRow = (this.gridApi?.getDisplayedRowCount() ?? 1) - 1;
    const maxCol = this._indexToColIdCache.size - 1;

    switch (direction) {
      case 'up':
        // 跳转到当前列的第一个非空单元格（或第一行）
        rowIndex = this.findEdgeRow(colIndex, 'up');
        break;
      case 'down':
        // 跳转到当前列的最后一个非空单元格（或最后一行）
        rowIndex = this.findEdgeRow(colIndex, 'down');
        break;
      case 'left':
        // 跳转到当前行的第一个单元格
        colId = this._indexToColIdCache.get(0) || colId;
        break;
      case 'right':
        // 跳转到当前行的最后一个单元格
        colId = this._indexToColIdCache.get(maxCol) || colId;
        break;
    }

    if (rowIndex === current.rowIndex && colId === current.colId) {
      return { consumed: false };
    }

    this.setFocusedCell(rowIndex, colId);
    return { consumed: true };
  }

  /** 查找边缘行（向上/向下找到第一个非空单元格） */
  private findEdgeRow(colIndex: number, direction: 'up' | 'down'): number {
    const current = this.getFocusedCell();
    if (!current) return 0;

    const maxRow = (this.gridApi?.getDisplayedRowCount() ?? 1) - 1;
    const colId = this._indexToColIdCache.get(colIndex) || '';

    if (direction === 'up') {
      // 向上找到第一个非空单元格
      for (let i = current.rowIndex - 1; i >= 0; i--) {
        const value = this.getCellValue(i, colId);
        if (value !== null && value !== undefined && value !== '') {
          return i;
        }
      }
      return 0; // 如果没有非空单元格，返回第一行
    } else {
      // 向下找到第一个非空单元格
      for (let i = current.rowIndex + 1; i <= maxRow; i++) {
        const value = this.getCellValue(i, colId);
        if (value !== null && value !== undefined && value !== '') {
          return i;
        }
      }
      return maxRow; // 如果没有非空单元格，返回最后一行
    }
  }

  /** 移动焦点 */
  private moveFocus(
    direction: 'up' | 'down' | 'left' | 'right' | 'next' | 'prev' | 'home' | 'end',
    extend: boolean
  ): KeyEventResult {
    const current = this.getFocusedCell();
    if (!current) {
      this.focusFirstCell();
      return { consumed: true };
    }

    let { rowIndex, colId } = current;
    const colIndex = this._colIdToIndexCache.get(colId) ?? 0;

    switch (direction) {
      case 'up':
        if (rowIndex > 0) rowIndex--;
        break;
      case 'down':
        rowIndex++;
        break;
      case 'left':
        if (colIndex > 0) {
          colId = this._indexToColIdCache.get(colIndex - 1) || colId;
        }
        break;
      case 'right':
        const nextColId = this._indexToColIdCache.get(colIndex + 1);
        if (nextColId) {
          colId = nextColId;
        } else {
          // 移到下一行第一个单元格
          rowIndex++;
          colId = this._indexToColIdCache.get(0) || '';
        }
        break;
      case 'next':
        const nxt = this._indexToColIdCache.get(colIndex + 1);
        if (nxt) {
          colId = nxt;
        } else {
          rowIndex++;
          colId = this._indexToColIdCache.get(0) || '';
        }
        break;
      case 'prev':
        const prv = this._indexToColIdCache.get(colIndex - 1);
        if (prv) {
          colId = prv;
        } else {
          rowIndex = Math.max(0, rowIndex - 1);
          const lastColIndex = this._indexToColIdCache.size - 1;
          colId = this._indexToColIdCache.get(lastColIndex) || '';
        }
        break;
      case 'home':
        // Home: 跳转到当前行第一个单元格
        colId = this._indexToColIdCache.get(0) || colId;
        break;
      case 'end':
        // End: 跳转到当前行最后一个单元格
        const lastColIdx = this._indexToColIdCache.size - 1;
        colId = this._indexToColIdCache.get(lastColIdx) || colId;
        break;
    }

    // 边界检查
    const maxRow = (this.gridApi?.getDisplayedRowCount() ?? 1) - 1;
    rowIndex = Math.max(0, Math.min(rowIndex, maxRow));

    if (rowIndex === current.rowIndex && colId === current.colId) {
      return { consumed: false };
    }

    // 如果 extend 为 true（Shift 键），扩展选择区域
    if (extend && this.rangeSelectionService) {
      this.extendSelection(rowIndex, colId);
    }

    this.setFocusedCell(rowIndex, colId);
    return { consumed: true };
  }

  /** 扩展选择区域（Shift+方向键） */
  private extendSelection(rowIndex: number, colId: string): void {
    if (!this.rangeSelectionService) return;

    const current = this.getFocusedCell();
    if (!current) return;

    // 使用 RangeSelectionService 扩展选择
    this.rangeSelectionService.startRangeSelection(current.rowIndex, current.colId);
    this.rangeSelectionService.extendRange(rowIndex, colId);
  }

  /** 按 Page Up/Down 移动（移动一屏） */
  private moveFocusByPage(direction: 1 | -1): KeyEventResult {
    const current = this.getFocusedCell();
    if (!current) return { consumed: false };

    // 估算每屏行数
    const pageSize = Math.max(10, Math.floor(this.rowHeight || 30));
    const newRow = Math.max(0, current.rowIndex + direction * pageSize);
    this.setFocusedCell(newRow, current.colId);
    return { consumed: true };
  }

  /** Home/End 处理 */
  private handleHomeKey(ctrl: boolean, shift: boolean): KeyEventResult {
    const current = this.getFocusedCell();
    if (!current) return { consumed: false };

    if (ctrl && shift) {
      // Ctrl+Shift+Home: 扩展选择到第一个单元格
      const firstColId = this._indexToColIdCache.get(0) || '';
      if (this.rangeSelectionService) {
        this.rangeSelectionService.startRangeSelection(current.rowIndex, current.colId);
        this.rangeSelectionService.extendRange(0, firstColId);
      }
      this.setFocusedCell(0, firstColId);
      return { consumed: true };
    }

    if (ctrl) {
      // Ctrl+Home: 跳转到第一个单元格
      return this.jumpToFirstCell();
    }

    // Home: 跳转到当前行第一个单元格
    const firstColId = this._indexToColIdCache.get(0) || '';
    if (shift && this.rangeSelectionService) {
      // Shift+Home: 扩展选择到当前行第一个单元格
      this.rangeSelectionService.startRangeSelection(current.rowIndex, current.colId);
      this.rangeSelectionService.extendRange(current.rowIndex, firstColId);
    }
    this.setFocusedCell(current.rowIndex, firstColId);
    return { consumed: true };
  }

  private handleEndKey(ctrl: boolean, shift: boolean): KeyEventResult {
    const current = this.getFocusedCell();
    if (!current) return { consumed: false };

    const maxRow = (this.gridApi?.getDisplayedRowCount() ?? 1) - 1;
    const lastColId = this._indexToColIdCache.get(this._indexToColIdCache.size - 1) || '';

    if (ctrl && shift) {
      // Ctrl+Shift+End: 扩展选择到最后一个单元格
      if (this.rangeSelectionService) {
        this.rangeSelectionService.startRangeSelection(current.rowIndex, current.colId);
        this.rangeSelectionService.extendRange(maxRow, lastColId);
      }
      this.setFocusedCell(maxRow, lastColId);
      return { consumed: true };
    }

    if (ctrl) {
      // Ctrl+End: 跳转到最后一个单元格
      return this.jumpToLastCell();
    }

    // End: 跳转到当前行最后一个单元格
    if (shift && this.rangeSelectionService) {
      // Shift+End: 扩展选择到当前行最后一个单元格
      this.rangeSelectionService.startRangeSelection(current.rowIndex, current.colId);
      this.rangeSelectionService.extendRange(current.rowIndex, lastColId);
    }
    this.setFocusedCell(current.rowIndex, lastColId);
    return { consumed: true };
  }

  /** 扩展选择到边缘（Ctrl+Shift+方向键）*/
  private extendSelectionToEdge(direction: 'top' | 'bottom' | 'left' | 'right'): void {
    if (!this.rangeSelectionService) return;

    const current = this.getFocusedCell();
    if (!current) return;

    let targetRow = current.rowIndex;
    let targetColId = current.colId;
    const maxRow = (this.gridApi?.getDisplayedRowCount() ?? 1) - 1;

    switch (direction) {
      case 'top':
        targetRow = 0;
        break;
      case 'bottom':
        targetRow = maxRow;
        break;
      case 'left':
        targetColId = this._indexToColIdCache.get(0) || current.colId;
        break;
      case 'right':
        targetColId = this._indexToColIdCache.get(this._indexToColIdCache.size - 1) || current.colId;
        break;
    }

    this.rangeSelectionService.startRangeSelection(current.rowIndex, current.colId);
    this.rangeSelectionService.extendRange(targetRow, targetColId);
    this.setFocusedCell(targetRow, targetColId);
  }

  /** Enter 键 */
  private handleEnterKey(): KeyEventResult {
    const current = this.getFocusedCell();
    if (!current) return { consumed: false };

    const colDef = this.gridApi?.getColumnDef(current.colId);
    const editable = this.isEditable(colDef, current.rowIndex);

    if (editable) {
      this.startEditing(current.rowIndex, current.colId);
    }

    // Enter 向下移动一行
    this.moveFocus('down', false);
    this.onEnterKey.next(current);
    return { consumed: true };
  }

  /** F2 键 - 开始编辑（不改变值） */
  private handleF2Key(): KeyEventResult {
    const current = this.getFocusedCell();
    if (!current) return { consumed: false };

    const colDef = this.gridApi?.getColumnDef(current.colId);
    if (this.isEditable(colDef, current.rowIndex)) {
      this.startEditing(current.rowIndex, current.colId);
    }
    return { consumed: true };
  }

  /** Escape 键 */
  private handleEscapeKey(): KeyEventResult {
    if (this.editing) {
      // 取消编辑，恢复原始值
      this.editing = false;
      this.onCellEditStop.next();
    }
    this.onEscapeKey.next();
    return { consumed: false }; // 不阻止默认行为
  }

  /** 编辑模式下的按键处理 */
  private handleEditingKeyDown(event: KeyboardEvent): KeyEventResult {
    const key = event.key;

    switch (key) {
      case 'Enter':
        this.stopEditing(true);
        this.moveFocus('down', false);
        return { consumed: true };

      case 'Tab':
        this.stopEditing(true);
        this.moveFocus(event.shiftKey ? 'prev' : 'next', false);
        return { consumed: true };

      case 'Escape':
        this.editing = false;
        this.onCellEditStop.next();
        return { consumed: true };

      // 方向键：先提交编辑，再移动焦点
      case 'ArrowUp':
      case 'ArrowDown':
        this.stopEditing(true);
        this.moveFocus(key === 'ArrowUp' ? 'up' : 'down', false);
        return { consumed: true };

      default:
        return { consumed: false }; // 允许字符输入
    }
  }

  /** 检查单元格是否可编辑 */
  private isEditable(colDef: any, rowIndex: number): boolean {
    if (!colDef) return false;
    if (colDef.editable === false) return false;
    if (typeof colDef.editable === 'function') {
      return colDef.editable({
        rowIndex,
        colDef,
        column: colDef,
      });
    }
    return !!colDef.editable;
  }

  /** 获取单元格值 */
  private getCellValue(rowIndex: number, colId: string): any {
    if (!this.rowRenderer) return null;
    return this.rowRenderer.getCellValue?.(rowIndex, colId);
  }

  /** 高亮焦点单元格 */
  private highlightFocusedCell(rowIndex: number, colId: string): void {
    // Highlighting is now handled by the component's applyFocusHighlight(),
    // which is called at the end of renderRows() (after DOM is updated).
    // This method is kept as a no-op for API compatibility.
  }

  // ========== 行高（用于 Page 计算）==========
  private rowHeight = 30;
  setRowHeight(height: number): void {
    this.rowHeight = height;
  }

  // ========== 销毁 ==========
  destroy(): void {
    this.onFocusChange.complete();
    this.onCellEditStart.complete();
    this.onCellEditStop.complete();
    this.onEnterKey.complete();
    this.onEscapeKey.complete();
  }
}