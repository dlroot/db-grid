/**
 * Sparkline Service
 * 迷你图渲染服务 — 使用 Canvas API 绘制轻量级迷你图表
 *
 * Features:
 *   - Line / Bar / Area 三种迷你图类型
 *   - 支持配置颜色、宽度、高度、是否显示最后一个值
 *   - 支持 negative / highlight 点
 *   - 不依赖 Chart.js，纯 Canvas API 实现，性能好 10x
 *
 * 用法：
 *   sparklineService.render(canvas, { type: 'line', data: [1,3,2,5,4], color: '#2196f3' });
 */

import { Injectable } from '@angular/core';

export type SparklineType = 'line' | 'bar' | 'area';

export interface SparklineOptions {
  /** 迷你图类型 */
  type?: SparklineType;
  /** 数据点 */
  data: number[];
  /** 线/填充颜色 */
  color?: string;
  /** 高亮最后一个点颜色 */
  highlightColor?: string;
  /** 负值颜色 */
  negativeColor?: string;
  /** Canvas 宽度 */
  width?: number;
  /** Canvas 高度 */
  height?: number;
  /** 线宽（line/area）或柱宽（bar） */
  lineWidth?: number;
  /** 边距 */
  padding?: number;
  /** 是否显示最后一个数据点的值 */
  showLastValue?: boolean;
  /** 最大值（不传则自动计算） */
  max?: number;
  /** 最小值（不传则自动计算） */
  min?: number;
  /** 背景色（默认透明） */
  backgroundColor?: string;
  /** 圆角 */
  borderRadius?: number;
  /** tooltip 数据点回调 */
  tooltipValueGetter?: (index: number, value: number) => string;
}

@Injectable()
export class SparklineService {

  private readonly DEFAULT_OPTIONS: Required<Pick<SparklineOptions,
    'type' | 'color' | 'highlightColor' | 'negativeColor' | 'width' | 'height' | 'lineWidth' | 'padding'
  >> = {
    type: 'line',
    color: '#2196f3',
    highlightColor: '#ff5722',
    negativeColor: '#f44336',
    width: 100,
    height: 30,
    lineWidth: 2,
    padding: 2,
  };

  constructor() {}

  /**
   * 渲染迷你图到 Canvas
   */
  render(canvas: HTMLCanvasElement, options: SparklineOptions): void {
    const data = options.data;
    if (!data || data.length === 0) return;

    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const { width, height, padding } = opts;

    // 设置 Canvas 尺寸（支持 HiDPI）
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // 背景
    if (opts.backgroundColor) {
      ctx.fillStyle = opts.backgroundColor;
      if (opts.borderRadius) {
        this.roundRect(ctx, 0, 0, width, height, opts.borderRadius);
        ctx.fill();
      } else {
        ctx.fillRect(0, 0, width, height);
      }
    }

    // 计算数据范围
    const min = opts.min ?? Math.min(...data);
    const max = opts.max ?? Math.max(...data);
    const range = max - min || 1;

    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;

    switch (opts.type) {
      case 'line':
        this.drawLine(ctx, data, min, range, drawWidth, drawHeight, padding, opts);
        break;
      case 'bar':
        this.drawBars(ctx, data, min, range, drawWidth, drawHeight, padding, opts);
        break;
      case 'area':
        this.drawArea(ctx, data, min, range, drawWidth, drawHeight, padding, opts);
        break;
    }

    // 最后一个值标注
    if (opts.showLastValue && data.length > 0) {
      const lastVal = data[data.length - 1];
      ctx.fillStyle = opts.highlightColor || opts.color;
      ctx.font = '10px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(String(lastVal), width - padding - ctx.measureText(String(lastVal)).width, padding + 10);
    }
  }

