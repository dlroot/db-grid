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
  /**
   * 自动分组列配置（AG Grid Enterprise 功能）
   * 当 rowGroup 启用时，自动创建分组列
   */
  autoGroupColumnDef?: {
    /** 分组列宽度 */
    width?: number;
    /** 分组列最小宽度 */
    minWidth?: number;
    /** 分组列最大宽度 */
    maxWidth?: number;
    /** 单元格渲染器 */
    cellRenderer?: any;
    /** 单元格渲染器参数 */
    cellRendererParams?: any;
    /** 是否显示行号 */
    rowCount?: number;
    /** checkbox 选择 */
    checkbox?: boolean;
    /** 展开/折叠图标 */
    suppressExpandable?: boolean;
  };
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
      const autoGroupConfig = this.config.autoGroupColumnDef || {};
      
      // 默认分组列渲染器
      const defaultRenderer = (params: any) => {
        if (!params?.node) return '';
        const node = params.node as RowNode;
        if (!node.group) return '';
        
        const level = node.level || 0;
        const indent = level * 20;
        const icon = node.expanded
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
        const key = node.key || node.data?.__groupKey || '';
        
        // 获取聚合值
        let aggregationHtml = '';
        if (node.data?.__aggregations) {
          const aggs = node.data.__aggregations;
          const aggParts: string[] = [];
          Object.keys(aggs).forEach(field => {
            Object.keys(aggs[field]).forEach(type => {
              const result = aggs[field][type];
              if (result && result.formatted) {
                aggParts.push(result.formatted);
              }
            });
          });
          if (aggParts.length > 0) {
            aggregationHtml = `<span class="group-aggregations">${aggParts.join(', ')}</span>`;
          }
        }
        
        // 子项数量
        const countText = node.allChildrenCount ? ` (${node.allChildrenCount} items)` : '';
        
        const el = document.createElement('div');
        el.className = 'db-grid-group-cell';
        el.style.cssText = `padding-left: ${indent}px; cursor: pointer; user-select: none; display: flex; align-items: center; gap: 6px;`;
        el.innerHTML = `<span class="group-icon">${icon}</span><span class="group-key">${key}</span>${aggregationHtml}<span class="group-count">${countText}</span>`;
        
        // 点击切换展开/折叠
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const nodeId = node.id;
          this.toggleGroup(nodeId);
          // 更新图标
          const iconEl = el.querySelector('.group-icon');
          if (iconEl) {
            iconEl.innerHTML = node.expanded
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
          }
        });
        
        return el;
      };

      this.groupColumnDefs.push({
        colId: this.config.groupColumnId || '__GROUP__',
        headerName: this.config.groupColumnHeader || '分组',
        width: autoGroupConfig.width || 250,
        minWidth: autoGroupConfig.minWidth || 100,
        maxWidth: autoGroupConfig.maxWidth || 500,
        sortable: true,
        resizable: true,
        pinnedLeft: true,
        suppressMovable: true,
        // 支持自定义 cellRenderer
        cellRenderer: autoGroupConfig.cellRenderer || defaultRenderer,
        cellRendererParams: autoGroupConfig.cellRendererParams,
        // 支持 checkbox
        checkboxSelection: autoGroupConfig.checkbox,
        // 支持筛选
        filter: autoGroupConfig.suppressExpandable !== true ? 'text' : undefined,
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
          const childCountBefore = this.flatNodes.length;
          buildGroups(subGrouped, level + 1, groupId, levelFields);
          // 将子分组节点添加到父分组的 children 中
          const childCountAfter = this.flatNodes.length;
          for (let ci = childCountBefore; ci < childCountAfter; ci++) {
            const childNode = this.flatNodes[ci];
            if (childNode.level === level + 1) {
              childNode.parent = groupNode;
              groupNode.children.push(childNode);
            }
          }
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

  /**
   * 获取节点层级（0=根）
   * @param nodeId 节点ID
   * @returns 层级，如果不是分组节点则返回 -1
   */
  getGroupLevel(nodeId: string): number {
    const node = this.groupNodes.get(nodeId) || this.flatNodes.find(n => n.id === nodeId);
    if (!node || !node.group) return -1;
    return node.level || 0;
  }

  /**
   * 判断是否为分组节点
   * @param nodeId 节点ID
   * @returns 是否为分组节点
   */
  isGroupNode(nodeId: string): boolean {
    const node = this.groupNodes.get(nodeId) || this.flatNodes.find(n => n.id === nodeId);
    return !!(node && node.group);
  }

  /**
   * 获取分组状态
   * @returns 分组状态信息
   */
  getGroupState(): any {
    const state: any = {
      groupFields: this.config?.groupFields || [],
      expandAll: this.config?.expandAll || false,
      groups: []
    };
    this.groupNodes.forEach((node, key) => {
      state.groups.push({
        nodeId: node.id,
        key: node.key,
        level: node.level,
        expanded: node.expanded,
        childCount: node.allChildrenCount
      });
    });
    return state;
  }

  /**
   * 展开到指定层级
   * @param level 目标层级（0-based）
   */
  expandToLevel(level: number): void {
    this.groupNodes.forEach(node => {
      if (node.level <= level) {
        node.expanded = true;
        this.emitGroupChange({ type: 'groupOpened', node });
      }
    });
  }

  /**
   * 获取分组列定义
   * 用于在 rowGroup 模式下自动注入分组列
   */
  getGroupColumnDef(): ColDef | null {
    if (this.groupColumnDefs.length > 0) {
      return this.groupColumnDefs[0];
    }
    return null;
  }

  /**
   * 检查是否启用了自动分组列
   */
  isAutoGroupColumnEnabled(): boolean {
    return this.config?.autoCreateGroupColumn !== false;
  }

  /**
   * 获取分组层级数量
   */
  getGroupLevelCount(): number {
    if (!this.config) return 0;
    return this.config.groupFields.length;
  }

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
