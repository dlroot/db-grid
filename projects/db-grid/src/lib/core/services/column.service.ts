/**
 * 列服务
 * 管理列定义、列状态、列操作
 */

import { Injectable } from '@angular/core';
import { ColDef, ColGroupDef } from '../models';

export interface ColumnState {
  colId: string;
  width: number;
  hide: boolean;
  pinned: 'left' | 'right' | null;
  sort: 'asc' | 'desc' | null;
  sortIndex: number | null;
  filter: string | null;
  flex: number | null;
}

@Injectable()
export class ColumnService {
  /** 列定义列表 */
  private columnDefs: (ColDef | ColGroupDef)[] = [];

  /** 扁平化的列映射（包含所有叶子节点） */
  private columnsMap: Map<string, ColDef> = new Map();

  /** 可见列列表 */
  private visibleColumns: ColDef[] = [];

  /** 固定在左边的列 */
  private leftPinnedColumns: ColDef[] = [];

  /** 固定在右边的列 */
  private rightPinnedColumns: ColDef[] = [];

  /** 可滚动的列 */
  private scrollableColumns: ColDef[] = [];

  /** 列状态映射 */
  private columnStates: Map<string, ColumnState> = new Map();

  /** 默认列宽 */
  private defaultColWidth = 200;

  /** 最小列宽 */
  private minColWidth = 100;

  /** 初始化列定义 */
  initialize(colDefs: (ColDef | ColGroupDef)[]): void {
    this.columnDefs = colDefs || [];
    this.columnsMap.clear();

    // 扁平化列定义
    const flattened = this.flattenColumnDefs(this.columnDefs);

    // 初始化列状态
    flattened.forEach((col, index) => {
      const colId = this.getColId(col, index);
      this.columnsMap.set(colId, col);

      this.columnStates.set(colId, {
        colId,
        width: col.width || this.defaultColWidth,
        hide: col.hide || false,
        pinned: col.pinnedLeft ? 'left' : col.pinnedRight ? 'right' : null,
        sort: col.sort || null,
        sortIndex: col.sortIndex ?? null,
        filter: (col.filter as string) || null,
        flex: col.flex || null,
      });
    });

    this.updateColumnGroups();
  }

  /** 扁平化列定义（处理 ColGroupDef） */
  private flattenColumnDefs(colDefs: (ColDef | ColGroupDef)[], parent?: ColGroupDef): ColDef[] {
    const result: ColDef[] = [];

    for (const colDef of colDefs) {
      if ('children' in colDef) {
        // ColGroupDef - 递归处理子列
        const group = colDef as ColGroupDef;
        const children = this.flattenColumnDefs(group.children || [], group);
        result.push(...children);
      } else {
        // ColDef
        result.push(colDef as ColDef);
      }
    }

    return result;
  }

  /** 获取列ID */
  private getColId(colDef: ColDef, index: number): string {
    return colDef.colId || colDef.field || `col-${index}`;
  }

  /** 更新列分组 */
  private updateColumnGroups(): void {
    const allColumns = Array.from(this.columnsMap.values());

    // 左固定列
    this.leftPinnedColumns = allColumns
      .filter(col => this.getColumnState(col)?.pinned === 'left')
      .sort((a, b) => (a.pinnedLeftIndex ?? 0) - (b.pinnedLeftIndex ?? 0));

    // 右固定列
    this.rightPinnedColumns = allColumns
      .filter(col => this.getColumnState(col)?.pinned === 'right')
      .sort((a, b) => (a.pinnedRightIndex ?? 0) - (b.pinnedRightIndex ?? 0));

    // 可滚动列
    this.scrollableColumns = allColumns
      .filter(col => !this.getColumnState(col)?.pinned)
      .sort((a, b) => (a.colSpan ? 1 : 0) - (b.colSpan ? 1 : 0));

    // 所有可见列
    this.visibleColumns = [
      ...this.leftPinnedColumns,
      ...this.scrollableColumns,
      ...this.rightPinnedColumns,
    ].filter(col => !this.getColumnState(col)?.hide);
  }

