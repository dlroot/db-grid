/**
 * Viewport Row Model Service
 * 视口行模型 — 只渲染可见区域的行，类似 AG Grid 的 Viewport Row Model
 * 
 * 与 Infinite Row Model 的区别：
 * - Infinite: 滚动时动态加载更多数据
 * - Viewport: 固定缓存窗口，窗口滑动时复用已有数据
 */

import { Injectable } from '@angular/core';
import { RowNode, createEmptyRowNode } from '../models';

export interface ViewportDatasource {
  /** 获取视口数据 */
  getRows(params: ViewportDatasourceParams): void;
  /** 可选：销毁方法 */
  destroy?: () => void;
}

export interface ViewportDatasourceParams {
  /** 起始行索引 */
  startRow: number;
  /** 结束行索引 */
  endRow: number;
  /** 成功回调 */
  success: (rowData: any[]) => void;
  /** 失败回调 */
  fail?: (error: any) => void;
}

export interface ViewportConfig {
  /** 缓存行数（前后各缓存多少行） */
  cacheSize?: number;
  /** 是否启用虚拟滚动 */
  virtualScroll?: boolean;
  /** 视口高度（px） */
  viewportHeight?: number;
  /** 行高（px） */
  rowHeight?: number;
  /** 缓冲区行数 */
  bufferSize?: number;
  /** 总行数（已知时） */
  rowCount?: number;
}

@Injectable()
export class ViewportRowModelService {
  private enabled = false;
  private datasource: ViewportDatasource | null = null;
  private config: ViewportConfig = {
    cacheSize: 100,
    virtualScroll: true,
    viewportHeight: 400,
    rowHeight: 40,
    bufferSize: 5,
    rowCount: 0,
  };

  private rowCache: Map<number, any> = new Map();
  private loadedRanges: Range[] = [];
  private isLoading = false;
  private pendingRequests: ViewportDatasourceParams[] = [];

  private onViewportChanged: ((event: ViewportChangedEvent) => void) | null = null;
  private onRowsLoaded: ((event: RowsLoadedEvent) => void) | null = null;

  constructor() {}

  /** 初始化 */
  initialize(config: ViewportConfig = {}): void {
    this.config = {
      cacheSize: config.cacheSize ?? 100,
      virtualScroll: config.virtualScroll ?? true,
      viewportHeight: config.viewportHeight ?? 400,
      rowHeight: config.rowHeight ?? 40,
      bufferSize: config.bufferSize ?? 5,
      rowCount: config.rowCount ?? 0,
    };
    this.rowCache.clear();
    this.loadedRanges = [];
    this.enabled = true;
  }

  /** 设置数据源 */
  setDatasource(datasource: ViewportDatasource): void {
    this.datasource = datasource;
    this.rowCache.clear();
    this.loadedRanges = [];
  }

  /** 清除数据源 */
  clearDatasource(): void {
    if (this.datasource?.destroy) {
      this.datasource.destroy();
    }
    this.datasource = null;
    this.rowCache.clear();
    this.loadedRanges = [];
  }

  /** 是否启用 */
  isEnabled(): boolean {
    return this.enabled;
  }

  /** 是否虚拟滚动 */
  isVirtualScroll(): boolean {
    return this.config.virtualScroll;
  }

  /** 获取总行数 */
  getRowCount(): number {
    return this.config.rowCount;
  }

  /** 设置总行数 */
  setRowCount(count: number): void {
    this.config.rowCount = count;
  }

  /** 获取行高 */
  getRowHeight(): number {
    return this.config.rowHeight;
  }

  /** 设置行高 */
  setRowHeight(height: number): void {
    this.config.rowHeight = height;
  }

  /** 计算可见行范围 */
  getVisibleRange(scrollTop: number, viewportHeight: number): { startIndex: number; endIndex: number } {
    const rowHeight = this.config.rowHeight;
    const bufferSize = this.config.bufferSize;

    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - bufferSize);
    const visibleRows = Math.ceil(viewportHeight / rowHeight);
    const endIndex = Math.min(
      this.config.rowCount > 0 ? this.config.rowCount : startIndex + visibleRows + bufferSize * 2,
      startIndex + visibleRows + bufferSize * 2
    );

