/**
 * 服务端行模型服务 — 支持异步数据源、分页加载、无限滚动
 * AG Grid 对应功能：Server-Side Row Model / Infinite Scroll
 */
import { Injectable } from '@angular/core';
import { ColDef, SortModelItem } from '../models';

// ============ 数据源接口 ============

/** 服务端数据源 — 用户实现此接口提供异步数据 */
export interface IServerSideDatasource {
  getRows(params: IServerSideGetRowsParams): void;
}

/** 数据请求参数 */
export interface IServerSideGetRowsParams {
  /** 请求起始行索引 */
  startRow: number;
  /** 请求结束行索引 */
  endRow: number;
  /** 排序模型 */
  sortModel: SortModelItem[];
  /** 筛选模型 */
  filterModel: Record<string, any>;
  /** 请求上下文 */
  context?: any;
  /** 成功回调 */
  successCallback(rowsThisPage: any[], lastRow?: number): void;
  /** 失败回调 */
  failCallback(): void;
}

// ============ 配置 ============

export interface ServerSideConfig {
  /** 行模型类型：serverSide（全功能）或 infinite（无限滚动） */
  rowModelType?: 'serverSide' | 'infinite';
  /** 每页行数（默认 100） */
  pageSize?: number;
  /** 缓存块大小（默认等于 pageSize） */
  cacheBlockSize?: number;
  /** 最大缓存块数（默认 10） */
  maxBlocksInCache?: number;
  /** 预取行数（默认 pageSize / 2） */
  maxConcurrentRequests?: number;
  /** 初始行数（未知时传 -1） */
  rowCount?: number;
  /** 是否无限滚动模式 */
  infinite?: boolean;
}

// ============ 缓存块 ============

interface CacheBlock {
  startRow: number;
  endRow: number;
  rows: any[];
  lastRow: number | null;  // 该块是否包含最后一行
  status: 'loading' | 'loaded' | 'failed';
  timestamp: number;
}

// ============ 服务 ============

@Injectable()
export class ServerSideService {
  private enabled = false;
  private config: ServerSideConfig = {
    rowModelType: 'serverSide',
    pageSize: 100,
    cacheBlockSize: 100,
    maxBlocksInCache: 10,
    maxConcurrentRequests: 2,
    rowCount: -1,
  };
  private datasource: IServerSideDatasource | null = null;

  // 数据缓存
  private cache: Map<number, CacheBlock> = new Map();  // key = blockNumber
  private allRows: any[] = [];       // 已加载的行数据
  private rowCount = -1;             // 总行数（-1 = 未知）
  private lastRowKnown = false;

  // 请求状态
  private pendingRequests: Set<number> = new Set();
  private sortModel: SortModelItem[] = [];
  private filterModel: Record<string, any> = {};

  // 回调
  private onRowsUpdated: (() => void) | null = null;
  private onLoadingChanged: ((loading: boolean) => void) | null = null;
  private onError: ((message: string) => void) | null = null;

  /** 初始化 */
  initialize(config: ServerSideConfig = {}): void {
    this.config = { ...this.config, ...config };
    if (this.config.infinite) {
      this.config.rowModelType = 'infinite';
    }
    this.pageSize = this.config.pageSize ?? 100;
    this.cacheBlockSize = this.config.cacheBlockSize ?? this.pageSize;
    this.enabled = true;
    this.clearCache();
  }

  private pageSize: number = 100;
  private cacheBlockSize: number = 100;

  /** 设置数据源 */
  setDatasource(datasource: IServerSideDatasource): void {
    this.datasource = datasource;
    this.clearCache();
    this.requestInitialRows();
  }

  /** 是否启用 */
  isEnabled(): boolean { return this.enabled; }

  /** 获取配置 */
  getConfig(): ServerSideConfig { return { ...this.config }; }

  /** 获取行模型类型 */
  getRowModelType(): 'serverSide' | 'infinite' {
    return this.config.rowModelType ?? 'serverSide';
  }

  // ============ 数据获取 ============

  /** 获取已加载的行 */
  getRows(): any[] {
    return this.allRows;
  }

  /** 获取指定范围的行 */
  getRowsInRange(startRow: number, endRow: number): any[] {
    return this.allRows.slice(startRow, Math.min(endRow, this.allRows.length));
  }

  /** 获取行数（已知） */
  getRowCount(): number {
    if (this.rowCount >= 0) return this.rowCount;
    return this.allRows.length;
  }

