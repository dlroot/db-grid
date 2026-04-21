/**
 * Cell Data Types 服务
 * 自动推断列数据类型，联动配置筛选器、编辑器、格式化、对齐等
 *
 * 用法：
 *   gridOptions = {
 *     columnDefs: [...],
 *     rowData: [...],
 *     columnTypes: { agNumberColumn: { cellAlign: 'right', filter: 'agNumberColumnFilter' } },
 *   }
 *
 * 组件中：
 *   this.cellDataTypeService.applyAutoTypes(columnDefs, rowData, gridOptions)
 */

import { Injectable } from '@angular/core';
import { ColDef, GridOptions } from '../models';

/** 推断出的数据类型 */
export type CellDataType = 'text' | 'number' | 'date' | 'boolean' | 'object' | 'undefined';

/** 类型推断结果 */
export interface ColumnTypeInference {
  colId: string;
  field: string | undefined;
  inferredType: CellDataType;
  confidence: number; // 0-1，数据扫描的置信度
}

/** 内置列类型预设 */
export interface ColumnTypePreset {
  /** 是否启用 */
  enabled?: boolean;
  /** 筛选器 */
  filter?: string | boolean;
  /** 编辑器 */
  cellEditor?: string;
  /** 对齐方式 */
  cellAlign?: 'left' | 'center' | 'right';
  /** cellType */
  cellType?: string;
  /** 值格式化 */
  valueFormatter?: any;
  /** 排序比较器 */
  comparator?: any;
  /** 宽度 */
  width?: number;
  /** 最小宽度 */
  minWidth?: number;
  /** 可编辑 */
  editable?: boolean;
}

/** 采样数量（扫描多少行来推断类型） */
const SAMPLE_SIZE = 100;

@Injectable()
export class CellDataTypeService {

  // ========== 内置预设 ==========

  /** AG Grid 兼容的列类型预设 */
  static readonly BUILTIN_PRESETS: Record<string, ColumnTypePreset> = {
    agTextColumn: {
      cellType: 'text',
      filter: true,
      cellEditor: 'agTextCellEditor',
      cellAlign: 'left',
    },
    agNumberColumn: {
      cellType: 'number',
      filter: 'agNumberColumnFilter',
      cellEditor: 'agNumberCellEditor',
      cellAlign: 'right',
      valueFormatter: CellDataTypeService.numberFormatter,
      comparator: CellDataTypeService.numberComparator,
    },
    agDateColumn: {
      cellType: 'date',
      filter: 'agDateColumnFilter',
      cellEditor: 'agDateCellEditor',
      cellAlign: 'left',
      valueFormatter: CellDataTypeService.dateFormatter,
      comparator: CellDataTypeService.dateComparator,
    },
    agBooleanColumn: {
      cellType: 'boolean',
      filter: 'agBooleanColumnFilter',
      cellEditor: 'agCheckboxCellEditor',
      cellAlign: 'center',
    },
    agObjectColumn: {
      cellType: 'object',
      filter: true,
      editable: false,
    },
  };

  // ========== 自动推断 ==========

  /**
   * 扫描 rowData，推断每列的数据类型
   * @returns 每列的推断结果
   */
  inferColumnTypes(columnDefs: ColDef[], rowData: any[]): ColumnTypeInference[] {
    if (!rowData || rowData.length === 0 || !columnDefs || columnDefs.length === 0) {
      return [];
    }

    const sample = rowData.slice(0, SAMPLE_SIZE);
    const fields = columnDefs.filter(c => c.field && !c.hide).map(c => ({
      colId: c.colId || c.field!,
      field: c.field!,
    }));

    return fields.map(({ colId, field }) => {
      const values: any[] = [];
      for (const row of sample) {
        const v = this.getNestedValue(row, field);
        if (v !== null && v !== undefined && v !== '') {
          values.push(v);
        }
      }

      const { type, confidence } = this.inferType(values);
      return { colId, field, inferredType: type, confidence };
    });
  }