  /** 获取列状态 */
  getColumnState(colDef: ColDef): ColumnState | undefined {
    const colId = this.getColId(colDef, -1);
    return this.columnStates.get(colId);
  }

  /** 获取所有列定义 */
  getColumnDefs(): (ColDef | ColGroupDef)[] {
    return this.columnDefs;
  }

  /** 获取列分组树结构（用于渲染分组表头）
   *  返回值中 ColGroupDef 表示分组（含 children），ColDef 表示叶子列
   */
  getColumnTree(): (ColDef | ColGroupDef)[] {
    return this.columnDefs;
  }

  /** 判断列定义是否有分组（至少一个 ColGroupDef） */
  hasColumnGroups(): boolean {
    return this.columnDefs.some(c => 'children' in c && (c as ColGroupDef).children?.length > 0);
  }

  /** 获取分组的最大深度（1=无分组，2=一级分组，3=二级嵌套...） */
  getGroupDepth(): number {
    return this.getDepth(this.columnDefs);
  }

  private getDepth(colDefs: (ColDef | ColGroupDef)[]): number {
    let max = 1;
    for (const col of colDefs) {
      if ('children' in col) {
        const children = (col as ColGroupDef).children || [];
        const childDepth = this.getDepth(children);
        max = Math.max(max, 1 + childDepth);
      }
    }
    return max;
  }

  /** 获取所有扁平化列 */
  getAllColumns(): ColDef[] {
    return Array.from(this.columnsMap.values());
  }

  /** 获取可见列 */
  getVisibleColumns(): ColDef[] {
    return this.visibleColumns;
  }

  /** 获取可见列中可滚动的（非 pinned）列 */
  getVisibleScrollableColumns(): ColDef[] {
    return this.visibleColumns.filter(col => {
      const state = this.getColumnState(col);
      return !state?.pinned;
    });
  }

  /** 列虚拟化：获取指定水平滚动范围内的可见列
   * @param scrollLeft 水平滚动偏移量（相对于可滚动区域）
   * @param viewportWidth 可视区域宽度
   * @param buffer 缓冲区额外列数（默认 2）
   * @returns { leftPinned, center, rightPinned, offsetX }
   */
  getVisibleColumnsInRange(
    scrollLeft: number,
    viewportWidth: number,
    buffer: number = 2
  ): { leftPinned: ColDef[]; center: ColDef[]; rightPinned: ColDef[]; offsetX: number; totalScrollableWidth: number } {
    const leftPinned = this.visibleColumns.filter(col => {
      const state = this.getColumnState(col);
      return state?.pinned === 'left';
    });

    const rightPinned = this.visibleColumns.filter(col => {
      const state = this.getColumnState(col);
      return state?.pinned === 'right';
    });

    // 可滚动的可见列
    const scrollable = this.visibleColumns.filter(col => {
      const state = this.getColumnState(col);
      return !state?.pinned;
    });

    // 计算每列的偏移量
    let accOffset = 0;
    const colOffsets: { col: ColDef; start: number; end: number }[] = [];
    for (const col of scrollable) {
      const state = this.getColumnState(col);
      const w = state?.width || this.defaultColWidth;
      colOffsets.push({ col, start: accOffset, end: accOffset + w });
      accOffset += w;
    }
    const totalScrollableWidth = accOffset;

    // 找出在视口范围内的列
    const viewStart = scrollLeft;
    const viewEnd = scrollLeft + viewportWidth;
    const centerInRange: ColDef[] = [];
    let firstVisibleStart = 0;

    let foundFirst = false;
    for (let i = 0; i < colOffsets.length; i++) {
      const { start, end, col } = colOffsets[i];
      // 列与视口有交集
      if (end > viewStart && start < viewEnd) {
        if (!foundFirst) {
          firstVisibleStart = start;
          foundFirst = true;
        }
        centerInRange.push(col);
      }
    }

    // 添加缓冲区
    const startIndex = centerInRange.length > 0
      ? scrollable.indexOf(centerInRange[0])
      : 0;
    const endIndex = centerInRange.length > 0
      ? scrollable.indexOf(centerInRange[centerInRange.length - 1])
      : -1;

    const bufStart = Math.max(0, startIndex - buffer);
    const bufEnd = Math.min(scrollable.length - 1, endIndex + buffer);

    const center = scrollable.slice(bufStart, bufEnd + 1);
    const offsetX = colOffsets[bufStart]?.start ?? 0;

    return { leftPinned, center, rightPinned, offsetX, totalScrollableWidth };
  }

