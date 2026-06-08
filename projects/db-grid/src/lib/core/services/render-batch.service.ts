/**
 * Render Batch Service
 * 渲染批处理服务 — 使用 requestAnimationFrame 合并多次渲染请求
 *
 * Features:
 *   - scheduleRender() — 调度渲染（合并多次调用）
 *   - flushRender() — 立即执行待处理的渲染
 *   - 批量更新单元格样式/类名
 */

import { Injectable } from '@angular/core';

export type RenderCallback = () => void;

@Injectable()
export class RenderBatchService {
  /** 待处理的渲染回调 */
  private pendingCallbacks: Set<RenderCallback> = new Set();

  /** rAF ID */
  private rafId: number | null = null;

  /** 是否启用批处理 */
  private enabled = true;

  /** 统计 */
  private stats = {
    scheduled: 0,
    executed: 0,
    skipped: 0,
  };

  /**
   * 调度渲染
   * 多次调用会在下一个 rAF 中合并执行
   */
  scheduleRender(callback: RenderCallback): void {
    this.pendingCallbacks.add(callback);
    this.stats.scheduled++;

    if (!this.enabled) {
      // 禁用批处理时立即执行
      this.executePending();
      return;
    }

    // 已经有待处理的 rAF，跳过
    if (this.rafId !== null) return;

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.executePending();
    });
  }

  /**
   * 立即执行所有待处理的渲染
   */
  flushRender(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.executePending();
  }

  /**
   * 执行待处理的回调
   */
  private executePending(): void {
    if (this.pendingCallbacks.size === 0) return;

    const callbacks = Array.from(this.pendingCallbacks);
    this.pendingCallbacks.clear();

    // 批量执行
    callbacks.forEach(cb => {
      try {
        cb();
        this.stats.executed++;
      } catch (e) {
        console.error('[RenderBatchService] Callback error:', e);
      }
    });
  }

  /**
   * 批量更新 DOM 样式
   * 使用 CSS class 批量切换而非逐个设置 style
   */
  batchStyleUpdate(
    elements: HTMLElement[],
    updates: Array<{ prop: string; value: string }>
  ): void {
    this.scheduleRender(() => {
      // 读取阶段：批量读取 layout 属性
      const reads: Map<HTMLElement, Map<string, string>> = new Map();
      elements.forEach(el => {
        const styles = new Map<string, string>();
        updates.forEach(({ prop }) => {
          if (prop.startsWith('scroll') || prop === 'scrollTop' || prop === 'scrollLeft') {
            styles.set(prop, (el as any)[prop] + '');
          }
        });
        reads.set(el, styles);
      });

      // 写入阶段：批量写入
      elements.forEach(el => {
        updates.forEach(({ prop, value }) => {
          if (prop.startsWith('scroll')) {
            (el as any)[prop] = parseFloat(value) || 0;
          } else {
            el.style.setProperty(prop, value);
          }
        });
      });
    });
  }

  /**
   * 批量设置 CSS 类
   */
  batchClassUpdate(
    updates: Array<{ element: HTMLElement; add?: string[]; remove?: string[] }>
  ): void {
    this.scheduleRender(() => {
      updates.forEach(({ element, add = [], remove = [] }) => {
        if (remove.length) element.classList.remove(...remove);
        if (add.length) element.classList.add(...add);
      });
    });
  }

  // ========== 配置 ==========

  /** 启用/禁用批处理 */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.flushRender();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // ========== 统计 ==========

  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = { scheduled: 0, executed: 0, skipped: 0 };
  }

  // ========== 销毁 ==========

  destroy(): void {
    this.flushRender();
    this.pendingCallbacks.clear();
  }
}
