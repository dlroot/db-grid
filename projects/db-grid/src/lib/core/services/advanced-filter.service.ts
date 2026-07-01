/**
 * 高级筛选器服务
 * 支持 N 个条件的 AND/OR 嵌套组合、保存/加载筛选预设、筛选器间联动
 */

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import {
  FilterService,
  ColumnFilterModel,
  FilterModel,
  JoinOperator,
  TextFilterCondition,
  NumberFilterCondition,
  DateFilterCondition,
} from './filter.service';

// Re-export JoinOperator for convenience
export { JoinOperator } from './filter.service';
import { ColDef } from '../models';

// ─── 高级筛选条件（单个条件） ──────────────────────────────────────────────

export type AdvancedConditionType =
  | TextFilterCondition
  | NumberFilterCondition
  | DateFilterCondition
  | 'in' | 'notIn';

export interface AdvancedFilterCondition {
  /** 条件 ID */
  id: string;
  /** 列 ID */
  colId: string;
  /** 筛选器类型 */
  filterType: 'text' | 'number' | 'date' | 'set' | 'boolean';
  /** 条件类型（如 contains、greaterThan） */
  conditionType: AdvancedConditionType;
  /** 筛选值 1 */
  value?: any;
  /** 筛选值 2（用于 inRange 的 To 值） */
  valueTo?: any;
}

// ─── 高级筛选组（AND/OR 组合） ──────────────────────────────────────────────

export interface AdvancedFilterGroup {
  /** 组 ID */
  id: string;
  /** 组内条件组合方式 */
  operator: JoinOperator;
  /** 组内条件列表 */
  conditions: AdvancedFilterCondition[];
  /** 嵌套子组 */
  groups?: AdvancedFilterGroup[];
}

// ─── 高级筛选模型 ──────────────────────────────────────────────────────────

export interface AdvancedFilterModel {
  /** 根组 */
  root: AdvancedFilterGroup;
}

// ─── 筛选预设 ──────────────────────────────────────────────────────────────

export interface FilterPreset {
  /** 预设名称 */
  name: string;
  /** 预设 ID */
  id: string;
  /** 创建时间 */
  createdAt: number;
  /** 高级筛选模型 */
  model: AdvancedFilterModel;
  /** 标准筛选模型（兼容旧接口） */
  standardModel?: FilterModel;
}

// ─── 筛选器联动事件 ────────────────────────────────────────────────────────

export interface FilterLinkageEvent {
  /** 触发联动的列 ID */
  sourceColId: string;
  /** 联动后的各列可选值 */
  availableValues: Record<string, any[]>;
}

// ─── 服务 ──────────────────────────────────────────────────────────────────

@Injectable()
export class AdvancedFilterService {
  private filterService: FilterService;
  private advancedModel: AdvancedFilterModel | null = null;
  private presets: FilterPreset[] = [];
  private readonly STORAGE_KEY = 'db-grid-filter-presets';

  /** 筛选变化事件 */
  onFilterChanged = new Subject<AdvancedFilterModel | null>();
  /** 预设变化事件 */
  onPresetsChanged = new Subject<FilterPreset[]>();
  /** 联动事件 */
  onFilterLinkage = new Subject<FilterLinkageEvent>();

  constructor() {
    this.filterService = new FilterService();
    this.loadPresetsFromStorage();
  }

  // ── 高级筛选模型管理 ─────────────────────────────────────────────────────

  /**
   * 设置高级筛选模型
   */
  setAdvancedFilterModel(model: AdvancedFilterModel | null): void {
    this.advancedModel = model;
    this.onFilterChanged.next(model);
  }

  /**
   * 获取高级筛选模型
   */
  getAdvancedFilterModel(): AdvancedFilterModel | null {
    return this.advancedModel;
  }

  /**
   * 清除高级筛选
   */
  clearAdvancedFilter(): void {
    this.advancedModel = null;
    this.onFilterChanged.next(null);
  }

  // ── 别名方法（兼容调用方） ───────────────────────────────────────────────

  /** 兼容别名 */
  getCurrentModel(): AdvancedFilterModel | null {
    return this.getAdvancedFilterModel();
  }

