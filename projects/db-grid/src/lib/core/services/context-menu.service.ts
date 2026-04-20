/**
 * Context Menu Service
 * 右键菜单服务
 */

import { Subject, BehaviorSubject } from 'rxjs';

export interface MenuItem {
  /** 菜单项 ID */
  id: string;
  /** 显示文本 */
  label: string;
  /** 图标 (CSS class 或 emoji) */
  icon?: string;
  /** 子菜单 */
  subMenu?: MenuItem[];
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否显示分隔线 */
  separator?: boolean;
  /** 点击回调 */
  action?: (params: MenuActionParams) => void;
  /** 快捷键 */
  shortcut?: string;
}

export interface MenuActionParams {
  /** 触发的菜单项 ID */
  menuItemId: string;
  /** 行数据 */
  rowData?: any;
  /** 行索引 */
  rowIndex?: number;
  /** 列定义 */
  colDef?: any;
  /** 鼠标事件 */
  event?: MouseEvent;
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuState {
  isVisible: boolean;
  position: ContextMenuPosition;
  items: MenuItem[];
  context: {
    rowData?: any;
    rowIndex?: number;
    colDef?: any;
    node?: any;
  };
}

export class ContextMenuService {
  private menuItems: MenuItem[] = [];
  private state$ = new BehaviorSubject<ContextMenuState>({
    isVisible: false,
    position: { x: 0, y: 0 },
    items: [],
    context: {},
  });

  private onMenuItemClicked$ = new Subject<MenuActionParams>();

  initialize(items?: MenuItem[]): void {
    if (items) {
      this.menuItems = items;
    }
  }

  setMenuItems(items: MenuItem[]): void {
    this.menuItems = items;
    this.updateState({ items });
  }

  getMenuItems(): MenuItem[] {
    return [...this.menuItems];
  }

  addMenuItem(item: MenuItem, position?: number): void {
    if (position !== undefined) {
      this.menuItems.splice(position, 0, item);
    } else {
      this.menuItems.push(item);
    }
    this.updateState({ items: this.menuItems });
  }

  removeMenuItem(itemId: string): void {
    this.menuItems = this.menuItems.filter(item => item.id !== itemId);
    this.updateState({ items: this.menuItems });
  }

  updateMenuItem(itemId: string, updates: Partial<MenuItem>): void {
    const item = this.menuItems.find(i => i.id === itemId);
    if (item) {
      Object.assign(item, updates);
      this.updateState({ items: [...this.menuItems] });
    }
  }

  show(position: ContextMenuPosition, context: MenuActionParams): void {
    this.updateState({
      isVisible: true,
      position,
      context: {
        rowData: context.rowData,
        rowIndex: context.rowIndex,
        colDef: context.colDef,
      },
    });
  }

  hide(): void {
    this.updateState({
      isVisible: false,
      context: {},
    });
  }

  getState() {
    return this.state$.asObservable();
  }

  getCurrentState(): ContextMenuState {
    return this.state$.getValue();
  }

  isVisible(): boolean {
    return this.state$.getValue().isVisible;
  }

  onMenuItemClicked(callback: (params: MenuActionParams) => void): void {
    this.onMenuItemClicked$.subscribe(callback);
  }

  triggerMenuItem(params: MenuActionParams): void {
    const item = this.menuItems.find(i => i.id === params.menuItemId);
    if (item && item.action && !item.disabled) {
      item.action(params);
    }
    this.onMenuItemClicked$.next(params);
    this.hide();
  }

  // 创建默认右键菜单项
  getDefaultMenuItems(type: 'grid' | 'row' | 'column' | 'cell'): MenuItem[] {
    switch (type) {
      case 'grid':
        return [
          { id: 'export-csv', label: '导出 CSV', icon: '📥', action: (p) => console.log('Export CSV', p) },
          { id: 'export-excel', label: '导出 Excel', icon: '📊', action: (p) => console.log('Export Excel', p) },
          { id: 'sep1', label: '', separator: true },
          { id: 'refresh', label: '刷新', icon: '🔄', action: (p) => console.log('Refresh', p) },
          { id: 'reset-columns', label: '重置列', icon: '↩️', action: (p) => console.log('Reset columns', p) },
        ];
      case 'row':
        return [
          { id: 'copy-row', label: '复制行', icon: '📋', shortcut: 'Ctrl+C', action: (p) => console.log('Copy row', p) },
          { id: 'delete-row', label: '删除行', icon: '🗑️', action: (p) => console.log('Delete row', p) },
          { id: 'sep1', label: '', separator: true },
          { id: 'select-row', label: '选择行', icon: '✓', action: (p) => console.log('Select row', p) },
          { id: 'expand-row', label: '展开行详情', icon: '▶️', action: (p) => console.log('Expand row', p) },
        ];
      case 'cell':
        return [
          { id: 'copy-cell', label: '复制单元格', icon: '📋', shortcut: 'Ctrl+C', action: (p) => console.log('Copy cell', p) },
          { id: 'copy-value', label: '仅复制值', icon: '📄', action: (p) => console.log('Copy value', p) },
          { id: 'sep1', label: '', separator: true },
          { id: 'edit-cell', label: '编辑', icon: '✏️', shortcut: 'Enter', action: (p) => console.log('Edit cell', p) },
        ];
      case 'column':
        return [
          { id: 'sort-asc', label: '升序', icon: '⬆️', action: (p) => console.log('Sort asc', p) },
          { id: 'sort-desc', label: '降序', icon: '⬇️', action: (p) => console.log('Sort desc', p) },
          { id: 'clear-sort', label: '清除排序', icon: '↩️', action: (p) => console.log('Clear sort', p) },
          { id: 'sep1', label: '', separator: true },
          { id: 'filter', label: '筛选', icon: '🔍', action: (p) => console.log('Filter', p) },
          { id: 'pin-left', label: '固定到左侧', icon: '📌', action: (p) => console.log('Pin left', p) },
          { id: 'pin-right', label: '固定到右侧', icon: '📌', action: (p) => console.log('Pin right', p) },
          { id: 'unpin', label: '取消固定', icon: '📌', action: (p) => console.log('Unpin', p) },
        ];
      default:
        return [];
    }
  }

  private updateState(updates: Partial<ContextMenuState>): void {
    const current = this.state$.getValue();
    this.state$.next({ ...current, ...updates });
  }

  destroy(): void {
    this.state$.complete();
    this.onMenuItemClicked$.complete();
  }
}