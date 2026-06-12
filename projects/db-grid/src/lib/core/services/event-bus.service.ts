import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * 事件总线服务
 * 统一管理 Grid 内部事件广播
 * 
 * 支持：
 * - 事件订阅/取消订阅
 * - 事件冒泡控制
 * - 事件停止传播
 */

export type EventCallback = (event: GridEvent) => void;

export interface GridEvent {
  type: string;
  /** 事件源 */
  source?: string;
  /** 是否停止冒泡 */
  bubbles?: boolean;
  /** 是否已停止传播 */
  stopped?: boolean;
  /** 原始事件对象 */
  originalEvent?: any;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class EventBusService {
  /** 事件监听器缓存 */
  private listeners: Map<string, Set<EventCallback>> = new Map();
  
  /** 一次性监听器 */
  private onceListeners: Map<string, Set<EventCallback>> = new Map();
  
  /** 全局监听器（所有事件都会触发） */
  private globalListeners: Set<EventCallback> = new Set();
  
  /** 事件流（用于响应式） */
  private eventSubject = new Subject<GridEvent>();
  
  /** 事件历史（用于调试） */
  private eventHistory: GridEvent[] = [];
  private maxHistorySize = 100;

  /**
   * 订阅事件
   */
  addEventListener(eventType: string, handler: EventCallback): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);
    
    // 返回取消订阅函数
    return () => {
      this.removeEventListener(eventType, handler);
    };
  }

  /**
   * 取消订阅
   */
  removeEventListener(eventType: string, handler: EventCallback): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  /**
   * 订阅一次性事件
   */
  once(eventType: string, handler: EventCallback): void {
    if (!this.onceListeners.has(eventType)) {
      this.onceListeners.set(eventType, new Set());
    }
    this.onceListeners.get(eventType)!.add(handler);
  }

  /**
   * 添加全局监听器
   */
  addGlobalListener(handler: EventCallback): () => void {
    this.globalListeners.add(handler);
    return () => {
      this.globalListeners.delete(handler);
    };
  }

  /**
   * 触发事件
   */
  dispatchEvent(event: GridEvent): void {
    // 添加到历史
    this.addToHistory(event);
    
    // 发布到 Subject
    this.eventSubject.next(event);
    
    // 触发全局监听器
    this.globalListeners.forEach(handler => {
      try {
        handler(event);
      } catch (e) {
        console.error('[EventBus] Global listener error:', e);
      }
    });
    
    // 触发类型特定监听器
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (e) {
          console.error('[EventBus] Listener error:', e);
        }
      });
    }
    
    // 触发一次性监听器并移除
    const onceHandlers = this.onceListeners.get(event.type);
    if (onceHandlers) {
      onceHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (e) {
          console.error('[EventBus] Once listener error:', e);
        }
      });
      this.onceListeners.delete(event.type);
    }
    
    // 冒泡到父级（如果有）
    if (event.bubbles !== false && event.stopped !== true) {
      this.dispatchBubbleEvent(event);
    }
  }

  /**
   * 创建并触发事件
   */
  emit(eventType: string, eventData: Partial<GridEvent> = {}): void {
    const event: GridEvent = {
      type: eventType,
      bubbles: true,
      stopped: false,
      ...eventData,
    };
    this.dispatchEvent(event);
  }

  /**
   * 停止事件传播
   */
  stopPropagation(event: GridEvent): void {
    event.stopped = true;
  }

  /**
   * 获取事件流（用于响应式）
   */
  getEventStream(eventType?: string): Subject<GridEvent> {
    if (eventType) {
      // 返回过滤后的事件流
      const filtered = new Subject<GridEvent>();
      this.eventSubject.subscribe(event => {
        if (event.type === eventType) {
          filtered.next(event);
        }
      });
      return filtered;
    }
    return this.eventSubject;
  }

  /**
   * 获取事件历史
   */
  getEventHistory(eventType?: string): GridEvent[] {
    if (eventType) {
      return this.eventHistory.filter(e => e.type === eventType);
    }
    return [...this.eventHistory];
  }

  /**
   * 获取已注册的事件类型
   */
  getRegisteredEventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * 检查是否有监听器
   */
  hasListeners(eventType?: string): boolean {
    if (eventType) {
      const handlers = this.listeners.get(eventType);
      return !!handlers && handlers.size > 0;
    }
    return this.listeners.size > 0 || this.globalListeners.size > 0;
  }

  /**
   * 清空所有监听器
   */
  clear(): void {
    this.listeners.clear();
    this.onceListeners.clear();
    this.globalListeners.clear();
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.clear();
    this.eventSubject.complete();
    this.eventHistory = [];
  }

  /**
   * 添加到历史
   */
  private addToHistory(event: GridEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * 冒泡事件（子类可覆盖）
   */
  protected dispatchBubbleEvent(event: GridEvent): void {
    // 默认不实现，由外部网格处理
  }
}

/**
 * Grid 事件名称常量
 */
export const GridEventTypes = {
  // 网格事件
  GRID_READY: 'gridReady',
  GRID_SIZE_CHANGED: 'gridSizeChanged',
  FIRST_DATA_RENDERED: 'firstDataRendered',
  MODEL_UPDATED: 'modelUpdated',
  
  // 行事件
  ROW_CLICKED: 'rowClicked',
  ROW_DOUBLE_CLICKED: 'rowDoubleClicked',
  ROW_SELECTED: 'rowSelected',
  SELECTION_CHANGED: 'selectionChanged',
  ROW_DATA_UPDATED: 'rowDataUpdated',
  ROW_EDITING_STARTED: 'rowEditingStarted',
  ROW_EDITING_STOPPED: 'rowEditingStopped',
  ROW_GROUP_OPENED: 'rowGroupOpened',
  
  // 单元格事件
  CELL_CLICKED: 'cellClicked',
  CELL_DOUBLE_CLICKED: 'cellDoubleClicked',
  CELL_VALUE_CHANGED: 'cellValueChanged',
  CELL_EDITING_STARTED: 'cellEditingStarted',
  CELL_EDITING_STOPPED: 'cellEditingStopped',
  CELL_FOCUSED: 'cellFocused',
  
  // 列事件
  COLUMN_RESIZED: 'columnResized',
  COLUMN_MOVED: 'columnMoved',
  COLUMN_VISIBLE: 'columnVisible',
  COLUMN_PINNED: 'columnPinned',
  COLUMN_SORT_CHANGED: 'sortChanged',
  COLUMN_FILTER_CHANGED: 'filterChanged',
  
  // 滚动事件
  VIEWPORT_CHANGED: 'viewportChanged',
  
  // 分页事件
  PAGINATION_CHANGED: 'paginationChanged',
  
  // 树形/分组事件
  NODE_EXPANDED: 'nodeExpanded',
  NODE_COLLAPSED: 'nodeCollapsed',
  GROUP_EXPANDED: 'groupExpanded',
  GROUP_COLLAPSED: 'groupCollapsed',
} as const;