  /** 获取总行数（含未知） */
  getTotalRowCount(): number {
    return this.rowCount >= 0 ? this.rowCount : this.allRows.length;
  }

  /** 是否知道最后一行 */
  isLastRowKnown(): boolean {
    return this.lastRowKnown;
  }

  /** 获取指定行 */
  getRow(index: number): any | null {
    if (index >= 0 && index < this.allRows.length) {
      return this.allRows[index];
    }
    return null;
  }

  /** 获取虚拟高度 */
  getTotalHeight(rowHeight: number): number {
    const count = this.getRowCount();
    return count >= 0 ? count * rowHeight : (this.allRows.length + this.pageSize) * rowHeight;
  }

  // ============ 数据请求 ============

  /** 请求初始数据 */
  private requestInitialRows(): void {
    this.requestRows(0, this.cacheBlockSize);
  }

  /** 请求指定范围的数据 */
  requestRows(startRow: number, endRow: number): void {
    if (!this.datasource) return;

    const startBlock = Math.floor(startRow / this.cacheBlockSize);
    const endBlock = Math.floor((endRow - 1) / this.cacheBlockSize);

    for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
      if (this.cache.has(blockNum) && this.cache.get(blockNum)!.status === 'loaded') {
        continue; // 已缓存
      }
      if (this.pendingRequests.has(blockNum)) {
        continue; // 正在请求
      }
      this.fetchBlock(blockNum);
    }
  }

  /** 请求指定块 */
  private fetchBlock(blockNum: number): void {
    if (!this.datasource) return;

    const startRow = blockNum * this.cacheBlockSize;
    const endRow = startRow + this.cacheBlockSize;

    // 创建缓存块
    const block: CacheBlock = {
      startRow,
      endRow,
      rows: [],
      lastRow: null,
      status: 'loading',
      timestamp: Date.now(),
    };
    this.cache.set(blockNum, block);
    this.pendingRequests.add(blockNum);
    this.emitLoadingChanged(true);

    // 调用数据源
    this.datasource.getRows({
      startRow,
      endRow,
      sortModel: this.sortModel,
      filterModel: this.filterModel,
      successCallback: (rowsThisPage: any[], lastRow?: number) => {
        this.onBlockLoaded(blockNum, rowsThisPage, lastRow);
      },
      failCallback: () => {
        this.onBlockFailed(blockNum);
      },
    });
  }

  /** 块加载成功 */
  private onBlockLoaded(blockNum: number, rows: any[], lastRow?: number): void {
    const block = this.cache.get(blockNum);
    if (!block) return;

    block.rows = rows;
    block.status = 'loaded';
    block.timestamp = Date.now();

    this.pendingRequests.delete(blockNum);

    // 处理 lastRow
    if (lastRow !== undefined && lastRow >= 0) {
      this.rowCount = lastRow;
      this.lastRowKnown = true;
    } else if (rows.length < this.cacheBlockSize) {
      // 返回行数不足 = 最后一页
      this.rowCount = block.startRow + rows.length;
      this.lastRowKnown = true;
      block.lastRow = this.rowCount;
    }

    // 合并到 allRows
    this.mergeBlockToRows(blockNum);

    // 清理超出 maxBlocksInCache 的旧块
    this.evictOldBlocks();

    this.emitLoadingChanged(this.pendingRequests.size > 0);
    this.emitRowsUpdated();
  }

  /** 块加载失败 */
  private onBlockFailed(blockNum: number): void {
    const block = this.cache.get(blockNum);
    if (block) {
      block.status = 'failed';
    }
    this.pendingRequests.delete(blockNum);
    this.emitLoadingChanged(false);
    this.emitError(`Failed to load block ${blockNum}`);
  }

  /** 将缓存块合并到 allRows */
  private mergeBlockToRows(blockNum: number): void {
    const block = this.cache.get(blockNum);
    if (!block || block.status !== 'loaded') return;

    const startIdx = block.startRow;
    const rows = block.rows;

    // 扩展 allRows 数组
    while (this.allRows.length < startIdx + rows.length) {
      this.allRows.push(null); // 占位
    }

    // 填充数据
    rows.forEach((row, i) => {
      this.allRows[startIdx + i] = row;
    });

    // 清除末尾 null 占位（如果已知总行数）
    if (this.rowCount >= 0 && this.allRows.length > this.rowCount) {
      this.allRows.length = this.rowCount;
    }
  }

  /** 驱逐超出缓存的旧块 */
  private evictOldBlocks(): void {
    const maxBlocks = this.config.maxBlocksInCache ?? 10;
    if (this.cache.size <= maxBlocks) return;

    // 按 blockNum 排序，移除最旧的
    const blocks = Array.from(this.cache.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp);

    while (blocks.length > maxBlocks) {
      const oldest = blocks.pop()!;
      // 不移除正在加载的块
      if (oldest[1].status !== 'loading') {
        this.cache.delete(oldest[0]);
      }
    }
  }

  // ============ 排序/筛选（触发重新请求） ============

  /** 设置排序模型 */
  setSortModel(sortModel: SortModelItem[]): void {
    this.sortModel = sortModel;
    this.purgeAndReload();
  }

  /** 设置筛选模型 */
  setFilterModel(filterModel: Record<string, any>): void {
    this.filterModel = filterModel;
    this.purgeAndReload();
  }

  /** 清空缓存并重新加载 */
  private purgeAndReload(): void {
    this.clearCache();
    this.requestInitialRows();
  }

  // ============ 滚动触发加载 ============

  /** 滚动时调用 — 检查是否需要加载新块 */
  onScroll(scrollTop: number, viewportHeight: number, rowHeight: number): void {
    if (!this.enabled || !this.datasource) return;

    const firstVisibleRow = Math.floor(scrollTop / rowHeight);
    const lastVisibleRow = Math.ceil((scrollTop + viewportHeight) / rowHeight);

    // 预取：提前加载前后各半页
    const prefetchStart = Math.max(0, firstVisibleRow - Math.floor(this.pageSize / 2));
    const prefetchEnd = lastVisibleRow + Math.floor(this.pageSize / 2);

    this.requestRows(prefetchStart, prefetchEnd);
  }

  // ============ 手动操作 ============

  /** 刷新所有数据 */
  refresh(): void {
    this.purgeAndReload();
  }

  /** 刷新指定块 */
  refreshBlock(blockNum: number): void {
    this.cache.delete(blockNum);
    this.pendingRequests.delete(blockNum);
    this.fetchBlock(blockNum);
  }

  /** 清空缓存 */
  clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    this.allRows = [];
    this.rowCount = this.config.rowCount ?? -1;
    this.lastRowKnown = this.rowCount >= 0;
  }

  // ============ 分页 API（serverSide 模式） ============

  /** 获取当前页号 */
  getCurrentPage(firstVisibleRow: number): number {
    return Math.floor(firstVisibleRow / this.pageSize);
  }

  /** 获取总页数 */
  getTotalPages(): number {
    if (this.rowCount < 0) return -1;
    return Math.ceil(this.rowCount / this.pageSize);
  }

  /** 跳转到指定页 */
  getPageRows(page: number): { startRow: number; endRow: number } {
    const startRow = page * this.pageSize;
    const endRow = startRow + this.pageSize;
    return { startRow, endRow };
  }

  // ============ 事件注册 ============

  onRowsUpdatedEvent(callback: () => void): void {
    this.onRowsUpdated = callback;
  }

  onLoadingChangedEvent(callback: (loading: boolean) => void): void {
    this.onLoadingChanged = callback;
  }

  onErrorEvent(callback: (message: string) => void): void {
    this.onError = callback;
  }

  private emitRowsUpdated(): void {
    if (this.onRowsUpdated) this.onRowsUpdated();
  }

  private emitLoadingChanged(loading: boolean): void {
    if (this.onLoadingChanged) this.onLoadingChanged(loading);
  }

  private emitError(message: string): void {
    if (this.onError) this.onError(message);
  }

  // ============ 状态查询 ============

  /** 是否正在加载 */
  isLoading(): boolean {
    return this.pendingRequests.size > 0;
  }

  /** 获取缓存块数量 */
  getCacheSize(): number {
    return this.cache.size;
  }

  /** 获取待请求数量 */
  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  /** 获取排序模型 */
  getSortModel(): SortModelItem[] {
    return [...this.sortModel];
  }

  /** 获取筛选模型 */
  getFilterModel(): Record<string, any> {
    return { ...this.filterModel };
  }

  // ============ 销毁 ============

  destroy(): void {
    this.clearCache();
    this.datasource = null;
    this.onRowsUpdated = null;
    this.onLoadingChanged = null;
    this.onError = null;
  }
}
