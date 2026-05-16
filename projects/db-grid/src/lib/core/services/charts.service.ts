/**
 * 图表服务 — 基于 Chart.js 实现内嵌图表
 * 支持：柱状图、折线图、饼图、环形图、迷你图 (sparkline)
 */

import { Injectable } from '@angular/core';

// Chart.js 动态导入类型
export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  title?: string;
  data: any;
  options?: any;
}

export interface ChartInstance {
  id: string;
  type: string;
  destroy: () => void;
}

const PALETTE = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666',
  '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'
];

/** 迷你图 sparkline 默认配置 */
const SPARKLINE_DEFAULTS: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: false },
    tooltip: { enabled: false },
  },
  scales: {
    x: { display: false },
    y: { display: false },
  },
  elements: {
    point: { radius: 0 },
    line: { tension: 0.4, borderWidth: 1.5 },
  },
  animation: false,
};

@Injectable()
export class ChartsService {
  private charts: Map<string, ChartInstance> = new Map();
  private elementCharts: Map<HTMLElement, ChartInstance> = new Map();
  private chartIdCounter = 0;

  async createChart(containerId: string, config: ChartConfig): Promise<ChartInstance> {
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    const canvas = document.getElementById(containerId) as HTMLCanvasElement;
    if (!canvas) throw new Error(`Container #${containerId} not found`);

    const chart = new Chart(canvas, {
      type: config.type,
      data: config.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: !!config.title,
            text: config.title || '',
            font: { size: 14 }
          },
          legend: {
            position: 'bottom'
          }
        },
        ...config.options
      }
    });

    const instance: ChartInstance = {
      id: containerId,
      type: config.type,
      destroy: () => chart.destroy()
    };

    this.charts.set(containerId, instance);
    return instance;
  }

  /** 在 HTMLElement 中创建图表（不依赖 containerId） */
  async createChartInElement(element: HTMLElement, config: ChartConfig): Promise<ChartInstance> {
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    // 创建 canvas 并追加到 element
    const canvas = document.createElement('canvas');
    element.innerHTML = '';
    element.appendChild(canvas);

    const chart = new Chart(canvas, {
      type: config.type,
      data: config.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: !!config.title,
            text: config.title || '',
            font: { size: 14 }
          },
          legend: {
            position: 'bottom'
          }
        },
        ...config.options
      }
    });

    const id = `chart-el-${++this.chartIdCounter}`;
    const instance: ChartInstance = {
      id,
      type: config.type,
      destroy: () => chart.destroy()
    };

    this.elementCharts.set(element, instance);
    return instance;
  }

  /** 创建迷你图 (sparkline) */
  async createSparkline(
    element: HTMLElement,
    data: number[],
    options?: { fill?: boolean; color?: string; fillColor?: string; width?: number; height?: number }
  ): Promise<ChartInstance> {
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    const isArea = options?.fill !== false; // 默认有填充
    const color = options?.color || '#5470c6';
    const fillColor = options?.fillColor || this.hexToRgba(color, 0.15);

    // 创建 canvas
    const canvas = document.createElement('canvas');
    element.innerHTML = '';
    element.appendChild(canvas);

    if (options?.width) element.style.width = `${options.width}px`;
    if (options?.height) element.style.height = `${options.height}px`;

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i),
        datasets: [{
          data,
          borderColor: color,
          backgroundColor: fillColor,
          fill: isArea,
        }]
      },
      options: { ...SPARKLINE_DEFAULTS }
    });

    const id = `sparkline-${++this.chartIdCounter}`;
    const instance: ChartInstance = {
      id,
      type: 'sparkline',
      destroy: () => chart.destroy()
    };

    this.elementCharts.set(element, instance);
    return instance;
  }

  /** 在单元格中创建图表（用于 chartCellRenderer） */
  async createCellChart(
    element: HTMLElement,
    config: {
      type: 'bar' | 'line' | 'pie' | 'doughnut' | 'sparkline' | 'sparklineArea';
      data: any[];
      labels?: string[];
      colors?: string[];
      height?: number;
      width?: number;
      extraOptions?: any;
    }
  ): Promise<ChartInstance> {
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    const isSparkline = config.type === 'sparkline' || config.type === 'sparklineArea';
    const height = config.height || (isSparkline ? 30 : 60);
    const width = config.width || (isSparkline ? 80 : 100);

    element.style.height = `${height}px`;
    element.style.width = `${width}px`;
    element.style.overflow = 'hidden';
    element.style.display = 'flex';
    element.style.alignItems = 'center';
    element.innerHTML = '';

    const canvas = document.createElement('canvas');
    element.appendChild(canvas);

    let chartType: any = config.type;
    let chartData: any;
    let chartOptions: any;

    if (isSparkline) {
      const isArea = config.type === 'sparklineArea';
      const color = config.colors?.[0] || '#5470c6';
      chartType = 'line';
      chartData = {
        labels: config.data.map((_, i) => i),
        datasets: [{
          data: config.data,
          borderColor: color,
          backgroundColor: isArea ? this.hexToRgba(color, 0.15) : 'transparent',
          fill: isArea,
        }]
      };
      chartOptions = {
        ...SPARKLINE_DEFAULTS,
        layout: { padding: 0 },
      };
    } else {
      chartType = config.type;
      chartData = {
        labels: config.labels || config.data.map((_, i) => `${i + 1}`),
        datasets: [{
          data: config.data,
          backgroundColor: config.colors || PALETTE.slice(0, config.data.length),
          borderColor: config.colors || PALETTE.slice(0, config.data.length),
          borderWidth: 1,
        }]
      };
      chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: false },
          tooltip: { enabled: false },
        },
        scales: config.type === 'pie' || config.type === 'doughnut' ? {} : {
          x: { display: false },
          y: { display: false },
        },
        animation: false,
        layout: { padding: 0 },
      };
    }

    // 合并额外选项
    if (config.extraOptions) {
      chartOptions = this.deepMerge(chartOptions, config.extraOptions);
    }

    const chart = new Chart(canvas, {
      type: chartType,
      data: chartData,
      options: chartOptions,
    });

    const id = `cell-chart-${++this.chartIdCounter}`;
    const instance: ChartInstance = {
      id,
      type: config.type,
      destroy: () => chart.destroy()
    };

    this.elementCharts.set(element, instance);
    return instance;
  }

  /** 在详情面板中创建图表 */
  async createDetailChart(
    element: HTMLElement,
    config: {
      type: 'bar' | 'line' | 'pie' | 'doughnut';
      title?: string;
      data: any[];
      labels?: string[];
      colors?: string[];
      height?: number;
      options?: any;
    }
  ): Promise<ChartInstance> {
    return this.createChartInElement(element, {
      type: config.type,
      title: config.title,
      data: {
        labels: config.labels || config.data.map((_, i) => `${i + 1}`),
        datasets: [{
          label: config.title || '',
          data: config.data,
          backgroundColor: config.colors || PALETTE.slice(0, config.data.length),
          borderColor: config.colors ? config.colors.map(c => c) : PALETTE.slice(0, config.data.length),
          borderWidth: 1,
        }]
      },
      options: {
        ...(config.options || {}),
      }
    });
  }

  /** 销毁通过 containerId 管理的图表 */
  destroyChart(containerId: string): void {
    this.charts.get(containerId)?.destroy();
    this.charts.delete(containerId);
  }

  /** 销毁通过 element 关联的图表 */
  destroyChartInElement(element: HTMLElement): void {
    const instance = this.elementCharts.get(element);
    if (instance) {
      instance.destroy();
      this.elementCharts.delete(element);
    }
  }

  destroyAll(): void {
    this.charts.forEach(c => c.destroy());
    this.charts.clear();
    // WeakMap entries are auto-collected, but we still need to destroy the charts
    this.elementCharts.forEach(c => c.destroy());
  }

  // 从表格数据生成图表配置
  chartConfigFromGridData(
    type: 'bar' | 'line' | 'pie' | 'doughnut',
    title: string,
    labels: string[],
    datasets: { label: string; data: number[]; color?: string }[]
  ): any {
    return {
      type,
      title,
      data: {
        labels,
        datasets: datasets.map((ds, i) => ({
          label: ds.label,
          data: ds.data,
          backgroundColor: ds.color || PALETTE[i % PALETTE.length],
          borderColor: ds.color ? this.hexToRgba(ds.color, 1) : PALETTE[i % PALETTE.length],
          borderWidth: 1
        }))
      }
    };
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        output[key] = this.deepMerge(output[key] || {}, source[key]);
      } else {
        output[key] = source[key];
      }
    }
    return output;
  }
}
