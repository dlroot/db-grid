/**
 * 筛选器服务
 * 提供 Text / Number / Date / Set / Boolean 五种内置筛选器逻辑
 * 以及浮动筛选、快速筛选、外部筛选支持
 */

import { Injectable } from '@angular/core';
import { ColDef, FilterParams } from '../models';

// ─── 筛选条件类型 ───────────────────────────────────────────────────────────────

export type FilterType = 'text' | 'number' | 'date' | 'set' | 'boolean';

export type TextFilterCondition =
  | 'contains' | 'notContains' | 'equals' | 'notEqual'
  | 'startsWith' | 'endsWith' | 'blank' | 'notBlank';

export type NumberFilterCondition =
  | 'equals' | 'notEqual' | 'greaterThan' | 'greaterThanOrEqual'
  | 'lessThan' | 'lessThanOrEqual' | 'inRange' | 'blank' | 'notBlank';

export type DateFilterCondition =
  | 'equals' | 'notEqual' | 'greaterThan' | 'lessThan'
  | 'inRange' | 'blank' | 'notBlank';

export type SetFilterCondition = 'in' | 'notIn';

export type JoinOperator = 'AND' | 'OR';

// ─── 筛选模型 ────────────────────────────────────────────────────────────────

export interface TextFilterModel {
  filterType: 'text';
  type: TextFilterCondition;
  filter?: string;
  filterTo?: string;
  operator?: JoinOperator;
  condition1?: { type: TextFilterCondition; filter?: string };
  condition2?: { type: TextFilterCondition; filter?: string };
}

export interface NumberFilterModel {
  filterType: 'number';
  type: NumberFilterCondition;
  filter?: number;
  filterTo?: number;
  operator?: JoinOperator;
  condition1?: { type: NumberFilterCondition; filter?: number; filterTo?: number };
  condition2?: { type: NumberFilterCondition; filter?: number; filterTo?: number };
}

export interface DateFilterModel {
  filterType: 'date';
  type: DateFilterCondition;
  dateFrom?: string;   // ISO string YYYY-MM-DD
  dateTo?: string;
  operator?: JoinOperator;
  condition1?: { type: DateFilterCondition; dateFrom?: string; dateTo?: string };
  condition2?: { type: DateFilterCondition; dateFrom?: string; dateTo?: string };
}

export interface SetFilterModel {
  filterType: 'set';
  values: any[];
}

export interface BooleanFilterModel {
  filterType: 'boolean';
  value: boolean | null;  // null = 全部
}

export type ColumnFilterModel =
  | TextFilterModel
  | NumberFilterModel
  | DateFilterModel
  | SetFilterModel
  | BooleanFilterModel;

export type FilterModel = Record<string, ColumnFilterModel>;

// ─── 服务 ────────────────────────────────────────────────────────────────────

@Injectable()
export class FilterService {
  private filterModel: FilterModel = {};
  private quickFilterText = '';
  private externalFilterFn: ((data: any) => boolean) | null = null;

  // ── 筛选模型管理 ──────────────────────────────────────────────────────────

  setFilterModel(model: FilterModel): void {
    this.filterModel = { ...model };
  }

  getFilterModel(): FilterModel {
    return { ...this.filterModel };
  }

  setColumnFilter(colId: string, model: ColumnFilterModel | null): void {
    if (model === null) {
      delete this.filterModel[colId];
    } else {
      this.filterModel[colId] = model;
    }
  }

  getColumnFilter(colId: string): ColumnFilterModel | null {
    return this.filterModel[colId] ?? null;
  }

  clearAllFilters(): void {
    this.filterModel = {};
    this.quickFilterText = '';
  }

  isFilterActive(): boolean {
    return (
      Object.keys(this.filterModel).length > 0 ||
      this.quickFilterText.trim().length > 0 ||
      this.externalFilterFn !== null
    );
  }

  // ── 快速筛选 ──────────────────────────────────────────────────────────────

  setQuickFilter(text: string): void {
    this.quickFilterText = text.toLowerCase().trim();
  }

  getQuickFilter(): string {
    return this.quickFilterText;
  }

  // ── 外部筛选 ──────────────────────────────────────────────────────────────

