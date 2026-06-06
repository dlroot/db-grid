/**
 * Overlay 覆盖层服务
 * 管理 loading / noRows / custom overlay 的显示与隐藏
 */

import { Injectable, signal } from '@angular/core';

export interface OverlayConfig {
  /** overlay 类型 */
  type: 'loading' | 'noRows' | 'custom';
  /** 自定义内容（type='custom'时） */
  template?: string;
  /** 自定义 CSS class */
  class?: string;
  /** loading 消息 */
  message?: string;
  /** 进度百分比（0-100） */
  progress?: number;
}

@Injectable({ providedIn: 'root' })
export class OverlayService {
  /** 当前 overlay 配置（signal，供组件响应式绑定） */
  overlayConfig = signal<OverlayConfig | null>(null);

  /** 显示 loading overlay */
  showLoading(message?: string): void {
    this.overlayConfig.set({ type: 'loading', message });
  }

  /** 显示 loading overlay（带进度） */
  showLoadingWithProgress(message?: string, progress?: number): void {
    this.overlayConfig.set({ type: 'loading', message, progress });
  }

  /** 显示无数据 overlay */
  showNoRows(message?: string): void {
    this.overlayConfig.set({ type: 'noRows', message });
  }

  /** 显示自定义 overlay */
  showCustom(template: string, cssClass?: string): void {
    this.overlayConfig.set({ type: 'custom', template, class: cssClass });
  }

  /** 隐藏 overlay */
  hide(): void {
    this.overlayConfig.set(null);
  }

  /** 获取当前 overlay 配置 */
  getOverlay(): OverlayConfig | null {
    return this.overlayConfig();
  }
}