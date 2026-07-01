/**
 * 服务器端事件缓冲服务
 * 用于优化大数据集的服务器端处理，实现事件批处理和节流
 * 
 * 功能:
 * 1. 事件批处理 (将多个事件合并为一个请求)
 * 2. 节流控制 (限制请求频率)
 * 3. 优先级队列 (高优先级事件优先处理)
 * 4. 失败重试 (自动重试失败的请求)
 * 5. 离线支持 (网络断开时缓存事件)
 */
import { GridStateService } from './grid-state.service';

export interface BufferedEvent {
  type: string;           // 事件类型 (sort, filter, group, etc.)
  payload: any;          // 事件数据
  priority: number;      // 优先级 (0-10, 0 最高)
  timestamp: number;     // 时间戳
  retryCount: number;    // 重试次数
  maxRetries: number;    // 最大重试次数
}

export interface EventBufferConfig {
  batchSize: number;        // 批处理大小 (默认: 10)
  throttleMs: number;       // 节流间隔 (默认: 300ms)
  maxRetries: number;       // 最大重试次数 (默认: 3)
  enableOfflineCache: boolean; // 启用离线缓存 (默认: true)
  enablePriorityQueue: boolean; // 启用优先级队列 (默认: true)
}

const DEFAULT_BUFFER_CONFIG: EventBufferConfig = {
  batchSize: 10,
  throttleMs: 300,
  maxRetries: 3,
  enableOfflineCache: true,
  enablePriorityQueue: true
};

export class ServerSideEventBufferService {
  private eventQueue: BufferedEvent[] = [];
  private config: EventBufferConfig;
  private throttleTimer: any = null;
  private isProcessing = false;
  private offlineCache: BufferedEvent[] = [];
  
  // 事件回调函数
  private eventHandler: ((events: BufferedEvent[]) => Promise<void>) | null = null;
  
  constructor(config?: Partial<EventBufferConfig>) {
    this.config = { ...DEFAULT_BUFFER_CONFIG, ...config };
    this.loadOfflineCache();
  }
  
  /**
   * 设置事件处理函数
   * @param handler 处理函数的 Promise，接收批处理后的事件数组
   */
  setEventHandler(handler: (events: BufferedEvent[]) => Promise<void>): void {
    this.eventHandler = handler;
  }
  
  /**
   * 添加事件到缓冲区
   * @param type 事件类型
   * @param payload 事件数据
   * @param priority 优先级 (0-10, 0 最高)
   */
  bufferEvent(type: string, payload: any, priority: number = 5): void {
    const event: BufferedEvent = {
      type,
      payload,
      priority,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.config.maxRetries
    };
    
    // 添加到队列
    if (this.config.enablePriorityQueue) {
      // 按优先级排序插入
      let inserted = false;
      for (let i = 0; i < this.eventQueue.length; i++) {
        if (priority < this.eventQueue[i].priority) {
          this.eventQueue.splice(i, 0, event);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        this.eventQueue.push(event);
      }
    } else {
      this.eventQueue.push(event);
    }
    
    // 保存到离线缓存
    if (this.config.enableOfflineCache) {
      this.saveToOfflineCache(event);
    }
    
    // 触发批处理
    this.scheduleBatchProcessing();
  }
  
  /**
   * 调度批处理
   */
  private scheduleBatchProcessing(): void {
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
    }
    
    this.throttleTimer = setTimeout(() => {
      this.processBatch();
    }, this.config.throttleMs);
  }
  
  /**
   * 处理批处理
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // 取出批处理事件
      const batch = this.eventQueue.splice(0, this.config.batchSize);
      
      // 调用事件处理函数
      if (this.eventHandler) {
        await this.eventHandler(batch);
      }
      
      // 从离线缓存中移除已处理的事件
      if (this.config.enableOfflineCache) {
        this.removeFromOfflineCache(batch);
      }
      
      console.log(`✅ Processed batch of ${batch.length} events`);
      
      // 如果还有剩余事件，继续处理
      if (this.eventQueue.length > 0) {
        this.scheduleBatchProcessing();
      }
    } catch (error) {
      console.error('❌ Batch processing failed:', error);
      
      // 重试逻辑
      const failedEvents = this.eventQueue.splice(0, this.config.batchSize);
      const retryEvents = failedEvents.filter(e => e.retryCount < e.maxRetries);
      
      if (retryEvents.length > 0) {
        retryEvents.forEach(e => e.retryCount++);
        this.eventQueue.unshift(...retryEvents);
        console.log(`🔄 Retrying ${retryEvents.length} events...`);
      }
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * 立即处理所有缓冲的事件
   */
  async flush(): Promise<void> {
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
    
    while (this.eventQueue.length > 0) {
      await this.processBatch();
    }
  }
  
  /**
   * 清空事件队列
   */
  clear(): void {
    this.eventQueue = [];
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
  }
  
  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.eventQueue.length;
  }
  
  /**
   * 获取离线缓存的事件数量
   */
  getOfflineCacheSize(): number {
    return this.offlineCache.length;
  }
  
  /**
   * 保存到离线缓存
   */
  private saveToOfflineCache(event: BufferedEvent): void {
    this.offlineCache.push(event);
    try {
      localStorage.setItem('db-grid-event-cache', JSON.stringify(this.offlineCache));
    } catch (error) {
      console.warn('⚠️ Failed to save offline cache:', error);
    }
  }
  
  /**
   * 从离线缓存加载
   */
  private loadOfflineCache(): void {
    try {
      const cached = localStorage.getItem('db-grid-event-cache');
      if (cached) {
        this.offlineCache = JSON.parse(cached);
        console.log(`📦 Loaded ${this.offlineCache.length} events from offline cache`);
        
        // 将离线缓存的事件重新加入队列
        if (this.offlineCache.length > 0) {
          this.eventQueue.unshift(...this.offlineCache);
          this.offlineCache = [];
          localStorage.removeItem('db-grid-event-cache');
          this.scheduleBatchProcessing();
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load offline cache:', error);
    }
  }
  
  /**
   * 从离线缓存移除已处理的事件
   */
  private removeFromOfflineCache(events: BufferedEvent[]): void {
    const eventIds = new Set(events.map(e => `${e.type}-${e.timestamp}`));
    this.offlineCache = this.offlineCache.filter(e => !eventIds.has(`${e.type}-${e.timestamp}`));
    try {
      localStorage.setItem('db-grid-event-cache', JSON.stringify(this.offlineCache));
    } catch (error) {
      console.warn('⚠️ Failed to update offline cache:', error);
    }
  }
  
  /**
   * 销毁服务
   */
  destroy(): void {
    this.clear();
    this.eventHandler = null;
  }
}
