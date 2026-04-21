/**
 * Accessibility Service
 * ARIA 属性支持 + 屏幕阅读器辅助
 *
 * 用法：
 *   const a11y = new AccessibilityService();
 *   a11y.setGridElement(gridContainer);
 *   a11y.announce('已选中第3行'); // 屏幕阅读器播报
 *   const ariaAttrs = a11y.getCellAria(rowIndex, colDef, isSelected, isFocused);
 */

import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';

export interface AccessibilityConfig {
  /** 是否启用屏幕阅读器播报 */
  announceEnabled: boolean;
  /** 播报延迟（毫秒） */
  announceDelay?: number;
  /** 是否在焦点变化时自动播报 */
  announceOnFocus?: boolean;
  /** 是否在选中变化时自动播报 */
  announceOnSelection?: boolean;
}

export interface AriaCellAttrs {
  role: string;
  'aria-rowindex': number;
  'aria-colindex': number;
  'aria-selected'?: boolean;
  'aria-readonly'?: boolean;
  'aria-disabled'?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
  tabindex: number;
}

@Injectable()
export class AccessibilityService {
  // ========== 配置 ==========
  private config: AccessibilityConfig = {
    announceEnabled: true,
    announceDelay: 50,
    announceOnFocus: true,
    announceOnSelection: true,
  };

  private gridElement: HTMLElement | null = null;
  private announcerElement: HTMLElement | null = null;

  // ========== 事件流 ==========
  readonly onAnnounce = new Subject<string>();

  // ========== 初始化 ==========
  setGridElement(element: HTMLElement): void {
    this.gridElement = element;
    this.setupGridAria(element);
  }

  setConfig(config: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private setupGridAria(grid: HTMLElement): void {
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', '数据表格');
    grid.setAttribute('aria-multiselectable', 'true');
    grid.setAttribute('aria-readonly', 'false');

    // 创建 announcer 元素（用于屏幕阅读器播报）
    this.createAnnouncer(grid);
  }

  private createAnnouncer(parent: HTMLElement): void {
    if (this.announcerElement) return;

    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'db-grid-announcer';
    announcer.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
    parent.appendChild(announcer);
    this.announcerElement = announcer;
  }

  // ========== ARIA 属性生成 ==========

  /** 生成表格容器的 ARIA 属性 */
  getGridAria(rowCount: number, colCount: number): Record<string, string> {
    return {
      role: 'grid',
      'aria-label': `数据表格，共${rowCount}行${colCount}列`,
      'aria-rowcount': String(rowCount),
      'aria-colcount': String(colCount),
    };
  }

  /** 生成表头容器的 ARIA 属性 */
  getHeaderAria(): Record<string, string> {
    return {
      role: 'rowgroup',
      'aria-label': '表头',
    };
  }

  /** 生成表体容器的 ARIA 属性 */
  getBodyAria(): Record<string, string> {
    return {
      role: 'rowgroup',
      'aria-label': '数据行',
    };
  }

  /** 生成行的 ARIA 属性 */
  getRowAria(rowIndex: number, isSelected: boolean, isGroup?: boolean): Record<string, string> {
    const attrs: Record<string, string> = {
      role: 'row',
      'aria-rowindex': String(rowIndex + 1), // ARIA 是 1-indexed
      'aria-selected': String(isSelected),
    };
    if (isGroup) {
      attrs['aria-label'] = `分组行第${rowIndex + 1}行`;
    }
    return attrs;
  }

  /** 生成单元格的 ARIA 属性 */
  getCellAria(
    rowIndex: number,
    colIndex: number,
    options: {
      isSelected?: boolean;
      isFocused?: boolean;
      isEditable?: boolean;
      isHeader?: boolean;
      label?: string;
      value?: any;
    }
  ): AriaCellAttrs {
    const { isSelected, isFocused, isEditable, isHeader, label, value } = options;

    const attrs: AriaCellAttrs = {
      role: isHeader ? 'columnheader' : 'gridcell',
      'aria-rowindex': rowIndex + 1,
      'aria-colindex': colIndex + 1,
      tabindex: isFocused ? 0 : -1,
    };

    if (isSelected !== undefined) {
      attrs['aria-selected'] = isSelected;
    }
    if (isEditable === false) {
      attrs['aria-readonly'] = true;
    }
    if (label) {
      attrs['aria-label'] = label;
    } else if (value !== undefined && value !== null) {
      attrs['aria-label'] = String(value);
    }

    return attrs;
  }

  /** 生成分组表头的 ARIA 属性 */
  getGroupHeaderAria(
    groupLabel: string,
    colSpan: number,
    isExpanded?: boolean
  ): Record<string, string> {
    const attrs: Record<string, string> = {
      role: 'columnheader',
      'aria-colspan': String(colSpan),
      'aria-label': groupLabel,
    };
    if (isExpanded !== undefined) {
      attrs['aria-expanded'] = String(isExpanded);
    }
    return attrs;
  }

  // ========== 屏幕阅读器播报 ==========

  /** 播报消息给屏幕阅读器 */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.config.announceEnabled || !this.announcerElement) return;

