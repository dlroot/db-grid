/**
 * Row Pinning Service
 * 行固定服务 — 支持将行固定到顶部/底部
 *
 * Features:
 *   - pinRow(pinIndex, rowData, position) — 固定行到顶部或底部
 *   - unpinRow(pinIndex) — 取消固定
 *   - unpinAll() — 取消所有固定
 *   - getPinnedTopRows() / getPinnedBottomRows() — 获取固定行
 *   - 与筛选/排序联动：固定行始终显示在筛选/排序后的数据之上/之下
 */

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface PinnedRowConfig {
  /** 顶部固定行数据（数组索引对应固定位置） */
  pinnedTopRowData?: any[];
  /** 底部固定行数据 */
  pinnedBottomRowData?: any[];
}

export interface PinnedRowEntry {
  pinIndex: number;
  data: any;
  position: 'top' | 'bottom';
}

@Injectable()
export class RowPinningService {
  /** 顶部固定行 */
  private pinnedTopRows: Map<number, PinnedRowEntry> = new Map();
  /** 底部固定行 */
  private pinnedBottomRows: Map<number, PinnedRowEntry> = new Map();

  /** 变更事件 */
  private onPinnedRowsChanged$ = new Subject<void>();

  constructor() {}

  // ========== 初始化 ==========

  /**
   * 从配置初始化固定行
   */
  initialize(config?: PinnedRowConfig): void {
    this.pinnedTopRows.clear();
    this.pinnedBottomRows.clear();

    if (config?.pinnedTopRowData) {
      config.pinnedTopRowData.forEach((data, index) => {
        this.pinnedTopRows.set(index, { pinIndex: index, data, position: 'top' });
      });
    }

    if (config?.pinnedBottomRowData) {
      config.pinnedBottomRowData.forEach((data, index) => {
        this.pinnedBottomRows.set(index, { pinIndex: index, data, position: 'bottom' });
      });
    }
  }

  // ========== 公共 API ==========

  /**
   * 固定行到指定位置
   */
  pinRow(pinIndex: number, data: any, position: 'top' | 'bottom' = 'top'): void {
    const targetMap = position === 'top' ? this.pinnedTopRows : this.pinnedBottomRows;
    targetMap.set(pinIndex, { pinIndex, data, position });
    this.onPinnedRowsChanged$.next();
  }

  /**
   * 取消固定行
   */
  unpinRow(pinIndex: number, position?: 'top' | 'bottom'): boolean {
    if (position) {
      const targetMap = position === 'top' ? this.pinnedTopRows : this.pinnedBottomRows;
      const result = targetMap.delete(pinIndex);
      if (result) this.onPinnedRowsChanged$.next();
      return result;
    }

    // 尝试两边都删除
    const fromTop = this.pinnedTopRows.delete(pinIndex);
    const fromBottom = this.pinnedBottomRows.delete(pinIndex);
    const result = fromTop || fromBottom;
    if (result) this.onPinnedRowsChanged$.next();
    return result;
  }

  /**
   * 取消所有固定行
   */
  unpinAll(position?: 'top' | 'bottom'): void {
    if (position === 'top') {
      this.pinnedTopRows.clear();
    } else if (position === 'bottom') {
      this.pinnedBottomRows.clear();
    } else {
      this.pinnedTopRows.clear();
      this.pinnedBottomRows.clear();
    }
    this.onPinnedRowsChanged$.next();
  }

  /**
   * 获取顶部固定行数据（按 pinIndex 排序）
   */
  getPinnedTopRows(): PinnedRowEntry[] {
    return Array.from(this.pinnedTopRows.values()).sort((a, b) => a.pinIndex - b.pinIndex);
  }

  /**
   * 获取底部固定行数据（按 pinIndex 排序）
   */
  getPinnedBottomRows(): PinnedRowEntry[] {
    return Array.from(this.pinnedBottomRows.values()).sort((a, b) => a.pinIndex - b.pinIndex);
  }

  /**
   * 获取顶部固定行原始数据
   */
  getPinnedTopRowData(): any[] {
    return this.getPinnedTopRows().map(entry => entry.data);
  }

  /**
   * 获取底部固定行原始数据
   */
  getPinnedBottomRowData(): any[] {
    return this.getPinnedBottomRows().map(entry => entry.data);
  }

  /**
   * 判断是否有固定行
   */
  hasPinnedRows(): boolean {
    return this.pinnedTopRows.size > 0 || this.pinnedBottomRows.size > 0;
  }

  /**
   * 判断某行是否已固定
   */
  isPinned(pinIndex: number, position?: 'top' | 'bottom'): boolean {
    if (position === 'top') return this.pinnedTopRows.has(pinIndex);
    if (position === 'bottom') return this.pinnedBottomRows.has(pinIndex);
    return this.pinnedTopRows.has(pinIndex) || this.pinnedBottomRows.has(pinIndex);
  }

  /**
   * 获取固定行总数
   */
  getPinnedRowCount(position?: 'top' | 'bottom'): number {
    if (position === 'top') return this.pinnedTopRows.size;
    if (position === 'bottom') return this.pinnedBottomRows.size;
    return this.pinnedTopRows.size + this.pinnedBottomRows.size;
  }

  /**
   * 更新固定行数据
   */
  updatePinnedRowData(pinIndex: number, newData: any, position?: 'top' | 'bottom'): boolean {
    // 先尝试查找
    let entry = this.pinnedTopRows.get(pinIndex);
    let pos: 'top' | 'bottom' = 'top';

    if (!entry) {
      entry = this.pinnedBottomRows.get(pinIndex);
      pos = 'bottom';
    }

    if (!entry) return false;

    if (position && position !== pos) {
      // 位置变了，需要移动
      this.unpinRow(pinIndex);
      this.pinRow(pinIndex, newData, position);
    } else {
      entry.data = newData;
    }

    this.onPinnedRowsChanged$.next();
    return true;
  }

  /**
   * 监听固定行变更
   */
  onPinnedRowsChanged(callback: () => void): void {
    this.onPinnedRowsChanged$.subscribe(callback);
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.onPinnedRowsChanged$.complete();
  }
}
