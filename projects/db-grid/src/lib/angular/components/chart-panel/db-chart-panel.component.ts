/**
 * 图表面板组件 — 浮动在 grid 右侧
 * 支持柱状图、折线图、饼图、环形图、面积图
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  signal,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartsService, ChartInstance } from '../../../core/services/charts.service';
import { ColDef } from '../../../core/models';

export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'area';

@Component({
  selector: 'db-chart-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="db-chart-panel" (keydown.escape)="onClose.emit()">
      <div class="db-chart-panel-header">
        <span class="db-chart-panel-title">📈 数据图表</span>
        <button class="db-chart-panel-close" (click)="onClose.emit()" title="关闭">✕</button>
      </div>
      <div class="db-chart-type-btns">
        @for (btn of chartTypeButtons; track btn.type) {
          <button
            [class.active]="currentType() === btn.type"
            (click)="onTypeChange.emit(btn.type)">
            {{ btn.icon }} {{ btn.label }}
          </button>
        }
      </div>
      <div class="db-chart-canvas-container" #canvasContainer></div>
      <div class="db-chart-panel-footer">
        <button class="db-chart-export-btn" (click)="onExport.emit('png')">📥 导出 PNG</button>
        <button class="db-chart-export-btn" (click)="onExport.emit('svg')">📥 导出 SVG</button>
      </div>
    </div>
  `,
  styles: [`
    .db-chart-panel {
      position: absolute;
      right: 0; top: 0;
      width: 420px; height: 100%;
      background: var(--db-grid-bg, #fff);
      border-left: 1px solid var(--db-grid-border-color, #ddd);
      box-shadow: -2px 0 8px rgba(0,0,0,0.1);
      z-index: 100;
      display: flex; flex-direction: column;
      font-family: var(--db-grid-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      font-size: var(--db-grid-font-size, 14px);
      animation: db-chart-panel-slide-in 0.2s ease-out;
    }
    @keyframes db-chart-panel-slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .db-chart-panel-header {
      padding: 8px 12px;
      border-bottom: 1px solid var(--db-grid-border-color, #ddd);
      display: flex; justify-content: space-between; align-items: center;
      background: var(--db-grid-header-bg, #f5f5f5);
    }
    .db-chart-panel-title {
      font-weight: 600; font-size: 14px;
    }
    .db-chart-panel-close {
      background: none; border: none; cursor: pointer;
      font-size: 16px; padding: 2px 6px; border-radius: 3px;
      color: var(--db-grid-text-secondary, #666);
      line-height: 1;
    }
    .db-chart-panel-close:hover {
      background: var(--db-grid-row-hover-bg, #f0f7ff);
      color: var(--db-grid-accent, #2196f3);
    }
    .db-chart-type-btns {
      display: flex; gap: 4px; padding: 8px 12px;
      border-bottom: 1px solid var(--db-grid-border-color, #ddd);
    }
    .db-chart-type-btns button {
      flex: 1; padding: 5px 8px;
      border: 1px solid var(--db-grid-border-color, #ddd);
      border-radius: 4px; cursor: pointer;
      background: var(--db-grid-bg, #fff);
      font-size: 12px; white-space: nowrap;
      transition: all 0.15s;
      color: var(--db-grid-text-secondary, #333);
    }
    .db-chart-type-btns button:hover {
      border-color: var(--db-grid-accent, #2196f3);
      color: var(--db-grid-accent, #2196f3);
    }
    .db-chart-type-btns button.active {
      background: var(--db-grid-accent, #2196f3);
      color: #fff; border-color: var(--db-grid-accent, #2196f3);
    }
    .db-chart-canvas-container {
      flex: 1; padding: 12px; overflow: hidden;
      min-height: 200px;
    }
    .db-chart-panel-footer {
      padding: 8px 12px;
      border-top: 1px solid var(--db-grid-border-color, #ddd);
      display: flex; gap: 8px;
      background: var(--db-grid-header-bg, #f5f5f5);
    }
    .db-chart-export-btn {
      flex: 1; padding: 6px 12px;
      border: 1px solid var(--db-grid-border-color, #ddd);
      border-radius: 4px; cursor: pointer;
      background: var(--db-grid-bg, #fff);
      font-size: 12px;
      transition: all 0.15s;
      color: var(--db-grid-text-secondary, #333);
    }
    .db-chart-export-btn:hover {
      border-color: var(--db-grid-accent, #2196f3);
      color: var(--db-grid-accent, #2196f3);
    }
  `],
})
export class DbChartPanelComponent implements OnDestroy {
  @ViewChild('canvasContainer') canvasContainer!: ElementRef<HTMLDivElement>;

  currentType = signal<ChartType>('bar');
  isPanelVisible = signal<boolean>(false);

  @Output() onClose = new EventEmitter<void>();
  @Output() onTypeChange = new EventEmitter<ChartType>();
  @Output() onExport = new EventEmitter<'png' | 'svg'>();

  chartTypeButtons: { type: ChartType; label: string; icon: string }[] = [
    { type: 'bar', label: '柱状图', icon: '📊' },
    { type: 'line', label: '折线图', icon: '📈' },
    { type: 'area', label: '面积图', icon: '📉' },
    { type: 'pie', label: '饼图', icon: '🥧' },
    { type: 'doughnut', label: '环形图', icon: '🍩' },
  ];

  private chartsService = inject(ChartsService);
  private currentChartInstance: ChartInstance | null = null;
  private currentRangeData: any[][] = [];
  private currentColumns: ColDef[] = [];

  getContainerElement(): HTMLElement | null {
    return this.canvasContainer?.nativeElement || null;
  }

  show(): void {
    this.isPanelVisible.set(true);
  }

  hide(): void {
    this.isPanelVisible.set(false);
    this.destroyChart();
  }

  setType(type: ChartType): void {
    this.currentType.set(type);
    // 重新渲染当前数据
    if (this.currentRangeData.length > 0) {
      this.renderChart(this.currentRangeData, this.currentColumns);
    }
  }

  /**
   * 接收选中范围数据并渲染图表
   * @param rangeData - 二维数组，来自 rangeSelectionService.getRangeValues()
   * @param columns - 列定义
   */
  async updateChart(rangeData: any[][], columns: ColDef[]): Promise<void> {
    this.currentRangeData = rangeData;
    this.currentColumns = columns;
    await this.renderChart(rangeData, columns);
  }

  /**
   * 渲染图表到面板容器
   */
  private async renderChart(rangeData: any[][], columns: ColDef[]): Promise<void> {
    const container = this.getContainerElement();
    if (!container) {
      console.warn('[DbChartPanel] Canvas container not ready');
      return;
    }

    if (!rangeData || rangeData.length === 0) {
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;">请先选择数据范围</div>';
      return;
    }

    // 销毁旧图表
    this.destroyChart();

    try {
      // 对于面积图，使用 line 类型并设置 fill
      const chartType = this.currentType() === 'area' ? 'line' : this.currentType() as any;

      this.currentChartInstance = await this.chartsService.createChartFromRange(
        rangeData,
        columns,
        chartType as 'bar' | 'line' | 'pie' | 'doughnut',
        container
      );

      // 对于面积图，需要设置 fill 选项
      if (this.currentType() === 'area' && this.currentChartInstance.nativeChart) {
        const chart = this.currentChartInstance.nativeChart;
        if (chart.data?.datasets) {
          chart.data.datasets.forEach((ds: any, idx: number) => {
            ds.fill = true;
            const color = ds.borderColor || '#5470c6';
            ds.backgroundColor = this.hexToRgbaArray(color, 0.2);
          });
          chart.update();
        }
      }
    } catch (err) {
      console.error('[DbChartPanel] Failed to render chart:', err);
      container.innerHTML = '<div style="color:red;padding:12px;">图表渲染失败，请检查数据格式</div>';
    }
  }

  /**
   * 导出图表为图片
   */
  exportChart(format: 'png' | 'svg'): void {
    if (!this.currentChartInstance) return;
    const base64 = this.chartsService.exportChartAsImage(
      this.currentChartInstance.id || '',
      format
    );
    if (base64) {
      const link = document.createElement('a');
      link.download = `db-grid-chart-${Date.now()}.png`;
      link.href = base64;
      link.click();
    }
  }

  private destroyChart(): void {
    if (this.currentChartInstance) {
      this.currentChartInstance.destroy();
      this.currentChartInstance = null;
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private hexToRgbaArray(color: string | string[], alpha: number): any[] {
    if (Array.isArray(color)) {
      return color.map(c => this.hexToRgba(c, alpha));
    }
    return [this.hexToRgba(color, alpha)];
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }
}
