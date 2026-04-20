/**
 * 选择服务
 * 处理行选择、多选、范围选择等功能
 */

import { Injectable } from '@angular/core';
import { RowNode } from '../models';

export interface SelectionConfig {
  mode: 'single' | 'multiple' | 'none';
  multiSortKey?: boolean;
  rangeSelection?: boolean;
}

export interface SelectionChange {
  type: 'select' | 'deselect' | 'selectAll' | 'deselectAll';
  nodes: RowNode[];
}

@Injectable()
export class SelectionService {
  private mode: 'single' | 'multiple' | 'none' = 'multiple';
  private multiSortKey = false;
  private rangeSelection = false;

  private selectedNodes: Map<string, RowNode> = new Map();
  private lastSelectedNode: RowNode | null = null;
  private rangeStartNode: RowNode | null = null;

  private onSelectionChanged: ((event: SelectionChange) => void) | null = null;

  /** 初始化 */
  initialize(config: SelectionConfig): void {
    this.mode = config.mode;
    this.multiSortKey = config.multiSortKey ?? false;
    this.rangeSelection = config.rangeSelection ?? false;
    this.clearSelection();
  }

  /** 设置选择变化回调 */
  setOnSelectionChanged(callback: (event: SelectionChange) => void): void {
    this.onSelectionChanged = callback;
  }

  /** 处理节点点击选择 */
  selectNode(node: RowNode, event?: MouseEvent): void {
    if (this.mode === 'none') return;

    if (this.mode === 'single') {
      this.clearSelection();
      this.addSelection(node);
    } else if (this.mode === 'multiple') {
      if (event?.ctrlKey || event?.metaKey) {
        // Ctrl/CMD 点击 - 切换选择
        if (this.isSelected(node)) {
          this.deselectNode(node);
        } else {
          this.addSelection(node);
        }
      } else if (event?.shiftKey && this.lastSelectedNode) {
        // Shift 点击 - 范围选择
        this.selectRange(this.lastSelectedNode, node);
      } else {
        // 普通点击 - 清除选择后选择当前
        this.clearSelection();
        this.addSelection(node);
      }
    }
  }

  /** 添加选择 */
  private addSelection(node: RowNode): void {
    if (!this.selectedNodes.has(node.id)) {
      node.selected = true;
      node.setSelected?.(true);
      this.selectedNodes.set(node.id, node);
      this.lastSelectedNode = node;
      this.rangeStartNode = node;
      this.emitSelectionChange({ type: 'select', nodes: [node] });
    }
  }

  /** 取消选择节点 */
  deselectNode(node: RowNode): void {
    if (this.selectedNodes.has(node.id)) {
      node.selected = false;
      node.setSelected?.(false);
      this.selectedNodes.delete(node.id);
      this.emitSelectionChange({ type: 'deselect', nodes: [node] });
    }
  }

  /** 清除所有选择 */
  clearSelection(): void {
    if (this.selectedNodes.size > 0) {
      const nodes = Array.from(this.selectedNodes.values());
      nodes.forEach(node => {
        node.selected = false;
        node.setSelected?.(false);
      });
      this.selectedNodes.clear();
      this.emitSelectionChange({ type: 'deselectAll', nodes });
    }
  }

  /** 全选 */
  selectAll(nodes: RowNode[]): void {
    if (this.mode === 'none') return;

    this.clearSelection();
    nodes.forEach(node => {
      node.selected = true;
      node.setSelected?.(true);
      this.selectedNodes.set(node.id, node);
    });
    this.emitSelectionChange({ type: 'selectAll', nodes: Array.from(this.selectedNodes.values()) });
  }

  /** 范围选择 */
  private selectRange(startNode: RowNode, endNode: RowNode): void {
    if (!startNode || !endNode) return;

    const startIndex = Math.min(startNode.rowIndex ?? 0, endNode.rowIndex ?? 0);
    const endIndex = Math.max(startNode.rowIndex ?? 0, endNode.rowIndex ?? 0);

    // 获取范围内的节点并选择
    const rangeNodes = Array.from(this.selectedNodes.values())
      .filter(node => node.rowIndex !== null && node.rowIndex >= startIndex && node.rowIndex <= endIndex);

    rangeNodes.forEach(node => this.addSelection(node));
  }

  /** 设置范围起点 */
  setRangeStart(node: RowNode): void {
    this.rangeStartNode = node;
  }

  /** 扩展范围到节点 */
  extendRangeTo(node: RowNode): void {
    if (this.rangeStartNode) {
      this.selectRange(this.rangeStartNode, node);
    }
  }

  /** 检查节点是否选中 */
  isSelected(node: RowNode): boolean {
    return this.selectedNodes.has(node.id);
  }

  /** 获取选中的节点 */
  getSelectedNodes(): RowNode[] {
    return Array.from(this.selectedNodes.values());
  }

  /** 获取选中的数据 */
  getSelectedData(): any[] {
    return this.getSelectedNodes().map(node => node.data);
  }

  /** 获取选中的ID列表 */
  getSelectedIds(): string[] {
    return Array.from(this.selectedNodes.keys());
  }

  /** 获取选择数量 */
  getSelectionCount(): number {
    return this.selectedNodes.size;
  }

  /** 是否有选中项 */
  hasSelection(): boolean {
    return this.selectedNodes.size > 0;
  }

  /** 是否全部选中 */
  isEverythingSelected(nodes: RowNode[]): boolean {
    const selectableNodes = nodes.filter(n => n.checkable);
    return selectableNodes.length > 0 && selectableNodes.every(n => this.isSelected(n));
  }

  /** 是否没有选中项 */
  isNothingSelected(): boolean {
    return this.selectedNodes.size === 0;
  }

  /** 切换全选状态 */
  toggleSelectAll(nodes: RowNode[]): void {
    if (this.isEverythingSelected(nodes)) {
      this.clearSelection();
    } else {
      this.selectAll(nodes);
    }
  }

  /** 更新节点（用于ID变更） */
  updateNode(oldId: string, newNode: RowNode): void {
    if (this.selectedNodes.has(oldId)) {
      this.selectedNodes.delete(oldId);
      this.selectedNodes.set(newNode.id, newNode);
    }
  }

  /** 删除节点 */
  deleteNode(nodeId: string): void {
    this.selectedNodes.delete(nodeId);
  }

  /** 触发选择变化事件 */
  private emitSelectionChange(event: SelectionChange): void {
    if (this.onSelectionChanged) {
      this.onSelectionChanged(event);
    }
  }

  /** 销毁 */
  destroy(): void {
    this.clearSelection();
    this.onSelectionChanged = null;
  }
}
