/**
 * 编辑器服务
 * 提供 7 种内置单元格编辑器的配置与值处理逻辑：
 *   text / number / select / date / checkbox / largeText / richSelect
 */

import { Injectable } from '@angular/core';
import { ColDef } from '../models';

// ─── 编辑器类型 ───────────────────────────────────────────────────────────────

export type EditorType =
  | 'agTextCellEditor'
  | 'agNumberCellEditor'
  | 'agSelectCellEditor'
  | 'agDateCellEditor'
  | 'agCheckboxCellEditor'
  | 'agLargeTextCellEditor'
  | 'agRichSelectCellEditor';

// ─── 编辑器参数 ───────────────────────────────────────────────────────────────

export interface TextEditorParams {
  maxLength?: number;
  placeholder?: string;
  useFormatter?: boolean;
}

export interface NumberEditorParams {
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  placeholder?: string;
}

export interface SelectEditorParams {
  values: any[];
  valueListGap?: number;
  valueListMaxHeight?: number;
  formatValue?: (value: any) => string;
}

export interface DateEditorParams {
  min?: string;   // YYYY-MM-DD
  max?: string;
  format?: string;
}

export interface CheckboxEditorParams {
  // 无额外参数
}

export interface LargeTextEditorParams {
  maxLength?: number;
  rows?: number;
  cols?: number;
}

export interface RichSelectEditorParams {
  values: any[];
  searchable?: boolean;
  searchDebounceDelay?: number;
  allowTyping?: boolean;
  filterList?: boolean;
  highlightMatch?: boolean;
  valueListMaxHeight?: number;
  valueListGap?: number;
  formatValue?: (value: any) => string;
  cellRenderer?: any;
}

export type EditorParams =
  | TextEditorParams
  | NumberEditorParams
  | SelectEditorParams
  | DateEditorParams
  | CheckboxEditorParams
  | LargeTextEditorParams
  | RichSelectEditorParams;

// ─── 编辑会话 ─────────────────────────────────────────────────────────────────

export interface EditSession {
  rowId: string;
  colId: string;
  field: string;
  originalValue: any;
  currentValue: any;
  editorType: EditorType;
  editorParams: EditorParams;
  startedByKey?: string;   // 触发编辑的按键
  startedByClick?: boolean;
}

// ─── 服务 ─────────────────────────────────────────────────────────────────────

@Injectable()
export class EditorService {
  private activeSession: EditSession | null = null;
  private pendingChanges: Map<string, Map<string, any>> = new Map(); // rowId → colId → newValue

  // ── 编辑会话管理 ──────────────────────────────────────────────────────────

  /**
   * 开始编辑一个单元格
   */
  startEditing(
    rowId: string,
    colDef: ColDef,
    currentValue: any,
    trigger?: { key?: string; click?: boolean }
  ): EditSession | null {
    if (!this.isCellEditable(colDef, currentValue)) return null;
    // 防止同一单元格重复进入编辑状态
    const colId = colDef.colId || colDef.field || '';
    if (this.activeSession?.rowId === rowId && this.activeSession?.colId === colId) return null;

    const editorType = this.resolveEditorType(colDef);
    const editorParams = this.resolveEditorParams(colDef);

    this.activeSession = {
      rowId,
      colId: colDef.colId || colDef.field || '',
      field: colDef.field || '',
      originalValue: currentValue,
      currentValue,
      editorType,
      editorParams,
      startedByKey: trigger?.key,
      startedByClick: trigger?.click,
    };

    return this.activeSession;
  }

  /**
   * 更新当前编辑值
   */
  updateValue(value: any): void {
    if (this.activeSession) {
      this.activeSession.currentValue = value;
    }
  }

  /**
   * 提交编辑（保存）
   * 返回 { rowId, field, oldValue, newValue } 或 null（值未变化）
   */
  commitEdit(): { rowId: string; field: string; oldValue: any; newValue: any } | null {
    if (!this.activeSession) return null;

    const { rowId, field, originalValue, currentValue } = this.activeSession;
    const parsedValue = this.parseValue(currentValue, this.activeSession.editorType);

    this.activeSession = null;

    if (this.valuesEqual(originalValue, parsedValue)) return null;

    // 记录待提交变更
    if (!this.pendingChanges.has(rowId)) {
      this.pendingChanges.set(rowId, new Map());
    }
    this.pendingChanges.get(rowId)!.set(field, parsedValue);

    return { rowId, field, oldValue: originalValue, newValue: parsedValue };
  }

  /**
   * 取消编辑（还原）
   */
  cancelEdit(): void {
    this.activeSession = null;
  }

  getActiveSession(): EditSession | null {
    return this.activeSession;
  }

  isEditing(): boolean {
    return this.activeSession !== null;
  }

  isEditingCell(rowId: string, colId: string): boolean {
    return (
      this.activeSession?.rowId === rowId &&
      this.activeSession?.colId === colId
    );
  }

  // ── 批量编辑 ──────────────────────────────────────────────────────────────

  /**
   * 获取并清空所有待提交变更
   */
  flushPendingChanges(): Array<{ rowId: string; field: string; newValue: any }> {
    const result: Array<{ rowId: string; field: string; newValue: any }> = [];
    this.pendingChanges.forEach((colMap, rowId) => {
      colMap.forEach((newValue, field) => {
        result.push({ rowId, field, newValue });
      });
    });
    this.pendingChanges.clear();
    return result;
  }

  // ── 编辑器类型推断 ────────────────────────────────────────────────────────

