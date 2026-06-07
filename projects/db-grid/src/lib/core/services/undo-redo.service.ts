import { Injectable } from '@angular/core';

/**
 * 撤销/重做服务 — 支持单元格编辑、列操作、排序、筛选的历史记录管理
 * AG Grid 对应功能：Undo/Redo Cell Edits + 扩展操作类型
 */
@Injectable({ providedIn: 'root' })
export class UndoRedoService {
  private enabled = true;
  private undoStack: UndoAction[] = [];
  private redoStack: UndoAction[] = [];
  private maxStackSize = 50;

  private onUndo: ((action: UndoAction) => void) | null = null;
  private onRedo: ((action: UndoAction) => void) | null = null;
  private onStackChanged: (() => void) | null = null;

  /** 初始化 */
  initialize(config: UndoRedoConfig = {}): void {
    this.enabled = config.enabled ?? true;
    this.maxStackSize = config.maxStackSize ?? 50;
    this.clear();
  }

  /** 是否启用 */
  isEnabled(): boolean { return this.enabled; }

  /** 启用 */
  enable(): void { this.enabled = true; }

  /** 禁用 */
  disable(): void { this.enabled = false; }

  /** 记录编辑操作 */
  recordEdit(params: EditParams): void {
    if (!this.enabled) return;

    const action: UndoAction = {
      type: 'edit',
      rowIndex: params.rowIndex,
      colId: params.colId,
      oldValue: params.oldValue,
      newValue: params.newValue,
      rowData: params.rowData,
      timestamp: Date.now()
    };

    this.pushStackItem(action);
  }

  /** 记录行添加 */
  recordRowAdd(params: RowAddParams): void {
    if (!this.enabled) return;

    const action: UndoAction = {
      type: 'rowAdd',
      rowIndex: params.rowIndex,
      rowData: params.rowData,
      timestamp: Date.now()
    };

    this.pushStackItem(action);
  }

  /** 记录行删除 */
  recordRowDelete(params: RowDeleteParams): void {
    if (!this.enabled) return;

    const action: UndoAction = {
      type: 'rowDelete',
      rowIndex: params.rowIndex,
      rowData: params.rowData,
      timestamp: Date.now()
    };

    this.pushStackItem(action);
  }

  /** 记录列宽变更 */
  recordColumnResize(params: ColumnResizeParams): void {
    if (!this.enabled) return;

    const action: UndoAction = {
      type: 'columnResize',
      colId: params.colId,
      oldWidth: params.oldWidth,
      newWidth: params.newWidth,
      rowData: {},
      timestamp: Date.now()
    };

    this.pushStackItem(action);
  }

  /** 记录列移动 */
  recordColumnMove(params: ColumnMoveParams): void {
    if (!this.enabled) return;

    const action: UndoAction = {
      type: 'columnMove',
      colId: params.colId,
      fromIndex: params.fromIndex,
      toIndex: params.toIndex,
      rowData: {},
      timestamp: Date.now()
    };

    this.pushStackItem(action);
  }

  /** 记录排序变更 */
  recordSortChange(params: SortChangeParams): void {
    if (!this.enabled) return;

    const action: UndoAction = {
      type: 'sortChange',
      colId: params.colId,
      oldSort: params.oldSort,
      newSort: params.newSort,
      rowData: {},
      timestamp: Date.now()
    };

    this.pushStackItem(action);
  }

  /** 记录筛选变更 */
  recordFilterChange(params: FilterChangeParams): void {
    if (!this.enabled) return;

    const action: UndoAction = {
      type: 'filterChange',
      colId: params.colId,
      oldFilter: params.oldFilter,
      newFilter: params.newFilter,
      rowData: {},
      timestamp: Date.now()
    };

    this.pushStackItem(action);
  }

  /**
   * 推入撤销栈
   * 同时清空重做栈，并限制栈大小
   */
  pushStackItem(item: UndoAction): void {
    if (!this.enabled) return;

    this.undoStack.push(item);
    // 新操作使重做栈失效
    this.redoStack = [];

    // 限制栈大小
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    this.emitStackChanged();
  }