  /** 兼容别名 */
  applyFilterModel(model: AdvancedFilterModel | null): void {
    this.setAdvancedFilterModel(model);
  }

  /** 兼容别名 */
  clearFilter(): void {
    this.clearAdvancedFilter();
  }

  /**
   * 判断高级筛选是否激活
   */
  isAdvancedFilterActive(): boolean {
    if (!this.advancedModel) return false;
    return this.countConditions(this.advancedModel.root) > 0;
  }

  // ── 创建空模型 ──────────────────────────────────────────────────────────

  /**
   * 创建空的高级筛选模型
   */
  createEmptyModel(): AdvancedFilterModel {
    return {
      root: {
        id: this.generateId(),
        operator: 'AND',
        conditions: [],
        groups: [],
      },
    };
  }

  /**
   * 添加条件到指定组
   */
  addCondition(group: AdvancedFilterGroup, condition: Omit<AdvancedFilterCondition, 'id'>): AdvancedFilterCondition {
    const newCondition: AdvancedFilterCondition = {
      ...condition,
      id: this.generateId(),
    };
    group.conditions.push(newCondition);
    return newCondition;
  }

  /**
   * 从组中移除条件
   */
  removeCondition(group: AdvancedFilterGroup, conditionId: string): boolean {
    const idx = group.conditions.findIndex(c => c.id === conditionId);
    if (idx >= 0) {
      group.conditions.splice(idx, 1);
      return true;
    }
    // 递归查找子组
    if (group.groups) {
      for (const subGroup of group.groups) {
        if (this.removeCondition(subGroup, conditionId)) return true;
      }
    }
    return false;
  }

  /**
   * 添加子组
   */
  addGroup(parentGroup: AdvancedFilterGroup, operator: JoinOperator = 'AND'): AdvancedFilterGroup {
    const newGroup: AdvancedFilterGroup = {
      id: this.generateId(),
      operator,
      conditions: [],
      groups: [],
    };
    if (!parentGroup.groups) {
      parentGroup.groups = [];
    }
    parentGroup.groups.push(newGroup);
    return newGroup;
  }

  /**
   * 移除子组
   */
  removeGroup(parentGroup: AdvancedFilterGroup, groupId: string): boolean {
    if (!parentGroup.groups) return false;
    const idx = parentGroup.groups.findIndex(g => g.id === groupId);
    if (idx >= 0) {
      parentGroup.groups.splice(idx, 1);
      return true;
    }
    // 递归查找
    for (const subGroup of parentGroup.groups) {
      if (this.removeGroup(subGroup, groupId)) return true;
    }
    return false;
  }

  /**
   * 修改组的 AND/OR 操作符
   */
  setGroupOperator(group: AdvancedFilterGroup, operator: JoinOperator): void {
    group.operator = operator;
  }

  // ── 高级筛选执行 ────────────────────────────────────────────────────────

  /**
   * 判断一行数据是否通过高级筛选
   */
  passesAdvancedFilter(data: any, colDefs: ColDef[]): boolean {
    if (!this.advancedModel) return true;
    return this.evalGroup(this.advancedModel.root, data, colDefs);
  }

