import { Injectable } from '@angular/core';

/**
 * 迷你图类型
 */
export type SparklineType = 'line' | 'bar' | 'pie' | 'stacked' | 'normalized';

/**
 * 迷你图配置
 */
export interface SparklineConfig {
  /** 迷你图类型 */
  type?: SparklineType;
  
  /** 容器宽度（像素） */
  width?: number;
  
  /** 容器高度（像素） */
  height?: number;
  
  /** 线条颜色（line 类型） */
  lineColor?: string;
  
  /** 填充颜色（line 类型） */
  fillColor?: string;
  
  /** 柱条颜色（bar 类型） */
  barColor?: string;
  
  /** 柱条间距（bar 类型） */
  barSpacing?: number;
  
  /** 饼图颜色列表（pie 类型） */
  pieColors?: string[];
  
  /** 是否显示数据点（line 类型） */
  showMarkers?: boolean;
  
  /** 数据点颜色（line 类型） */
  markerColor?: string;
  
  /** 最小值颜色（bar/line 类型） */
  minColor?: string;
  
  /** 最大值颜色（bar/line 类型） */
  maxColor?: string;
  
  /** 中性值颜色（bar/line 类型） */
  neutralColor?: string;
  
  /** 高值阈值（bar/line 类型） */
  highThreshold?: number;
  
  /** 低值阈值（bar/line 类型） */
  lowThreshold?: number;
  
  /** 标题（tooltip 显示） */
  title?: string;
  
  /** 值标签格式化函数 */
  labelFormatter?: (value: number) => string;
}

/**
 * 默认迷你图配置
 */
export const DEFAULT_SPARKLINE_CONFIG: SparklineConfig = {
  type: 'line',
  width: 100,
  height: 30,
  lineColor: '#2196f3',
  fillColor: 'rgba(33, 150, 243, 0.2)',
  barColor: '#2196f3',
  barSpacing: 1,
  pieColors: ['#2196f3', '#4caf50', '#ff9800', '#f44336', '#9c27b0'],
  showMarkers: false,
  markerColor: '#2196f3',
  minColor: '#f44336',
  maxColor: '#4caf50',
  neutralColor: '#ff9800',
  highThreshold: 80,
  lowThreshold: 20,
};

/**
 * 迷你图服务 — 提供迷你图渲染功能
 * 
 * AG Grid 企业版对应功能：Sparklines
 */
@Injectable()
export class SparklineService {
  /** 是否已加载 Canvas 依赖 */
  private canvasSupported = true;
  
  constructor() {
    // 检查浏览器是否支持 Canvas
    this.canvasSupported = typeof document !== 'undefined' && !!document.createElement('canvas').getContext;
  }
  
  /**
   * 检查是否支持 Canvas
   */
  isSupported(): boolean {
    return this.canvasSupported;
  }
  
