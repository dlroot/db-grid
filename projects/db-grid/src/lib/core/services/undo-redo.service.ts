import { Injectable } from '@angular/core';
import { GridRow } from '../models';

/**
 * 事务类型
 */
export type TransactionType = 
  | 'add'           // 添加行
  | 'remove'        // 删除行
  | 'update'        // 更新单元格
  | 'sort'          // 排序变更
  | 'filter'        // 过滤变更
  | 'columnResize'  // 列宽调整
  | 'columnMove'    // 列移动
  | 'columnVisible' // 列显示/隐藏
  | 'group'         // 分组变更
  | 'paste'         // 粘贴数据
  | 'cut'           // 剪切数据
  | 'undo'          // 撤销操作（内部使用）
  | 'redo';         // 重做操作（内部使用）

/**
 * 事务记录
 */
export interface Transaction {
  /** 事务 ID */
  id: string;
  
  /** 事务类型 */
  type: TransactionType;
  
  /** 事务描述（用于显示） */
  description: string;
  
  /** 时间戳 */
  timestamp: number;
  
  /** 撤销操作所需的数据 */
  undoData: any;
  
  /** 重做操作所需的数据 */
  redoData: any;
  
  /** 关联的行 ID（用于定位） */
  rowIds?: string[];
  
  /** 关联的列 ID（用于定位） */
  colIds?: string[];
}

/**
 * 撤销/重做服务 — 提供事务日志和撤销/重做功能
 * 
 * AG Grid 企业版对应功能：Undo/Redo
 */
@Injectable()
export class UndoRedoService {
  /** 操作历史（用于撤销） */
  private undoStack: any[] = [];
  
  /** 重做栈（用于重做） */
  private redoStack: any[] = [];
  
  /** 最大历史记录数 */
  private maxHistorySize = 50;
  
  /** 是否启用 */
  private enabled = false;
  
  /** 是否正在执行撤销/重做（防止递归） */
  private isApplying = false;
  
  /** 事务计数器（用于生成唯一 ID） */
  private transactionCounter = 0;
  
  /** 批次模式：是否正在收集批次操作 */
  private batchMode = false;
  
  /** 批次操作缓存 */
  private batchTransactions: Transaction[] = [];
  
  /** 回调函数 */
  private onUndoApplied: ((transaction: Transaction) => void) | null = null;
  private onRedoApplied: ((transaction: Transaction) => void) | null = null;
  private onHistoryChanged: (() => void) | null = null;

  /**
   * 初始化
   * @param maxHistory 最大历史记录数（默认 50）
   */
  initialize(maxHistory?: number): void {
    this.enabled = true;
    if (maxHistory !== undefined) {
      this.maxHistorySize = maxHistory;
    }
    this.clearHistory();
  }

  /**
   * 是否启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 启用撤销/重做
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * 禁用撤销/重做
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * 开始批次操作（多个操作合并为一个撤销/重做步骤）
   */
  startBatch(): void {
    if (!this.enabled || this.isApplying) return;
    this.batchMode = true;
    this.batchTransactions = [];
  }

  /**
   * 结束批次操作
   */
  endBatch(description: string): void {
    if (!this.batchMode) return;
    
    this.batchMode = false;
    
    if (this.batchTransactions.length === 0) {
      return;
    }
    
    if (this.batchTransactions.length === 1) {
      // 只有一个操作，直接记录
      this.recordTransaction(this.batchTransactions[0]);
    } else {
      // 多个操作，合并为一个事务
      const mergedTransaction: Transaction = {
        id: this.generateTransactionId(),
        type: 'update',
        description,
        timestamp: Date.now(),
        undoData: this.batchTransactions.map(t => t.undoData),
        redoData: this.batchTransactions.map(t => t.redoData),
        rowIds: this.batchTransactions.flatMap(t => t.rowIds || []),
        colIds: this.batchTransactions.flatMap(t => t.colIds || []),
      };
      this.recordTransaction(mergedTransaction);
    }
    
    this.batchTransactions = [];
  }

  /**
   * 记录编辑操作（组件使用此方法）
   * @param edit 编辑操作 { type, rowIndex, colId, oldValue, newValue, rowData?, rowId? }
   */
  recordEdit(edit: {
    type: 'edit' | 'rowAdd' | 'rowDelete' | 'columnResize' | 'sort' | 'filter';
    rowIndex?: number;
    colId?: string;
    oldValue?: any;
    newValue?: any;
    rowData?: any;
    rowId?: string;
    id?: string;
  }): void {
    if (!this.enabled || this.isApplying) return;
    
    if (this.batchMode) {
      this.batchTransactions.push(edit as any);
      return;
    }
    
    // 添加到撤销栈
    this.undoStack.push(edit as any);
    
    // 裁剪撤销栈
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
    
    // 记录新操作后，清空重做栈
    this.redoStack = [];
    
    this.emitHistoryChanged();
  }

  /**
   * 记录添加行操作（简化版）
   */
  recordAddRow(row: GridRow, index: number): void {
    this.recordEdit({
      type: 'rowAdd',
      rowIndex: index,
      rowData: { ...row },
      rowId: row.id,
    });
  }

  /**
   * 记录删除行操作（简化版）
   */
  recordRemoveRow(row: GridRow, index: number): void {
    this.recordEdit({
      type: 'rowDelete',
      rowIndex: index,
      rowData: { ...row },
      rowId: row.id,
    });
  }

  /**
   * 记录更新单元格操作（简化版）
   */
  recordCellUpdate(rowId: string, colId: string, oldValue: any, newValue: any): void {
    this.recordEdit({
      type: 'edit',
      rowId,
      colId,
      oldValue,
      newValue,
    });
  }