  /**
   * 递归评估组
   */
  private evalGroup(group: AdvancedFilterGroup, data: any, colDefs: ColDef[]): boolean {
    const results: boolean[] = [];

    // 评估本组条件
    for (const condition of group.conditions) {
      results.push(this.evalCondition(condition, data, colDefs));
    }

    // 评估子组
    if (group.groups) {
      for (const subGroup of group.groups) {
        results.push(this.evalGroup(subGroup, data, colDefs));
      }
    }

    // 无条件则通过
    if (results.length === 0) return true;

    // 按操作符组合
    if (group.operator === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  /**
   * 评估单个条件
   */
  private evalCondition(condition: AdvancedFilterCondition, data: any, colDefs: ColDef[]): boolean {
    const colDef = colDefs.find(c => (c.colId || c.field) === condition.colId || c.field === condition.colId);
    const cellValue = this.getCellValue(data, colDef?.field || condition.colId);

    switch (condition.filterType) {
      case 'text':
        return this.evalTextCondition(cellValue, condition.conditionType as TextFilterCondition, condition.value);
      case 'number':
        return this.evalNumberCondition(cellValue, condition.conditionType as NumberFilterCondition, condition.value, condition.valueTo);
      case 'date':
        return this.evalDateCondition(cellValue, condition.conditionType as DateFilterCondition, condition.value, condition.valueTo);
      case 'set':
        return this.evalSetCondition(cellValue, condition.conditionType as 'in' | 'notIn', condition.value);
      case 'boolean':
        return this.evalBooleanCondition(cellValue, condition.value);
      default:
        return true;
    }
  }

  // ── 条件评估方法 ────────────────────────────────────────────────────────

  private evalTextCondition(cellValue: any, type: TextFilterCondition, filter?: string): boolean {
    const str = cellValue != null ? String(cellValue).toLowerCase() : '';
    const f = (filter ?? '').toLowerCase();
    switch (type) {
      case 'contains':       return str.includes(f);
      case 'notContains':    return !str.includes(f);
      case 'equals':         return str === f;
      case 'notEqual':       return str !== f;
      case 'startsWith':     return str.startsWith(f);
      case 'endsWith':       return str.endsWith(f);
      case 'blank':          return str.trim() === '';
      case 'notBlank':       return str.trim() !== '';
      default:               return true;
    }
  }

  private evalNumberCondition(cellValue: any, type: NumberFilterCondition, filter?: any, filterTo?: any): boolean {
    const num = Number(cellValue);
    if (type === 'blank')    return cellValue == null || isNaN(num);
    if (type === 'notBlank') return cellValue != null && !isNaN(num);

    const f = Number(filter) || 0;
    switch (type) {
      case 'equals':              return num === f;
      case 'notEqual':            return num !== f;
      case 'greaterThan':         return num > f;
      case 'greaterThanOrEqual':  return num >= f;
      case 'lessThan':            return num < f;
      case 'lessThanOrEqual':     return num <= f;
      case 'inRange':             return num >= f && num <= (Number(filterTo) || f);
      default:                    return true;
    }
  }

  private evalDateCondition(cellValue: any, type: DateFilterCondition, dateFrom?: any, dateTo?: any): boolean {
    if (type === 'blank')    return cellValue == null || cellValue === '';
    if (type === 'notBlank') return cellValue != null && cellValue !== '';

    const cell = new Date(cellValue).getTime();
    const from = dateFrom ? new Date(dateFrom).getTime() : NaN;
    const to   = dateTo   ? new Date(dateTo).getTime()   : NaN;

    if (isNaN(cell)) return false;

    switch (type) {
      case 'equals':      return !isNaN(from) && this.sameDay(cell, from);
      case 'notEqual':    return !isNaN(from) && !this.sameDay(cell, from);
      case 'greaterThan': return !isNaN(from) && cell > from;
      case 'lessThan':    return !isNaN(from) && cell < from;
      case 'inRange':     return !isNaN(from) && !isNaN(to) && cell >= from && cell <= to;
      default:            return true;
    }
  }

  private evalSetCondition(cellValue: any, type: 'in' | 'notIn', values?: any): boolean {
    const vals = Array.isArray(values) ? values : [];
    if (vals.length === 0) return true;
    if (type === 'in') return vals.includes(cellValue);
    return !vals.includes(cellValue);
  }

  private evalBooleanCondition(cellValue: any, value?: any): boolean {
    if (value === null || value === undefined) return true;
    const boolVal = cellValue === true || cellValue === 'true' || cellValue === 1;
    return boolVal === Boolean(value);
  }

  private sameDay(a: number, b: number): boolean {
    const da = new Date(a), db = new Date(b);
    return da.getFullYear() === db.getFullYear() &&
           da.getMonth()    === db.getMonth()    &&
           da.getDate()     === db.getDate();
  }

  // ── 转换为标准 FilterModel ──────────────────────────────────────────────

  /**
   * 将高级筛选模型转换为标准 FilterModel（用于兼容旧接口）
   * 只转换根组的第一层条件（不支持嵌套映射）
   */
  toStandardFilterModel(model: AdvancedFilterModel): FilterModel {
    const result: FilterModel = {};
    const root = model.root;

    // 按 colId 收集条件
    const conditionsByCol = new Map<string, AdvancedFilterCondition[]>();
    this.collectConditionsByCol(root, conditionsByCol);

    for (const [colId, conditions] of conditionsByCol) {
      if (conditions.length === 1) {
        const c = conditions[0];
        result[colId] = this.conditionToColumnFilter(c);
      } else if (conditions.length === 2) {
        // 两个条件 → 使用 condition1/condition2 + operator
        const c1 = conditions[0];
        const c2 = conditions[1];
        const base = this.conditionToColumnFilter(c1);
        if (base.filterType === 'text' || base.filterType === 'number' || base.filterType === 'date') {
          (base as any).operator = root.operator;
          (base as any).condition1 = { type: c1.conditionType, filter: c1.value };
          (base as any).condition2 = { type: c2.conditionType, filter: c2.value };
        }
        result[colId] = base;
      }
      // 3+ 个条件无法精确映射为标准模型，仅取前2个
    }
    return result;
  }

  private collectConditionsByCol(group: AdvancedFilterGroup, map: Map<string, AdvancedFilterCondition[]>): void {
    for (const c of group.conditions) {
      if (!map.has(c.colId)) map.set(c.colId, []);
      map.get(c.colId)!.push(c);
    }
    if (group.groups) {
      for (const g of group.groups) {
        this.collectConditionsByCol(g, map);
      }
    }
  }

  private conditionToColumnFilter(c: AdvancedFilterCondition): ColumnFilterModel {
    switch (c.filterType) {
      case 'text':
        return { filterType: 'text', type: c.conditionType as any, filter: c.value } as any;
      case 'number':
        return { filterType: 'number', type: c.conditionType as any, filter: c.value, filterTo: c.valueTo } as any;
      case 'date':
        return { filterType: 'date', type: c.conditionType as any, dateFrom: c.value, dateTo: c.valueTo } as any;
      case 'set':
        return { filterType: 'set', values: Array.isArray(c.value) ? c.value : [] } as any;
      case 'boolean':
        return { filterType: 'boolean', value: c.value ?? null } as any;
      default:
        return { filterType: 'text', type: 'contains', filter: '' } as any;
    }
  }

  // ── 预设管理 ─────────────────────────────────────────────────────────────

  /**
   * 保存当前高级筛选模型为预设
   */
  savePreset(name: string): FilterPreset {
    if (!this.advancedModel) {
      throw new Error('当前无高级筛选模型');
    }
    const preset: FilterPreset = {
      id: this.generateId(),
      name,
      createdAt: Date.now(),
      model: JSON.parse(JSON.stringify(this.advancedModel)),
    };
    this.presets.push(preset);
    this.savePresetsToStorage();
    this.onPresetsChanged.next([...this.presets]);
    return preset;
  }

  /**
   * 加载预设
   */
  loadPreset(presetId: string): AdvancedFilterModel | null {
    const preset = this.presets.find(p => p.id === presetId);
    if (!preset) return null;
    // 深拷贝避免引用问题
    this.advancedModel = JSON.parse(JSON.stringify(preset.model));
    this.onFilterChanged.next(this.advancedModel);
    return this.advancedModel;
  }

  /**
   * 删除预设
   */
  deletePreset(presetId: string): boolean {
    const idx = this.presets.findIndex(p => p.id === presetId);
    if (idx >= 0) {
      this.presets.splice(idx, 1);
      this.savePresetsToStorage();
      this.onPresetsChanged.next([...this.presets]);
      return true;
    }
    return false;
  }

  /**
   * 获取所有预设
   */
  getPresets(): FilterPreset[] {
    return [...this.presets];
  }

  /**
   * 重命名预设
   */
  renamePreset(presetId: string, newName: string): boolean {
    const preset = this.presets.find(p => p.id === presetId);
    if (preset) {
      preset.name = newName;
      this.savePresetsToStorage();
      this.onPresetsChanged.next([...this.presets]);
      return true;
    }
    return false;
  }

  // ── 筛选器联动 ──────────────────────────────────────────────────────────

  /**
   * 计算筛选器联动：当一列筛选激活后，计算其他列的可用值
   * 原理：先应用所有筛选条件，从过滤后的数据中提取各列的唯一值
   */
  computeLinkage(
    activeColId: string,
    allData: any[],
    colDefs: ColDef[]
  ): Record<string, any[]> {
    // 过滤数据：只应用非当前列的筛选
    const otherConditions: AdvancedFilterCondition[] = [];
    if (this.advancedModel) {
      this.collectOtherConditions(this.advancedModel.root, activeColId, otherConditions);
    }

    // 如果没有其他条件，返回各列全部唯一值
    if (otherConditions.length === 0) {
      const result: Record<string, any[]> = {};
      for (const col of colDefs) {
        const field = col.field || '';
        result[col.colId || field] = this.filterService.getSetFilterValues(allData, field, col);
      }

      this.onFilterLinkage.next({
        sourceColId: activeColId,
        availableValues: result,
      });

      return result;
    }

    // 过滤数据
    const filteredData = allData.filter(row =>
      otherConditions.every(c => this.evalCondition(c, row, colDefs))
    );

    // 从过滤后的数据中提取各列唯一值
    const result: Record<string, any[]> = {};
    for (const col of colDefs) {
      const field = col.field || '';
      result[col.colId || field] = this.filterService.getSetFilterValues(filteredData, field, col);
    }

    this.onFilterLinkage.next({
      sourceColId: activeColId,
      availableValues: result,
    });

    return result;
  }

  private collectOtherConditions(
    group: AdvancedFilterGroup,
    excludeColId: string,
    result: AdvancedFilterCondition[]
  ): void {
    for (const c of group.conditions) {
      if (c.colId !== excludeColId) {
        result.push(c);
      }
    }
    if (group.groups) {
      for (const g of group.groups) {
        this.collectOtherConditions(g, excludeColId, result);
      }
    }
  }

  // ── 统计 ────────────────────────────────────────────────────────────────

  /**
   * 统计模型中的条件总数
   */
  countConditions(group: AdvancedFilterGroup): number {
    let count = group.conditions.length;
    if (group.groups) {
      for (const g of group.groups) {
        count += this.countConditions(g);
      }
    }
    return count;
  }

  /**
   * 统计模型中的组总数
   */
  countGroups(group: AdvancedFilterGroup): number {
    let count = 1;
    if (group.groups) {
      for (const g of group.groups) {
        count += this.countGroups(g);
      }
    }
    return count;
  }

  /**
   * 获取高级筛选摘要（用于状态栏显示）
   */
  getFilterSummary(): string {
    if (!this.advancedModel) return '无筛选';
    const root = this.advancedModel.root;
    const condCount = this.countConditions(root);
    const groupCount = this.countGroups(root);
    if (condCount === 0) return '无筛选';
    const op = root.operator === 'AND' ? '且' : '或';
    return `${condCount} 个条件，${groupCount} 个组（${op}）`;
  }

  // ── 工具方法 ────────────────────────────────────────────────────────────

  private generateId(): string {
    return 'af_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  }

  private getCellValue(data: any, field: string): any {
    if (!data || !field) return null;
    const keys = field.split('.');
    let value = data;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  }

  // ── 本地存储 ────────────────────────────────────────────────────────────

  private loadPresetsFromStorage(): void {
    try {
      const stored = typeof localStorage !== 'undefined'
        ? localStorage.getItem(this.STORAGE_KEY)
        : null;
      if (stored) {
        this.presets = JSON.parse(stored);
      }
    } catch {
      this.presets = [];
    }
  }

  private savePresetsToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.presets));
      }
    } catch {
      // localStorage 不可用时静默失败
    }
  }

  // ── 生命周期 ────────────────────────────────────────────────────────────

  destroy(): void {
    this.advancedModel = null;
    this.onFilterChanged.complete();
    this.onPresetsChanged.complete();
    this.onFilterLinkage.complete();
    this.filterService.destroy();
  }
}
