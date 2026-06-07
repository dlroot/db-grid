/**
 * 外部筛选服务
 * 支持注册自定义外部筛选回调函数，所有回调必须通过才显示该行
 */

import { Injectable } from '@angular/core';
import { IRowNode } from '../models';

@Injectable()
export class ExternalFilterService {
  /** 已注册的外部筛选回调 */
  private filters: Map<string, (node: IRowNode) => boolean> = new Map();

  /**
   * 注册外部筛选函数
   * @param id 唯一标识
   * @param callback 筛选回调，返回 true 表示该行通过筛选
   */
  registerExternalFilter(id: string, callback: (node: IRowNode) => boolean): void {
    this.filters.set(id, callback);
  }

  /**
   * 注销外部筛选函数
   * @param id 唯一标识
   */
  deregisterExternalFilter(id: string): void {
    this.filters.delete(id);
  }

  /**
   * 是否存在已注册的外部筛选
   */
  hasExternalFilters(): boolean {
    return this.filters.size > 0;
  }

  /**
   * 判断行节点是否通过所有外部筛选
   * 所有回调都返回 true 才通过
   * @param rowNode 行节点
   */
  passesExternalFilters(rowNode: IRowNode): boolean {
    if (!this.hasExternalFilters()) return true;

    for (const callback of this.filters.values()) {
      if (!callback(rowNode)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 清除所有外部筛选
   */
  clearAll(): void {
    this.filters.clear();
  }

  /**
   * 获取已注册的筛选 ID 列表
   */
  getFilterIds(): string[] {
    return Array.from(this.filters.keys());
  }

  destroy(): void {
    this.filters.clear();
  }
}