  /**
   * 渲染迷你图到 Canvas
   * @param canvas Canvas 元素
   * @param data 数据数组
   * @param config 配置
   */
  render(canvas: HTMLCanvasElement, data: number[], config: SparklineConfig = {}): void {
    if (!this.canvasSupported || !data || data.length === 0) {
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const fullConfig: SparklineConfig = { ...DEFAULT_SPARKLINE_CONFIG, ...config };
    
    // 设置 Canvas 尺寸
    canvas.width = fullConfig.width || 100;
    canvas.height = fullConfig.height || 30;
    
    // 根据类型渲染
    switch (fullConfig.type) {
      case 'line':
        this.renderLine(ctx, data, fullConfig);
        break;
      case 'bar':
        this.renderBar(ctx, data, fullConfig);
        break;
      case 'pie':
        this.renderPie(ctx, data, fullConfig);
        break;
      case 'stacked':
        this.renderStacked(ctx, data, fullConfig);
        break;
      case 'normalized':
        this.renderNormalized(ctx, data, fullConfig);
        break;
    }
  }
  
  /**
   * 渲染折线图
   */
  private renderLine(ctx: CanvasRenderingContext2D, data: number[], config: SparklineConfig): void {
    const { width = 100, height = 30, lineColor = '#2196f3', fillColor = 'rgba(33, 150, 243, 0.2)', showMarkers = false, markerColor = '#2196f3' } = config;
    
    // 计算数据范围
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    // 计算 X/Y 坐标
    const stepX = width / (data.length - 1 || 1);
    const padding = 2;
    const chartHeight = height - padding * 2;
    
    // 创建路径
    ctx.beginPath();
    
    data.forEach((value, index) => {
      const x = index * stepX;
      const y = padding + chartHeight - (value - min) / range * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    // 绘制填充区域
    ctx.lineTo((data.length - 1) * stepX, height - padding);
    ctx.lineTo(0, height - padding);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    
    // 绘制线条
    ctx.beginPath();
    data.forEach((value, index) => {
      const x = index * stepX;
      const y = padding + chartHeight - (value - min) / range * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // 绘制数据点
    if (showMarkers) {
      data.forEach((value, index) => {
        const x = index * stepX;
        const y = padding + chartHeight - (value - min) / range * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = markerColor;
        ctx.fill();
      });
    }
  }
  
  /**
   * 渲染柱状图
   */
  private renderBar(ctx: CanvasRenderingContext2D, data: number[], config: SparklineConfig): void {
    const { width = 100, height = 30, barColor = '#2196f3', barSpacing = 1 } = config;
    
    // 计算数据范围
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    // 计算柱条宽度和间距
    const barWidth = Math.max(1, (width - barSpacing * (data.length - 1)) / data.length);
    const padding = 2;
    const chartHeight = height - padding * 2;
    
    // 绘制柱条
    data.forEach((value, index) => {
      const x = index * (barWidth + barSpacing);
      const barHeight = (value - min) / range * chartHeight;
      const y = height - padding - barHeight;
      
      ctx.fillStyle = barColor;
      ctx.fillRect(x, y, barWidth, barHeight);
    });
  }
  
  /**
   * 渲染饼图
   */
  private renderPie(ctx: CanvasRenderingContext2D, data: number[], config: SparklineConfig): void {
    const { width = 100, height = 30, pieColors = ['#2196f3', '#4caf50', '#ff9800', '#f44336', '#9c27b0'] } = config;
    
    const total = data.reduce((sum, val) => sum + val, 0);
    if (total === 0) return;
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 1;
    
    let startAngle = -Math.PI / 2;
    
    data.forEach((value, index) => {
      const sliceAngle = (value / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      
      ctx.fillStyle = pieColors[index % pieColors.length];
      ctx.fill();
      
      startAngle = endAngle;
    });
  }
  
  /**
   * 渲染堆叠图（简化版）
   */
  private renderStacked(ctx: CanvasRenderingContext2D, data: number[], config: SparklineConfig): void {
    // 堆叠图需要多维数据，这里简化为柱状图
    this.renderBar(ctx, data, config);
  }
  
  /**
   * 渲染归一化图（简化版）
   */
  private renderNormalized(ctx: CanvasRenderingContext2D, data: number[], config: SparklineConfig): void {
    // 归一化到 0-1 范围
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const normalized = data.map(val => (val - min) / range);
    
    // 渲染为面积图
    this.renderLine(ctx, normalized, { ...config, fillColor: 'rgba(33, 150, 243, 0.4)' });
  }
  
  /**
   * 从单元格数据提取数值数组
   * @param cellValue 单元格值（支持数组、JSON 字符串、逗号分隔）
   * @returns 数值数组
   */
  extractData(cellValue: any): number[] {
    if (Array.isArray(cellValue)) {
      return cellValue.map(v => parseFloat(v)).filter(v => !isNaN(v));
    }
    
    if (typeof cellValue === 'string') {
      try {
        // 尝试解析 JSON 数组
        const parsed = JSON.parse(cellValue);
        if (Array.isArray(parsed)) {
          return parsed.map(v => parseFloat(v)).filter(v => !isNaN(v));
        }
      } catch {
        // 尝试解析逗号分隔值
        return cellValue.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
      }
    }
    
    if (typeof cellValue === 'number') {
      return [cellValue];
    }
    
    return [];
  }
  
  /**
   * 创建迷你图单元格渲染器
   * @param config 默认配置
   * @returns 渲染器函数
   */
  createRenderer(defaultConfig: SparklineConfig = {}) {
    return (params: any): HTMLElement => {
      const container = document.createElement('div');
      container.style.width = `${defaultConfig.width || 100}px`;
      container.style.height = `${defaultConfig.height || 30}px`;
      
      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      
      const data = this.extractData(params.value);
      const config = { ...DEFAULT_SPARKLINE_CONFIG, ...defaultConfig, ...params.sparklineConfig };
      
      // 等待 DOM 更新后渲染
      setTimeout(() => {
        this.render(canvas, data, config);
      }, 0);
      
      container.appendChild(canvas);
      return container;
    };
  }
}
