/**
 * 值映射服务 (refData)
 * 将单元格原始值映射为显示文本
 */

import { Injectable } from '@angular/core';

@Injectable()
export class ValueMappingService {
  /**
   * 获取显示值
   * 如果存在 refData 映射且值在映射中，返回映射后的文本；否则返回原始值
   * @param value 原始值
   * @param refData 值到显示文本的映射
   */
  getDisplayValue(value: any, refData?: Record<string, string>): string {
    if (!refData || value == null) {
      return value != null ? String(value) : '';
    }

    const key = String(value);
    if (key in refData) {
      return refData[key];
    }

    return String(value);
  }

  /**
   * 获取所有映射后的显示值
   * 用于 Set Filter 的选项列表
   * @param refData 值到显示文本的映射
   */
  getMappedValues(refData: Record<string, string>): string[] {
    if (!refData) return [];
    return Object.values(refData);
  }

  /**
   * 反向查找：根据显示文本查找原始值
   * @param displayText 显示文本
   * @param refData 值到显示文本的映射
   * @returns 原始值，未找到则返回 undefined
   */
  reverseLookup(displayText: string, refData: Record<string, string>): string | undefined {
    if (!refData) return undefined;

    for (const [key, display] of Object.entries(refData)) {
      if (display === displayText) {
        return key;
      }
    }

    return undefined;
  }

  destroy(): void {
    // 无状态服务，无需清理
  }
}
