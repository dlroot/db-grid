import { Component, Input, OnInit, OnDestroy, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerformanceMonitorService, PerformanceMetrics } from '../../../core/services';

/**
 * 性能面板组件
 * 显示 FPS、渲染时间、DOM 节点数等性能指标
 */
@Component({
  selector: 'db-performance-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="performance-panel" [class.collapsed]="collapsed()">
      <div class="panel-header" (click)="toggle()">
        <span class="panel-title">⚡ 性能监控</span>
        <span class="panel-toggle">{{ collapsed() ? '▼' : '▲' }}</span>
      </div>
      
      @if (!collapsed()) {
        <div class="panel-content">
          <!-- FPS 指示器 -->
          <div class="metric-row">
            <span class="metric-label">FPS</span>
            <div class="fps-bar">
              <div 
                class="fps-fill" 
                [style.width.%]="fpsPercent()"
                [class.good]="metrics().fps >= 50"
                [class.warning]="metrics().fps >= 30 && metrics().fps < 50"
                [class.bad]="metrics().fps < 30">
              </div>
            </div>
            <span class="metric-value" [class.good]="metrics().fps >= 50" [class.warning]="metrics().fps >= 30" [class.bad]="metrics().fps < 30">
              {{ metrics().fps }}
            </span>
          </div>
          
          <!-- 平均 FPS -->
          <div class="metric-row">
            <span class="metric-label">平均 FPS</span>
            <span class="metric-value secondary">{{ metrics().avgFps }}</span>
          </div>
          
          <!-- 渲染时间 -->
          <div class="metric-row">
            <span class="metric-label">渲染时间</span>
            <span class="metric-value" [class.good]="metrics().renderTime < 16" [class.warning]="metrics().renderTime >= 16 && metrics().renderTime < 50" [class.bad]="metrics().renderTime >= 50">
              {{ metrics().renderTime }}ms
            </span>
          </div>
          
          <!-- 平均渲染时间 -->
          <div class="metric-row">
            <span class="metric-label">平均渲染</span>
            <span class="metric-value secondary">{{ metrics().avgRenderTime }}ms</span>
          </div>
          
          <!-- DOM 节点数 -->
          <div class="metric-row">
            <span class="metric-label">DOM 节点</span>
            <span class="metric-value">{{ metrics().domNodes }}</span>
          </div>
          
          <!-- 可见行数 -->
          <div class="metric-row">
            <span class="metric-label">可见行数</span>
            <span class="metric-value">{{ metrics().visibleRows }}</span>
          </div>
          
          <!-- 内存使用 -->
          @if (metrics().memoryUsage !== null) {
            <div class="metric-row">
              <span class="metric-label">内存使用</span>
              <span class="metric-value">{{ metrics().memoryUsage }}MB</span>
            </div>
          }
          
          <!-- 警告 -->
          @if (warnings().length > 0) {
            <div class="warnings">
              @for (warning of warnings(); track warning) {
                <div class="warning-item">⚠️ {{ warning }}</div>
              }
            </div>
          }
          
          <!-- 健康状态 -->
          <div class="health-status" [class.healthy]="isHealthy()" [class.unhealthy]="!isHealthy()">
            {{ isHealthy() ? '✅ 健康' : '⚠️ 需要优化' }}
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .performance-panel {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.85);
      color: white;
      border-radius: 8px;
      font-size: 12px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      min-width: 200px;
      max-width: 280px;
    }
    
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px 8px 0 0;
    }
    
    .panel-title {
      font-weight: 600;
    }
    
    .panel-content {
      padding: 8px 12px;
    }
    
    .metric-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .metric-label {
      color: rgba(255, 255, 255, 0.7);
    }
    
    .metric-value {
      font-weight: 600;
    }
    
    .metric-value.secondary {
      font-weight: 400;
      color: rgba(255, 255, 255, 0.7);
    }
    
    .metric-value.good { color: #4caf50; }
    .metric-value.warning { color: #ffc107; }
    .metric-value.bad { color: #f44336; }
    
    .fps-bar {
      flex: 1;
      height: 6px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      margin: 0 8px;
      overflow: hidden;
    }
    
    .fps-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s, background 0.3s;
    }
    
    .fps-fill.good { background: #4caf50; }
    .fps-fill.warning { background: #ffc107; }
    .fps-fill.bad { background: #f44336; }
    
    .warnings {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .warning-item {
      color: #ffc107;
      padding: 2px 0;
      font-size: 11px;
    }
    
    .health-status {
      margin-top: 8px;
      padding: 6px 8px;
      border-radius: 4px;
      text-align: center;
      font-weight: 600;
    }
    
    .health-status.healthy {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
    }
    
    .health-status.unhealthy {
      background: rgba(244, 67, 54, 0.2);
      color: #f44336;
    }
    
    .collapsed .panel-content {
      display: none;
    }
  `]
})
export class PerformancePanelComponent implements OnInit, OnDestroy {
  @Input() monitor!: PerformanceMonitorService;
  
  metrics = signal<PerformanceMetrics>({
    fps: 60,
    avgFps: 60,
    minFps: 60,
    renderTime: 0,
    avgRenderTime: 0,
    domNodes: 0,
    visibleRows: 0,
    memoryUsage: null,
    timestamp: Date.now(),
  });
  
  collapsed = signal(false);
  warnings = signal<string[]>([]);
  
  private intervalId: any;
  
  ngOnInit(): void {
    if (this.monitor) {
      this.monitor.enable();
      
      // 定期更新指标
      this.intervalId = setInterval(() => {
        this.metrics.set(this.monitor.metrics());
        this.warnings.set(this.monitor.getWarnings());
      }, 500);
    }
  }
  
  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.monitor?.disable();
  }
  
  toggle(): void {
    this.collapsed.update(v => !v);
  }
  
  fpsPercent(): number {
    return Math.min(100, (this.metrics().fps / 60) * 100);
  }
  
  isHealthy(): boolean {
    return this.monitor?.isHealthy() ?? true;
  }
}
