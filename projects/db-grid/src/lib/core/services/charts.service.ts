/**
 * 图表服务 — 基于 Chart.js 实现内嵌图表
 * 支持：柱状图、折线图、饼图、环形图
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

@Injectable()
export class ChartsService {
  private charts: Map<string, ChartInstance> = new Map();

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

  destroyChart(containerId: string): void {
    this.charts.get(containerId)?.destroy();
    this.charts.delete(containerId);
  }

  destroyAll(): void {
    this.charts.forEach(c => c.destroy());
    this.charts.clear();
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
}