  /**
   * 核心：自动推断类型 + 应用 columnTypes 预设 + 合并到 columnDefs
   *
   * 流程：
   * 1. 应用 columnTypes 预设（用户在 gridOptions 中定义的）
   * 2. 扫描数据推断未指定类型的列
   * 3. 将推断结果写入 columnDefs（仅在用户未显式配置时）
   *
   * @returns 推断结果（用于调试/日志）
   */
  applyAutoTypes(
    columnDefs: ColDef[],
    rowData: any[],
    gridOptions: GridOptions = {}
  ): ColumnTypeInference[] {
    if (!columnDefs || columnDefs.length === 0) return [];

    // 1. 应用 columnTypes 预设
    this.applyColumnTypes(columnDefs, gridOptions);

    // 2. 应用 defaultColDef
    if (gridOptions.defaultColDef) {
      this.applyDefaultColDef(columnDefs, gridOptions.defaultColDef);
    }

    // 3. 扫描数据推断未指定类型的列
    const inferences = this.inferColumnTypes(columnDefs, rowData);
    for (const inf of inferences) {
      const colDef = columnDefs.find(c => (c.colId || c.field) === inf.colId || c.field === inf.field);
      if (!colDef) continue;

      // 只在用户没有显式指定 cellType / filter 时才自动推断
      const userSpecifiedType = colDef.cellType
        || (typeof colDef.filter === 'string' ? colDef.filter : null);

      if (!userSpecifiedType && inf.confidence >= 0.6) {
        this.applyInferredType(colDef, inf.inferredType);
      }
    }

    return inferences;
  }

  /**
   * 应用 columnTypes 预设到 columnDefs
   * AG Grid 兼容：columnDefs 中 type: 'agNumberColumn' 会应用对应预设
   */
  applyColumnTypes(columnDefs: ColDef[], gridOptions: GridOptions): void {
    const allPresets = {
      ...CellDataTypeService.BUILTIN_PRESETS,
      ...(gridOptions.columnTypes || {}),
    } as Record<string, ColumnTypePreset>;

    for (const colDef of columnDefs) {
      if (!colDef.type) continue;

      const types = Array.isArray(colDef.type) ? colDef.type : [colDef.type];
      for (const typeName of types) {
        const preset = allPresets[typeName];
        if (!preset || preset.enabled === false) continue;

        // 只设置用户未显式定义的属性
        if (preset.cellType && !colDef.cellType) colDef.cellType = preset.cellType;
        if (preset.filter !== undefined && colDef.filter === undefined) colDef.filter = preset.filter;
        if (preset.cellEditor && !colDef.cellEditor) colDef.cellEditor = preset.cellEditor;
        if (preset.cellAlign && !colDef.cellAlign) colDef.cellAlign = preset.cellAlign;
        if (preset.valueFormatter && !colDef.valueFormatter) colDef.valueFormatter = preset.valueFormatter;
        if (preset.comparator && !(colDef as any).comparator) (colDef as any).comparator = preset.comparator;
        if (preset.width && !colDef.width) colDef.width = preset.width;
        if (preset.minWidth && !colDef.minWidth) colDef.minWidth = preset.minWidth;
        if (preset.editable !== undefined && colDef.editable === undefined) colDef.editable = preset.editable;
      }
    }
  }

  /**
   * 应用 defaultColDef 到所有 columnDefs
   * 只覆盖用户未显式定义的属性
   */
  applyDefaultColDef(columnDefs: ColDef[], defaultDef: Partial<ColDef>): void {
    const skipKeys = new Set(['field', 'colId', 'headerName', 'children']);
    for (const colDef of columnDefs) {
      for (const [key, value] of Object.entries(defaultDef)) {
        if (skipKeys.has(key)) continue;
        if ((colDef as any)[key] === undefined) {
          (colDef as any)[key] = value;
        }
      }
    }
  }

  // ========== 内部方法 ==========