    return { startIndex, endIndex };
  }

  /** 获取行数据 */
  getRow(index: number): any | null {
    return this.rowCache.get(index) ?? null;
  }

  /** 获取多行数据 */
  getRows(startIndex: number, endIndex: number): any[] {
    const rows: any[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      rows.push(this.rowCache.get(i) ?? { id: i, __loading: true });
    }
    return rows;
  }

  /** 检查行是否已加载 */
  isRowLoaded(index: number): boolean {
    return this.rowCache.has(index);
  }

  /** 请求加载行数据 */
  requestRows(startIndex: number, endIndex: number): void {
    if (!this.datasource) return;
    if (this.isRangeLoaded(startIndex, endIndex)) return;

    const params: ViewportDatasourceParams = {
      startRow: startIndex,
      endRow: endIndex,
      success: (rowData) => this.onLoadSuccess(startIndex, rowData),
      fail: (error) => this.onLoadFail(error),
    };

    if (this.isLoading) {
      this.pendingRequests.push(params);
    } else {
      this.isLoading = true;
      this.datasource.getRows(params);
    }
  }

  /** 加载成功回调 */
  private onLoadSuccess(startIndex: number, rowData: any[]): void {
    this.isLoading = false;

    // 缓存数据
    rowData.forEach((data, i) => {
      this.rowCache.set(startIndex + i, data);
    });

    // 更新已加载范围
    this.loadedRanges.push({ start: startIndex, end: startIndex + rowData.length });

    // 合并重叠范围
    this.mergeLoadedRanges();

    // 触发事件
    if (this.onRowsLoaded) {
      this.onRowsLoaded({
        startIndex,
        endIndex: startIndex + rowData.length,
        rowCount: rowData.length,
      });
    }

    // 处理待处理的请求
    this.processPendingRequests();
  }

  /** 加载失败回调 */
  private onLoadFail(error: any): void {
    this.isLoading = false;
    console.error('[ViewportRowModel] Load failed:', error);
    this.processPendingRequests();
  }

  /** 处理待处理的请求 */
  private processPendingRequests(): void {
    if (this.pendingRequests.length > 0 && this.datasource) {
      const next = this.pendingRequests.shift()!;
      this.isLoading = true;
      this.datasource.getRows(next);
    }
  }

  /** 检查范围是否已加载 */
  private isRangeLoaded(startIndex: number, endIndex: number): boolean {
    return this.loadedRanges.some(
      (range) => range.start <= startIndex && range.end >= endIndex
    );
  }

  /** 合并重叠的已加载范围 */
  private mergeLoadedRanges(): void {
    if (this.loadedRanges.length <= 1) return;

    this.loadedRanges.sort((a, b) => a.start - b.start);
    const merged: Range[] = [this.loadedRanges[0]];

    for (let i = 1; i < this.loadedRanges.length; i++) {
      const last = merged[merged.length - 1];
      const current = this.loadedRanges[i];

      if (current.start <= last.end) {
        last.end = Math.max(last.end, current.end);
      } else {
        merged.push(current);
      }
    }

    this.loadedRanges = merged;
  }

  /** 获取已加载范围 */
  getLoadedRanges(): Range[] {
    return [...this.loadedRanges];
  }

  /** 获取缓存大小 */
  getCacheSize(): number {
    return this.config.cacheSize;
  }

  /** 清除缓存 */
  clearCache(): void {
    this.rowCache.clear();
    this.loadedRanges = [];
  }

  /** 刷新（重新加载当前视口数据） */
  refresh(startIndex: number, endIndex: number): void {
    if (!this.datasource) return;

    // 清除范围内的缓存
    for (let i = startIndex; i < endIndex; i++) {
      this.rowCache.delete(i);
    }

    // 重新请求
    this.requestRows(startIndex, endIndex);
  }

  /** 注册视口变化回调 */
  onViewportChangedEvent(callback: (event: ViewportChangedEvent) => void): void {
    this.onViewportChanged = callback;
  }

  /** 注册行加载完成回调 */
  onRowsLoadedEvent(callback: (event: RowsLoadedEvent) => void): void {
    this.onRowsLoaded = callback;
  }

  /** 销毁 */
  destroy(): void {
    this.clearDatasource();
    this.onViewportChanged = null;
    this.onRowsLoaded = null;
    this.pendingRequests = [];
  }
}

/** 已加载范围 */
interface Range {
  start: number;
  end: number;
}

/** 视口变化事件 */
export interface ViewportChangedEvent {
  type: 'viewportChanged';
  startIndex: number;
  endIndex: number;
  scrollTop: number;
  direction: 'up' | 'down';
}

/** 行加载完成事件 */
export interface RowsLoadedEvent {
  startIndex: number;
  endIndex: number;
  rowCount: number;
}