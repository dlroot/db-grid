import { Injectable } from '@angular/core';

export type FillDirection = 'down' | 'up' | 'left' | 'right';
export type FillMode = 'copy' | 'fillSeries' | 'linear' | 'date';

export interface FillResult {
  values: any[][];
  direction: FillDirection;
  mode: FillMode;
}

/**
 * 填充手柄服务 — 支持 Excel 风格的拖拽填充功能
 * 支持复制、序列填充、线性递增、日期递增等模式
 */
@Injectable({ providedIn: 'root' })
export class FillHandleService {

  /**
   * 根据填充方向和模式，生成填充值
   * @param sourceValues — 源范围的值（二维数组）
   * @param direction — 填充方向
   * @param targetCount — 目标单元格数量（从源范围角点到目标位置）
   * @param mode — 填充模式
   */
  fill(
    sourceValues: any[][],
    direction: FillDirection,
    targetCount: number,
    mode: FillMode = 'copy'
  ): any[][] {
    if (!sourceValues || sourceValues.length === 0 || targetCount <= 0) {
      return [];
    }

    const result: any[][] = [];
    const [rows, cols] = [sourceValues.length, sourceValues[0]?.length || 0];

    // 根据方向调整填充逻辑
    const isVertical = direction === 'down' || direction === 'up';
    const isForward = direction === 'down' || direction === 'right';

    for (let i = 0; i < targetCount; i++) {
      result[i] = [];
      for (let j = 0; j < cols; j++) {
        const sourceRow = isVertical ? i % rows : 0;
        const sourceCol = !isVertical ? i % cols : j;
        const sourceVal = sourceValues[sourceRow]?.[sourceCol];

        if (mode === 'copy') {
          // 复制模式：所有单元格填充相同的值
          result[i][j] = sourceVal;
        } else if (mode === 'fillSeries' || mode === 'linear') {
          // 序列模式：检测数据类型并递增
          const offset = isForward ? i + 1 : -(i + 1);
          result[i][j] = this.nextValue(sourceValues, sourceRow, sourceCol, direction, offset, mode);
        } else if (mode === 'date') {
          // 日期递增
          const offset = isForward ? i + 1 : -(i + 1);
          result[i][j] = this.incrementDate(sourceVal, offset);
        } else {
          result[i][j] = sourceVal;
        }
      }
    }

    return result;
  }

  /**
   * 线性填充（数字递增/递减）
   */
  linearFill(startValues: any[], count: number): any[] {
    if (count <= 1) return [startValues[0]];
    if (startValues.length === 1) {
      return Array.from({ length: count }, (_, i) => (startValues[0] as number) + i);
    }
    // 至少两个值 → 线性回归
    const step = (startValues[1] as number) - (startValues[0] as number);
    return Array.from({ length: count }, (_, i) => (startValues[0] as number) + step * i);
  }

  /**
   * 日期递增填充
   */
  dateFill(startDate: Date | string, count: number, stepDays = 1): Date[] {
    const base = new Date(startDate);
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i * stepDays);
      return d;
    });
  }

  /**
   * 获取下一个值（智能递增）
   */
  private nextValue(
    sourceValues: any[][],
    row: number,
    col: number,
    direction: FillDirection,
    offset: number,
    mode: FillMode
  ): any {
    const value = sourceValues[row]?.[col];
    if (value === null || value === undefined) return value;

    // 数字 → 递增
    if (typeof value === 'number') {
      if (mode === 'linear' && sourceValues.length > 1) {
        // 线性填充：计算步长
        const step = this.calculateStep(sourceValues, row, col, direction);
        return value + step * offset;
      }
      return value + offset;
    }

    // 字符串中的数字 → 提取并递增
    const str = String(value);
    const numMatch = str.match(/^([^\d]*)(\d+)([^\d]*)$/);
    if (numMatch) {
      const prefix = numMatch[1];
      const num = parseInt(numMatch[2], 10);
      const suffix = numMatch[3];
      return `${prefix}${num + offset}${suffix}`;
    }

    // 日期字符串
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return this.incrementDate(value, offset);
    }

    // 其他 → 复制
    return value;
  }

  /**
   * 计算线性步长
   */
  private calculateStep(
    sourceValues: any[][],
    row: number,
    col: number,
    direction: FillDirection
  ): number {
    const isVertical = direction === 'down' || direction === 'up';

    if (isVertical) {
      // 垂直方向：从上一行同列获取步长
      if (row > 0 && typeof sourceValues[row - 1]?.[col] === 'number') {
        return (sourceValues[row][col] as number) - (sourceValues[row - 1][col] as number);
      }
    } else {
      // 水平方向：从同一行前一列获取步长
      if (col > 0 && typeof sourceValues[row]?.[col - 1] === 'number') {
        return (sourceValues[row][col] as number) - (sourceValues[row][col - 1] as number);
      }
    }

    return 1; // 默认步长
  }

  /**
   * 日期递增
   */
  private incrementDate(value: any, offset: number): string {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    date.setDate(date.getDate() + offset);
    return date.toISOString().split('T')[0];
  }

  /**
   * 推断填充模式
   */
  inferMode(sampleValues: any[]): FillMode {
    if (sampleValues.length === 0) return 'copy';
    const first = sampleValues[0];

    if (typeof first === 'number') {
      // 如果所有值等差 → linear
      if (sampleValues.length >= 2) {
        const step = (sampleValues[1] as number) - (sampleValues[0] as number);
        const consistent = sampleValues.slice(1).every((v, i) =>
          (v as number) - (sampleValues[i] as number) === step
        );
        if (consistent && step !== 0) return 'linear';
      }
      return 'fillSeries';
    }

    // 检查是否为日期
    const date = new Date(first);
    if (!isNaN(date.getTime()) && typeof first === 'string' && first.match(/^\d{4}-\d{2}-\d{2}/)) {
      return 'date';
    }

    return 'copy';
  }
}
