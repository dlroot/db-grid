import { Injectable } from '@angular/core';
import { ColDef, IRowNode } from '../models';

/**
 * 列头菜单服务 — 列头右键/下拉菜单，包含排序、筛选、固定列等操作
 * AG Grid 对应功能：Column Menu, Header Menu
 */
@Injectable({ providedIn: 'root' })
export class ColumnMenuService {
  private enabled = true;
  private menuTabs: string[] = ['generalMenuTab', 'filterMenuTab', 'columnsMenuTab'];
  private activeMenu: ColumnMenuState | null = null;
  private columnDefs: ColDef[] = [];

  private onMenuVisible: ((state: ColumnMenuState | null) => void) | null = null;
  private onMenuItemAction: ((action: ColumnMenuAction) => void) | null = null;

  /** 初始化 */
  initialize(columnDefs: ColDef[], config: ColumnMenuConfig = {}): void {
    this.columnDefs = columnDefs;
    this.enabled = config.enabled ?? true;
    this.menuTabs = config.menuTabs ?? ['generalMenuTab', 'filterMenuTab', 'columnsMenuTab'];
  }

  /** 是否启用列菜单 */
  isEnabled(): boolean { return this.enabled; }

  /** 显示列菜单 */
  show(colId: string, position: { x: number; y: number }, tab?: string): void {
    if (!this.enabled) return;
    const col = this.columnDefs.find(c => c.field === colId || c.colId === colId);
    if (!col) return;
    if (col.suppressHeaderMenuButton) return;

    this.activeMenu = {
      colId,
      position,
      activeTab: tab ?? this.menuTabs[0],
      tabs: this.getAvailableTabs(col)
    };
    if (this.onMenuVisible) this.onMenuVisible(this.activeMenu);
  }

  /** 隐藏列菜单 */
  hide(): void {
    this.activeMenu = null;
    if (this.onMenuVisible) this.onMenuVisible(null);
  }

  /** 获取当前菜单状态 */
  getActiveMenu(): ColumnMenuState | null { return this.activeMenu; }

  /** 切换菜单Tab */
  setActiveTab(tab: string): void {
    if (!this.activeMenu) return;
    this.activeMenu.activeTab = tab;
    if (this.onMenuVisible) this.onMenuVisible(this.activeMenu);
  }

  /** 执行菜单操作 */
  executeAction(action: ColumnMenuAction): void {
    if (this.onMenuItemAction) this.onMenuItemAction(action);

    switch (action.type) {
      case 'sortAsc':
      case 'sortDesc':
      case 'clearSort':
      case 'pinLeft':
      case 'pinRight':
      case 'clearPinned':
      case 'hideColumn':
      case 'filterApply':
      case 'filterClear':
      case 'autoSizeThis':
      case 'autoSizeAll':
      case 'rowGroup':
      case 'expandAll':
      case 'contractAll':
        break;
    }
    this.hide();
  }

  /** 获取列的通用菜单项 */
  getGeneralMenuItems(colId: string): ColumnMenuItem[] {
    const col = this.columnDefs.find(c => c.field === colId || c.colId === colId);
    const items: ColumnMenuItem[] = [];

    // 排序
    if (col?.sortable !== false) {
      items.push(
        { id: 'sortAsc', label: '升序排列', icon: '↑', action: 'sortAsc' },
        { id: 'sortDesc', label: '降序排列', icon: '↓', action: 'sortDesc' },
        { id: 'clearSort', label: '取消排序', icon: '↕', action: 'clearSort' },
        { id: 'separator1', type: 'separator' }
      );
    }

    // 固定列
    if (col?.lockPinned !== true) {
      items.push(
        { id: 'pinLeft', label: '固定到左侧', icon: '◀', action: 'pinLeft' },
        { id: 'pinRight', label: '固定到右侧', icon: '▶', action: 'pinRight' },
        { id: 'clearPinned', label: '取消固定', icon: '◇', action: 'clearPinned' },
        { id: 'separator2', type: 'separator' }
      );
    }

    // 列宽
    items.push(
      { id: 'autoSizeThis', label: '自适应此列', icon: '↔', action: 'autoSizeThis' },
      { id: 'autoSizeAll', label: '自适应所有列', icon: '⇔', action: 'autoSizeAll' }
    );

    // 隐藏列
    if (col?.lockVisible !== true) {
      items.push(
        { id: 'separator3', type: 'separator' },
        { id: 'hideColumn', label: '隐藏此列', icon: '✕', action: 'hideColumn' }
      );
    }

    return items;
  }

  /** 注册菜单可见性回调 */
  onMenuVisibilityChanged(callback: (state: ColumnMenuState | null) => void): void {
    this.onMenuVisible = callback;
  }

  /** 注册菜单操作回调 */
  onMenuAction(callback: (action: ColumnMenuAction) => void): void {
    this.onMenuItemAction = callback;
  }

  /** 更新列定义 */
  setColumnDefs(columnDefs: ColDef[]): void {
    this.columnDefs = columnDefs;
  }

  private getAvailableTabs(col: ColDef): string[] {
    const tabs: string[] = [];
    if (!col.suppressHeaderMenuButton) tabs.push('generalMenuTab');
    if (col.filter !== false) tabs.push('filterMenuTab');
    tabs.push('columnsMenuTab');
    return tabs;
  }

  destroy(): void {
    this.activeMenu = null;
    this.onMenuVisible = null;
    this.onMenuItemAction = null;
  }
}

/** 列菜单配置 */
export interface ColumnMenuConfig {
  enabled?: boolean;
  menuTabs?: string[];
}

/** 列菜单状态 */
export interface ColumnMenuState {
  colId: string;
  position: { x: number; y: number };
  activeTab: string;
  tabs: string[];
}

/** 列菜单操作 */
export interface ColumnMenuAction {
  type: string;
  colId: string;
  value?: any;
}

/** 菜单项 */
export interface ColumnMenuItem {
  id: string;
  label?: string;
  icon?: string;
  action?: string;
  type?: 'item' | 'separator' | 'submenu';
  subItems?: ColumnMenuItem[];
  checked?: boolean;
  disabled?: boolean;
  shortcut?: string;
}
