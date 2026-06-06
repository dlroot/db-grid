/**
 * 图表服务 — 基于 Chart.js 实现内嵌图表
 * 支持：柱状图、折线图、饼图、环形图、迷你图 (sparkline)
 */

import { Injectable } from '@angular/core';
import { ColDef } from '../models';

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
  nativeChart?: any; // Chart.js 原生实例
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
  private nativeCharts: Map<string, any> = new Map(); // 存储 Chart.js 原生实例
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
      destroy: () => { chart.destroy(); this.nativeCharts.delete(containerId); },
      nativeChart: chart,
    };

    this.charts.set(containerId, instance);
    this.nativeCharts.set(containerId, chart);
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
      destroy: () => { chart.destroy(); this.nativeCharts.delete(id); },
      nativeChart: chart,
    };

    this.elementCharts.set(element, instance);
    this.nativeCharts.set(id, chart);
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
      destroy: () => { chart.destroy(); this.nativeCharts.delete(id); },
      nativeChart: chart,
    };

    this.elementCharts.set(element, instance);
    this.nativeCharts.set(id, chart);
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
      destroy: () => { chart.destroy(); this.nativeCharts.delete(id); },
      nativeChart: chart,
    };

    this.elementCharts.set(element, instance);
    this.nativeCharts.set(id, chart);
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
    const instance = this.charts.get(containerId);
    if (instance) {
      instance.destroy();
      this.charts.delete(containerId);
    }
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
    this.elementCharts.forEach(c => c.destroy());
    this.elementCharts.clear();
    this.nativeCharts.clear();
  }

  /**
   * 根据选中范围数据创建图表
   * @param rangeData - 二维数组（来自 rangeSelectionService.getRangeValues()）
   * @param columns - 列定义
   * @param chartType - 图表类型
   * @param container - DOM 容器
   */
  async createChartFromRange(
    rangeData: any[][],
    columns: ColDef[],
    chartType: 'bar' | 'line' | 'pie' | 'doughnut',
    container: HTMLElement
  ): Promise<ChartInstance> {
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    if (!rangeData || rangeData.length === 0) {
      throw new Error('No range data provided for chart creation');
    }

    // 判断列数
    const colCount = rangeData[0]?.length || 0;
    let labels: string[];
    let datasets: any[];

    if (colCount === 1) {
      // 只有一列：用行号作为 labels，该列作为数据
      labels = rangeData.map((_, i) => `${i + 1}`);
      const values = rangeData.map(row => this.toNumber(row[0]));
      datasets = [{
        label: columns[0]?.headerName || columns[0]?.field || 'Data',
        data: values,
        backgroundColor: PALETTE,
        borderColor: PALETTE,
        borderWidth: 1,
      }];
    } else {
      // 第一列 → labels，其他列 → datasets
      labels = rangeData.map(row => String(row[0] ?? ''));
      datasets = [];
      for (let c = 1; c < colCount; c++) {
        const col = columns[c];
        const values = rangeData.map(row => this.toNumber(row[c]));
        const color = PALETTE[(c - 1) % PALETTE.length];
        datasets.push({
          label: col?.headerName || col?.field || `Series ${c}`,
          data: values,
          backgroundColor: (chartType === 'pie' || chartType === 'doughnut')
            ? values.map((_, i) => PALETTE[i % PALETTE.length])
            : color,
          borderColor: color,
          borderWidth: 1,
        });
      }
    }

    // 创建 canvas
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    const isPie = chartType === 'pie' || chartType === 'doughnut';
    const chart = new Chart(canvas, {
      type: chartType,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'DB Grid 数据图表',
            font: { size: 14 },
          },
          legend: {
            position: 'bottom',
          },
        },
        scales: isPie ? {} : {
          x: { display: true },
          y: { display: true, beginAtZero: true },
        },
      },
    });

    const id = `range-chart-${++this.chartIdCounter}`;
    const instance: ChartInstance = {
      id,
      type: chartType,
      destroy: () => { chart.destroy(); this.nativeCharts.delete(id); },
      nativeChart: chart,
    };

    this.charts.set(id, instance);
    this.nativeCharts.set(id, chart);
    return instance;
  }

  /**
   * 更新已有图表的数据
   */
  async updateChartData(chartId: string, newData: any[][]): Promise<void> {
    const chart = this.nativeCharts.get(chartId);
    if (!chart) return;

    if (!newData || newData.length === 0) return;

    const colCount = newData[0]?.length || 0;

    if (colCount === 1) {
      const labels = newData.map((_, i) => `${i + 1}`);
      const values = newData.map(row => this.toNumber(row[0]));
      chart.data.labels = labels;
      if (chart.data.datasets[0]) {
        chart.data.datasets[0].data = values;
      }
    } else {
      const labels = newData.map(row => String(row[0] ?? ''));
      chart.data.labels = labels;
      for (let c = 1; c < colCount; c++) {
        if (chart.data.datasets[c - 1]) {
          chart.data.datasets[c - 1].data = newData.map(row => this.toNumber(row[c]));
        }
      }
    }
    chart.update();
  }

  /**
   * 更新已有图表的类型
   */
  async updateChartType(chartId: string, chartType: 'bar' | 'line' | 'pie' | 'doughnut'): Promise<void> {
    const chart = this.nativeCharts.get(chartId);
    if (!chart) return;

    const isPie = chartType === 'pie' || chartType === 'doughnut';
    chart.config.type = chartType;
    chart.options.scales = isPie ? {} : {
      x: { display: true },
      y: { display: true, beginAtZero: true },
    };
    // 重新分配颜色给饼图/环形图
    if (isPie && chart.data.datasets.length > 0) {
      chart.data.datasets.forEach((ds: any) => {
        ds.backgroundColor = ds.data.map((_: any, i: number) => PALETTE[i % PALETTE.length]);
        ds.borderColor = ds.data.map((_: any, i: number) => PALETTE[i % PALETTE.length]);
      });
    }
    chart.update();
  }

  /**
   * 导出图表为 PNG/SVG
   */
  exportChartAsImage(chartId: string, format: 'png' | 'svg' = 'png'): string {
    const chart = this.nativeCharts.get(chartId);
    if (!chart) return '';

    if (format === 'png') {
      return chart.toBase64Image('image/png', 1);
    }
    // SVG 不直接支持，回退到 PNG
    return chart.toBase64Image('image/png', 1);
  }

  /**
   * 获取原生 Chart.js 实例（用于高级自定义）
   */
  getNativeChart(chartId: string): any | undefined {
    return this.nativeCharts.get(chartId);
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
          backgroundColor: (type === 'pie' || type === 'doughnut')
            ? ds.data.map((_, j) => PALETTE[j % PALETTE.length])
            : (ds.color || PALETTE[i % PALETTE.length]),
          borderColor: ds.color ? this.hexToRgba(ds.color, 1) : PALETTE[i % PALETTE.length],
          borderWidth: 1
        }))
      }
    };
  }

  /** 将值转为数字（非数字返回 0） */
  private toNumber(value: any): number {
    if (value == null) return 0;
    const num = typeof value === 'string' ? parseFloat(value.replace(/[,%\s]/g, '')) : Number(value);
    return isNaN(num) ? 0 : num;
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