  /**
   * 记录批量更新操作（如粘贴）
   */
  recordBulkUpdate(updates: Array<{ rowId: string; colId: string; oldValue: any; newValue: any }>): void {
    if (!this.enabled || this.isApplying) return;
    
    const rowIds = [...new Set(updates.map(u => u.rowId))];
    const colIds = [...new Set(updates.map(u => u.colId))];
    
    const transaction: Transaction = {
      id: this.generateTransactionId(),
      type: 'paste',
      description: `批量更新 ${updates.length} 个单元格`,
      timestamp: Date.now(),
      undoData: updates.map(u => ({ rowId: u.rowId, colId: u.colId, value: u.oldValue })),
      redoData: updates.map(u => ({ rowId: u.rowId, colId: u.colId, value: u.newValue })),
      rowIds,
      colIds,
    };
    
    this.recordTransaction(transaction);
  }

  /**
   * 记录排序变更
   */
  recordSortChange(oldSortModel: any[], newSortModel: any[]): void {
    if (!this.enabled || this.isApplying) return;
    
    const transaction: Transaction = {
      id: this.generateTransactionId(),
      type: 'sort',
      description: '更改排序',
      timestamp: Date.now(),
      undoData: oldSortModel,
      redoData: newSortModel,
    };
    
    this.recordTransaction(transaction);
  }

  /**
   * 记录过滤变更
   */
  recordFilterChange(oldFilterModel: any, newFilterModel: any): void {
    if (!this.enabled || this.isApplying) return;
    
    const transaction: Transaction = {
      id: this.generateTransactionId(),
      type: 'filter',
      description: '更改过滤',
      timestamp: Date.now(),
      undoData: oldFilterModel,
      redoData: newFilterModel,
    };
    
    this.recordTransaction(transaction);
  }

  /**
   * 撤销上一步操作
   * @returns 撤销的操作，如果无法撤销则返回 null
   */
  undo(): any | null {
    if (!this.enabled || this.undoStack.length === 0) {
      return null;
    }
    
    const action = this.undoStack.pop();
    if (!action) return null;
    
    this.isApplying = true;
    
    try {
      // 将操作放入重做栈
      this.redoStack.push(action);
      
      // 裁剪重做栈
      if (this.redoStack.length > this.maxHistorySize) {
        this.redoStack.shift();
      }
      
      // 触发回调
      if (this.onUndoApplied) {
        this.onUndoApplied(action);
      }
      
      this.emitHistoryChanged();
      
      return action;
    } finally {
      this.isApplying = false;
    }
  }

  /**
   * 重做上一步撤销的操作
   * @returns 重做的操作，如果无法重做则返回 null
   */
  redo(): any | null {
    if (!this.enabled || this.redoStack.length === 0) {
      return null;
    }
    
    const action = this.redoStack.pop();
    if (!action) return null;
    
    this.isApplying = true;
    
    try {
      // 将操作放回撤销栈
      this.undoStack.push(action);
      
      // 触发回调
      if (this.onRedoApplied) {
        this.onRedoApplied(action);
      }
      
      this.emitHistoryChanged();
      
      return action;
    } finally {
      this.isApplying = false;
    }
  }

  /**
   * 是否可以撤销
   */
  canUndo(): boolean {
    return this.enabled && this.undoStack.length > 0;
  }

  /**
   * 是否可以重做
   */
  canRedo(): boolean {
    return this.enabled && this.redoStack.length > 0;
  }

  /**
   * 获取撤销栈大小
   */
  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  /**
   * 获取重做栈大小
   */
  getRedoStackSize(): number {
    return this.redoStack.length;
  }

  /**
   * 获取撤销栈中的事务列表（只读）
   */
  getUndoHistory(): Transaction[] {
    return [...this.undoStack].reverse(); // 最新的在前
  }

  /**
   * 获取重做栈中的事务列表（只读）
   */
  getRedoHistory(): Transaction[] {
    return [...this.redoStack].reverse(); // 最新的在前
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.emitHistoryChanged();
  }

  /**
   * 设置撤销/重做应用回调
   */
  setCallbacks(callbacks: {
    onUndo?: (transaction: Transaction) => void;
    onRedo?: (transaction: Transaction) => void;
    onHistoryChanged?: () => void;
  }): void {
    if (callbacks.onUndo) {
      this.onUndoApplied = callbacks.onUndo;
    }
    if (callbacks.onRedo) {
      this.onRedoApplied = callbacks.onRedo;
    }
    if (callbacks.onHistoryChanged) {
      this.onHistoryChanged = callbacks.onHistoryChanged;
    }
  }

  /**
   * 记录事务
   */
  private recordTransaction(transaction: Transaction): void {
    if (this.batchMode) {
      this.batchTransactions.push(transaction);
      return;
    }
    
    // 添加到撤销栈
    this.undoStack.push(transaction);
    
    // 裁剪撤销栈
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
    
    // 记录新操作后，清空重做栈（符合用户体验）
    this.redoStack = [];
    
    this.emitHistoryChanged();
  }

  /**
   * 生成事务 ID
   */
  private generateTransactionId(): string {
    return `txn_${Date.now()}_${++this.transactionCounter}`;
  }

  /**
   * 触发历史变更回调
   */
  private emitHistoryChanged(): void {
    if (this.onHistoryChanged) {
      this.onHistoryChanged();
    }
  }

  /**
   * 销毁服务，清理所有历史记录
   */
  destroy(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.enabled = false;
    this.batchMode = false;
    this.batchTransactions = [];
  }
}
