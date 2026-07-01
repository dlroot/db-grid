import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { SparklineService, SparklineConfig, SparklineType } from '../../../core/services/sparkline.service';

/**
 * 迷你图单元格渲染器组件
 * 
 * 在单元格中渲染迷你图（折线图、柱状图、饼图等）
 * 
 * 使用示例：
 * ```typescript
 * // 列定义
 * {
 *   field: 'salesData',
 *   cellRenderer: SparklineCellRendererComponent,
 *   cellRendererParams: {
 *     sparklineOptions: {
 *       type: 'line',
 *       lineColor: '#2196f3',
 *       fillColor: 'rgba(33, 150, 243, 0.2)',
 *       width: 100,
 *       height: 30,
 *     }
 *   }
 * }
 * ```
 */
@Component({
  selector: 'db-grid-sparkline-cell',
  template: `
    <div class="db-grid-sparkline-cell" [style.width.px]="width" [style.height.px]="height">
      <canvas 
        #sparklineCanvas 
        [width]="width" 
        [height]="height"
        [style.width.px]="width"
        [style.height.px]="height">
      </canvas>
      @if (error) {
        <div class="db-grid-sparkline-error">{{ error }}</div>
      }
    </div>
  `,
  styles: [`
    .db-grid-sparkline-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
    }
    .db-grid-sparkline-error {
      color: #f44336;
      font-size: 10px;
      text-align: center;
    }
    canvas {
      display: block;
    }
  `],
  encapsulation: ViewEncapsulation.None,
})
export class SparklineCellRendererComponent implements OnInit, OnDestroy {
  /** 单元格值（数组或逗号分隔的字符串） */
  @Input() value: any;
  
  /** 行数据 */
  @Input() data: any;
  
  /** 列定义 */
  @Input() colDef: any;
  
  /** 迷你图配置（从 cellRendererParams 传入） */
  @Input() sparklineOptions?: SparklineConfig;
  
  /** 宽度 */
  @Input() width = 100;
  
  /** 高度 */
  @Input() height = 30;
  
  /** Canvas 元素引用 */
  @ViewChild('sparklineCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  /** 错误信息 */
  error: string | null = null;
  
  /** 默认配置 */
  private defaultConfig: SparklineConfig = {
    type: 'line',
    width: 100,
    height: 30,
    lineColor: '#2196f3',
    fillColor: 'rgba(33, 150, 243, 0.2)',
    showDots: false,
    showArea: true,
    responsive: false,
  };
  
  constructor(private sparklineService: SparklineService) {}
  
  ngOnInit(): void {
    this.initialize();
  }
  
  ngOnDestroy(): void {
    // 清理
  }
  
  /**
   * 初始化
   */
  private initialize(): void {
    // 合并配置
    const params = this.colDef?.cellRendererParams?.sparklineOptions;
    const config = { ...this.defaultConfig, ...params, ...this.sparklineOptions };
    
    this.width = config.width || 100;
    this.height = config.height || 30;
    
    // 渲染迷你图
    this.renderSparkline(config);
  }
  
  /**
   * 渲染迷你图
   */
  private renderSparkline(config: SparklineConfig): void {
    if (!this.canvasRef) {
      this.error = 'Canvas not found';
      return;
    }
    
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      this.error = 'Cannot get canvas context';
      return;
    }
    
    // 提取数据
    const data = this.sparklineService.extractData(this.value);
    
    if (data.length === 0) {
      this.error = 'No data';
      return;
    }
    
    // 根据类型渲染
    try {
      switch (config.type) {
        case 'line':
          this.sparklineService.renderLineChart(ctx, data, config);
          break;
        case 'bar':
          this.sparklineService.renderBarChart(ctx, data, config);
          break;
        case 'pie':
        case 'stacked':
        case 'normalized':
          // 对于复杂类型，使用通用渲染方法
          this.sparklineService.render(canvas, data, config);
          break;
        default:
          this.sparklineService.renderLineChart(ctx, data, config);
      }
      
      this.error = null;
    } catch (err) {
      this.error = `Render error: ${err}`;
      console.error('[SparklineCellRenderer] Render error:', err);
    }
  }
  
  /**
   * 刷新（当值变更时）
   */
  refresh(value: any): void {
    this.value = value;
    this.initialize();
  }
}
