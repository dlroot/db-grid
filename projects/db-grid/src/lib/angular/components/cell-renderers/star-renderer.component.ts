import { Component, Input } from '@angular/core';

/**
 * 星级评分单元格渲染器
 * 
 * 使用方式：
 * ```typescript
 * columnDefs = [
 *   { field: 'rating', headerName: '评分', cellRenderer: StarRendererComponent }
 * ]
 * ```
 */
@Component({
  selector: 'db-star-renderer',
  template: `
    <span class="star-rating">
      @for (star of stars; track star) {
        <span
          class="star"
          [class.filled]="star <= value"
          [style.color]="star <= value ? '#ffc107' : '#ddd'"
          (click)="onStarClick(star)">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" [attr.fill]="star <= value ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </span>
      }
      @if (showValue) {
        <span class="rating-value">{{ value }}/{{ maxStars }}</span>
      }
    </span>
  `,
  styles: [`
    .star-rating {
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }
    .star {
      font-size: 16px;
      cursor: pointer;
      transition: transform 0.1s;
    }
    .star:hover {
      transform: scale(1.2);
    }
    .star.filled {
      color: #ffc107;
    }
    .rating-value {
      margin-left: 8px;
      font-size: 12px;
      color: #666;
    }
  `]
})
export class StarRendererComponent {
  /** 当前评分值 */
  value: number = 0;
  
  /** 最大星数 */
  maxStars: number = 5;
  
  /** 是否显示数值 */
  showValue: boolean = true;

  /** 是否只读 */
  readonly: boolean = true;

  /** 生成星数组 */
  get stars(): number[] {
    return Array.from({ length: this.maxStars }, (_, i) => i + 1);
  }

  /**
   * AG Grid Angular 接口
   */
  agInit(params: any): void {
    this.value = params.value || 0;
    this.maxStars = params.maxStars || params.cellRendererParams?.maxStars || 5;
    this.showValue = params.showValue ?? params.cellRendererParams?.showValue ?? true;
    this.readonly = params.readonly ?? params.cellRendererParams?.readonly ?? true;
  }

  /**
   * 刷新
   */
  refresh(params: any): boolean {
    this.agInit(params);
    return true;
  }

  /**
   * 点击星星
   */
  onStarClick(star: number): void {
    if (this.readonly) return;
    this.value = star;
  }

  /**
   * 获取值
   */
  getValue(): number {
    return this.value;
  }
}
