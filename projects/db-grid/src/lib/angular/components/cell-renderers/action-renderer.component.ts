import { Component, Input, Output, EventEmitter } from '@angular/core';

/**
 * 动作按钮单元格渲染器
 * 
 * 使用方式：
 * ```typescript
 * columnDefs = [
 *   { 
 *     field: 'actions', 
 *     headerName: '操作', 
 *     cellRenderer: ActionRendererComponent,
 *     cellRendererParams: {
 *       actions: [
 *         { label: '编辑', icon: '✏️', action: 'edit' },
 *         { label: '删除', icon: '🗑️', action: 'delete', danger: true }
 *       ]
 *     }
 *   }
 * ]
 * ```
 */
@Component({
  selector: 'db-action-renderer',
  template: `
    <div class="action-buttons">
      @for (action of actions; track action.action) {
        <button 
          class="action-btn"
          [class.danger]="action.danger"
          [disabled]="action.disabled"
          (click)="onActionClick(action, $event)"
          [title]="action.label">
          @if (action.icon) {
            <span class="action-icon" [innerHTML]="action.icon"></span>
          }
          @if (action.showLabel) {
            <span class="action-label">{{ action.label }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: [`
    .action-buttons {
      display: inline-flex;
      gap: 4px;
    }
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border: none;
      border-radius: 4px;
      background: #e9ecef;
      color: #495057;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .action-btn:hover:not(:disabled) {
      background: #dee2e6;
      transform: translateY(-1px);
    }
    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .action-btn.danger {
      background: #fee;
      color: #dc3545;
    }
    .action-btn.danger:hover:not(:disabled) {
      background: #fdd;
    }
    .action-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 16px; height: 16px; flex-shrink: 0;
    }
  `]
})
export class ActionRendererComponent {
  /** 动作列表 */
  actions: Action[] = [];
  
  /** 行数据 */
  data: any;
  
  /** 行节点 */
  node: any;
  
  /** 行索引 */
  rowIndex: number = 0;
  
  /** API */
  api: any;

  /** 动作事件 */
  @Output() action = new EventEmitter<{ action: string; data: any; node: any }>();

  /**
   * AG Grid Angular 接口
   */
  agInit(params: any): void {
    this.data = params.data;
    this.node = params.node;
    this.rowIndex = params.rowIndex;
    this.api = params.api;
    
    // 获取动作配置
    const actionParams = params.colDef?.cellRendererParams?.actions || 
                         params.cellRendererParams?.actions || 
                         params.actions || 
                         [];
    
    this.actions = actionParams.map((a: ActionConfig) => ({
      action: a.action || a.label || 'click',
      label: a.label || '',
      icon: a.icon || '',
      showLabel: a.showLabel ?? false,
      disabled: a.disabled ?? false,
      danger: a.danger ?? false,
      className: a.className || '',
    }));
  }

  /**
   * 刷新
   */
  refresh(params: any): boolean {
    this.agInit(params);
    return true;
  }

  /**
   * 执行动作
   */
  onActionClick(action: Action, event: MouseEvent): void {
    event.stopPropagation();
    
    // 触发事件
    this.action.emit({
      action: action.action,
      data: this.data,
      node: this.node,
    });
    
    // 同时触发 rowAction 事件到 Grid
    if (this.api?.onRowAction) {
      this.api.onRowAction({
        action: action.action,
        data: this.data,
        node: this.node,
        rowIndex: this.rowIndex,
      });
    }
  }
}

export interface Action {
  action: string;
  label: string;
  icon: string;
  showLabel: boolean;
  disabled: boolean;
  danger: boolean;
  className: string;
}

export interface ActionConfig {
  /** 动作标识 */
  action: string;
  /** 按钮文本 */
  label?: string;
  /** 按钮图标（emoji 或 class） */
  icon?: string;
  /** 是否显示文本 */
  showLabel?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否危险操作（红色） */
  danger?: boolean;
  /** 自定义样式类 */
  className?: string;
}
