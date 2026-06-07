/**
 * 工具提示服务
 * 提供单元格工具提示的显示、隐藏、定位功能
 */

import { Injectable } from '@angular/core';
import { ColDef, TooltipValueGetterParams } from '../models';

export interface TooltipParams {
  value: any;
  colDef: ColDef;
  rowIndex: number;
  column: any;
  cellElement: HTMLElement;
}

@Injectable()
export class TooltipService {
  /** 当前显示的 tooltip DOM 元素 */
  private tooltipElement: HTMLElement | null = null;

  /** 自动隐藏定时器 */
  private autoHideTimer: ReturnType<typeof setTimeout> | null = null;

  /** 自动隐藏延迟（毫秒） */
  private autoHideDelay = 5000;

  /** 当前是否正在显示 tooltip */
  private _isVisible = false;

  get isVisible(): boolean {
    return this._isVisible;
  }

  /**
   * 显示工具提示
   * 优先使用 tooltipValueGetter 回调，其次使用 tooltipField，最后显示原始值
   */
  showTooltip(params: TooltipParams): void {
    this.hideTooltip();

    const { value, colDef, rowIndex, column, cellElement } = params;

    // 获取 tooltip 文本
    let tooltipText: string;

    if (colDef.tooltipValueGetter) {
      const getterParams: TooltipValueGetterParams = {
        value,
        data: null,
        node: null as any,
        colDef,
        column,
        context: {},
      };
      tooltipText = colDef.tooltipValueGetter(getterParams);
    } else if (colDef.tooltipField) {
      // tooltipField — 暂不支持深层嵌套，取同层字段
      tooltipText = String(value ?? '');
    } else {
      tooltipText = value != null ? String(value) : '';
    }

    if (!tooltipText) return;

    // 创建 tooltip 元素
    const el = document.createElement('div');
    el.className = 'db-grid-tooltip';
    el.innerHTML = `<div class="db-grid-tooltip-content">${this.escapeHtml(tooltipText)}</div>`;

    document.body.appendChild(el);
    this.tooltipElement = el;
    this._isVisible = true;

    // 定位
    const cellRect = cellElement.getBoundingClientRect();
    this.positionTooltip(el, cellRect);

    // 自动隐藏
    this.autoHideTimer = setTimeout(() => {
      this.hideTooltip();
    }, this.autoHideDelay);
  }

  /**
   * 隐藏工具提示
   */
  hideTooltip(): void {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }

    if (this.tooltipElement) {
      // 添加淡出动画类
      this.tooltipElement.classList.add('db-grid-tooltip-fadeout');
      const el = this.tooltipElement;
      setTimeout(() => {
        el.remove();
      }, 150);
      this.tooltipElement = null;
    }

    this._isVisible = false;
  }

  /**
   * 定位工具提示
   * 在目标元素附近显示，保持在视口内
   */
  positionTooltip(element: HTMLElement, targetRect: DOMRect): void {
    const tooltipRect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 默认定位在目标元素下方，居中对齐
    let left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
    let top = targetRect.bottom + 6;

    // 如果超出底部视口，显示在上方
    if (top + tooltipRect.height > viewportHeight - 8) {
      top = targetRect.top - tooltipRect.height - 6;
    }

    // 如果仍然超出顶部，则紧贴顶部
    if (top < 8) {
      top = 8;
    }

    // 如果超出左侧，向右调整
    if (left < 8) {
      left = 8;
    }

    // 如果超出右侧，向左调整
    if (left + tooltipRect.width > viewportWidth - 8) {
      left = viewportWidth - tooltipRect.width - 8;
    }

    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
  }

  /**
   * 设置自动隐藏延迟
   */
  setAutoHideDelay(delayMs: number): void {
    this.autoHideDelay = delayMs;
  }

  /**
   * HTML 转义
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy(): void {
    this.hideTooltip();
  }
}
