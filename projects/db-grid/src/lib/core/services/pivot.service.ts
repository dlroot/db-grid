import { Injectable } from '@angular/core';

/**
 * 数据透视服务 — 将行数据按维度旋转生成交叉表
 * AG Grid 对应功能：Pivoting (Enterprise)
 */
@Injectable({ providedIn: 'root' })
export class PivotService {
  private enabled = false;
  private pivotMode = false;
  private pivotColumns: string[] = [];
  private rowGroupColumns: string[] = [];
  private valueColumns: PivotValueColumn[] = [];
  private pivotResult: PivotResult | null = null;

  private onPivotChanged: ((result: PivotResult) => void) | null = null;

  /** 初始化 */
  initialize(config: PivotConfig = {}): void {
    this.enabled = config.enabled ?? false;
    this.pivotMode = config.pivotMode ?? false;
    this.pivotColumns = config.pivotColumns ?? [];
    this.rowGroupColumns = config.rowGroupColumns ?? [];
    this.valueColumns = config.valueColumns ?? [];
  }

  /** 是否启用 */
  isEnabled(): boolean { return this.enabled; }

  /** 是否透视模式 */
  isPivotMode(): boolean { return this.pivotMode; }

  /** 启用透视模式 */
  enablePivotMode(): void { this.pivotMode = true; this.enabled = true; }

  /** 禁用透视模式 */
  disablePivotMode(): void {
    this.pivotMode = false;
    this.pivotResult = null;
  }

  /** 设置透视列 */
  setPivotColumns(columns: string[]): void {
    this.pivotColumns = columns;
  }

  /** 设置行分组列 */
  setRowGroupColumns(columns: string[]): void {
    this.rowGroupColumns = columns;
  }

  /** 设置值列 */
  setValueColumns(columns: PivotValueColumn[]): void {
    this.valueColumns = columns;
  }

  /** 添加透视列 */
  addPivotColumn(colId: string): void {
    if (!this.pivotColumns.includes(colId)) {
      this.pivotColumns.push(colId);
    }
  }

  /** 移除透视列 */
  removePivotColumn(colId: string): void {
    this.pivotColumns = this.pivotColumns.filter(c => c !== colId);
  }

  /** 添加行分组列 */
  addRowGroupColumn(colId: string): void {
    if (!this.rowGroupColumns.includes(colId)) {
      this.rowGroupColumns.push(colId);
    }
  }

  /** 添加值列 */
  addValueColumn(column: PivotValueColumn): void {
    this.valueColumns.push(column);
  }

  /** 执行透视计算 */
  compute(rowData: any[]): PivotResult {
    if (!this.pivotMode || this.pivotColumns.length === 0) {
      this.pivotResult = { headers: [], rows: [], totals: {} };
      return this.pivotResult;
    }

    // 1. 收集所有唯一的透视值（列头）
    const pivotValueSet = new Set<string>();
    for (const row of rowData) {
      for (const pivotCol of this.pivotColumns) {
        const val = row[pivotCol];
        if (val !== undefined && val !== null) {
          pivotValueSet.add(String(val));
        }
      }
    }
    const pivotHeaders = Array.from(pivotValueSet).sort();

    // 2. 构建行分组
    const groupedData = this.groupByFields(rowData, this.rowGroupColumns);

    // 3. 对每个分组计算聚合值
    const resultRows: PivotRow[] = [];
    const totals: Record<string, number> = {};

    for (const [groupKey, groupRows] of Object.entries(groupedData)) {
      const row: PivotRow = {
        groupKey,
        groupValues: this.parseGroupKey(groupKey),
        values: {}
      };

      for (const pivotHeader of pivotHeaders) {
        const matchingRows = groupRows.filter(r => {
          return this.pivotColumns.some(pc => String(r[pc]) === pivotHeader);
        });

        for (const valueCol of this.valueColumns) {
          const key = `${pivotHeader}_${valueCol.field}`;
          const aggregated = this.aggregate(matchingRows, valueCol.field, valueCol.aggFunc);
          row.values[key] = aggregated;

          // 累加总计
          if (!totals[key]) totals[key] = 0;
          if (valueCol.aggFunc !== 'count') {
            totals[key] += aggregated;
          }
        }
      }

      resultRows.push(row);
    }

    // 4. 构建列头
    const headers: PivotHeader[] = [];
    for (const pivotHeader of pivotHeaders) {
      for (const valueCol of this.valueColumns) {
        headers.push({
          key: `${pivotHeader}_${valueCol.field}`,
          label: `${pivotHeader} - ${valueCol.field}`,
          pivotValue: pivotHeader,
          valueField: valueCol.field,
          aggFunc: valueCol.aggFunc
        });
      }
    }

    this.pivotResult = { headers, rows: resultRows, totals };
    if (this.onPivotChanged) this.onPivotChanged(this.pivotResult);
    return this.pivotResult;
  }

