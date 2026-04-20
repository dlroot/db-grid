import { Injectable } from '@angular/core';
import { ColDef } from '../models';

/**
 * 主从表服务 — 支持行展开显示详情行或关联子表
 * AG Grid 对应功能：Master Detail, Row Detail Panel
 */
@Injectable({ providedIn: 'root' })
export class MasterDetailService {
  private enabled = false;
  private masterDetail = false;
  private detailRowAutoHeight = false;
  private detailRowHeight = 300;
  private expandedNodes: Set<string> = new Set();
  private detailGridConfigs: Map<string, DetailGridConfig> = new Map();
  private columnDefs: ColDef[] = [];

  private onDetailExpanded: ((params: DetailExpandEvent) => void) | null = null;
  private onDetailCollapsed: ((params: DetailExpandEvent) => void) | null = null;

  /** 初始化 */
  initialize(config: MasterDetailConfig = {}): void {
    this.enabled = config.enabled ?? false;
    this.masterDetail = config.masterDetail ?? false;
    this.detailRowAutoHeight = config.detailRowAutoHeight ?? false;
    this.detailRowHeight = config.detailRowHeight ?? 300;
    if (config.detailGridConfigs) {
      for (const cfg of config.detailGridConfigs) {
        this.detailGridConfigs.set(cfg.id, cfg);
      }
    }
  }

  /** 是否启用主从 */
  isEnabled(): boolean { return this.enabled; }

  /** 是否启用 Master-Detail 模式 */
  isMasterDetail(): boolean { return this.masterDetail; }

  /** 启用 */
  enable(): void { this.enabled = true; this.masterDetail = true; }

  /** 禁用 */
  disable(): void {
    this.enabled = false;
    this.masterDetail = false;
    this.expandedNodes.clear();
  }

  /** 展开详情行 */
  expandDetail(nodeId: string, data?: any): void {
    if (!this.enabled) return;
    this.expandedNodes.add(nodeId);
    if (this.onDetailExpanded) {
      this.onDetailExpanded({ nodeId, data });
    }
  }

  /** 折叠详情行 */
  collapseDetail(nodeId: string): void {
    this.expandedNodes.delete(nodeId);
    if (this.onDetailCollapsed) {
      this.onDetailCollapsed({ nodeId, data: null });
    }
  }

  /** 切换详情展开 */
  toggleDetail(nodeId: string, data?: any): void {
    if (this.isDetailExpanded(nodeId)) {
      this.collapseDetail(nodeId);
    } else {
      this.expandDetail(nodeId, data);
    }
  }

  /** 是否展开 */
  isDetailExpanded(nodeId: string): boolean {
    return this.expandedNodes.has(nodeId);
  }

  /** 获取所有展开的行 */
  getExpandedNodeIds(): string[] {
    return Array.from(this.expandedNodes);
  }

  /** 展开所有行 */
  expandAll(nodeIds: string[]): void {
    for (const id of nodeIds) {
      this.expandedNodes.add(id);
    }
  }

  /** 折叠所有行 */
  collapseAll(): void {
    this.expandedNodes.clear();
  }

  /** 获取详情行高度 */
  getDetailRowHeight(): number { return this.detailRowHeight; }

  /** 是否自适应高度 */
  isAutoHeight(): boolean { return this.detailRowAutoHeight; }

  /** 注册详情网格配置 */
  registerDetailGridConfig(config: DetailGridConfig): void {
    this.detailGridConfigs.set(config.id, config);
  }

  /** 获取详情网格配置 */
  getDetailGridConfig(id: string): DetailGridConfig | undefined {
    return this.detailGridConfigs.get(id);
  }

  /** 获取行的详情网格配置名 */
  getDetailNameForNode(data: any): string | null {
    // 默认返回 'default'，可由 getDetailRowCallback 自定义
    return data?.detailGridName ?? 'default';
  }

  /** 注册展开回调 */
  onDetailExpandedEvent(callback: (params: DetailExpandEvent) => void): void {
    this.onDetailExpanded = callback;
  }

  /** 注册折叠回调 */
  onDetailCollapsedEvent(callback: (params: DetailExpandEvent) => void): void {
    this.onDetailCollapsed = callback;
  }

  destroy(): void {
    this.expandedNodes.clear();
    this.detailGridConfigs.clear();
    this.onDetailExpanded = null;
    this.onDetailCollapsed = null;
  }
}

/** 主从配置 */
export interface MasterDetailConfig {
  enabled?: boolean;
  masterDetail?: boolean;
  detailRowHeight?: number;
  detailRowAutoHeight?: boolean;
  detailGridConfigs?: DetailGridConfig[];
  getDetailRowCallback?: (params: { data: any; node: any }) => boolean;
}

/** 详情网格配置 */
export interface DetailGridConfig {
  id: string;
  columnDefs: ColDef[];
  defaultColDef?: Partial<ColDef>;
  rowData?: any[];
  detailRowHeight?: number;
}

/** 详情展开/折叠事件 */
export interface DetailExpandEvent {
  nodeId: string;
  data: any;
}
