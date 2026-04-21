import { Injectable } from '@angular/core';

/**
 * 撤销/重做服务 — 支持单元格编辑的历史记录管理
 * AG Grid 对应功能：Undo/Redo Cell Edits
 */
@Injectable({ providedIn: 'root' })
export class UndoRedoService {
  private enabled = true;
  private undoStack: UndoAction[] = [];
  private redoStack: UndoAction[] = [];
  private maxStackSize = 100;

  private onUndo: ((action: UndoAction) => void) | null = null;
  private onRedo: ((action: UndoAction) => void) | null = null;
  private onStackChanged: (() => void) | null = null;

  /** 初始化 */
  initialize(config: UndoRedoConfig = {}): void {
    this.enabled = config.enabled ?? true;
    this.maxStackSize = config.maxStackSize ?? 100;
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

    this.undoStack.push(action);

    // 清空 redo 栈（新操作使 redo 失效）
    this.redoStack = [];

    // 限制栈大小
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    this.emitStackChanged();
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

    this.undoStack.push(action);
    this.redoStack = [];

    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    this.emitStackChanged();
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

    this.undoStack.push(action);
    this.redoStack = [];

    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    this.emitStackChanged();
  }

  /** 撤销 */
  undo(): UndoAction | null {
    if (!this.enabled || this.undoStack.length === 0) return null;

    const action = this.undoStack.pop()!;
    this.redoStack.push(action);

    this.emitUndo(action);
    this.emitStackChanged();

    return action;
  }

  /** 重做 */
  redo(): UndoAction | null {
    if (!this.enabled || this.redoStack.length === 0) return null;

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
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.emitStackChanged();
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
  type: 'edit' | 'rowAdd' | 'rowDelete';
  rowIndex: number;
  colId?: string;
  oldValue?: any;
  newValue?: any;
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