  /** 获取透视结果 */
  getResult(): PivotResult | null { return this.pivotResult; }

  /** 获取透视列头（可转换为 ColDef） */
  getPivotColumnDefs(): any[] {
    if (!this.pivotResult) return [];
    const defs: any[] = [];
    // 行分组列
    for (let i = 0; i < this.rowGroupColumns.length; i++) {
      defs.push({ field: `group_${i}`, headerName: this.rowGroupColumns[i] });
    }
    // 透视值列
    for (const header of this.pivotResult.headers) {
      defs.push({ field: header.key, headerName: header.label });
    }
    return defs;
  }

  /** 注册透视变更回调 */
  onPivotChangedEvent(callback: (result: PivotResult) => void): void {
    this.onPivotChanged = callback;
  }

  /** 重置 */
  reset(): void {
    this.pivotColumns = [];
    this.rowGroupColumns = [];
    this.valueColumns = [];
    this.pivotResult = null;
  }

  // ===== 内部方法 =====

  private groupByFields(data: any[], fields: string[]): Record<string, any[]> {
    if (fields.length === 0) return { '全部': data };

    const result: Record<string, any[]> = {};
    for (const row of data) {
      const key = fields.map(f => String(row[f] ?? '')).join('|');
      if (!result[key]) result[key] = [];
      result[key].push(row);
    }
    return result;
  }

  private parseGroupKey(key: string): string[] {
    return key.split('|');
  }

  private aggregate(rows: any[], field: string, aggFunc: AggFunc): number {
    if (rows.length === 0) return 0;
    const values = rows.map(r => Number(r[field]) || 0);

    switch (aggFunc) {
      case 'sum': return values.reduce((a, b) => a + b, 0);
      case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min': return Math.min(...values);
      case 'max': return Math.max(...values);
      case 'count': return rows.length;
      case 'first': return values[0];
      case 'last': return values[values.length - 1];
      default: return values.reduce((a, b) => a + b, 0);
    }
  }

  destroy(): void {
    this.pivotResult = null;
    this.onPivotChanged = null;
  }
}

/** 透视配置 */
export interface PivotConfig {
  enabled?: boolean;
  pivotMode?: boolean;
  pivotColumns?: string[];
  rowGroupColumns?: string[];
  valueColumns?: PivotValueColumn[];
}

/** 透视值列 */
export interface PivotValueColumn {
  field: string;
  aggFunc: AggFunc;
}

/** 聚合函数类型 */
export type AggFunc = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'first' | 'last';

/** 透视结果 */
export interface PivotResult {
  headers: PivotHeader[];
  rows: PivotRow[];
  totals: Record<string, number>;
}

/** 透视列头 */
export interface PivotHeader {
  key: string;
  label: string;
  pivotValue: string;
  valueField: string;
  aggFunc: AggFunc;
}

/** 透视行 */
export interface PivotRow {
  groupKey: string;
  groupValues: string[];
  values: Record<string, number>;
}
