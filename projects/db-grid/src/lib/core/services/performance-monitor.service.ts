/**
 * Performance Monitor Service
 * 性能监控服务 — 测量渲染帧率、执行时间
 *
 * Features:
 *   - measureFrame() — 测量单帧渲染时间
 *   - startMonitoring() / stopMonitoring() — 实时 FPS 监控
 *   - benchmark() — 性能基准测试
 */

import { Injectable } from '@angular/core';

export interface FrameStats {
  frameTime: number; // ms
  fps: number;
  timestamp: number;
}

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number; // ms
  avgTime: number; // ms
  minTime: number; // ms
  maxTime: number; // ms
  opsPerSecond: number;
}

@Injectable()
export class PerformanceMonitorService {
  private frameStart = 0;
  private frameCount = 0;
  private lastFrameTime = 0;
  private isMonitoring = false;
  private frameCallback?: (stats: FrameStats) => void;
  private rafId: number | null = null;

  /** 帧历史记录 */
  private frameHistory: FrameStats[] = [];
  private maxHistoryLength = 100;

  // ========== 帧时间测量 ==========

  /**
   * 开始测量一帧
   */
  beginFrame(): void {
    this.frameStart = performance.now();
  }

  /**
   * 结束测量一帧
   */
  endFrame(): FrameStats | null {
    if (this.frameStart === 0) return null;

    const now = performance.now();
    const frameTime = now - this.frameStart;
    const fps = 1000 / frameTime;

    const stats: FrameStats = {
      frameTime,
      fps,
      timestamp: now,
    };

    this.frameHistory.push(stats);
    if (this.frameHistory.length > this.maxHistoryLength) {
      this.frameHistory.shift();
    }

    this.frameStart = 0;
    this.lastFrameTime = frameTime;
    this.frameCount++;

    return stats;
  }

  /**
   * 测量一个函数的执行时间
   */
  measure<T>(fn: () => T): { result: T; time: number } {
    const start = performance.now();
    const result = fn();
    const time = performance.now() - start;
    return { result, time };
  }

  /**
   * 异步测量
   */
  async measureAsync<T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> {
    const start = performance.now();
    const result = await fn();
    const time = performance.now() - start;
    return { result, time };
  }

  // ========== FPS 监控 ==========

  /**
   * 开始实时 FPS 监控
   */
  startMonitoring(callback?: (stats: FrameStats) => void): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.frameCallback = callback;

    const measureLoop = () => {
      if (!this.isMonitoring) return;

      const stats = this.endFrame();
      if (stats && this.frameCallback) {
        this.frameCallback(stats);
      }

      this.beginFrame();
      this.rafId = requestAnimationFrame(measureLoop);
    };

    this.beginFrame();
    this.rafId = requestAnimationFrame(measureLoop);
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.frameCallback = undefined;
  }

  /**
   * 获取当前 FPS
   */
  getCurrentFps(): number {
    const stats = this.frameHistory[this.frameHistory.length - 1];
    return stats?.fps ?? 0;
  }

  /**
   * 获取平均 FPS
   */
  getAverageFps(): number {
    if (this.frameHistory.length === 0) return 0;
    const sum = this.frameHistory.reduce((acc, s) => acc + s.fps, 0);
    return sum / this.frameHistory.length;
  }

  /**
   * 获取帧时间历史
   */
  getFrameHistory(): FrameStats[] {
    return [...this.frameHistory];
  }

  // ========== 性能基准测试 ==========

  /**
   * 运行基准测试
   */
  async benchmark(
    name: string,
    fn: () => void | Promise<void>,
    options: { iterations?: number; warmup?: number } = {}
  ): Promise<BenchmarkResult> {
    const { iterations = 100, warmup = 10 } = options;
    const times: number[] = [];

    // 预热
    for (let i = 0; i < warmup; i++) {
      await fn();
    }

    // 正式测试
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const time = performance.now() - start;
      times.push(time);
    }

    const totalTime = times.reduce((a, b) => a + b, 0);
    const avgTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const opsPerSecond = 1000 / avgTime;

    return {
      name,
      iterations,
      totalTime,
      avgTime,
      minTime,
      maxTime,
      opsPerSecond,
    };
  }

  /**
   * 格式化基准测试结果
   */
  formatBenchmarkResult(result: BenchmarkResult): string {
    return [
      `=== ${result.name} ===`,
      `Iterations: ${result.iterations}`,
      `Total Time: ${result.totalTime.toFixed(2)}ms`,
      `Average: ${result.avgTime.toFixed(3)}ms`,
      `Min/Max: ${result.minTime.toFixed(3)}ms / ${result.maxTime.toFixed(3)}ms`,
      `Ops/sec: ${result.opsPerSecond.toFixed(0)}`,
    ].join('\n');
  }

  // ========== 清理 ==========

  clearHistory(): void {
    this.frameHistory = [];
    this.frameCount = 0;
  }

  destroy(): void {
    this.stopMonitoring();
    this.clearHistory();
  }
}
