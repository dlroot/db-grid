import { Injectable } from '@angular/core';
import { ColDef, GridRow } from '../models';

/**
 * 聚合函数类型
 */
export type AggregationFunction = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'first' | 'last';

/**
 * 透视表配置
 */
export interface PivotConfig {
  /** 是否启用透视表 */
  pivotMode: boolean;
  
  /** 透视行字段（行分组字段） */
  pivotRowFields: string[];
  
  /** 透视列字段（列分组字段） */
  pivotColumnFields: string[];
  
  /** 值字段（需要聚合的字段） */
  valueFields: Array<{
    field: string;
    aggregation: AggregationFunction;
    colId?: string;
  }>;
  
  /** 聚合函数映射（自定义聚合函数） */
  aggregationFunctions?: Record<string, (values: any[]) => any>;
  
  /** 是否显示聚合值列组 */
  groupWithPivot?: boolean;
  
  /** 是否展开所有行 */
  expandAllPivotRows?: boolean;
}

/**
 * 透视列定义
 */
export interface PivotColumnDef extends ColDef {
  /** 是否为透视生成的列 */
  pivotValueColumn?: boolean;
  
  /** 透视键（唯一标识） */
  pivotKey?: string;
  
  /** 透视行键值 */
  pivotRowKey?: string;
  
  /** 透视列键值 */
  pivotColumnKey?: string;
  
  /** 聚合函数 */
  pivotAggregation?: AggregationFunction;
  
  /** 原始字段 */
  pivotOriginalField?: string;
}

/**
 * 透视数据节点
 */
export interface PivotNode {
  /** 唯一 ID */
  id: string;
  
  /** 行键值 */
  rowKey: string;
  
  /** 行分组值 */
  rowGroupValues: any[];
  
  /** 子节点（树形结构） */
  children?: PivotNode[];
  
  /** 数据行（叶子节点） */
  data?: GridRow;
  
  /** 聚合值 */
  aggregatedValues?: Record<string, any>;
  
  /** 是否展开 */
  expanded?: boolean;
  
  /** 层级 */
  level: number;
}

/**
 * 默认聚合函数
 */
const DEFAULT_AGGREGATION_FUNCTIONS: Record<AggregationFunction, (values: any[]) => any> = {
  sum: (values) => values.reduce((sum, v) => sum + (parseFloat(v) || 0), 0),
  avg: (values) => {
    if (values.length === 0) return null;
    const sum = values.reduce((s, v) => s + (parseFloat(v) || 0), 0);
    return sum / values.length;
  },
  count: (values) => values.length,
  min: (values) => {
    const nums = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
    return nums.length > 0 ? Math.min(...nums) : null;
  },
  max: (values) => {
    const nums = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
    return nums.length > 0 ? Math.max(...nums) : null;
  },
  first: (values) => values.length > 0 ? values[0] : null,
  last: (values) => values.length > 0 ? values[values.length - 1] : null,
};

/**
 * 透视表服务 — 提供透视表数据转换和列生成功能
 * 
 * AG Grid 企业版对应功能：Pivot Tables
 */
@Injectable()
export class PivotService {
  /** 当前透视配置 */
  private config: PivotConfig = {
    pivotMode: false,
    pivotRowFields: [],
    pivotColumnFields: [],
    valueFields: [],
  };
  
  /** 聚合函数 */
  private aggregationFunctions: Record<string, (values: any[]) => any> = {};
  
  /** 透视数据缓存 */
  private pivotData: PivotNode[] = [];
  
  /** 透视列定义缓存 */
  private pivotColumnDefs: PivotColumnDef[] = [];
  
  /** 回调函数 */
  private onPivotChanged: (() => void) | null = null;
  
  constructor() {
    // 初始化默认聚合函数
    this.aggregationFunctions = { ...DEFAULT_AGGREGATION_FUNCTIONS };
  }
  
  /**
   * 初始化透视表
   */
  initialize(config: Partial<PivotConfig> = {}): void {
    this.config = { ...this.config, ...config };
    if (config.aggregationFunctions) {
      this.aggregationFunctions = { ...this.aggregationFunctions, ...config.aggregationFunctions };
    }
  }
  
  /**
   * 是否启用透视表
   */
  isPivotMode(): boolean {
    return this.config.pivotMode;
  }
  
  /**
   * 启用/禁用透视表
   */
  setPivotMode(enabled: boolean): void {
    if (this.config.pivotMode !== enabled) {
      this.config.pivotMode = enabled;
      this.onPivotChanged?.();
    }
  }
  
