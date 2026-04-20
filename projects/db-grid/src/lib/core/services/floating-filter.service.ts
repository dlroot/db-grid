import { Injectable } from '@angular/core';
import { ColDef } from '../models';

/**
 * 浮动筛选服务 — 在表头下方显示简化的筛选输入框
 * AG Grid 对应功能：Floating Filters
 */
@Injectable({ providedIn: 'root' })
export class FloatingFilterService {
  private enabled = false;
  private height = 40;
  private filterModels: Map<string, FloatingFilterModel> = new Map();
  private columnDefs: ColDef[] = [];

  private onFilterChanged: ((model: Record<string, FloatingFilterModel>) => void) | null = null;

  /** 初始化 */
  initialize(columnDefs: ColDef[], config: FloatingFilterConfig = {}): void {
    this.enabled = config.enabled ?? false;
    this.height = config.height ?? 40;
    this.columnDefs = columnDefs;

    // 为每个筛选列创建浮动筛选模型
    this.filterModels.clear();
    for (const col of columnDefs) {
      if (col.filter && !col.hide) {
        const colId = col.field ?? col.colId ?? '';
        this.filterModels.set(colId, {
          colId,
          type: this.inferFilterType(col),
          value: null,
          active: false
        });
      }
    }
  }

  /** 是否启用 */
  isEnabled(): boolean { return this.enabled; }

  /** 启用 */
  enable(): void { this.enabled = true; }

  /** 禁用 */
  disable(): void {
    this.enabled = false;
    this.clearAll();
  }

  /** 获取浮动筛选行高度 */
  getHeight(): number { return this.height; }

  /** 设置浮动筛选值 */
  setFilterValue(colId: string, value: any): void {
    const model = this.filterModels.get(colId);
    if (model) {
      model.value = value;
      model.active = value !== null && value !== undefined && value !== '';
      this.emitFilterChanged();
    }
  }

  /** 获取浮动筛选值 */
  getFilterValue(colId: string): any {
    return this.filterModels.get(colId)?.value ?? null;
  }

  /** 获取所有浮动筛选模型 */
  getAllFilterModels(): Record<string, FloatingFilterModel> {
    const result: Record<string, FloatingFilterModel> = {};
    for (const [key, model] of this.filterModels) {
      result[key] = { ...model };
    }
    return result;
  }

  /** 清除某列的浮动筛选 */
  clearFilter(colId: string): void {
    const model = this.filterModels.get(colId);
    if (model) {
      model.value = null;
      model.active = false;
      this.emitFilterChanged();
    }
  }

  /** 清除所有浮动筛选 */
  clearAll(): void {
    for (const [, model] of this.filterModels) {
      model.value = null;
      model.active = false;
    }
    this.emitFilterChanged();
  }

  /** 判断列是否支持浮动筛选 */
  hasFloatingFilter(colId: string): boolean {
    return this.filterModels.has(colId);
  }

  /** 获取活跃筛选数 */
  getActiveFilterCount(): number {
    let count = 0;
    for (const [, model] of this.filterModels) {
      if (model.active) count++;
    }
    return count;
  }

  /** 从主筛选模型同步 */
  syncFromMainFilter(filterModel: Record<string, any>): void {
    for (const [colId, filter] of Object.entries(filterModel)) {
      const model = this.filterModels.get(colId);
      if (model) {
        model.value = filter.filter ?? filter.filterTo ?? null;
        model.active = model.value !== null && model.value !== undefined && model.value !== '';
      }
    }
  }

  /** 注册筛选变更回调 */
  onFilterChangedEvent(callback: (model: Record<string, FloatingFilterModel>) => void): void {
    this.onFilterChanged = callback;
  }

  private inferFilterType(col: ColDef): FloatingFilterType {
    if (typeof col.filter === 'string') {
      return col.filter as FloatingFilterType;
    }
    // 根据 cellType 推断
    const type = col.type;
    if (Array.isArray(type)) {
      if (type.includes('numeric')) return 'number';
      if (type.includes('date')) return 'date';
    }
    if (type === 'numericColumn') return 'number';
    if (type === 'dateColumn') return 'date';
    if (type === 'boolean') return 'boolean';
    return 'text';
  }

  private emitFilterChanged(): void {
    if (this.onFilterChanged) {
      this.onFilterChanged(this.getAllFilterModels());
    }
  }

  destroy(): void {
    this.filterModels.clear();
    this.onFilterChanged = null;
  }
}

/** 浮动筛选配置 */
export interface FloatingFilterConfig {
  enabled?: boolean;
  height?: number;
  alwaysShow?: boolean;
}

/** 浮动筛选模型 */
export interface FloatingFilterModel {
  colId: string;
  type: FloatingFilterType;
  value: any;
  active: boolean;
}

/** 浮动筛选类型 */
export type FloatingFilterType = 'text' | 'number' | 'date' | 'boolean' | 'set' | 'custom';