  /**
   * 将推断类型应用到列定义
   */
  private applyInferredType(colDef: ColDef, type: CellDataType): void {
    switch (type) {
      case 'number':
        colDef.cellType = 'number';
        if (colDef.filter === undefined) colDef.filter = 'agNumberColumnFilter';
        if (!colDef.cellEditor) colDef.cellEditor = 'agNumberCellEditor';
        if (!colDef.cellAlign) colDef.cellAlign = 'right';
        if (!colDef.valueFormatter) colDef.valueFormatter = CellDataTypeService.numberFormatter;
        break;

      case 'date':
        colDef.cellType = 'date';
        if (colDef.filter === undefined) colDef.filter = 'agDateColumnFilter';
        if (!colDef.cellEditor) colDef.cellEditor = 'agDateCellEditor';
        if (!colDef.valueFormatter) colDef.valueFormatter = CellDataTypeService.dateFormatter;
        break;

      case 'boolean':
        colDef.cellType = 'boolean';
        if (colDef.filter === undefined) colDef.filter = 'agBooleanColumnFilter';
        if (!colDef.cellEditor) colDef.cellEditor = 'agCheckboxCellEditor';
        if (!colDef.cellAlign) colDef.cellAlign = 'center';
        break;

      case 'text':
      default:
        if (!colDef.cellType) colDef.cellType = 'text';
        if (colDef.filter === undefined) colDef.filter = true;
        break;
    }
  }

  /**
   * 从值列表推断类型
   */
  private inferType(values: any[]): { type: CellDataType; confidence: number } {
    if (values.length === 0) {
      return { type: 'text', confidence: 0 };
    }

    const typeCounts: Record<CellDataType, number> = {
      text: 0,
      number: 0,
      date: 0,
      boolean: 0,
      object: 0,
      undefined: 0,
    };

    for (const v of values) {
      typeCounts[this.valueTypeOf(v)]++;
    }

    const total = values.length;
    let bestType: CellDataType = 'text';
    let bestCount = 0;

    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > bestCount) {
        bestCount = count;
        bestType = type as CellDataType;
      }
    }

    return {
      type: bestType,
      confidence: bestCount / total,
    };
  }

  /**
   * 判断单个值的类型
   */
  private valueTypeOf(v: any): CellDataType {
    if (v === null || v === undefined) return 'undefined';

    // boolean 优先（也是 number 的子集）
    if (v === true || v === false) return 'boolean';

    // number（排除 NaN）
    if (typeof v === 'number' && !isNaN(v)) return 'number';

    // date 对象
    if (v instanceof Date) return 'date';

    // 日期字符串
    if (typeof v === 'string' && this.isDateString(v)) return 'date';

    // 对象
    if (typeof v === 'object') return 'object';

    return 'text';
  }

  /**
   * 检测是否为日期字符串
   * 支持：YYYY-MM-DD, YYYY/MM/DD, YYYY-MM-DD HH:mm:ss, ISO 8601
   */
  private isDateString(s: string): boolean {
    if (s.length < 6 || s.length > 30) return false;

    // ISO 8601
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/.test(s)) {
      const d = new Date(s);
      return !isNaN(d.getTime());
    }

    // YYYY/MM/DD or YYYY.MM.DD
    if (/^\d{4}[\/\.]\d{2}[\/\.]\d{2}/.test(s)) {
      const d = new Date(s.replace(/[\/\.]/g, '-'));
      return !isNaN(d.getTime());
    }

    return false;
  }

  /**
   * 读取嵌套属性值（支持 'address.city' 格式）
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj);
  }

  // ========== 内置格式化器 ==========

  /** 数字格式化 */
  static numberFormatter(params: any): string {
    const v = params.value;
    if (v === null || v === undefined || v === '') return '';
    const num = Number(v);
    if (isNaN(num)) return String(v);
    return num.toLocaleString();
  }

  /** 日期格式化 */
  static dateFormatter(params: any): string {
    const v = params.value;
    if (!v) return '';
    if (v instanceof Date) {
      return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
    }
    if (typeof v === 'string') {
      const d = new Date(v);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    }
    return String(v);
  }

  /** 数字排序比较器 */
  static numberComparator(a: any, b: any): number {
    const na = Number(a);
    const nb = Number(b);
    if (isNaN(na) && isNaN(nb)) return 0;
    if (isNaN(na)) return 1;
    if (isNaN(nb)) return -1;
    return na - nb;
  }

  /** 日期排序比较器 */
  static dateComparator(a: any, b: any): number {
    const da = a instanceof Date ? a.getTime() : new Date(a).getTime();
    const db = b instanceof Date ? b.getTime() : new Date(b).getTime();
    return da - db;
  }
}
