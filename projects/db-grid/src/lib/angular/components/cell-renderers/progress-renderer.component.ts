import { Component, Input } from '@angular/core';

/**
 * 进度条单元格渲染器
 * 
 * 使用方式：
 * ```typescript
 * columnDefs = [
 *   { field: 'progress', headerName: '进度', cellRenderer: ProgressRendererComponent }
 * ]
 * ```
 */
@Component({
  selector: 'db-progress-renderer',
  template: `
    <div class="progress-container">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          [style.width.%]="displayValue"
          [style.background]="getBarColor()">
        </div>
      </div>
      @if (showLabel) {
        <span class="progress-label">{{ displayValue }}%</span>
      }
    </div>
  `,
  styles: [`
    .progress-container {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      height: 100%;
    }
    .progress-bar {
      flex: 1;
      height: 12px;
      background: #e9ecef;
      border-radius: 6px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      border-radius: 6px;
      transition: width 0.3s ease;
    }
    .progress-label {
      font-size: 12px;
      color: #666;
      min-width: 40px;
      text-align: right;
    }
  `]
})
export class ProgressRendererComponent {
  /** 当前值 (0-100 或 0-1) */
  value: number = 0;
  
  /** 最大值 */
  max: number = 100;
  
  /** 是否显示标签 */
  showLabel: boolean = true;

  /** 颜色阈值 */
  thresholds: { value: number; color: string }[] = [
    { value: 30, color: '#dc3545' },  // 红色
    { value: 60, color: '#ffc107' },  // 黄色
    { value: 100, color: '#28a745' },  // 绿色
  ];

  /** 自定义颜色 */
  customColor: string | null = null;

  /** 计算后的显示值 */
  get displayValue(): number {
    if (this.value <= 1) {
      // 0-1 范围
      return Math.round(this.value * 100);
    }
    // 0-100 范围
    return Math.min(100, Math.max(0, Math.round(this.value)));
  }

  /**
   * AG Grid Angular 接口
   */
  agInit(params: any): void {
    this.value = params.value ?? 0;
    this.max = params.max ?? params.cellRendererParams?.max ?? 100;
    this.showLabel = params.showLabel ?? params.cellRendererParams?.showLabel ?? true;
    this.customColor = params.color ?? params.cellRendererParams?.color ?? null;
    
    // 支持阈值配置
    if (params.thresholds) {
      this.thresholds = params.thresholds;
    }
  }

  /**
   * 刷新
   */
  refresh(params: any): boolean {
    this.agInit(params);
    return true;
  }

  /**
   * 获取进度条颜色
   */
  getBarColor(): string {
    if (this.customColor) {
      return this.customColor;
    }
    
    const percent = this.displayValue;
    for (const threshold of this.thresholds) {
      if (percent <= threshold.value) {
        return threshold.color;
      }
    }
    
    return this.thresholds[this.thresholds.length - 1].color;
  }
}
