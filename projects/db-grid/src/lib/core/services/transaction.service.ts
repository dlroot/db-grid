import { Injectable, signal } from '@angular/core';

/**
 * RowDataTransaction 服务
 * 增量添加/删除/更新行，仅更新变化的行，不重绘全表
 * 
 * AG Grid 对应功能：api.applyTransaction(transaction)
 */

// Re-export RowDataTransaction for convenience
import { RowDataTransaction } from '../models';

export type { RowDataTransaction };

// TransactionResult with extra node tracking
export interface TransactionResult {
  /** 实际添加的行 */
  added: any[];
  /** 实际删除的行 */
  removed: any[];
  /** 实际更新的行 */
  updated: any[];
  /** 实际添加的节点 */
  addedNodes: any[];
  /** 实际删除的节点 */
  removedNodes: any[];
  /** 实际更新的节点 */
  updatedNodes: any[];
}

export interface TransactionAddEvent {
  type: 'add';
  rows: any[];
}

export interface TransactionRemoveEvent {
  type: 'remove';
  rows: any[];
}

export interface TransactionUpdateEvent {
  type: 'update';
  rows: any[];
}

export type TransactionEvent = TransactionAddEvent | TransactionRemoveEvent | TransactionUpdateEvent;

@Injectable({ providedIn: 'root' })
export class TransactionService {
  /** Transaction 变更回调 */
  private onChange: ((result: TransactionResult) => void) | null = null;
  
  /** Transaction 事件回调 */
  private onAdd: ((event: TransactionAddEvent) => void) | null = null;
  private onRemove: ((event: TransactionRemoveEvent) => void) | null = null;
  private onUpdate: ((event: TransactionUpdateEvent) => void) | null = null;
  
  /** 批量更新缓冲 */
  private batchBuffer: TransactionResult | null = null;
  private batchTimeout: any = null;
  private batchDelay = 0; // 毫秒，0 表示同步

  /** 动画配置 */
  private animate = true;
  private animateDuration = 300;

  /** 初始化 */
  initialize(config: TransactionConfig = {}): void {
    this.batchDelay = config.batchDelay ?? 0;
    this.animate = config.animate ?? true;
    this.animateDuration = config.animateDuration ?? 300;
  }

  /** 注册变更回调 */
  onTransactionChange(callback: (result: TransactionResult) => void): void {
    this.onChange = callback;
  }

  /** 注册添加事件回调 */
  onAddEvent(callback: (event: TransactionAddEvent) => void): void {
    this.onAdd = callback;
  }

  /** 注册删除事件回调 */
  onRemoveEvent(callback: (event: TransactionRemoveEvent) => void): void {
    this.onRemove = callback;
  }

  /** 注册更新事件回调 */
  onUpdateEvent(callback: (event: TransactionUpdateEvent) => void): void {
    this.onUpdate = callback;
  }

  /**
   * 同步执行 Transaction（立即生效）
   */
  applyTransaction(transaction: RowDataTransactionInput): TransactionResult {
    const result = this.executeTransaction(transaction);
    this.notifyChange(result);
    return result;
  }

  /**
   * 异步批量执行 Transaction
   * 支持批量缓冲，减少重绘次数
   */
  applyTransactionAsync(
    transaction: RowDataTransactionInput, 
    callback?: (result: TransactionResult) => void
  ): void {
    if (this.batchDelay === 0) {
      // 同步模式
      const result = this.executeTransaction(transaction);
      this.notifyChange(result);
      callback?.(result);
      return;
    }

    // 批量缓冲模式
    if (!this.batchBuffer) {
      this.batchBuffer = {
        added: [],
        removed: [],
        updated: [],
        addedNodes: [],
        removedNodes: [],
        updatedNodes: [],
      };
    }

    // 合并到缓冲
    if (transaction.add) {
      this.batchBuffer.added.push(...transaction.add);
    }
    if (transaction.remove) {
      this.batchBuffer.removed.push(...transaction.remove);
    }
    if (transaction.update) {
      this.batchBuffer.updated.push(...transaction.update);
    }

    // 设置延迟刷新
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      if (this.batchBuffer) {
        const result = this.executeTransactionFromBuffer(this.batchBuffer);
        this.batchBuffer = null;
        this.batchTimeout = null;
        this.notifyChange(result);
        callback?.(result);
      }
    }, this.batchDelay);
  }

  /**
   * 刷新挂起的事务（立即执行缓冲中的事务）
   */
  flush(): TransactionResult | null {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (!this.batchBuffer) {
      return null;
    }

    const result = this.executeTransactionFromBuffer(this.batchBuffer);
    this.batchBuffer = null;
    this.notifyChange(result);
    return result;
  }

  /** 
   * 执行 Transaction（子类实现具体逻辑）
   * 此方法由 DbGridComponent 调用，传递实际的数据操作
   */
  private executeTransaction(transaction: RowDataTransactionInput): TransactionResult {
    const result: TransactionResult = {
      added: transaction.add ? [...transaction.add] : [],
      removed: transaction.remove ? [...transaction.remove] : [],
      updated: transaction.update ? [...transaction.update] : [],
      addedNodes: [],
      removedNodes: [],
      updatedNodes: [],
    };

    // 触发事件
    if (transaction.add?.length && this.onAdd) {
      this.onAdd({ type: 'add', rows: result.added });
    }
    if (transaction.remove?.length && this.onRemove) {
      this.onRemove({ type: 'remove', rows: result.removed });
    }
    if (transaction.update?.length && this.onUpdate) {
      this.onUpdate({ type: 'update', rows: result.updated });
    }

    return result;
  }

  private executeTransactionFromBuffer(buffer: TransactionResult): TransactionResult {
    const transaction: RowDataTransactionInput = {
      add: buffer.added.length > 0 ? buffer.added : undefined,
      remove: buffer.removed.length > 0 ? buffer.removed : undefined,
      update: buffer.updated.length > 0 ? buffer.updated : undefined,
    };
    return this.executeTransaction(transaction);
  }

  private notifyChange(result: TransactionResult): void {
    if (this.onChange) {
      this.onChange(result);
    }
  }

  /** 是否启用动画 */
  isAnimate(): boolean {
    return this.animate;
  }

  /** 获取动画时长 */
  getAnimateDuration(): number {
    return this.animateDuration;
  }

  /** 销毁 */
  destroy(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    this.onChange = null;
    this.onAdd = null;
    this.onRemove = null;
    this.onUpdate = null;
    this.batchBuffer = null;
  }
}

/** Transaction 输入接口 */
export interface RowDataTransactionInput {
  /** 要添加的行数据 */
  add?: any[];
  /** 要删除的行数据（根据行数据匹配） */
  remove?: any[];
  /** 要更新的行数据（根据行数据匹配） */
  update?: any[];
}

/** Transaction 配置 */
export interface TransactionConfig {
  /** 批量更新延迟（毫秒），0 表示同步模式 */
  batchDelay?: number;
  /** 是否启用动画 */
  animate?: boolean;
  /** 动画时长（毫秒） */
  animateDuration?: number;
}
