import { Injectable, signal } from '@angular/core';

/**
 * 性能监控服务
 * 监控渲染性能、帧率、DOM 节点数等
 * 
 * AG Grid 对应：Performance Monitor / Debug Panel
 */

export interface PerformanceMetrics {
  /** 当前 FPS */
  fps: number;
  /** 平均 FPS */
  avgFps: number;
  /** 最低 FPS */
  minFps: number;
  /** 渲染时间（ms） */
  renderTime: number;
  /** 平均渲染时间（ms） */
  avgRenderTime: number;
  /** DOM 节点数 */
  domNodes: number;
  /** 可见行数 */
  visibleRows: number;
  /** 内存使用（MB） */
  memoryUsage: number | null;
  /** 时间戳 */
  timestamp: number;
}

export interface RenderProfile {
  /** 操作类型 */
  type: 'scroll' | 'sort' | 'filter' | 'add' | 'remove' | 'update' | 'render';
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime: number;
  /** 耗时（ms） */
  duration: number;
  /** 附加数据 */
  metadata?: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class PerformanceMonitorService {
  /** FPS 计算配置 */
  private fpsHistory: number[] = [];
  private maxFpsHistory = 60;
  private lastFrameTime = 0;
  private frameCount = 0;
  
  /** 渲染时间统计 */
  private renderTimeHistory: number[] = [];
  private maxRenderHistory = 100;
  
  /** 性能指标信号 */
  metrics = signal<PerformanceMetrics>({
    fps: 60,
    avgFps: 60,
    minFps: 60,
    renderTime: 0,
    avgRenderTime: 0,
    domNodes: 0,
    visibleRows: 0,
    memoryUsage: null,
    timestamp: Date.now(),
  });
  
  /** 是否启用监控 */
  private enabled = false;
  private animationFrameId: number | null = null;
  
  /** 性能日志 */
  private profiles: RenderProfile[] = [];
  private maxProfiles = 50;
  
  /** 性能阈值 */
  private thresholds = {
    minFps: 30,
    maxRenderTime: 16, // 60fps = 16.67ms
    maxDomNodes: 10000,
  };

  /** 慢操作回调 */
  private slowOperationCallbacks: Array<(profile: RenderProfile) => void> = [];

  /**
   * 启用性能监控
   */
  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    this.startFpsMonitor();
  }

  /**
   * 禁用性能监控
   */
  disable(): void {
    this.enabled = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * 开始 FPS 监控
   */
  private startFpsMonitor(): void {
    if (!this.enabled) return;
    
    const measureFrame = (timestamp: number) => {
      if (!this.enabled) return;
      
      this.frameCount++;
      
      if (this.lastFrameTime === 0) {
        this.lastFrameTime = timestamp;
      }
      
      const delta = timestamp - this.lastFrameTime;
      
      if (delta >= 1000) {
        // 一秒计算一次 FPS
        const fps = Math.round((this.frameCount * 1000) / delta);
        this.updateFps(fps);
        this.frameCount = 0;
        this.lastFrameTime = timestamp;
        
        // 更新 DOM 节点数
        this.updateDomNodes();
        this.updateMemory();
        
        // 更新信号
        this.metrics.update(m => ({
          ...m,
          fps,
          avgFps: this.calculateAvgFps(),
          minFps: Math.min(this.metrics().minFps, fps),
          domNodes: this.countDomNodes(),
          timestamp: Date.now(),
        }));
      }
      
      this.animationFrameId = requestAnimationFrame(measureFrame);
    };
    
    this.animationFrameId = requestAnimationFrame(measureFrame);
  }

  /**
   * 更新 FPS
   */
  private updateFps(fps: number): void {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.maxFpsHistory) {
      this.fpsHistory.shift();
    }
  }

