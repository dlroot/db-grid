import { Injectable } from '@angular/core';
import { ColDef } from '../models';

/**
 * 状态栏服务 — 底部状态面板显示选中行数、筛选数、总行数等
 * AG Grid 对应功能：Status Bar
 */
@Injectable({ providedIn: 'root' })
export class StatusBarService {
  private enabled = false;
  private panels: StatusPanelConfig[] = [];
  private state: StatusBarState = {
    totalRows: 0,
    filteredRows: 0,
    selectedRows: 0,
    currentPage: 0,
    totalPages: 0,
    activeFilters: 0,
    sortColumn: null,
    sortDirection: null
  };

  private onStateChanged: ((state: StatusBarState) => void) | null = null;

  /** 初始化 */
  initialize(config: StatusBarConfig = {}): void {
    this.enabled = config.enabled ?? false;
    this.panels = config.panels ?? [
      { key: 'totalAndFilteredRows', align: 'left' },
      { key: 'selectedRows', align: 'left' },
      { key: 'filterStatus', align: 'center' },
      { key: 'pageStatus', align: 'right' }
    ];
  }

  /** 是否启用 */
  isEnabled(): boolean { return this.enabled; }

  /** 启用 */
  enable(): void { this.enabled = true; }

  /** 禁用 */
  disable(): void { this.enabled = false; }

  /** 获取当前状态 */
  getState(): StatusBarState { return { ...this.state }; }

  /** 更新总行数 */
  setTotalRows(count: number): void {
    this.state.totalRows = count;
    this.emitState();
  }

  /** 更新筛选后行数 */
  setFilteredRows(count: number): void {
    this.state.filteredRows = count;
    this.emitState();
  }

  /** 更新选中行数 */
  setSelectedRows(count: number): void {
    this.state.selectedRows = count;
    this.emitState();
  }

  /** 更新分页信息 */
  setPageInfo(currentPage: number, totalPages: number): void {
    this.state.currentPage = currentPage;
    this.state.totalPages = totalPages;
    this.emitState();
  }

  /** 更新筛选数 */
  setActiveFilters(count: number): void {
    this.state.activeFilters = count;
    this.emitState();
  }

  /** 更新排序信息 */
  setSortInfo(column: string | null, direction: string | null): void {
    this.state.sortColumn = column;
    this.state.sortDirection = direction;
    this.emitState();
  }

  /** 批量更新状态 */
  updateState(partial: Partial<StatusBarState>): void {
    this.state = { ...this.state, ...partial };
    this.emitState();
  }

  /** 获取面板列表 */
  getPanels(): StatusPanelConfig[] { return [...this.panels]; }

  /** 获取格式化的状态文本 */
  getFormattedStatus(): Record<string, string> {
    const result: Record<string, string> = {};

    for (const panel of this.panels) {
      switch (panel.key) {
        case 'totalAndFilteredRows':
          if (this.state.filteredRows < this.state.totalRows) {
            result[panel.key] = `行: ${this.state.filteredRows} / ${this.state.totalRows}`;
          } else {
            result[panel.key] = `总行数: ${this.state.totalRows}`;
          }
          break;
        case 'selectedRows':
          result[panel.key] = `已选: ${this.state.selectedRows}`;
          break;
        case 'filterStatus':
          result[panel.key] = this.state.activeFilters > 0
            ? `筛选: ${this.state.activeFilters} 个活跃`
            : '无筛选';
          break;
        case 'pageStatus':
          if (this.state.totalPages > 1) {
            result[panel.key] = `第 ${this.state.currentPage + 1} / ${this.state.totalPages} 页`;
          } else {
            result[panel.key] = '';
          }
          break;
        case 'sortStatus':
          result[panel.key] = this.state.sortColumn
            ? `排序: ${this.state.sortColumn} ${this.state.sortDirection === 'asc' ? '↑' : '↓'}`
            : '';
          break;
        default:
          result[panel.key] = '';
      }
    }
    return result;
  }

  /** 注册状态变更回调 */
  onStateChangedEvent(callback: (state: StatusBarState) => void): void {
    this.onStateChanged = callback;
  }

  private emitState(): void {
    if (this.onStateChanged) this.onStateChanged({ ...this.state });
  }

  destroy(): void {
    this.onStateChanged = null;
  }
}

/** 状态栏配置 */
export interface StatusBarConfig {
  enabled?: boolean;
  panels?: StatusPanelConfig[];
}

/** 状态面板配置 */
export interface StatusPanelConfig {
  key: string;
  align: 'left' | 'center' | 'right';
  component?: any;
  label?: string;
}

/** 状态栏状态 */
export interface StatusBarState {
  totalRows: number;
  filteredRows: number;
  selectedRows: number;
  currentPage: number;
  totalPages: number;
  activeFilters: number;
  sortColumn: string | null;
  sortDirection: string | null;
}