  /**
   * 获取当前配置
   */
  getConfig(): PivotConfig {
    return { ...this.config };
  }
  
  /**
   * 更新配置
   */
  setConfig(config: Partial<PivotConfig>): void {
    const changed = 
      config.pivotMode !== undefined && config.pivotMode !== this.config.pivotMode ||
      config.pivotRowFields !== undefined && JSON.stringify(config.pivotRowFields) !== JSON.stringify(this.config.pivotRowFields) ||
      config.pivotColumnFields !== undefined && JSON.stringify(config.pivotColumnFields) !== JSON.stringify(this.config.pivotColumnFields) ||
      config.valueFields !== undefined && JSON.stringify(config.valueFields) !== JSON.stringify(this.config.valueFields);
    
    this.config = { ...this.config, ...config };
    
    if (changed) {
      this.onPivotChanged?.();
    }
  }
  
  /**
   * 设置透视行字段（行分组）
   */
  setPivotRowFields(fields: string[]): void {
    if (JSON.stringify(fields) !== JSON.stringify(this.config.pivotRowFields)) {
      this.config.pivotRowFields = fields;
      this.onPivotChanged?.();
    }
  }
  
  /**
   * 设置透视列字段（列分组）
   */
  setPivotColumnFields(fields: string[]): void {
    if (JSON.stringify(fields) !== JSON.stringify(this.config.pivotColumnFields)) {
      this.config.pivotColumnFields = fields;
      this.onPivotChanged?.();
    }
  }
  
  /**
   * 设置值字段（聚合字段）
   */
  setValueFields(fields: Array<{ field: string; aggregation: AggregationFunction }>): void {
    if (JSON.stringify(fields) !== JSON.stringify(this.config.valueFields)) {
      this.config.valueFields = fields;
      this.onPivotChanged?.();
    }
  }
  
  /**
   * 生成透视数据
   * @param rowData 原始行数据
   * @returns 透视后的数据节点树
   */
  generatePivotData(rowData: GridRow[]): PivotNode[] {
    if (!this.config.pivotMode || rowData.length === 0) {
      return [];
    }
    
    // 1. 构建行分组树
    const rootNode: PivotNode = {
      id: 'root',
      rowKey: 'root',
      rowGroupValues: [],
      children: [],
      level: -1,
    };
    
    // 2. 按行分组字段分组数据
    const rowGroups = this.groupData(rowData, this.config.pivotRowFields);
    
    // 3. 为每个行分组生成节点
    rootNode.children = Object.entries(rowGroups).map(([key, rows]) => 
      this.createPivotNode(key, rows as GridRow[], this.config.pivotRowFields, 0)
    );
    
    // 4. 如果配置了透视列字段，生成透视列
    if (this.config.pivotColumnFields.length > 0) {
      this.generatePivotColumns(rowData);
    }
    
    // 5. 计算聚合值
    this.calculateAggregations(rootNode);
    
    this.pivotData = [rootNode];
    return this.pivotData;
  }
  
  /**
   * 生成透视列定义
   * @param rowData 原始行数据
   * @returns 透视列定义数组
   */
  generatePivotColumnDefs(rowData: GridRow[]): PivotColumnDef[] {
    if (!this.config.pivotMode) {
      return [];
    }
    
    // 1. 获取所有透视列键值
    const pivotColumnKeys = this.getPivotColumnKeys(rowData);
    
    // 2. 为每个值字段和聚合函数组合生成列
    const columnDefs: PivotColumnDef[] = [];
    
    this.config.valueFields.forEach(valueField => {
      pivotColumnKeys.forEach(colKey => {
        const colId = `${valueField.field}|${valueField.aggregation}|${colKey}`;
        const colDef: PivotColumnDef = {
          field: colId,
          colId,
          headerName: this.buildPivotColumnHeader(valueField, colKey),
          pivotValueColumn: true,
          pivotKey: colId,
          pivotColumnKey: colKey,
          pivotAggregation: valueField.aggregation,
          pivotOriginalField: valueField.field,
          valueGetter: (params) => {
            const node = params.data as PivotNode;
            if (node && node.aggregatedValues) {
              return node.aggregatedValues[colId];
            }
            return null;
          },
        };
        columnDefs.push(colDef);
      });
    });
    
    this.pivotColumnDefs = columnDefs;
    return columnDefs;
  }
  
