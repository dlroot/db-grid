import { Injectable } from '@angular/core';

/**
 * 行动画服务 — 排序/筛选/增删行时的过渡动画
 * AG Grid 对应功能：Animate Rows
 */
@Injectable({ providedIn: 'root' })
export class AnimationService {
  private enabled = true;
  private duration = 300;     // 毫秒
  private easing = 'ease-out';
  private animateRows = true;
  private rowPositions: Map<string, number> = new Map();
  private previousPositions: Map<string, number> = new Map();

  private onAnimationStart: ((params: AnimationEvent) => void) | null = null;
  private onAnimationEnd: ((params: AnimationEvent) => void) | null = null;

  /** 初始化 */
  initialize(config: AnimationConfig = {}): void {
    this.enabled = config.enabled ?? true;
    this.animateRows = config.animateRows ?? true;
    this.duration = config.duration ?? 300;
    this.easing = config.easing ?? 'ease-out';
  }

  /** 是否启用动画 */
  isEnabled(): boolean { return this.enabled; }

  /** 是否启用行动画 */
  isAnimateRows(): boolean { return this.animateRows; }

  /** 启用 */
  enable(): void { this.enabled = true; }

  /** 禁用 */
  disable(): void { this.enabled = false; }

  /** 获取动画时长 */
  getDuration(): number { return this.duration; }

  /** 获取缓动函数 */
  getEasing(): string { return this.easing; }

  /** 记录当前行位置（在数据变更前调用） */
  captureRowPositions(rows: { id: string; top: number }[]): void {
    this.previousPositions.clear();
    for (const row of rows) {
      this.previousPositions.set(row.id, row.top);
    }
  }

  /** 计算行动画（数据变更后调用，返回需要动画的行及其偏移量） */
  computeRowAnimation(rows: { id: string; top: number }[]): RowAnimationInfo[] {
    if (!this.enabled || !this.animateRows) return [];

    const animations: RowAnimationInfo[] = [];
    this.rowPositions.clear();

    for (const row of rows) {
      this.rowPositions.set(row.id, row.top);
      const prevTop = this.previousPositions.get(row.id);
      if (prevTop !== undefined && prevTop !== row.top) {
        animations.push({
          rowId: row.id,
          fromTop: prevTop,
          toTop: row.top,
          deltaY: row.top - prevTop
        });
      }
    }

    return animations;
  }

  /** 生成 CSS transition 样式 */
  generateTransitionStyle(property: string = 'transform'): string {
    if (!this.enabled) return 'none';
    return `${property} ${this.duration}ms ${this.easing}`;
  }

  /** 生成行的 CSS transform */
  generateRowTransform(animationInfo: RowAnimationInfo, progress: number = 1): string {
    const currentY = animationInfo.fromTop + (animationInfo.deltaY * progress);
    return `translateY(${currentY - animationInfo.toTop}px)`;
  }

  /** 触发行动画 */
  startRowAnimation(rows: { id: string; top: number }[]): RowAnimationInfo[] {
    const animations = this.computeRowAnimation(rows);
    if (animations.length > 0 && this.onAnimationStart) {
      this.onAnimationStart({ type: 'rowMove', animations });
    }

    // 模拟动画结束
    if (animations.length > 0) {
      setTimeout(() => {
        if (this.onAnimationEnd) {
          this.onAnimationEnd({ type: 'rowMove', animations });
        }
      }, this.duration);
    }

    return animations;
  }

  /** 注册动画开始回调 */
  onAnimationStarted(callback: (params: AnimationEvent) => void): void {
    this.onAnimationStart = callback;
  }

  /** 注册动画结束回调 */
  onAnimationEnded(callback: (params: AnimationEvent) => void): void {
    this.onAnimationEnd = callback;
  }

  /** 销毁 */
  destroy(): void {
    this.rowPositions.clear();
    this.previousPositions.clear();
    this.onAnimationStart = null;
    this.onAnimationEnd = null;
  }
}

/** 动画配置 */
export interface AnimationConfig {
  enabled?: boolean;
  animateRows?: boolean;
  duration?: number;
  easing?: string;
}

/** 行动画信息 */
export interface RowAnimationInfo {
  rowId: string;
  fromTop: number;
  toTop: number;
  deltaY: number;
}

/** 动画事件 */
export interface AnimationEvent {
  type: 'rowMove' | 'fadeIn' | 'fadeOut' | 'resize';
  animations: RowAnimationInfo[];
}