  /** 撤销 */
  undo(): UndoAction | null {
    if (!this.canUndo()) return null;

    const action = this.undoStack.pop()!;
    this.redoStack.push(action);

    this.emitUndo(action);
    this.emitStackChanged();

    return action;
  }

  /** 重做 */
  redo(): UndoAction | null {
    if (!this.canRedo()) return null;

    const action = this.redoStack.pop()!;
    this.undoStack.push(action);

    this.emitRedo(action);
    this.emitStackChanged();

    return action;
  }

  /** 是否可撤销 */
  canUndo(): boolean {
    return this.enabled && this.undoStack.length > 0;
  }

  /** 是否可重做 */
  canRedo(): boolean {
    return this.enabled && this.redoStack.length > 0;
  }

  /** 获取撤销栈大小 */
  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  /** 获取重做栈大小 */
  getRedoStackSize(): number {
    return this.redoStack.length;
  }

  /** 获取撤销栈（只读） */
  getUndoStack(): readonly UndoAction[] {
    return [...this.undoStack];
  }

  /** 获取重做栈（只读） */
  getRedoStack(): readonly UndoAction[] {
    return [...this.redoStack];
  }

  /** 清空历史 */
  clearStack(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.emitStackChanged();
  }

  /** 清空历史（别名） */
  clear(): void {
    this.clearStack();
  }

  /** 设置最大栈大小 */
  setMaxStackItems(max: number): void {
    this.maxStackSize = max;
    // 如果当前栈超过新限制，裁剪
    while (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    while (this.redoStack.length > this.maxStackSize) {
      this.redoStack.shift();
    }
    this.emitStackChanged();
  }

  /** 获取最大栈大小 */
  getMaxStackItems(): number {
    return this.maxStackSize;
  }

  /** 注册撤销回调 */
  onUndoEvent(callback: (action: UndoAction) => void): void {
    this.onUndo = callback;
  }

  /** 注册重做回调 */
  onRedoEvent(callback: (action: UndoAction) => void): void {
    this.onRedo = callback;
  }

  /** 栈变化回调 */
  onStackChangedEvent(callback: () => void): void {
    this.onStackChanged = callback;
  }

  private emitUndo(action: UndoAction): void {
    if (this.onUndo) this.onUndo(action);
  }

  private emitRedo(action: UndoAction): void {
    if (this.onRedo) this.onRedo(action);
  }

  private emitStackChanged(): void {
    if (this.onStackChanged) this.onStackChanged();
  }

  destroy(): void {
    this.clear();
    this.onUndo = null;
    this.onRedo = null;
    this.onStackChanged = null;
  }
}

/** 撤销/重做配置 */
export interface UndoRedoConfig {
  enabled?: boolean;
  maxStackSize?: number;
}

/** 撤销动作 */
export interface UndoAction {
  type: 'edit' | 'rowAdd' | 'rowDelete' | 'columnResize' | 'columnMove' | 'sortChange' | 'filterChange';
  rowIndex?: number;
  colId?: string;
  oldValue?: any;
  newValue?: any;
  oldWidth?: number;
  newWidth?: number;
  fromIndex?: number;
  toIndex?: number;
  oldSort?: 'asc' | 'desc' | null;
  newSort?: 'asc' | 'desc' | null;
  oldFilter?: any;
  newFilter?: any;
  rowData: any;
  timestamp: number;
}

/** 编辑参数 */
export interface EditParams {
  rowIndex: number;
  colId: string;
  oldValue: any;
  newValue: any;
  rowData: any;
}

/** 行添加参数 */
export interface RowAddParams {
  rowIndex: number;
  rowData: any;
}

/** 行删除参数 */
export interface RowDeleteParams {
  rowIndex: number;
  rowData: any;
}

/** 列宽变更参数 */
export interface ColumnResizeParams {
  colId: string;
  oldWidth: number;
  newWidth: number;
}

/** 列移动参数 */
export interface ColumnMoveParams {
  colId: string;
  fromIndex: number;
  toIndex: number;
}

/** 排序变更参数 */
export interface SortChangeParams {
  colId: string;
  oldSort: 'asc' | 'desc' | null;
  newSort: 'asc' | 'desc' | null;
}

/** 筛选变更参数 */
export interface FilterChangeParams {
  colId: string;
  oldFilter: any;
  newFilter: any;
}
