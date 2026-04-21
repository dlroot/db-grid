/**
 * 行分组服务
 * 基于列值自动创建分组行，支持多级分组和聚合
 */

import { Injectable } from '@angular/core';
import { RowNode, ColDef, createEmptyRowNode } from '../models';
import { AggregationService, GroupAggregations } from './aggregation.service';

export interface GroupConfig {
  groupFields: string[];
  autoCreateGroupColumn?: boolean;
  groupColumnId?: string;
  groupColumnHeader?: string;
  expandAll?: boolean;
  /** 是否启用聚合 */
  enableAggregation?: boolean;
  /** 聚合列配置（覆盖 ColDef.aggregation） */
  aggregationFields?: string[];
}

export interface GroupResult {
  groupNodes: RowNode[];
  flatNodes: RowNode[];
  groupColumnDefs: ColDef[];
}

export interface GroupChangeEvent {
  type: 'groupOpened' | 'groupClosed' | 'groupingChanged';
  node?: RowNode;
  groupNode?: RowNode;
}

@Injectable()
export class GroupService {
  private groupNodes: Map<string, RowNode> = new Map();
  private flatNodes: RowNode[] = [];
  private groupColumnDefs: ColDef[] = [];
  private config: GroupConfig | null = null;
  private originalRowData: any[] = [];
  private onGroupChange: ((event: GroupChangeEvent) => void) | null = null;

  constructor(private aggregationService: AggregationService) {}

  initialize(rowData: any[], config: GroupConfig, columnDefs?: ColDef[]): void {
    this.config = config;
    this.originalRowData = rowData;
    this.groupNodes.clear();

    // 注册聚合配置
    if (config.enableAggregation !== false && columnDefs) {
      this.aggregationService.registerColumns(columnDefs);
    }

    this.createGroupColumnDefs();
    this.doGrouping(rowData);
  }

  private createGroupColumnDefs(): void {
    if (!this.config) return;
    this.groupColumnDefs = [];
    if (this.config.autoCreateGroupColumn !== false) {
      this.groupColumnDefs.push({
        colId: this.config.groupColumnId || '__GROUP__',
        headerName: this.config.groupColumnHeader || '分组',
        width: 250,
        sortable: true,
        resizable: true,
        pinnedLeft: true,
        suppressMovable: true,
        cellRenderer: (params: any) => {
          const node = params.node as RowNode;
          if (!node.group) return '';
          const level = node.level || 0;
          const indent = '  '.repeat(level);
          const icon = node.expanded ? '▼' : '▶';
          return `${indent}${icon} ${node.key || node.data?.__groupKey || ''}`;
        },
      });
    }
  }