  /**
   * 获取数据分组
   */
  private groupData(data: GridRow[], groupFields: string[]): Record<string, GridRow[]> {
    if (groupFields.length === 0) {
      return { '': data };
    }
    
    const result: Record<string, GridRow[]> = {};
    
    data.forEach(row => {
      const key = groupFields.map(field => row[field]).join('|');
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(row);
    });
    
    return result;
  }
  
  /**
   * 创建透视节点
   */
  private createPivotNode(key: string, rows: GridRow[], groupFields: string[], level: number): PivotNode {
    const node: PivotNode = {
      id: key,
      rowKey: key,
      rowGroupValues: key.split('|'),
      children: [],
      data: rows.length === 1 ? rows[0] : undefined,
      level,
      expanded: this.config.expandAllPivotRows,
    };
    
    // 如果还有更多分组字段，继续分组
    if (level < groupFields.length - 1) {
      const subGroups = this.groupData(rows, [groupFields[level + 1]]);
      node.children = Object.entries(subGroups).map(([subKey, subRows]) =>
        this.createPivotNode(subKey, subRows as GridRow[], groupFields, level + 1)
      );
    }
    
    return node;
  }
  
  /**
   * 获取所有透视列键值
   */
  private getPivotColumnKeys(rowData: GridRow[]): string[] {
    if (this.config.pivotColumnFields.length === 0) {
      return [''];
    }
    
    const keys = new Set<string>();
    
    rowData.forEach(row => {
      const key = this.config.pivotColumnFields.map(field => row[field]).join('|');
      keys.add(key);
    });
    
    return Array.from(keys);
  }
  
  /**
   * 构建透视列头名称
   */
  private buildPivotColumnHeader(valueField: any, colKey: string): string {
    const parts = [valueField.field, valueField.aggregation];
    
    if (colKey) {
      parts.unshift(colKey);
    }
    
    return parts.join(' - ');
  }
  
  /**
   * 生成透视列（简化版）
   */
  private generatePivotColumns(rowData: GridRow[]): void {
    // 在实际实现中，这里会生成透视列的组合
    // 为简化，我们在 generatePivotColumnDefs 中实现
  }
  
  /**
   * 计算聚合值
   */
  private calculateAggregations(node: PivotNode): void {
    if (!node.children || node.children.length === 0) {
      // 叶子节点，无需聚合
      return;
    }
    
    // 递归计算子节点
    node.children.forEach(child => {
      this.calculateAggregations(child);
    });
    
    // 计算当前节点的聚合值
    node.aggregatedValues = {};
    
    this.config.valueFields.forEach(valueField => {
      const values: any[] = [];
      
      // 收集所有子节点的值
      this.collectValues(node, valueField.field, values);
      
      // 应用聚合函数
      const aggFunc = this.aggregationFunctions[valueField.aggregation];
      if (aggFunc) {
        const colId = `${valueField.field}|${valueField.aggregation}`;
        node.aggregatedValues[colId] = aggFunc(values);
      }
    });
  }
  
  /**
   * 递归收集值
   */
  private collectValues(node: PivotNode, field: string, values: any[]): void {
    if (node.data) {
      // 叶子节点
      values.push(node.data[field]);
    } else if (node.children) {
      // 内部节点，递归收集
      node.children.forEach(child => {
        this.collectValues(child, field, values);
      });
    }
  }
  
  /**
   * 设置聚合函数
   */
  setAggregationFunction(name: string, func: (values: any[]) => any): void {
    this.aggregationFunctions[name] = func;
  }
  
  /**
   * 获取聚合函数
   */
  getAggregationFunction(name: string): ((values: any[]) => any) | undefined {
    return this.aggregationFunctions[name];
  }
  
  /**
   * 设置透视变更回调
   */
  setPivotChangedCallback(callback: () => void): void {
    this.onPivotChanged = callback;
  }
  
  /**
   * 获取透视数据（扁平化，用于渲染）
   */
  getFlattenedPivotData(nodes: PivotNode[] = this.pivotData): any[] {
    const result: any[] = [];
    
    const flatten = (node: PivotNode) => {
      if (node.id === 'root') {
        // 跳过根节点
        if (node.children) {
          node.children.forEach(child => flatten(child));
        }
        return;
      }
      
      // 添加当前节点
      result.push({
        id: node.id,
        ...node.aggregatedValues,
        _pivotNode: node,
      });
      
      // 如果展开，添加子节点
      if (node.expanded && node.children) {
        node.children.forEach(child => flatten(child));
      }
    };
    
    nodes.forEach(node => flatten(node));
    return result;
  }
}