  /**
   * 计算平均 FPS
   */
  private calculateAvgFps(): number {
    if (this.fpsHistory.length === 0) return 60;
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.fpsHistory.length);
  }

  /**
   * 更新 DOM 节点数
   */
  private updateDomNodes(): void {
    this.metrics.update(m => ({
      ...m,
      domNodes: this.countDomNodes(),
    }));
  }

  /**
   * 统计 DOM 节点数
   */
  private countDomNodes(): number {
    if (typeof document !== 'undefined') {
      return document.querySelectorAll('.db-grid-body-container *').length;
    }
    return 0;
  }

  /**
   * 更新内存使用
   */
  private updateMemory(): void {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.update(m => ({
        ...m,
        memoryUsage: Math.round(memory.usedJSHeapSize / (1024 * 1024)),
      }));
    }
  }

  /**
   * 记录渲染操作
   */
  startProfile(type: RenderProfile['type'], metadata?: Record<string, any>): number {
    return Date.now();
  }

  /**
   * 结束渲染操作
   */
  endProfile(startTime: number, type: RenderProfile['type'], metadata?: Record<string, any>): void {
    const duration = Date.now() - startTime;
    
    const profile: RenderProfile = {
      type,
      startTime,
      endTime: Date.now(),
      duration,
      metadata,
    };
    
    // 添加到日志
    this.profiles.push(profile);
    if (this.profiles.length > this.maxProfiles) {
      this.profiles.shift();
    }
    
    // 更新渲染时间统计
    this.renderTimeHistory.push(duration);
    if (this.renderTimeHistory.length > this.maxRenderHistory) {
      this.renderTimeHistory.shift();
    }
    
    // 更新信号
    this.metrics.update(m => ({
      ...m,
      renderTime: duration,
      avgRenderTime: this.calculateAvgRenderTime(),
    }));
    
    // 检查慢操作
    if (duration > 50) {
      this.slowOperationCallbacks.forEach(cb => cb(profile));
    }
  }

  /**
   * 计算平均渲染时间
   */
  private calculateAvgRenderTime(): number {
    if (this.renderTimeHistory.length === 0) return 0;
    const sum = this.renderTimeHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.renderTimeHistory.length);
  }

  /**
   * 注册慢操作回调
   */
  onSlowOperation(callback: (profile: RenderProfile) => void): () => void {
    this.slowOperationCallbacks.push(callback);
    return () => {
      const index = this.slowOperationCallbacks.indexOf(callback);
      if (index >= 0) {
        this.slowOperationCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 设置可见行数
   */
  setVisibleRows(count: number): void {
    this.metrics.update(m => ({
      ...m,
      visibleRows: count,
    }));
  }

  /**
   * 获取性能报告
   */
  getReport(): PerformanceMetrics & { slowProfiles: RenderProfile[] } {
    return {
      ...this.metrics(),
      slowProfiles: this.profiles.filter(p => p.duration > 50),
    };
  }

  /**
   * 获取性能日志
   */
  getProfiles(): RenderProfile[] {
    return [...this.profiles];
  }

  /**
   * 清空日志
   */
  clearProfiles(): void {
    this.profiles = [];
  }

  /**
   * 检查性能是否正常
   */
  isHealthy(): boolean {
    const m = this.metrics();
    return (
      m.fps >= this.thresholds.minFps &&
      m.renderTime <= this.thresholds.maxRenderTime * 3
    );
  }

  /**
   * 获取警告信息
   */
  getWarnings(): string[] {
    const warnings: string[] = [];
    const m = this.metrics();
    
    if (m.fps < this.thresholds.minFps) {
      warnings.push(`FPS 过低: ${m.fps} < ${this.thresholds.minFps}`);
    }
    
    if (m.renderTime > this.thresholds.maxRenderTime * 3) {
      warnings.push(`渲染时间过长: ${m.renderTime}ms > ${this.thresholds.maxRenderTime * 3}ms`);
    }
    
    if (m.domNodes > this.thresholds.maxDomNodes) {
      warnings.push(`DOM 节点过多: ${m.domNodes} > ${this.thresholds.maxDomNodes}`);
    }
    
    return warnings;
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.disable();
    this.fpsHistory = [];
    this.renderTimeHistory = [];
    this.profiles = [];
    this.slowOperationCallbacks = [];
  }
}