  private doGrouping(rowData: any[]): void {
    if (!this.config || this.config.groupFields.length === 0) {
      this.flatNodes = rowData.map((data, i) => {
        const node = createEmptyRowNode();
        node.id = String(data.id || `row-${i}`);
        node.data = data;
        node.rowIndex = i;
        node.group = false;
        node.level = 0;
        node.uiLevel = 0;
        return node;
      });
      return;
    }

    this.groupNodes.clear();
    this.flatNodes = [];
    const grouped = this.groupByField(rowData, this.config.groupFields[0]);

    let rowIndex = 0;
    const buildGroups = (groups: Map<string, any[]>, level: number, parentKey: string, levelFields: string[]): void => {
      let groupIndex = 0;
      groups.forEach((rows, key) => {
        const groupNode = createEmptyRowNode();
        const groupId = parentKey ? `${parentKey}-${key}` : key;
        groupNode.id = `__GROUP__${groupId}`;
        groupNode.data = { __groupKey: key, __groupLevel: level, __groupField: levelFields[0] };
        groupNode.key = key;
        groupNode.group = true;
        groupNode.expanded = this.config?.expandAll !== false;
        groupNode.level = level;
        groupNode.uiLevel = level;
        groupNode.rowIndex = rowIndex++;
        groupNode.childIndex = groupIndex;
        groupNode.firstChild = groupIndex === 0;
        groupNode.lastChild = groupIndex === groups.size - 1;
        groupNode.allChildrenCount = rows.length;
        groupNode.siblingGroups = [];

        // 收集叶子节点用于聚合计算
        const leafNodes: RowNode[] = [];

        this.groupNodes.set(groupId, groupNode);
        this.flatNodes.push(groupNode);

        if (level < levelFields.length - 1) {
          const subGrouped = this.groupByField(rows, levelFields[level + 1]);
          buildGroups(subGrouped, level + 1, groupId, levelFields);
        } else {
          rows.forEach((data, i) => {
            const leafNode = createEmptyRowNode();
            leafNode.id = String(data.id || `row-${rowIndex}`);
            leafNode.data = data;
            leafNode.rowIndex = rowIndex++;
            leafNode.parent = groupNode;
            leafNode.group = false;
            leafNode.level = level + 1;
            leafNode.uiLevel = level + 1;
            leafNode.childIndex = i;
            leafNode.firstChild = i === 0;
            leafNode.lastChild = i === rows.length - 1;
            groupNode.children.push(leafNode);
            leafNodes.push(leafNode);
            this.flatNodes.push(leafNode);
          });
          groupNode.allChildrenCount = rows.length;
        }

        // 计算聚合值
        if (this.config?.enableAggregation !== false && leafNodes.length > 0) {
          const aggregations = this.aggregationService.calculateAggregations(groupNode, leafNodes);
          groupNode.data.__aggregations = aggregations;
        }

        groupIndex++;
      });
    };

    buildGroups(grouped, 0, '', this.config.groupFields);
  }

  private groupByField(data: any[], field: string): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    data.forEach(item => {
      const key = String(item[field] ?? 'null');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    });
    return groups;
  }

  getResult(): GroupResult {
    return {
      groupNodes: Array.from(this.groupNodes.values()),
      flatNodes: this.flatNodes,
      groupColumnDefs: this.groupColumnDefs,
    };
  }

  getFlattenedNodes(): RowNode[] {
    const result: RowNode[] = [];
    const traverse = (nodes: RowNode[]): void => {
      nodes.forEach(node => {
        result.push(node);
        if (node.group && node.expanded && node.children.length > 0) traverse(node.children);
      });
    };
    const roots = this.flatNodes.filter(n => n.group && n.level === 0);
    traverse(roots);
    if (roots.length === 0) result.push(...this.flatNodes);
    return result;
  }

  setGroupExpanded(nodeId: string, expanded: boolean): void {
    const node = this.groupNodes.get(nodeId) || this.flatNodes.find(n => n.id === nodeId);
    if (!node || !node.group) return;
    node.expanded = expanded;
    this.emitGroupChange({ type: expanded ? 'groupOpened' : 'groupClosed', groupNode: node });
  }

  toggleGroup(nodeId: string): void {
    const node = this.groupNodes.get(nodeId) || this.flatNodes.find(n => n.id === nodeId);
    if (node?.group) this.setGroupExpanded(nodeId, !node.expanded);
  }

  expandAll(): void { this.groupNodes.forEach(n => { n.expanded = true; }); this.emitGroupChange({ type: 'groupOpened' }); }
  collapseAll(): void { this.groupNodes.forEach(n => { n.expanded = false; }); this.emitGroupChange({ type: 'groupClosed' }); }
  getGroupColumnDefs(): ColDef[] { return this.groupColumnDefs; }
  isGroupingEnabled(): boolean { return !!(this.config?.groupFields?.length); }
  getGroupFields(): string[] { return this.config?.groupFields || []; }
  setOnGroupChange(callback: (event: GroupChangeEvent) => void): void { this.onGroupChange = callback; }

  private emitGroupChange(event: GroupChangeEvent): void {
    if (this.onGroupChange) this.onGroupChange(event);
  }

  destroy(): void {
    this.groupNodes.clear();
    this.flatNodes = [];
    this.groupColumnDefs = [];
    this.onGroupChange = null;
  }
}
