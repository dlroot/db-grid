/**
 * Grid State Service
 * 统一的状态持久化服务，实现 getState()/setState() API
 * 参考 ag-Grid 企业版的状态管理
 */

import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { GridState, StatePersistenceConfig, DEFAULT_STATE_CONFIG } from '../models';
import { ColumnState } from './column.service';
import { SortModelItem, FilterModel } from '../models';

/**
 * Grid State Service
 * 负责聚合和持久化所有网格状态
 */
@Injectable()
export class GridStateService implements OnDestroy {

  private readonly destroy$ = new Subject<void>();
  private config: StatePersistenceConfig = { ...DEFAULT_STATE_CONFIG };
  private autoSaveEnabled = false;

  // 依赖的服务（通过 setter 注入，避免循环依赖）
  private columnService: any = null;
  private dataService: any = null;
  private filterService: any = null;
  private groupService: any = null;
  private selectionService: any = null;
  private sidebarService: any = null;
  private pivotService: any = null;
  private advancedFilterService: any = null;
  private undoRedoService: any = null;

  /**
   * 配置状态持久化
   */
  configure(config: Partial<StatePersistenceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 设置依赖服务（避免循环依赖）
   */
  setServices(services: {
    columnService?: any;
    dataService?: any;
    filterService?: any;
    groupService?: any;
    selectionService?: any;
    sidebarService?: any;
    pivotService?: any;
    advancedFilterService?: any;
    undoRedoService?: any;
  }): void {
    if (services.columnService) this.columnService = services.columnService;
    if (services.dataService) this.dataService = services.dataService;
    if (services.filterService) this.filterService = services.filterService;
    if (services.groupService) this.groupService = services.groupService;
    if (services.selectionService) this.selectionService = services.selectionService;
    if (services.sidebarService) this.sidebarService = services.sidebarService;
    if (services.pivotService) this.pivotService = services.pivotService;
    if (services.advancedFilterService) this.advancedFilterService = services.advancedFilterService;
    if (services.undoRedoService) this.undoRedoService = services.undoRedoService;
  }

  /**
   * 获取完整网格状态
   * 参考 ag-Grid 的 api.getState()
   */
  getState(): GridState {
    const state: GridState = {
      columnStates: this.getColumnStates(),
      columnOrder: this.getColumnOrder(),
      sortModel: this.getSortModel(),
      filterModel: this.getFilterModel(),
      advancedFilterModel: this.getAdvancedFilterModel(),
      groupState: this.getGroupState(),
      selectionState: this.getSelectionState(),
      expandedRows: this.getExpandedRows(),
      version: this.config.version,
      timestamp: Date.now(),
    };

    // 可选状态
    const sidebarState = this.getSidebarState();
    if (sidebarState) state.sidebarState = sidebarState;

    const pivotState = this.getPivotState();
    if (pivotState) state.pivotState = pivotState;

    const rangeState = this.getRangeSelectionState();
    if (rangeState) state.rangeSelectionState = rangeState;

    return state;
  }

  /**
   * 恢复完整网格状态
   * 参考 ag-Grid 的 api.setState()
   */
  setState(state: GridState): void {
    if (!state) return;

    // 按依赖顺序恢复状态
    
    // 1. 列状态和顺序（最基础）
    if (state.columnOrder) this.setColumnOrder(state.columnOrder);
    if (state.columnStates) this.setColumnStates(state.columnStates);

    // 2. 分组（需要在排序和过滤之前）
    if (state.groupState) this.setGroupState(state.groupState);

    // 3. 排序
    if (state.sortModel) this.setSortModel(state.sortModel);

    // 4. 过滤（包括高级过滤）
    if (state.filterModel) this.setFilterModel(state.filterModel);
    if (state.advancedFilterModel) this.setAdvancedFilterModel(state.advancedFilterModel);

    // 5. 选中状态
    if (state.selectionState) this.setSelectionState(state.selectionState);

    // 6. 展开状态
    if (state.expandedRows) this.setExpandedRows(state.expandedRows);

    // 7. 可选状态
    if (state.sidebarState) this.setSidebarState(state.sidebarState);
    if (state.pivotState) this.setPivotState(state.pivotState);
    if (state.rangeSelectionState) this.setRangeSelectionState(state.rangeSelectionState);
  }

  /**
   * 保存到 localStorage
   */
  saveStateToLocalStorage(key?: string): void {
    const storageKey = key || this.config.storageKey;
    const state = this.getState();
    try {
      const stateJson = JSON.stringify(state);
      localStorage.setItem(storageKey, stateJson);
    } catch (e) {
      console.error('[GridStateService] Failed to save state to localStorage:', e);
    }
  }

  /**
   * 从 localStorage 恢复
   * @returns 是否成功恢复
   */
  loadStateFromLocalStorage(key?: string): boolean {
    const storageKey = key || this.config.storageKey;
    try {
      const stateJson = localStorage.getItem(storageKey);
      if (!stateJson) return false;

      const state: GridState = JSON.parse(stateJson);

      // 检查版本兼容性
      if (state.version && this.config.version && state.version !== this.config.version) {
        console.warn(`[GridStateService] State version mismatch: saved=${state.version}, current=${this.config.version}`);
        // 可以选择迁移或忽略
      }

      this.setState(state);
      return true;
    } catch (e) {
      console.error('[GridStateService] Failed to load state from localStorage:', e);
      return false;
    }
  }

  /**
   * 清除保存的状态
   */
  clearStateFromLocalStorage(key?: string): void {
    const storageKey = key || this.config.storageKey;
    localStorage.removeItem(storageKey);
  }

  /**
   * 保存为命名状态预设
   */
  saveAsPreset(name: string): void {
    const state = this.getState();
    const presets = this.getPresets();
    presets[name] = state;
    try {
      localStorage.setItem(`${this.config.storageKey}-presets`, JSON.stringify(presets));
    } catch (e) {
      console.error('[GridStateService] Failed to save preset:', e);
    }
  }

  /**
   * 加载命名状态预设
   */
  loadPreset(name: string): boolean {
    const presets = this.getPresets();
    const state = presets[name];
    if (!state) return false;
    this.setState(state);
    return true;
  }

  /**
   * 获取所有保存的预设
   */
  getPresetNames(): string[] {
    return Object.keys(this.getPresets());
  }

  /**
   * 删除命名预设
   */
  deletePreset(name: string): void {
    const presets = this.getPresets();
    delete presets[name];
    try {
      localStorage.setItem(`${this.config.storageKey}-presets`, JSON.stringify(presets));
    } catch (e) {
      console.error('[GridStateService] Failed to delete preset:', e);
    }
  }

  // ============ 私有方法：获取各服务状态 ============

  private getColumnStates(): ColumnState[] {
    if (!this.columnService) return [];
    // columnService 有 columnStates Map
    const states: ColumnState[] = [];
    this.columnService['columnStates']?.forEach((state: ColumnState) => {
      states.push({ ...state });
    });
    return states;
  }

  private getColumnOrder(): string[] {
    if (!this.columnService) return [];
    const visibleCols = this.columnService.getVisibleColumns();
    return visibleCols.map((col: any) => this.columnService.getColId(col));
  }

  private getSortModel(): SortModelItem[] {
    if (!this.dataService) return [];
    return this.dataService.getSortModel() || [];
  }

  private getFilterModel(): FilterModel {
    if (!this.filterService) return {};
    return this.filterService.getFilterModel() || {};
  }

  private getAdvancedFilterModel(): any | null {
    if (!this.advancedFilterService) return null;
    return this.advancedFilterService.getAdvancedFilterModel?.() || null;
  }

  private getGroupState(): string[] {
    if (!this.groupService) return [];
    return this.groupService.getGroupState() || [];
  }

  private getSelectionState(): string[] {
    if (!this.selectionService) return [];
    const selectedNodes = this.selectionService.getSelectedNodes();
    return selectedNodes.map((node: any) => node.id).filter((id: any) => id != null);
  }

  private getExpandedRows(): string[] {
    // 从 groupService 或 masterDetailService 获取
    if (!this.groupService) return [];
    return this.groupService.getExpandedRows?.() || [];
  }

  private getSidebarState(): any | null {
    if (!this.sidebarService) return null;
    return this.sidebarService.getSidebarState?.() || null;
  }

  private getPivotState(): any | null {
    if (!this.pivotService) return null;
    return this.pivotService.getPivotState?.() || null;
  }

  private getRangeSelectionState(): any[] | null {
    // 从 rangeSelectionService 获取
    return null; // 待实现
  }

  // ============ 私有方法：设置各服务状态 ============

  private setColumnStates(states: ColumnState[]): void {
    if (!this.columnService) return;
    states.forEach(state => {
      this.columnService['columnStates']?.set(state.colId, { ...state });
    });
    // 触发列状态更新
    this.columnService['onColumnStateChanged']?.();
  }

  private setColumnOrder(colIds: string[]): void {
    if (!this.columnService) return;
    // 通过重新排列 columnDefs 来实现
    this.columnService.reorderColumns?.(colIds);
  }

  private setSortModel(model: SortModelItem[]): void {
    if (!this.dataService) return;
    this.dataService.setSortModel(model);
  }

  private setFilterModel(model: FilterModel): void {
    if (!this.filterService) return;
    this.filterService.setFilterModel(model);
  }

  private setAdvancedFilterModel(model: any): void {
    if (!this.advancedFilterService) return;
    this.advancedFilterService.setAdvancedFilterModel?.(model);
  }

  private setGroupState(groups: string[]): void {
    if (!this.groupService) return;
    this.groupService.setGroupState?.(groups);
  }

  private setSelectionState(rowIds: string[]): void {
    if (!this.selectionService) return;
    // 先清空选择
    this.selectionService.deselectAll();
    // 选中指定行
    rowIds.forEach(id => {
      const node = this.selectionService.getRowNode?.(id);
      if (node) this.selectionService.selectNode(node);
    });
  }

  private setExpandedRows(rowIds: string[]): void {
    if (!this.groupService) return;
    this.groupService.setExpandedRows?.(rowIds);
  }

  private setSidebarState(state: any): void {
    if (!this.sidebarService) return;
    this.sidebarService.setSidebarState?.(state);
  }

  private setPivotState(state: any): void {
    if (!this.pivotService) return;
    this.pivotService.setPivotState?.(state);
  }

  private setRangeSelectionState(state: any[]): void {
    // 待实现
  }

  // ============ 辅助方法 ============

  private getPresets(): Record<string, GridState> {
    try {
      const presetsJson = localStorage.getItem(`${this.config.storageKey}-presets`);
      return presetsJson ? JSON.parse(presetsJson) : {};
    } catch {
      return {};
    }
  }

  /**
   * 启用自动保存（监听网格事件）
   */
  enableAutoSave(gridApi: any): void {
    if (this.autoSaveEnabled || !gridApi) return;
    this.autoSaveEnabled = true;

    const events = this.config.saveEvents || [];
    events.forEach(eventName => {
      gridApi.addEventListener?.(eventName, () => {
        this.saveStateToLocalStorage();
      });
    });
  }

  /**
   * 禁用自动保存
   */
  disableAutoSave(): void {
    this.autoSaveEnabled = false;
    // 移除事件监听（需要保存引用，这里简化）
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
