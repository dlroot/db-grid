import { Injectable } from '@angular/core';
import { ColDef } from '../models';

/**
 * 数据聚合服务 — 分组后的聚合计算（sum/avg/min/max/count）
 * AG Grid 对应功能：Aggregation (Enterprise)
 */
@Injectable({ providedIn: 'root' })
export class AggregationService {
  private enabled = false;
  private aggColumns: Map<string, AggConfig> = new Map();
  private customAggFunctions: Map<string, CustomAggFunction> = new Map();
  private results: Map<string, AggResult> = new Map();

  private onAggregationChanged: ((results: Map<string, AggResult>) => void) | null = null;

  /** 初始化 */
  initialize(columnDefs: ColDef[], config: AggregationConfig = {}): void {
    this.enabled = config.enabled ?? false;
    this.aggColumns.clear();

    for (const col of columnDefs) {
      const aggFunc = (col as any).aggFunc;
      if (aggFunc) {
        const colId = col.field ?? col.colId ?? '';
        this.aggColumns.set(colId, {
          field: colId,
          aggFunc: typeof aggFunc === 'string' ? aggFunc as AggFuncType : 'custom',
          customFn: typeof aggFunc === 'function' ? aggFunc : undefined
        });
      }
    }

    // 注册内置聚合函数
    this.registerBuiltInFunctions();
  }

  /** 是否启用 */
  isEnabled(): boolean { return this.enabled; }

  /** 启用 */
  enable(): void { this.enabled = true; }

  /** 禁用 */
  disable(): void { this.enabled = false; this.results.clear(); }

  /** 设置列的聚合函数 */
  setColumnAggFunc(colId: string, aggFunc: AggFuncType | CustomAggFunction): void {
    this.aggColumns.set(colId, {
      field: colId,
      aggFunc: typeof aggFunc === 'string' ? aggFunc : 'custom',
      customFn: typeof aggFunc === 'function' ? aggFunc : undefined
    });
  }

  /** 移除列的聚合 */
  removeColumnAgg(colId: string): void {
    this.aggColumns.delete(colId);
    this.results.delete(colId);
  }

  /** 注册自定义聚合函数 */
  registerAggFunction(name: string, fn: CustomAggFunction): void {
    this.customAggFunctions.set(name, fn);
  }

  /** 计算聚合 */
  aggregate(rowData: any[], groupKey?: string): Map<string, AggResult> {
    if (!this.enabled) return new Map();

    this.results.clear();

    for (const [colId, config] of this.aggColumns) {
      const values = rowData
        .map(r => Number(r[colId]))
        .filter(v => !isNaN(v));

      if (values.length === 0) {
        this.results.set(colId, { value: null, count: 0 });
        continue;
      }

      let result: number;
      const fn = config.customFn ?? this.customAggFunctions.get(config.aggFunc as string);

      if (fn) {
        result = fn(values);
      } else {
        result = this.computeBuiltin(values, config.aggFunc as AggFuncType);
      }

      this.results.set(colId, {
        value: result,
        count: values.length,
        formattedValue: this.formatAggValue(result, config.aggFunc as AggFuncType)
      });
    }

    if (this.onAggregationChanged) {
      this.onAggregationChanged(new Map(this.results));
    }

    return new Map(this.results);
  }

  /** 分组聚合 */
  aggregateGrouped(groupedData: Map<string, any[]>): Map<string, Map<string, AggResult>> {
    const groupResults = new Map<string, Map<string, AggResult>>();
    for (const [groupKey, rows] of groupedData) {
      groupResults.set(groupKey, this.aggregate(rows, groupKey));
    }
    return groupResults;
  }

  /** 获取聚合结果 */
  getResult(colId: string): AggResult | undefined {
    return this.results.get(colId);
  }

  /** 获取所有聚合结果 */
  getAllResults(): Map<string, AggResult> {
    return new Map(this.results);
  }

  /** 注册变更回调 */
  onAggregationChangedEvent(callback: (results: Map<string, AggResult>) => void): void {
    this.onAggregationChanged = callback;
  }

  // ===== 内部方法 =====

  private registerBuiltInFunctions(): void {
    // sum, avg, min, max, count, first, last 已经内置
    // 自定义函数通过 registerAggFunction 添加
  }

  private computeBuiltin(values: number[], func: AggFuncType): number {
    switch (func) {
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      case 'first':
        return values[0];
      case 'last':
        return values[values.length - 1];
      default:
        return values.reduce((a, b) => a + b, 0);
    }
  }

  private formatAggValue(value: number, func: AggFuncType): string {
    if (value === null) return '';
    switch (func) {
      case 'sum': return `合计: ${value.toLocaleString()}`;
      case 'avg': return `平均: ${value.toFixed(2)}`;
      case 'min': return `最小: ${value}`;
      case 'max': return `最大: ${value}`;
      case 'count': return `计数: ${value}`;
      case 'first': return `首项: ${value}`;
      case 'last': return `末项: ${value}`;
      default: return String(value);
    }
  }

  destroy(): void {
    this.aggColumns.clear();
    this.customAggFunctions.clear();
    this.results.clear();
    this.onAggregationChanged = null;
  }
}

/** 聚合配置 */
export interface AggregationConfig {
  enabled?: boolean;
}

/** 列聚合配置 */
export interface AggConfig {
  field: string;
  aggFunc: AggFuncType | 'custom';
  customFn?: CustomAggFunction;
}

/** 内置聚合函数类型 */
export type AggFuncType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'first' | 'last';

/** 自定义聚合函数 */
export type CustomAggFunction = (values: number[]) => number;

/** 聚合结果 */
export interface AggResult {
  value: number | null;
  count: number;
  formattedValue?: string;
}