  /**
   * 根据列定义推断编辑器类型
   */
  resolveEditorType(colDef: ColDef): EditorType {
    if (colDef.cellEditor) {
      // 支持简化名映射
      const aliasMap: Record<string, EditorType> = {
        'text': 'agTextCellEditor',
        'number': 'agNumberCellEditor',
        'select': 'agSelectCellEditor',
        'date': 'agDateCellEditor',
        'checkbox': 'agCheckboxCellEditor',
        'largeText': 'agLargeTextCellEditor',
        'richSelect': 'agRichSelectCellEditor',
      };
      const raw = String(colDef.cellEditor);
      return aliasMap[raw] || (raw as EditorType);
    }

    // 根据 cellType 自动推断
    switch (colDef.cellType) {
      case 'number':  return 'agNumberCellEditor';
      case 'date':    return 'agDateCellEditor';
      case 'boolean': return 'agCheckboxCellEditor';
      default:        return 'agTextCellEditor';
    }
  }

  /**
   * 解析编辑器参数
   */
  resolveEditorParams(colDef: ColDef): EditorParams {
    const base = colDef.cellEditorParams || {};
    const type = this.resolveEditorType(colDef);

    switch (type) {
      case 'agNumberCellEditor':
        return {
          min: base.min,
          max: base.max,
          step: base.step ?? 1,
          precision: base.precision,
          placeholder: base.placeholder,
        } as NumberEditorParams;

      case 'agSelectCellEditor':
        return {
          values: base.values ?? [],
          formatValue: base.formatValue,
        } as SelectEditorParams;

      case 'agRichSelectCellEditor':
        return {
          values: base.values ?? [],
          searchable: base.searchable ?? true,
          allowTyping: base.allowTyping ?? false,
          filterList: base.filterList ?? true,
          highlightMatch: base.highlightMatch ?? true,
          formatValue: base.formatValue,
          cellRenderer: base.cellRenderer,
        } as RichSelectEditorParams;

      case 'agDateCellEditor':
        return {
          min: base.min,
          max: base.max,
          format: base.format ?? 'YYYY-MM-DD',
        } as DateEditorParams;

      case 'agLargeTextCellEditor':
        return {
          maxLength: base.maxLength ?? 2000,
          rows: base.rows ?? 10,
          cols: base.cols ?? 60,
        } as LargeTextEditorParams;

      default:
        return {
          maxLength: base.maxLength,
          placeholder: base.placeholder,
          useFormatter: base.useFormatter ?? false,
        } as TextEditorParams;
    }
  }

  // ── 值处理 ────────────────────────────────────────────────────────────────

  /**
   * 将编辑器输出的字符串解析为正确类型
   */
  parseValue(value: any, editorType: EditorType): any {
    switch (editorType) {
      case 'agNumberCellEditor':
        if (value === '' || value == null) return null;
        const num = Number(value);
        return isNaN(num) ? null : num;

      case 'agCheckboxCellEditor':
        if (typeof value === 'boolean') return value;
        return value === 'true' || value === true || value === 1;

      case 'agDateCellEditor':
        if (!value) return null;
        // 统一返回 ISO 日期字符串
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];

      default:
        return value;
    }
  }

  /**
   * 格式化值用于编辑器显示
   */
  formatValueForEditor(value: any, editorType: EditorType): string {
    if (value == null) return '';
    switch (editorType) {
      case 'agDateCellEditor':
        const d = new Date(value);
        if (isNaN(d.getTime())) return String(value);
        return d.toISOString().split('T')[0];
      case 'agCheckboxCellEditor':
        return String(Boolean(value));
      default:
        return String(value);
    }
  }

  // ── 可编辑性检查 ──────────────────────────────────────────────────────────

  isCellEditable(colDef: ColDef, data?: any): boolean {
    if (!colDef.editable) return false;
    if (typeof colDef.editable === 'function') {
      return colDef.editable({ colDef, data, node: null, api: null, context: null } as any);
    }
    return colDef.editable === true;
  }

  // ── 键盘触发判断 ──────────────────────────────────────────────────────────

  /**
   * 判断按键是否应触发编辑
   */
  shouldStartEditOnKey(key: string): boolean {
    // 可打印字符、F2、Enter 触发编辑
    if (key === 'F2' || key === 'Enter') return true;
    if (key.length === 1) return true;  // 单个可打印字符
    return false;
  }

  /**
   * 判断按键是否应提交编辑
   */
  shouldCommitOnKey(key: string): boolean {
    return key === 'Enter' || key === 'Tab';
  }

  /**
   * 判断按键是否应取消编辑
   */
  shouldCancelOnKey(key: string): boolean {
    return key === 'Escape';
  }

  // ── 工具 ──────────────────────────────────────────────────────────────────

  private valuesEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  }

  /**
   * 获取编辑器的显示名称
   */
  getEditorLabel(type: EditorType): string {
    const labels: Record<EditorType, string> = {
      agTextCellEditor:      '文本',
      agNumberCellEditor:    '数字',
      agSelectCellEditor:    '下拉选择',
      agDateCellEditor:      '日期',
      agCheckboxCellEditor:  '复选框',
      agLargeTextCellEditor: '多行文本',
      agRichSelectCellEditor:'富选择',
    };
    return labels[type] ?? type;
  }

  /**
   * 获取所有内置编辑器列表
   */
  getBuiltinEditors(): EditorType[] {
    return [
      'agTextCellEditor',
      'agNumberCellEditor',
      'agSelectCellEditor',
      'agDateCellEditor',
      'agCheckboxCellEditor',
      'agLargeTextCellEditor',
      'agRichSelectCellEditor',
    ];
  }

  destroy(): void {
    this.activeSession = null;
    this.pendingChanges.clear();
  }
}