    this.announcerElement.setAttribute('aria-live', priority);
    this.announcerElement.textContent = '';

    // 使用 setTimeout 确保屏幕阅读器能检测到变化
    setTimeout(() => {
      if (this.announcerElement) {
        this.announcerElement.textContent = message;
        this.onAnnounce.next(message);
      }
    }, this.config.announceDelay);
  }

  /** 播报焦点变化 */
  announceFocus(rowIndex: number, colId: string, value?: any): void {
    if (!this.config.announceOnFocus) return;

    const colLabel = this.getColumnLabel(colId);
    const valueLabel = value !== undefined ? `，值为 ${value}` : '';
    this.announce(`第${rowIndex + 1}行，${colLabel}列${valueLabel}`);
  }

  /** 播报选中变化 */
  announceSelection(count: number, total: number): void {
    if (!this.config.announceOnSelection) return;

    const message = count === 0
      ? '已取消所有选择'
      : count === total
        ? `已全选，共${count}项`
        : `已选择${count}项，共${total}项`;
    this.announce(message);
  }

  /** 播报排序变化 */
  announceSort(colId: string, direction: 'asc' | 'desc' | null): void {
    const colLabel = this.getColumnLabel(colId);
    const dirLabel = direction === 'asc' ? '升序' : direction === 'desc' ? '降序' : '无排序';
    this.announce(`${colLabel}列，${dirLabel}排列`);
  }

  /** 播报筛选变化 */
  announceFilter(colId: string, filterActive: boolean): void {
    const colLabel = this.getColumnLabel(colId);
    const status = filterActive ? '已筛选' : '已清除筛选';
    this.announce(`${colLabel}列，${status}`);
  }

  /** 播报编辑状态 */
  announceEditing(rowIndex: number, colId: string, isEditing: boolean): void {
    const colLabel = this.getColumnLabel(colId);
    const status = isEditing ? '进入编辑' : '退出编辑';
    this.announce(`第${rowIndex + 1}行，${colLabel}列，${status}模式`);
  }

  private getColumnLabel(colId: string): string {
    // 尝试从缓存或 DOM 中获取列标题
    const headerCell = this.gridElement?.querySelector(`[data-col-id="${colId}"]`);
    if (headerCell) {
      const text = headerCell.textContent?.trim();
      if (text) return text;
    }
    // 回退到 colId
    return colId;
  }

  // ========== 属性应用工具 ==========

  /** 应用 ARIA 属性到元素 */
  applyAria(element: HTMLElement, attrs: Record<string, string | boolean | undefined>): void {
    Object.entries(attrs).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        element.setAttribute(key, String(value));
      } else {
        element.removeAttribute(key);
      }
    });
  }

  /** 设置表格的活动描述元素 ID */
  setActiveDescendantId(element: HTMLElement, id: string): void {
    element.setAttribute('aria-activedescendant', id);
  }

  // ========== 销毁 ==========
  destroy(): void {
    this.announcerElement?.remove();
    this.announcerElement = null;
    this.onAnnounce.complete();
  }
}