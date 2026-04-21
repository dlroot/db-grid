/**
 * Keyboard Navigation Service
 * 完整键盘操作支持：Tab / Enter / Arrow / Escape / 编辑快捷键
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

  /** 当前焦点单元格 */
  private _focusedRowIndex = -1;
  private _focusedColId = '';

  /** 焦点列索引缓存 */
  private _colIdToIndexCache: Map<string, number> = new Map();
  private _indexToColIdCache: Map<number, string> = new Map();

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
    rowRenderer: any
  ): void {
    this.gridApi = gridApi;
    this.gridElement = gridElement;
    this.columnService = columnService;
    this.rowRenderer = rowRenderer;
    this.refreshColumnCache();
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
      this.gridApi?.ensureIndexVisible(rowIndex, 'middle');
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
        return this.moveFocus('up', shift);

      case 'ArrowDown':
        return this.moveFocus('down', shift);

      case 'ArrowLeft':
        return this.moveFocus('left', shift);

      case 'ArrowRight':
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

      default:
        return { consumed: false };
    }
  }

  // ========== 内部方法 ==========

  /** 移动焦点 */
  private moveFocus(
    direction: 'up' | 'down' | 'left' | 'right' | 'next' | 'prev',
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
    }

    // 边界检查
    const maxRow = (this.gridApi?.getDisplayedRowCount() ?? 1) - 1;
    rowIndex = Math.max(0, Math.min(rowIndex, maxRow));

    if (rowIndex === current.rowIndex && colId === current.colId) {
      return { consumed: false };
    }

    this.setFocusedCell(rowIndex, colId);
    return { consumed: true };
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

    const firstColId = this._indexToColIdCache.get(0) || '';
    this.setFocusedCell(ctrl ? 0 : current.rowIndex, firstColId);
    return { consumed: true };
  }

  private handleEndKey(ctrl: boolean, shift: boolean): KeyEventResult {
    const current = this.getFocusedCell();
    if (!current) return { consumed: false };

    const maxRow = (this.gridApi?.getDisplayedRowCount() ?? 1) - 1;
    const lastColId = this._indexToColIdCache.get(this._indexToColIdCache.size - 1) || '';
    this.setFocusedCell(ctrl ? maxRow : current.rowIndex, lastColId);
    return { consumed: true };
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
    if (!this.gridElement) return;

    // 移除旧高亮
    this.gridElement.querySelectorAll('.db-grid-cell-focused').forEach(el => {
      el.classList.remove('db-grid-cell-focused');
    });

    // 添加新高亮
    const selector = `.db-grid-row[data-row-index="${rowIndex}"] .db-grid-cell[data-col-id="${colId}"]`;
    this.gridElement.querySelector(selector)?.classList.add('db-grid-cell-focused');
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