  setExternalFilter(fn: ((data: any) => boolean) | null): void {
    this.externalFilterFn = fn;
  }

  // ── 核心筛选逻辑 ──────────────────────────────────────────────────────────

  /**
   * 判断一行数据是否通过所有筛选条件
   */
  passesAllFilters(data: any, colDefs: ColDef[]): boolean {
    // 1. 外部筛选
    if (this.externalFilterFn && !this.externalFilterFn(data)) {
      return false;
    }

    // 2. 快速筛选
    if (this.quickFilterText) {
      const rowText = colDefs
        .map(col => {
          const val = this.getCellValue(data, col.field || '');
          return val != null ? String(val).toLowerCase() : '';
        })
        .join(' ');
      if (!rowText.includes(this.quickFilterText)) {
        return false;
      }
    }

    // 3. 列筛选
    for (const [colId, filterModel] of Object.entries(this.filterModel)) {
      const colDef = colDefs.find(c => (c.colId || c.field) === colId || c.field === colId);
      const cellValue = this.getCellValue(data, colDef?.field || colId);
      if (!this.passesColumnFilter(cellValue, filterModel)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 判断单元格值是否通过列筛选
   */
  passesColumnFilter(cellValue: any, model: ColumnFilterModel): boolean {
    switch (model.filterType) {
      case 'text':    return this.passesTextFilter(cellValue, model);
      case 'number':  return this.passesNumberFilter(cellValue, model);
      case 'date':    return this.passesDateFilter(cellValue, model);
      case 'set':     return this.passesSetFilter(cellValue, model);
      case 'boolean': return this.passesBooleanFilter(cellValue, model);
      default:        return true;
    }
  }

  // ── Text Filter ───────────────────────────────────────────────────────────

  private passesTextFilter(cellValue: any, model: TextFilterModel): boolean {
    const str = cellValue != null ? String(cellValue).toLowerCase() : '';

    if (model.operator && model.condition1 && model.condition2) {
      const r1 = this.evalTextCondition(str, model.condition1.type, model.condition1.filter);
      const r2 = this.evalTextCondition(str, model.condition2.type, model.condition2.filter);
      return model.operator === 'AND' ? r1 && r2 : r1 || r2;
    }

    return this.evalTextCondition(str, model.type, model.filter);
  }

  private evalTextCondition(str: string, type: TextFilterCondition, filter?: string): boolean {
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

  // ── Number Filter ─────────────────────────────────────────────────────────

  private passesNumberFilter(cellValue: any, model: NumberFilterModel): boolean {
    const num = Number(cellValue);

    if (model.operator && model.condition1 && model.condition2) {
      const r1 = this.evalNumberCondition(num, model.condition1.type, model.condition1.filter, model.condition1.filterTo);
      const r2 = this.evalNumberCondition(num, model.condition2.type, model.condition2.filter, model.condition2.filterTo);
      return model.operator === 'AND' ? r1 && r2 : r1 || r2;
    }

    return this.evalNumberCondition(num, model.type, model.filter, model.filterTo);
  }

  private evalNumberCondition(
    num: number,
    type: NumberFilterCondition,
    filter?: number,
    filterTo?: number
  ): boolean {
    if (type === 'blank')    return num == null || isNaN(num);
    if (type === 'notBlank') return num != null && !isNaN(num);

    const f = filter ?? 0;
    switch (type) {
      case 'equals':              return num === f;
      case 'notEqual':            return num !== f;
      case 'greaterThan':         return num > f;
      case 'greaterThanOrEqual':  return num >= f;
      case 'lessThan':            return num < f;
      case 'lessThanOrEqual':     return num <= f;
      case 'inRange':             return num >= f && num <= (filterTo ?? f);
      default:                    return true;
    }
  }

  // ── Date Filter ───────────────────────────────────────────────────────────

  private passesDateFilter(cellValue: any, model: DateFilterModel): boolean {
    if (model.operator && model.condition1 && model.condition2) {
      const r1 = this.evalDateCondition(cellValue, model.condition1.type, model.condition1.dateFrom, model.condition1.dateTo);
      const r2 = this.evalDateCondition(cellValue, model.condition2.type, model.condition2.dateFrom, model.condition2.dateTo);
      return model.operator === 'AND' ? r1 && r2 : r1 || r2;
    }
    return this.evalDateCondition(cellValue, model.type, model.dateFrom, model.dateTo);
  }

  private evalDateCondition(
    cellValue: any,
    type: DateFilterCondition,
    dateFrom?: string,
    dateTo?: string
  ): boolean {
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

  private sameDay(a: number, b: number): boolean {
    const da = new Date(a), db = new Date(b);
    return da.getFullYear() === db.getFullYear() &&
           da.getMonth()    === db.getMonth()    &&
           da.getDate()     === db.getDate();
  }

  // ── Set Filter ────────────────────────────────────────────────────────────

  private passesSetFilter(cellValue: any, model: SetFilterModel): boolean {
    if (!model.values || model.values.length === 0) return true;
    return model.values.includes(cellValue);
  }

  /**
   * 从数据集中提取某列的唯一值（用于 Set Filter 选项列表）
   */
  getSetFilterValues(data: any[], field: string): any[] {
    const seen = new Set<any>();
    const result: any[] = [];
    for (const row of data) {
      const val = this.getCellValue(row, field);
      const key = val == null ? '__null__' : val;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(val);
      }
    }
    return result.sort((a, b) => {
      if (a == null) return 1;
      if (b == null) return -1;
      return String(a).localeCompare(String(b));
    });
  }

  // ── Boolean Filter ────────────────────────────────────────────────────────

  private passesBooleanFilter(cellValue: any, model: BooleanFilterModel): boolean {
    if (model.value === null) return true;
    const boolVal = cellValue === true || cellValue === 'true' || cellValue === 1;
    return boolVal === model.value;
  }

  // ── 工具方法 ──────────────────────────────────────────────────────────────

  private getCellValue(data: any, field: string): any {
    if (!data || !field) return null;
    const keys = field.split('.');
    let value = data;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  }

  /**
   * 根据列定义推断筛选器类型
   */
  inferFilterType(colDef: ColDef): FilterType {
    if (colDef.filter === 'agSetColumnFilter')     return 'set';
    if (colDef.filter === 'agNumberColumnFilter')  return 'number';
    if (colDef.filter === 'agDateColumnFilter')    return 'date';
    if (colDef.filter === 'agBooleanColumnFilter') return 'boolean';
    if (colDef.filter === 'agTextColumnFilter')    return 'text';

    // 根据 cellType 推断
    if (colDef.cellType === 'number') return 'number';
    if (colDef.cellType === 'date')   return 'date';
    if (colDef.cellType === 'boolean') return 'boolean';

    return 'text';
  }

  /**
   * 获取筛选器可用的条件选项
   */
  getFilterOptions(type: FilterType): string[] {
    switch (type) {
      case 'text':
        return ['contains', 'notContains', 'equals', 'notEqual', 'startsWith', 'endsWith', 'blank', 'notBlank'];
      case 'number':
        return ['equals', 'notEqual', 'greaterThan', 'greaterThanOrEqual', 'lessThan', 'lessThanOrEqual', 'inRange', 'blank', 'notBlank'];
      case 'date':
        return ['equals', 'notEqual', 'greaterThan', 'lessThan', 'inRange', 'blank', 'notBlank'];
      case 'set':
        return ['in', 'notIn'];
      case 'boolean':
        return ['true', 'false', 'all'];
      default:
        return [];
    }
  }

  /**
   * 获取条件的显示名称（中文）
   */
  getConditionLabel(condition: string): string {
    const labels: Record<string, string> = {
      contains:            '包含',
      notContains:         '不包含',
      equals:              '等于',
      notEqual:            '不等于',
      startsWith:          '开头是',
      endsWith:            '结尾是',
      blank:               '为空',
      notBlank:            '不为空',
      greaterThan:         '大于',
      greaterThanOrEqual:  '大于等于',
      lessThan:            '小于',
      lessThanOrEqual:     '小于等于',
      inRange:             '范围',
      in:                  '在列表中',
      notIn:               '不在列表中',
    };
    return labels[condition] ?? condition;
  }

  destroy(): void {
    this.filterModel = {};
    this.quickFilterText = '';
    this.externalFilterFn = null;
  }
}