  /**
   * 绘制折线迷你图
   */
  private drawLine(
    ctx: CanvasRenderingContext2D,
    data: number[],
    min: number,
    range: number,
    drawWidth: number,
    drawHeight: number,
    padding: number,
    opts: Required<Pick<SparklineOptions, 'color' | 'highlightColor' | 'negativeColor' | 'lineWidth'>>
  ): void {
    if (data.length < 2) {
      // 单点 — 绘制圆点
      const x = padding + drawWidth / 2;
      const y = padding + drawHeight / 2;
      ctx.beginPath();
      ctx.arc(x, y, opts.lineWidth, 0, Math.PI * 2);
      ctx.fillStyle = opts.color;
      ctx.fill();
      return;
    }

    const points = this.calculatePoints(data, min, range, drawWidth, drawHeight, padding);

    // 绘制线条
    ctx.beginPath();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    points.forEach((point, i) => {
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        // 检查是否需要切换到负值颜色
        if (opts.negativeColor && data[i] < 0) {
          ctx.stroke();
          ctx.beginPath();
          ctx.strokeStyle = opts.negativeColor;
          ctx.moveTo(points[i - 1].x, points[i - 1].y);
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.strokeStyle = opts.color;
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
    });
    ctx.stroke();

    // 高亮最后一个点
    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, opts.lineWidth + 1, 0, Math.PI * 2);
    ctx.fillStyle = opts.highlightColor;
    ctx.fill();
  }

  /**
   * 绘制柱状迷你图
   */
  private drawBars(
    ctx: CanvasRenderingContext2D,
    data: number[],
    min: number,
    range: number,
    drawWidth: number,
    drawHeight: number,
    padding: number,
    opts: Required<Pick<SparklineOptions, 'color' | 'negativeColor' | 'lineWidth'>>
  ): void {
    const barCount = data.length;
    const gap = 1;
    const barWidth = Math.max(1, (drawWidth - gap * (barCount - 1)) / barCount);
    const zeroLine = min < 0 ? padding + drawHeight * (0 - min) / range : padding + drawHeight;

    data.forEach((value, i) => {
      const x = padding + i * (barWidth + gap);
      let barHeight: number;
      let y: number;

      if (value >= 0) {
        barHeight = drawHeight * value / range;
        y = zeroLine - barHeight;
      } else {
        barHeight = drawHeight * Math.abs(value) / range;
        y = zeroLine;
      }

      barHeight = Math.max(1, barHeight);

      ctx.fillStyle = (opts.negativeColor && value < 0) ? opts.negativeColor : opts.color;
      ctx.fillRect(x, y, barWidth, barHeight);
    });
  }

  /**
   * 绘制面积迷你图
   */
  private drawArea(
    ctx: CanvasRenderingContext2D,
    data: number[],
    min: number,
    range: number,
    drawWidth: number,
    drawHeight: number,
    padding: number,
    opts: Required<Pick<SparklineOptions, 'color' | 'lineWidth'>>
  ): void {
    if (data.length < 2) return;

    const points = this.calculatePoints(data, min, range, drawWidth, drawHeight, padding);
    const baseline = padding + drawHeight;

    // 填充区域
    ctx.beginPath();
    ctx.moveTo(points[0].x, baseline);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, baseline);
    ctx.closePath();

    // 渐变填充
    const gradient = ctx.createLinearGradient(0, padding, 0, baseline);
    gradient.addColorStop(0, this.hexToRgba(opts.color, 0.3));
    gradient.addColorStop(1, this.hexToRgba(opts.color, 0.02));
    ctx.fillStyle = gradient;
    ctx.fill();

    // 线条
    ctx.beginPath();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }

  /**
   * 计算数据点坐标
   */
  private calculatePoints(
    data: number[],
    min: number,
    range: number,
    drawWidth: number,
    drawHeight: number,
    padding: number
  ): Array<{ x: number; y: number }> {
    return data.map((value, i) => ({
      x: data.length === 1
        ? padding + drawWidth / 2
        : padding + (i / (data.length - 1)) * drawWidth,
      y: padding + drawHeight - (value - min) / range * drawHeight,
    }));
  }

  /**
   * 绘制圆角矩形
   */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * hex 颜色转 rgba
   */
  private hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(33, 150, 243, ${alpha})`;
    return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
  }

  /**
   * 生成单元格渲染器用的 HTML（含 canvas 元素）
   * 用于 cellRenderer 返回值
   */
  createCellRendererHtml(options: SparklineOptions, uniqueId: string): string {
    const w = options.width || 100;
    const h = options.height || 30;
    return `<canvas class="db-grid-sparkline" data-sparkline-id="${uniqueId}" width="${w}" height="${h}" style="display:block;width:${w}px;height:${h}px;"></canvas>`;
  }
}
