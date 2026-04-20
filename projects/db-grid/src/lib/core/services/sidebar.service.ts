import { Injectable } from '@angular/core';
import { ColDef } from '../models';

/**
 * 侧边栏服务 — 列工具面板 + 筛选工具面板 + 自定义面板
 * AG Grid 对应功能：Side Bar, Tool Panel (Columns / Filters)
 */
@Injectable({ providedIn: 'root' })
export class SideBarService {
  private config: SideBarConfig | null = null;
  private visible = false;
  private activePanelId: string | null = null;
  private panels: ToolPanelInfo[] = [];
  private columnVisibility: Map<string, boolean> = new Map();
  private columnOrder: string[] = [];
  private columnGroups: Map<string, string[]> = new Map();

  private onPanelChanged: ((panelId: string | null) => void) | null = null;
  private onVisibilityChanged: ((visible: boolean) => void) | null = null;
  private onColumnVisibilityChanged: ((changes: { colId: string; visible: boolean }[]) => void) | null = null;

  /** 初始化 */
  initialize(columnDefs: ColDef[], config: SideBarConfig = {}): void {
    this.config = config;
    this.panels = config.toolPanels ?? [
      { id: 'columns', label: '列', icon: '_COLUMNS_', default: true },
      { id: 'filters', label: '筛选', icon: '_FILTER_' }
    ];
    this.activePanelId = config.defaultToolPanel ?? this.panels[0]?.id ?? null;
    this.visible = !!config.defaultToolPanel || config.openByDefault === true;

    // 初始化列可见性
    this.columnVisibility.clear();
    this.columnOrder = [];
    for (const col of columnDefs) {
      const id = col.field ?? col.colId ?? '';
      this.columnVisibility.set(id, !col.hide);
      this.columnOrder.push(id);
    }

    // 初始化列分组
    this.buildColumnGroups(columnDefs);
  }

  /** 是否显示侧边栏 */
  isVisible(): boolean { return this.visible; }

  /** 显示侧边栏 */
  show(panelId?: string): void {
    this.visible = true;
    if (panelId) this.activePanelId = panelId;
    if (!this.activePanelId && this.panels.length > 0) {
      this.activePanelId = this.panels[0].id;
    }
    this.emitVisibilityChanged();
  }

  /** 隐藏侧边栏 */
  hide(): void {
    this.visible = false;
    this.emitVisibilityChanged();
  }

  /** 切换侧边栏 */
  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  /** 获取当前活跃面板 */
  getActivePanel(): string | null { return this.activePanelId; }

  /** 切换面板 */
  setActivePanel(panelId: string): void {
    this.activePanelId = panelId;
    if (!this.visible) this.visible = true;
    if (this.onPanelChanged) this.onPanelChanged(panelId);
  }

  /** 获取所有面板 */
  getPanels(): ToolPanelInfo[] { return [...this.panels]; }

  /** 添加自定义面板 */
  addPanel(panel: ToolPanelInfo): void {
    if (!this.panels.find(p => p.id === panel.id)) {
      this.panels.push(panel);
    }
  }

  /** 移除面板 */
  removePanel(panelId: string): void {
    this.panels = this.panels.filter(p => p.id !== panelId);
    if (this.activePanelId === panelId) {
      this.activePanelId = this.panels[0]?.id ?? null;
    }
  }

  // ===== 列工具面板功能 =====

  /** 获取列可见性 */
  isColumnVisible(colId: string): boolean {
    return this.columnVisibility.get(colId) ?? true;
  }

  /** 设置列可见性 */
  setColumnVisible(colId: string, visible: boolean): void {
    this.columnVisibility.set(colId, visible);
    this.emitColumnVisibilityChanged([{ colId, visible }]);
  }

  /** 批量设置列可见性 */
  setColumnsVisibility(changes: { colId: string; visible: boolean }[]): void {
    for (const { colId, visible } of changes) {
      this.columnVisibility.set(colId, visible);
    }
    this.emitColumnVisibilityChanged(changes);
  }

  /** 显示所有列 */
  showAllColumns(): void {
    const changes: { colId: string; visible: boolean }[] = [];
    for (const [colId] of this.columnVisibility) {
      if (!this.columnVisibility.get(colId)) {
        this.columnVisibility.set(colId, true);
        changes.push({ colId, visible: true });
      }
    }
    this.emitColumnVisibilityChanged(changes);
  }

  /** 获取列分组 */
  getColumnGroups(): Map<string, string[]> { return this.columnGroups; }

  /** 获取列顺序 */
  getColumnOrder(): string[] { return [...this.columnOrder]; }

  /** 在面板中移动列 */
  moveColumnInPanel(fromIndex: number, toIndex: number): void {
    const [removed] = this.columnOrder.splice(fromIndex, 1);
    this.columnOrder.splice(toIndex, 0, removed);
  }

  // ===== 筛选工具面板功能 =====

  /** 获取所有活跃筛选 */
  getActiveFilters(columnDefs: ColDef[]): { colId: string; filter: any }[] {
    const filters: { colId: string; filter: any }[] = [];
    for (const col of columnDefs) {
      if (col.filterActive) {
        filters.push({ colId: col.field ?? col.colId ?? '', filter: col.filterParams });
      }
    }
    return filters;
  }

  // ===== 事件注册 =====

  onPanelChangedEvent(callback: (panelId: string | null) => void): void {
    this.onPanelChanged = callback;
  }

  onSideBarVisibilityChanged(callback: (visible: boolean) => void): void {
    this.onVisibilityChanged = callback;
  }

  onColumnVisibilityChangedEvent(callback: (changes: { colId: string; visible: boolean }[]) => void): void {
    this.onColumnVisibilityChanged = callback;
  }

  // ===== 内部方法 =====

  private buildColumnGroups(columnDefs: ColDef[]): void {
    this.columnGroups.clear();
    for (const col of columnDefs) {
      if ('children' in col && (col as any).children) {
        const groupDef = col as any;
        const groupId = groupDef.headerName ?? groupDef.groupId ?? '';
        const childIds = groupDef.children
          .map((c: any) => c.field ?? c.colId ?? '')
          .filter((id: string) => id);
        if (groupId && childIds.length) {
          this.columnGroups.set(groupId, childIds);
        }
      }
    }
  }

  private emitVisibilityChanged(): void {
    if (this.onVisibilityChanged) this.onVisibilityChanged(this.visible);
  }

  private emitColumnVisibilityChanged(changes: { colId: string; visible: boolean }[]): void {
    if (this.onColumnVisibilityChanged) this.onColumnVisibilityChanged(changes);
  }

  destroy(): void {
    this.columnVisibility.clear();
    this.columnOrder = [];
    this.columnGroups.clear();
    this.panels = [];
    this.onPanelChanged = null;
    this.onVisibilityChanged = null;
    this.onColumnVisibilityChanged = null;
  }
}

/** 侧边栏配置 */
export interface SideBarConfig {
  toolPanels?: ToolPanelInfo[];
  defaultToolPanel?: string;
  openByDefault?: boolean;
  position?: 'left' | 'right';
  hiddenByDefault?: boolean;
}

/** 工具面板信息 */
export interface ToolPanelInfo {
  id: string;
  label: string;
  icon?: string;
  default?: boolean;
  width?: number;
  component?: any;
}
