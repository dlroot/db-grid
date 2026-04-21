/**
 * 树形单元格渲染器
 * 显示树节点展开/折叠图标和缩进
 */

import { Component, Input } from '@angular/core';
import { RowNode } from '../../../core/models';

@Component({
  selector: 'db-tree-cell',
  template: `
    <div class="db-tree-cell" [style.padding-left.px]="indentPx">
      <span class="db-tree-icon" [class.has-children]="hasChildren" [class.expanded]="isExpanded"
            (click)="onIconClick($event)">
        <ng-container *ngIf="hasChildren">
          <svg *ngIf="isExpanded" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <svg *ngIf="!isExpanded" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </ng-container>
      </span>
      <span class="db-tree-value" [title]="textValue">{{ textValue }}</span>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .db-tree-cell {
      display: flex;
      align-items: center;
      gap: 4px;
      height: 100%;
      width: 100%;
    }
    .db-tree-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      cursor: default;
      color: #666;
      transition: transform 0.15s ease;
    }
    .db-tree-icon.has-children {
      cursor: pointer;
    }
    .db-tree-icon.has-children:hover {
      color: #333;
    }
    .db-tree-icon svg {
      width: 12px;
      height: 12px;
    }
    .db-tree-value {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `],
  standalone: true,
})
export class DbTreeCellComponent {
  @Input() value: any = '';
  @Input() node!: RowNode;
  @Input() level = 0;
  @Input() indentSize = 20;

  get indentPx(): number {
    return this.level * this.indentSize;
  }

  get hasChildren(): boolean {
    return !!(this.node?.children && this.node.children.length > 0);
  }

  get isExpanded(): boolean {
    return !!(this.node?.expanded);
  }

  get textValue(): string {
    if (this.value == null) return '';
    if (typeof this.value === 'object') return JSON.stringify(this.value);
    return String(this.value);
  }

  onIconClick(event: MouseEvent): void {
    event.stopPropagation();
    if (this.hasChildren && this.node) {
      this.node.expanded = !this.node.expanded;
    }
  }
}