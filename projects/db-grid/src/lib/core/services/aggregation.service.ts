/**
 * 聚合服务
 * 计算分组行的聚合值（sum/avg/count/min/max）
 *
 * 用法：
 *   ColDef 配置:
 *   { field: 'price', aggregation: { type: 'sum', precision: 2 } }
 *   { field: 'quantity', aggregation: ['sum', 'avg'] }
 */

import { Injectable } from '@angular/core';
import { ColDef, RowNode } from '../models';

export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'first' | 'last';

export interface AggregationConfig {
  /** 聚合类型 */
  type: AggregationType | AggregationType[];
  /** 小数位数 */
  precision?: number;
  /** 自定义聚合函数 */
  aggregator?: (values: any[], node: RowNode) => any;
  /** 格式化函数 */
  formatter?: (value: any, node: RowNode) => string;
  /** 是否在分组行显示 */
  showInGroup?: boolean;
  /** 聚合值前缀 */
  prefix?: string;
  /** 聚合值后缀 */
  suffix?: string;
}

export interface AggregationResult {
  field: string;
  type: AggregationType;
  value: any;
  formatted: string;
}

export interface GroupAggregations {
  [field: string]: {
    [type: string]: AggregationResult;
  };
}

@Injectable()
export class AggregationService {
  /** 聚合配置缓存 */
  private aggregationConfigs: Map<string, AggregationConfig> = new Map();

  /** 聚合值缓存 */
  private aggregationCache: Map<string, GroupAggregations> = new Map();

  /** 注册列聚合配置 */
  registerColumn(colDef: ColDef): void {
    if (!colDef.aggregation) return;

    const field = colDef.field || colDef.colId;
    if (!field) return;

    const config: AggregationConfig =
      typeof colDef.aggregation === 'string'
        ? { type: colDef.aggregation as AggregationType }
        : Array.isArray(colDef.aggregation)
          ? { type: colDef.aggregation as AggregationType[] }
          : (colDef.aggregation as AggregationConfig);

    this.aggregationConfigs.set(field, config);
  }

  /** 批量注册列聚合配置 */
  registerColumns(columnDefs: ColDef[]): void {
    columnDefs.forEach(col => this.registerColumn(col));
  }

  /** 计算分组节点的聚合值 */
  calculateAggregations(groupNode: RowNode, leafNodes: RowNode[]): GroupAggregations {
    const result: GroupAggregations = {};

    if (leafNodes.length === 0) return result;

    this.aggregationConfigs.forEach((config, field) => {
      const types = Array.isArray(config.type) ? config.type : [config.type];

      result[field] = {};

      types.forEach(type => {
        const values = leafNodes.map(node => node.data?.[field]).filter(v => v !== undefined && v !== null);
        let value: any;

        if (config.aggregator) {
          value = config.aggregator(values, groupNode);
        } else {
          value = this.aggregate(values, type);
        }

        // 应用精度
        if (typeof value === 'number' && config.precision !== undefined) {
          value = Number(value.toFixed(config.precision));
        }

        // 格式化
        let formatted: string;
        if (config.formatter) {
          formatted = config.formatter(value, groupNode);
        } else {
          formatted = this.formatValue(value, type, config);
        }

        result[field][type] = {
          field,
          type,
          value,
          formatted,
        };
      });
    });

    // 缓存结果
    this.aggregationCache.set(groupNode.id, result);

    return result;
  }

  /** 计算单个聚合值 */
  private aggregate(values: any[], type: AggregationType): any {
    if (values.length === 0) {
      return type === 'count' ? 0 : null;
    }

    const numericValues = values.map(v => Number(v)).filter(v => !isNaN(v));

    switch (type) {
      case 'sum':
        return numericValues.reduce((a, b) => a + b, 0);

      case 'avg':
        return numericValues.length > 0
          ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
          : null;

      case 'count':
        return values.length;

      case 'min':
        return numericValues.length > 0 ? Math.min(...numericValues) : null;

      case 'max':
        return numericValues.length > 0 ? Math.max(...numericValues) : null;

      case 'first':
        return values[0];

      case 'last':
        return values[values.length - 1];

      default:
        return null;
    }
  }

  /** 格式化聚合值 */
  private formatValue(value: any, type: AggregationType, config: AggregationConfig): string {
    if (value === null || value === undefined) return '';

    const prefix = config.prefix || '';
    const suffix = config.suffix || '';

    // 类型标签
    const typeLabels: Record<AggregationType, string> = {
      sum: '合计',
      avg: '平均',
      count: '计数',
      min: '最小',
      max: '最大',
      first: '首个',
      last: '末个',
    };

    const label = typeLabels[type] || '';
    return `${label}: ${prefix}${value}${suffix}`;
  }

  /** 获取分组节点的聚合值 */
  getAggregations(nodeId: string): GroupAggregations | undefined {
    return this.aggregationCache.get(nodeId);
  }

  /** 获取字段聚合值 */
  getFieldValue(nodeId: string, field: string, type: AggregationType): any {
    const aggregations = this.aggregationCache.get(nodeId);
    return aggregations?.[field]?.[type]?.value;
  }

  /** 获取格式化的聚合值 */
  getFormattedValue(nodeId: string, field: string, type: AggregationType): string {
    const aggregations = this.aggregationCache.get(nodeId);
    return aggregations?.[field]?.[type]?.formatted || '';
  }

  /** 获取所有聚合配置 */
  getAggregationConfigs(): Map<string, AggregationConfig> {
    return this.aggregationConfigs;
  }

  /** 检查列是否有聚合配置 */
  hasAggregation(field: string): boolean {
    return this.aggregationConfigs.has(field);
  }

  /** 清除缓存 */
  clearCache(): void {
    this.aggregationCache.clear();
  }

  /** 销毁 */
  destroy(): void {
    this.aggregationConfigs.clear();
    this.aggregationCache.clear();
  }
}