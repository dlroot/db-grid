/**
 * 树形数据服务
 * 处理树形结构数据的展开/折叠、懒加载等
 */

import { Injectable } from '@angular/core';
import { RowNode, createEmptyRowNode } from '../models';

export interface TreeNodeConfig {
  idField: string;
  parentField: string;
  hasChildrenField?: string;
  expandedField?: string;
}

export interface TreeNodeEvent {
  type: 'expand' | 'collapse';
  node: RowNode;
  nodes: RowNode[];
}

@Injectable()
export class TreeService {
  private rootNodes: RowNode[] = [];
  private allNodes: Map<string, RowNode> = new Map();
  private childrenMap: Map<string, RowNode[]> = new Map();
  private config: TreeNodeConfig | null = null;
  private onExpandChange: ((event: TreeNodeEvent) => void) | null = null;

  initialize(rowData: any[], config: TreeNodeConfig): void {
    this.config = config;
    this.allNodes.clear();
    this.childrenMap.clear();
    this.rootNodes = [];

    rowData.forEach((data, index) => {
      const id = String(data[config.idField] ?? data.id ?? `node-${index}`);
      const node = this.createTreeNode(id, data, index);
      this.allNodes.set(id, node);
    });

    this.buildTree();
    this.calculateLevels();
  }

  private createTreeNode(id: string, data: any, index: number): RowNode {
    const node = createEmptyRowNode();
    node.id = id;
    node.data = data;
    node.rowIndex = index;
    node.expanded = false;
    node.level = 0;
    node.uiLevel = 0;
    if (this.config?.hasChildrenField) {
      node.expanded = !!data[this.config.hasChildrenField];
    }
    return node;
  }

  private buildTree(): void {
    if (!this.config) return;
    const { parentField } = this.config;

    this.allNodes.forEach((node, id) => {
      const parentId = node.data[parentField];
      if (parentId !== undefined && parentId !== null && parentId !== '') {
        if (!this.childrenMap.has(parentId)) {
          this.childrenMap.set(parentId, []);
        }
        this.childrenMap.get(parentId)!.push(node);
        const parentNode = this.allNodes.get(String(parentId));
        if (parentNode) {
          node.parent = parentNode;
          node.firstChild = parentNode.children.length === 0;
          node.lastChild = true;
          if (parentNode.lastChild) parentNode.lastChild = false;
        }
      } else {
        this.rootNodes.push(node);
      }
    });

    // 为所有节点设置 children（不只是 rootNodes）
    this.allNodes.forEach((node, id) => {
      node.children = this.childrenMap.get(id) || [];
      node.allChildrenCount = this.countAllChildren(node);
    });

    // 为 rootNodes 设置 firstChild/lastChild
    this.rootNodes.forEach((root, i) => {
      root.firstChild = i === 0;
      root.lastChild = i === this.rootNodes.length - 1;
    });
  }

  private countAllChildren(node: RowNode, visited: Set<string> = new Set()): number {
    if (visited.has(node.id)) return 0; // 防止循环引用
    visited.add(node.id);
    let count = node.children.length;
    node.children.forEach(child => { count += this.countAllChildren(child, visited); });
    return count;
  }

  private calculateLevels(): void {
    const traverse = (node: RowNode, level: number, uiLevel: number): void => {
      node.level = level;
      node.uiLevel = uiLevel;
      node.children.forEach(child => { traverse(child, level + 1, uiLevel + 1); });
    };
    this.rootNodes.forEach(root => { traverse(root, 0, 0); });
  }

  setOnExpandChange(callback: (event: TreeNodeEvent) => void): void {
    this.onExpandChange = callback;
  }

  expandNode(nodeId: string): void {
    const node = this.allNodes.get(nodeId);
    if (!node) return;
    node.expanded = true;
    this.emitExpandChange({ type: 'expand', node, nodes: this.getAllDescendants(node) });
  }

  collapseNode(nodeId: string): void {
    const node = this.allNodes.get(nodeId);
    if (!node) return;
    node.expanded = false;
    this.emitExpandChange({ type: 'collapse', node, nodes: this.getAllDescendants(node) });
  }

  toggleNode(nodeId: string): void {
    const node = this.allNodes.get(nodeId);
    if (!node) return;
    node.expanded ? this.collapseNode(nodeId) : this.expandNode(nodeId);
  }

  expandAll(): void {
    this.allNodes.forEach(node => {
      if (node.children.length > 0) node.expanded = true;
    });
    this.emitExpandChange({ type: 'expand', node: this.rootNodes[0], nodes: Array.from(this.allNodes.values()) });
  }

  collapseAll(): void {
    this.allNodes.forEach(node => { node.expanded = false; });
    this.emitExpandChange({ type: 'collapse', node: this.rootNodes[0], nodes: Array.from(this.allNodes.values()) });
  }

  getFlattenedNodes(): RowNode[] {
    const result: RowNode[] = [];
    const traverse = (nodes: RowNode[]): void => {
      nodes.forEach(node => {
        result.push(node);
        if (node.expanded && node.children.length > 0) traverse(node.children);
      });
    };
    traverse(this.rootNodes);
    return result;
  }

  getDisplayCount(): number { return this.getFlattenedNodes().length; }
  getNode(nodeId: string): RowNode | undefined { return this.allNodes.get(nodeId); }
  getRootNodes(): RowNode[] { return this.rootNodes; }

  private getAllDescendants(node: RowNode): RowNode[] {
    const descendants: RowNode[] = [];
    const collect = (n: RowNode): void => {
      n.children.forEach(child => { descendants.push(child); collect(child); });
    };
    collect(node);
    return descendants;
  }

  hasChildren(nodeId: string): boolean {
    const children = this.childrenMap.get(nodeId);
    return !!(children && children.length > 0);
  }

  updateNodeData(nodeId: string, data: any): void {
    const node = this.allNodes.get(nodeId);
    if (node) { node.data = data; node.setDataUpdated?.(); }
  }

  private emitExpandChange(event: TreeNodeEvent): void {
    if (this.onExpandChange) this.onExpandChange(event);
  }

  destroy(): void {
    this.allNodes.clear();
    this.childrenMap.clear();
    this.rootNodes = [];
    this.onExpandChange = null;
  }
}
