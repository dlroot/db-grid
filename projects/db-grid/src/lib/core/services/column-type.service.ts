/**
 * 列类型服务
 * 管理内置列类型和自定义列类型，支持 defaultColDef 合并
 * AG Grid 对应功能：Column Types + Default Col Def
 */

import { Injectable } from '@angular/core';
import { ColDef } from '../models';

/** 内置列类型定义 */
const BUILTIN_COLUMN_TYPES: Record<string, Partial<ColDef>> = {
  textColumn: {
    filter: 'text',
    editable: true,
    sortable: true,
    resizable: true,
  },
  numberColumn: {
    filter: 'number',
    editable: true,
    sortable: true,
    resizable: true,
    cellAlign: 'right',
  },
  dateColumn: {
    filter: 'date',
    editable: true,
    sortable: true,
    resizable: true,
    cellRenderer: 'dateRenderer',
  },
  booleanColumn: {
    filter: 'boolean',
    editable: true,
    cellRenderer: 'booleanRenderer',
  },
  largeTextColumn: {
    filter: 'text',
    editable: true,
    cellEditor: 'textarea',
  },
  percentageColumn: {
    filter: 'number',
    editable: true,
    cellAlign: 'right',
    valueFormatter: (params: any) => {
      const val = params.value;
      if (val == null) return '';
      return (val * 100).toFixed(2) + '%';
    },
  },
};

@Injectable({ providedIn: 'root' })
export class ColumnTypeService {
  /** 自定义列类型（覆盖或扩展内置类型） */
  private customColumnTypes: Record<string, Partial<ColDef>> = {};

  /** 合并后的所有列类型（内置 + 自定义） */
  private get allColumnTypes(): Record<string, Partial<ColDef>> {
    return { ...BUILTIN_COLUMN_TYPES, ...this.customColumnTypes };
  }

  /** 获取列类型定义 */
  getColumnType(typeName: string): Partial<ColDef> | undefined {
    return this.allColumnTypes[typeName];
  }

  /** 注册自定义列类型（可覆盖内置类型） */
  registerColumnType(name: string, colDef: Partial<ColDef>): void {
    this.customColumnTypes[name] = colDef;
  }

  /** 批量注册自定义列类型 */
  registerColumnTypes(types: Record<string, Partial<ColDef>>): void {
    this.customColumnTypes = { ...this.customColumnTypes, ...types };
  }

  /** 获取所有列类型名称 */
  getTypeNames(): string[] {
    return Object.keys(this.allColumnTypes);
  }

  /** 获取所有内置列类型名称 */
  getBuiltinTypeNames(): string[] {
    return Object.keys(BUILTIN_COLUMN_TYPES);
  }

  /** 判断列类型是否存在 */
  hasColumnType(typeName: string): boolean {
    return typeName in this.allColumnTypes;
  }

  /**
   * 应用列类型和 defaultColDef 到列定义
   * 合并顺序：defaultColDef → columnType → individual colDef overrides
   * 后者覆盖前者，保证列定义的优先级最高
   */
  applyColumnTypes(columnDefs: ColDef[], defaultColDef?: Partial<ColDef>): ColDef[] {
    if (!columnDefs || columnDefs.length === 0) return columnDefs;
    if (!defaultColDef && !columnDefs.some(col => col.type || col.cellType)) {
      return columnDefs;
    }

    return columnDefs.map(colDef => {
      // 收集要合并的类型定义
      const typeParts: Partial<ColDef>[] = [];

      // 1. defaultColDef 优先级最低（先合并）
      if (defaultColDef) {
        typeParts.push(defaultColDef);
      }

      // 2. columnType 优先级中等（覆盖 defaultColDef）
      const typeNames = this.resolveTypeNames(colDef);
      for (const typeName of typeNames) {
        const typeDef = this.allColumnTypes[typeName];
        if (typeDef) {
          typeParts.push(typeDef);
        }
      }

      // 3. 逐步合并：每次用下一级覆盖上一级
      let merged: Partial<ColDef> = {};
      for (const part of typeParts) {
        merged = this.mergeColDef(merged, part);
      }
      // 4. 最后用 individual colDef 覆盖（最高优先级）
      merged = this.mergeColDef(merged, colDef);

      return merged as ColDef;
    });
  }

  /** 解析列的类型名称（支持 type: string | string[] 以及 cellType: string） */
  private resolveTypeNames(colDef: ColDef): string[] {
    const names: string[] = [];
    if (colDef.type) {
      if (Array.isArray(colDef.type)) {
        names.push(...colDef.type);
      } else {
        names.push(colDef.type);
      }
    }
    if (colDef.cellType && !names.includes(colDef.cellType)) {
      names.push(colDef.cellType);
    }
    return names;
  }

  /**
   * 合并两个 ColDef，higherPriority 中显式定义的属性会覆盖 lowerPriority
   * lowerPriority 作为基础，higherPriority 的非 undefined 属性覆盖上去
   */
  private mergeColDef(lowerPriority: Partial<ColDef>, higherPriority: Partial<ColDef>): Partial<ColDef> {
    const result: any = {};

    // 先复制低优先级
    for (const key of Object.keys(lowerPriority)) {
      (result as any)[key] = (lowerPriority as any)[key];
    }

    // 再用高优先级覆盖（只覆盖高优先级中显式定义的属性，跳过 undefined）
    for (const key of Object.keys(higherPriority)) {
      const val = (higherPriority as any)[key];
      if (val !== undefined) {
        (result as any)[key] = val;
      }
    }

    return result;
  }

  /** 清除所有自定义列类型 */
  clearCustomTypes(): void {
    this.customColumnTypes = {};
  }

  /** 销毁 */
  destroy(): void {
    this.customColumnTypes = {};
  }
}
