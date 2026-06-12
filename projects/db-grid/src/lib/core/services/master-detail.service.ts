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
  private detailRowMinHeight = 100;
  private detailRowMaxHeight = 1000;
  private expandAnimationDuration = 200;
  private detailCellRenderer: any;
  private detailCellRendererParams: DetailCellRendererParams | undefined;
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
    if (!this.enabled && !this.masterDetail) return;
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
    if (!this.enabled && !this.masterDetail) return;
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

  /**
   * 获取详情单元格渲染器
   */
  getDetailCellRenderer(): any {
    return this.detailCellRenderer;
  }
  /**
   * 获取详情渲染器参数
   */
  getDetailCellRendererParams(): DetailCellRendererParams | undefined {
    return this.detailCellRendererParams;
  }
  /**
   * 获取详情行最小高度
   */
  getDetailRowMinHeight(): number {
    return this.detailRowMinHeight ?? 100;
  }
  /**
   * 获取详情行最大高度
   */
  getDetailRowMaxHeight(): number {
    return this.detailRowMaxHeight ?? 1000;
  }
  /**
   * 获取展开动画时长
   */
  getExpandAnimationDuration(): number {
    return this.expandAnimationDuration ?? 200;
  }
  /**
   * 检查是否使用异步加载
   */
  isAsyncDetail(): boolean {
    return this.detailCellRendererParams?.async ?? false;
  }
  /**
   * 获取所有详情网格配置
   */
  getAllDetailGridConfigs(): DetailGridConfig[] {
    return Array.from(this.detailGridConfigs.values());
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
  /**
   * 自定义详情面板渲染器（AG Grid Enterprise 功能）
   * 可以是组件类型、字符串（组件名）或函数
   */
  detailCellRenderer?: any;
  /**
   * 详情渲染器参数
   */
  detailCellRendererParams?: DetailCellRendererParams;
  /**
   * 详情行最小高度
   */
  detailRowMinHeight?: number;
  /**
   * 详情行最大高度
   */
  detailRowMaxHeight?: number;
  /**
   * 展开动画时长（毫秒）
   */
  expandAnimationDuration?: number;
  /**
   * 回调函数判断是否显示详情行
   */
  suppressDetailHide?: boolean;
}

/** 详情网格配置 */
export interface DetailGridConfig {
  id: string;
  columnDefs: ColDef[];
  defaultColDef?: Partial<ColDef>;
  rowData?: any[];
  detailRowHeight?: number;
  /** 详情网格选项 */
  gridOptions?: any;
  /** 共享 API 回调 */
  sharedApiCallback?: (api: any) => void;
}

/** 详情展开/折叠事件 */
export interface DetailExpandEvent {
  nodeId: string;
  data: any;
  /** 关联的详情网格 API */
  detailApi?: any;
  /** 是否自动高度 */
  autoHeight?: boolean;
}


/**
 * 详情单元格渲染器参数
 */
export interface DetailCellRendererParams {
  /** 详情网格 ID */
  detailGridId?: string;
  /** 远程详情数据回调 */
  detailGridDataFactory?: (params: any) => any[];
  /** 模板 HTML */
  template?: string;
  /** 异步加载详情数据 */
  async?: boolean;
}