  /** 获取左固定列 */
  getLeftPinnedColumns(): ColDef[] {
    return this.leftPinnedColumns;
  }

  /** 获取右固定列 */
  getRightPinnedColumns(): ColDef[] {
    return this.rightPinnedColumns;
  }

  /** 获取可滚动列 */
  getScrollableColumns(): ColDef[] {
    return this.scrollableColumns;
  }

  /** 根据字段名获取列 */
  getColumn(field: string): ColDef | undefined {
    return Array.from(this.columnsMap.values()).find(col => col.field === field);
  }

  /** 设置列宽 */
  setColumnWidth(colId: string, width: number): void {
    const state = this.columnStates.get(colId);
    if (state) {
      state.width = Math.max(width, this.minColWidth);
    }
  }

  /** 设置列隐藏 */
  setColumnHidden(colId: string, hide: boolean): void {
    const state = this.columnStates.get(colId);
    if (state) {
      state.hide = hide;
      this.updateColumnGroups();
    }
  }

  /** 设置列固定 */
  setColumnPinned(colId: string, pinned: 'left' | 'right' | null): void {
    const state = this.columnStates.get(colId);
    if (state) {
      state.pinned = pinned;
      this.updateColumnGroups();
    }
  }

  /** 设置排序列 */
  setColumnSort(colId: string, sort: 'asc' | 'desc' | null): void {
    const state = this.columnStates.get(colId);
    if (state) {
      state.sort = sort;
    }
  }

  /** 重置所有列状态 */
  resetColumnState(): void {
    this.columnStates.forEach((state, colId) => {
      const colDef = this.columnsMap.get(colId);
      if (colDef) {
        state.width = colDef.width || this.defaultColWidth;
        state.hide = colDef.hide || false;
        state.pinned = colDef.pinnedLeft ? 'left' : colDef.pinnedRight ? 'right' : null;
        state.sort = colDef.sort || null;
        state.sortIndex = colDef.sortIndex ?? null;
        state.filter = (colDef.filter as string) || null;
        state.flex = colDef.flex || null;
      }
    });
    this.updateColumnGroups();
  }

  /** 获取所有列状态 */
  getAllColumnState(): ColumnState[] {
    return Array.from(this.columnStates.values());
  }

  /** 应用列状态 */
  applyColumnState(states: ColumnState[]): void {
    states.forEach(state => {
      this.columnStates.set(state.colId, state);
    });
    this.updateColumnGroups();
  }

  /** 获取总列宽 */
  getTotalWidth(onlyVisible = true): number {
    const columns = onlyVisible ? this.visibleColumns : Array.from(this.columnsMap.values());
    return columns.reduce((total, col) => {
      const state = this.getColumnState(col);
      return total + (state?.width || this.defaultColWidth);
    }, 0);
  }

  /** 移动列 */
  moveColumn(fromIndex: number, toIndex: number): void {
    const columns = this.scrollableColumns;
    const column = columns.splice(fromIndex, 1)[0];
    if (column) {
      columns.splice(toIndex, 0, column);
      this.updateColumnGroups();
    }
  }

  /** 获取列在可见列表中的索引 */
  getVisibleIndex(colId: string): number {
    return this.visibleColumns.findIndex(col => {
      const c = col;
      return (c.colId || c.field) === colId;
    });
  }
}
