/**
 * 表头渲染器
 * 处理列标题的渲染和交互
 */

import { Injectable } from '@angular/core';
import { ColDef, ColGroupDef } from '../../models';
import { ColumnService } from '../../services/column.service';
import { I18nService } from '../../services/i18n.service';

export interface HeaderRenderResult {
  headerElement: HTMLElement;
  columnHeaders: Map<string, HTMLElement>;
}

@Injectable()
export class HeaderRendererService {
  /** 表头高度 */
  private headerHeight = 40;

  /** 是否显示列分组 */
  private showGroupHeaders = false;

  // ========== 列拖拽状态 ==========
  private isDragging = false;
  private dragColDef: ColDef | null = null;
  private dragColId = '';
  private dragStartX = 0;
  private ghostEl: HTMLElement | null = null;
  private dragIndicatorEl: HTMLElement | null = null;
  private onColDragEnd?: (fromColId: string, toColId: string) => void;

  constructor(private columnService: ColumnService, private i18n?: I18nService) {}

  /** 渲染表头 */
  render(): HeaderRenderResult {
    return this.renderWithColumns(undefined);
  }

  /** 渲染指定列表头（列虚拟化）
   * @param columns 如果提供，只渲染这些列；否则渲染所有可见列
   */
  renderWithColumns(columns?: { leftPinned: ColDef[]; center: ColDef[]; rightPinned: ColDef[]; offsetX: number; totalScrollableWidth: number }): HeaderRenderResult {
    const headerElement = this.createHeaderContainer();
    const columnHeaders = new Map<string, HTMLElement>();

    const columnTree = this.columnService.getColumnTree();
    const hasGroups = this.columnService.hasColumnGroups();

    if (hasGroups) {
      // ========== 分组表头：多行渲染 ==========
      const depth = this.columnService.getGroupDepth();
      headerElement.style.height = `${depth * this.headerHeight}px`;

      const rows: HTMLElement[][] = [];
      for (let i = 0; i < depth; i++) {
        rows.push([]);
      }

      this.buildGroupCells(columnTree, rows, 0, depth);

      rows.forEach((cells, rowIndex) => {
        const row = this.createHeaderRow();
        cells.forEach(cell => row.appendChild(cell));
        headerElement.appendChild(row);
      });
    } else {
      // ========== 扁平表头：单行渲染 ==========
      headerElement.style.height = `${this.headerHeight}px`;
      const headerRow = this.createHeaderRow();

      if (columns) {
        // 列虚拟化模式：渲染 leftPinned + center(带偏移) + rightPinned
        // 左固定列
        columns.leftPinned.forEach(colDef => {
          const colHeader = this.createColumnHeader(colDef);
          headerRow.appendChild(colHeader);
          columnHeaders.set(colDef.field || colDef.colId || '', colHeader);
        });

        // 中间可滚动列（带偏移）
        const centerContainer = document.createElement('div');
        centerContainer.className = 'db-grid-header-center';
        centerContainer.style.cssText = `
          display: flex;
          position: relative;
          margin-left: ${columns.offsetX}px;
        `;
        columns.center.forEach(colDef => {
          const colHeader = this.createColumnHeader(colDef);
          centerContainer.appendChild(colHeader);
          columnHeaders.set(colDef.field || colDef.colId || '', colHeader);
        });
        headerRow.appendChild(centerContainer);

        // 右固定列
        columns.rightPinned.forEach(colDef => {
          const colHeader = this.createColumnHeader(colDef);
          headerRow.appendChild(colHeader);
          columnHeaders.set(colDef.field || colDef.colId || '', colHeader);
        });
      } else {
        // 常规模式：渲染所有列
        const allCols = this.columnService.getVisibleColumns();
        allCols.forEach(colDef => {
          const colHeader = this.createColumnHeader(colDef);
          headerRow.appendChild(colHeader);
          columnHeaders.set(colDef.field || colDef.colId || '', colHeader);
        });
      }

      headerElement.appendChild(headerRow);
    }

    return { headerElement, columnHeaders };
  }

  /**
   * 递归构建分组表头单元格
   * @param colDefs 当前列定义列表
   * @param rows 行数组（每行是一个 HTMLElement[]）
   * @param currentRow 当前行索引
   * @param totalDepth 总深度
   */
  private buildGroupCells(
    colDefs: (ColDef | ColGroupDef)[],
    rows: HTMLElement[][],
    currentRow: number,
    totalDepth: number
  ): void {
    for (const colDef of colDefs) {
      if ('children' in colDef && (colDef as ColGroupDef).children?.length > 0) {
        const group = colDef as ColGroupDef;

        // 创建分组表头单元格
        const groupHeader = this.createGroupHeader(group);
        // 计算分组跨越的列数
        const leafCount = this.countLeafColumns([group]);
        const groupWidth = this.calculateGroupWidth(group);

        groupHeader.style.width = `${groupWidth}px`;
        groupHeader.style.minWidth = `${groupWidth}px`;
        groupHeader.style.maxWidth = `${groupWidth}px`;

        // 分组表头放在当前行，纵向跨 (totalDepth - currentRow - 1) 行
        const rowSpan = totalDepth - currentRow;
        groupHeader.style.height = `${rowSpan * this.headerHeight}px`;
        rows[currentRow].push(groupHeader);

        // 递归处理子列（从下一行开始）
        this.buildGroupCells(group.children || [], rows, currentRow + 1, totalDepth);
      } else {
        // 叶子列 - 放在最底行
        const leafDef = colDef as ColDef;
        const colHeader = this.createColumnHeader(leafDef);

        // 如果不是最底行，需要纵向跨行到底部
        const rowSpan = totalDepth - currentRow;
        if (rowSpan > 1) {
          colHeader.style.height = `${rowSpan * this.headerHeight}px`;
        }

        rows[currentRow].push(colHeader);
      }
    }
  }

  /** 创建分组表头 */
  private createGroupHeader(group: ColGroupDef): HTMLElement {
    const header = document.createElement('div');
    header.className = 'db-grid-header-cell db-grid-header-group';

    // ARIA 属性
    header.setAttribute('role', 'columnheader');
    header.setAttribute('aria-label', group.headerName || 'Group');
    const leafCount = this.countLeafColumns([group]);
    header.setAttribute('aria-colspan', String(leafCount));

    // 标题内容
    const label = document.createElement('span');
    label.className = 'db-grid-header-label db-grid-header-group-label';
    label.textContent = group.headerName || 'Group';
    label.style.fontWeight = '600';
    label.style.flex = '1';
    header.appendChild(label);

    header.style.cssText += `
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 12px;
      box-sizing: border-box;
      user-select: none;
      position: relative;
      border-bottom: 1px solid var(--db-grid-border-color, #ddd);
    `;

    // 分组分隔线
    const separator = document.createElement('div');
    separator.style.cssText = `
      position: absolute;
      right: 0;
      top: 10%;
      height: 80%;
      width: 1px;
      background: var(--db-grid-border-color, #ddd);
    `;
    header.appendChild(separator);

    return header;
  }

  /** 计算分组下的叶子列数 */
  private countLeafColumns(colDefs: (ColDef | ColGroupDef)[]): number {
    let count = 0;
    for (const col of colDefs) {
      if ('children' in col) {
        count += this.countLeafColumns((col as ColGroupDef).children || []);
      } else {
        count++;
      }
    }
    return count;
  }

  /** 计算分组的总宽度 */
  private calculateGroupWidth(group: ColGroupDef): number {
    let width = 0;
    const children = group.children || [];
    for (const child of children) {
      if ('children' in child) {
        width += this.calculateGroupWidth(child as ColGroupDef);
      } else {
        const colDef = child as ColDef;
        const state = this.columnService.getColumnState(colDef);
        width += state?.width || colDef.width || 200;
      }
    }
    return width || group.width || 200;
  }

  /** 创建表头容器 */
  private createHeaderContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'db-grid-header';
    container.setAttribute('role', 'rowgroup');
    container.setAttribute('aria-label', 'table header');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--db-grid-header-bg, #f5f5f5);
      border-bottom: 2px solid var(--db-grid-border-color, #ddd);
      height: ${this.headerHeight}px;
    `;
    return container;
  }

  /** 创建表头行 */
  private createHeaderRow(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'db-grid-header-row';
    row.setAttribute('role', 'row');
    row.style.cssText = `
      display: flex;
      align-items: center;
      flex: 1;
    `;
    return row;
  }

  /** 创建列标题 */
  private createColumnHeader(colDef: ColDef): HTMLElement {
    const header = document.createElement('div');
    header.className = this.getHeaderClass(colDef);
    const colId = colDef.colId || colDef.field || '';
    header.dataset['colId'] = colId;
    header.style.cssText = this.getHeaderStyle(colDef);

    // ARIA 属性
    header.setAttribute('role', 'columnheader');
    header.setAttribute('aria-colindex', String(this.columnService.getVisibleColumns().findIndex(c => (c.colId || c.field) === colId) + 1));
    header.setAttribute('aria-label', colDef.headerName || colDef.field || '');
    header.setAttribute('aria-sort', colDef.sort === 'asc' ? 'ascending' : colDef.sort === 'desc' ? 'descending' : 'none');
    header.setAttribute('tabindex', '-1');

    // 标题内容
    const label = document.createElement('span');
    label.className = 'db-grid-header-label';
    label.textContent = colDef.headerName || colDef.field || '';
    header.appendChild(label);

    // 排序图标
    if (colDef.sortable) {
      const sortIcon = this.createSortIcon(colDef);
      header.appendChild(sortIcon);
    }

    // 筛选图标
    if (colDef.filter) {
      const filterIcon = this.createFilterIcon(colDef);
      header.appendChild(filterIcon);
    }

    // 列拖拽手柄
    const dragHandle = this.createDragHandle();
    this.setupColumnDrag(dragHandle, colDef, colId);
    header.appendChild(dragHandle);

    // 菜单按钮（三横线图标）
    const menuButton = this.createMenuButton(colDef, colId);
    header.appendChild(menuButton);

    // 调整大小手柄
    const resizeHandle = this.createResizeHandle(colDef);
    header.appendChild(resizeHandle);

    // 设置交互事件
    this.setupHeaderEvents(header, colDef);

    return header;
  }

  /** 获取表头类名 */
  private getHeaderClass(colDef: ColDef): string {
    const classes = ['db-grid-header-cell'];

    if (colDef.sortable) {
      classes.push('db-grid-header-sortable');
    }

    if (colDef.resizable) {
      classes.push('db-grid-header-resizable');
    }

    if (colDef.pinnedLeft) {
      classes.push('db-grid-header-pinned-left');
    }

    if (colDef.pinnedRight) {
      classes.push('db-grid-header-pinned-right');
    }

    // 排序状态
    if (colDef.sort === 'asc') {
      classes.push('db-grid-header-sorted-asc');
    } else if (colDef.sort === 'desc') {
      classes.push('db-grid-header-sorted-desc');
    }

    // 筛选状态
    if (colDef.filterActive) {
      classes.push('db-grid-header-filtered');
    }

    return classes.join(' ');
  }

  /** 获取表头样式 */
  private getHeaderStyle(colDef: ColDef): string {
    const state = this.columnService.getColumnState(colDef);
    const width = state?.width || colDef.width || 200;
    const styles: string[] = [
      `width: ${width}px`,
      `min-width: ${width}px`,
      `max-width: ${width}px`,
      `display: flex`,
      `align-items: center`,
      `padding: 0 8px`,
      `box-sizing: border-box`,
      `user-select: none`,
      `position: relative`,
    ];

    // 对齐方式
    if (colDef.headerAlign) {
      styles.push(`justify-content: ${this.getFlexAlign(colDef.headerAlign)}`);
    }

    // 固定列定位
    if (colDef.pinnedLeft) {
      styles.push(`left: 0`);
      styles.push(`z-index: 1`);
    } else if (colDef.pinnedRight) {
      styles.push(`right: 0`);
      styles.push(`z-index: 1`);
    }

    return styles.join('; ');
  }

  /** 获取flex对齐方式 */
  private getFlexAlign(align: string): string {
    switch (align) {
      case 'left':
        return 'flex-start';
      case 'right':
        return 'flex-end';
      case 'center':
        return 'center';
      default:
        return 'flex-start';
    }
  }

  /** 创建排序图标 */
  private createSortIcon(colDef: ColDef): HTMLElement {
    const icon = document.createElement('span');
    icon.className = 'db-grid-sort-icon';

    const sort = colDef.sort;

    if (sort === 'asc') {
      icon.innerHTML = '▲';
      icon.title = `${this.i18n?.t('sort.ascending') ?? 'Sort Ascending'}`;
    } else if (sort === 'desc') {
      icon.innerHTML = '▼';
      icon.title = `${this.i18n?.t('sort.descending') ?? 'Sort Descending'}`;
    } else {
      icon.innerHTML = '⇅';
      icon.title = `${this.i18n?.t('sort.noSort') ?? 'Click to Sort'}`;
      icon.classList.add('db-grid-sort-icon-inactive');
    }

    return icon;
  }

  /** 创建筛选图标 */
  private createFilterIcon(colDef: ColDef): HTMLElement {
    const icon = document.createElement('span');
    icon.className = 'db-grid-filter-icon';
    icon.innerHTML = '⫴';
    icon.title = `${this.i18n?.t('filter.click') ?? 'Click to Filter'}`;

    if (colDef.filterActive) {
      icon.classList.add('db-grid-filter-icon-active');
    }

    // 绑定筛选图标点击事件
    icon.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      const event = new CustomEvent('filterClick', {
        bubbles: true,
        detail: {
          colDef,
          colId: colDef.colId || colDef.field || '',
          event: e,
        },
      });
      icon.dispatchEvent(event);
    });

    return icon;
  }

  /** 创建拖拽手柄 */
  /** 创建拖拽手柄 */
  private createDragHandle(): HTMLElement {
    const handle = document.createElement('div');
    handle.className = 'db-grid-drag-handle';
    handle.innerHTML = '⋮⋮';
    handle.title = `${this.i18n?.t('col.drag') ?? 'Drag to Move Column'}`;
    return handle;
  }

  /** 创建菜单按钮（三横线图标） */
  private createMenuButton(colDef: ColDef, colId: string): HTMLElement {
    const btn = document.createElement('div');
    btn.className = 'db-grid-header-menu-button';
    btn.innerHTML = '☰';
    btn.title = `${this.i18n?.t('col.menu') ?? 'Column Menu'}`;
    btn.style.cssText = `
      display: flex; align-items: center; justify-content: center;
      width: 20px; height: 20px;
      cursor: pointer; font-size: 12px;
      opacity: 0.4; transition: opacity 0.15s;
      border-radius: 3px;
    `;

    // 鼠标悬停时显示
    btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; btn.style.background = 'rgba(0,0,0,0.06)'; });
    btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.4'; btn.style.background = ''; });

    // 点击触发列菜单事件
    btn.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const event = new CustomEvent('columnMenuClick', {
        bubbles: true,
        detail: { colDef, colId, event: e },
      });
      btn.dispatchEvent(event);
    });

    return btn;
  }

  /** 创建调整大小手柄 */
  private createResizeHandle(colDef: ColDef): HTMLElement {
    const handle = document.createElement('div');
    handle.className = 'db-grid-resize-handle';

    if (colDef.resizable !== false) {
      handle.classList.add('db-grid-resize-handle-active');
    }

    return handle;
  }

  /** 设置表头交互事件 */
  private setupHeaderEvents(header: HTMLElement, colDef: ColDef): void {
    const colId = colDef.colId || colDef.field || '';

    // 点击排序
    header.addEventListener('click', (e: MouseEvent) => {
      // 忽略图标和手柄的点击
      const target = e.target as HTMLElement;
      if (
        target.classList.contains('db-grid-sort-icon') ||
        target.classList.contains('db-grid-filter-icon') ||
        target.classList.contains('db-grid-drag-handle') ||
        target.classList.contains('db-grid-resize-handle')
      ) {
        return;
      }

      // 触发排序事件（传递 shiftKey 支持多列排序）
      const event = new CustomEvent('headerClick', {
        bubbles: true,
        detail: {
          colDef,
          colId,
          column: colDef,
          shiftKey: e.shiftKey,
        },
      });
      header.dispatchEvent(event);
    });

    // 双击排序
    header.addEventListener('dblclick', (e: MouseEvent) => {
      const event = new CustomEvent('headerDoubleClick', {
        bubbles: true,
        detail: {
          colDef,
          colId,
        },
      });
      header.dispatchEvent(event);
    });

    // 右键菜单
    header.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();

      const event = new CustomEvent('headerContextMenu', {
        bubbles: true,
        detail: {
          colDef,
          colId,
          event: e,
        },
      });
      header.dispatchEvent(event);
    });
  }

  /** 更新列标题 */
  updateColumnHeader(colId: string, updates: Partial<ColDef>): void {
    // 查找并更新对应的表头元素
    const headerCell = document.querySelector(`.db-grid-header-cell[data-col-id="${colId}"]`);
    if (!headerCell) return;

    // 更新排序状态
    if (updates.sort !== undefined) {
      const sortIcon = headerCell.querySelector('.db-grid-sort-icon');
      if (sortIcon) {
        sortIcon.classList.remove('db-grid-sort-icon-inactive');

        if (updates.sort === 'asc') {
          sortIcon.innerHTML = '▲';
          headerCell.classList.add('db-grid-header-sorted-asc');
          headerCell.classList.remove('db-grid-header-sorted-desc');
        } else if (updates.sort === 'desc') {
          sortIcon.innerHTML = '▼';
          headerCell.classList.add('db-grid-header-sorted-desc');
          headerCell.classList.remove('db-grid-header-sorted-asc');
        } else {
          sortIcon.innerHTML = '⇅';
          sortIcon.classList.add('db-grid-sort-icon-inactive');
          headerCell.classList.remove('db-grid-header-sorted-asc', 'db-grid-header-sorted-desc');
        }
      }
    }

    // 更新筛选状态
    if (updates.filterActive !== undefined) {
      const filterIcon = headerCell.querySelector('.db-grid-filter-icon');
      if (filterIcon) {
        filterIcon.classList.toggle('db-grid-filter-icon-active', updates.filterActive);
      }
    }

    // 更新宽度
    if (updates.width !== undefined) {
      (headerCell as HTMLElement).style.width = `${updates.width}px`;
    }
  }

  /** 显示列选择菜单 */
  showColumnMenu(colId: string, x: number, y: number): void {
    // 创建菜单
    const menu = document.createElement('div');
    menu.className = 'db-grid-header-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
      min-width: 150px;
    `;

    // 菜单项
    const menuItems = [
      { label: 'Sort Ascending', action: 'sortAsc' },
      { label: 'Sort Descending', action: 'sortDesc' },
      { label: 'Clear Sort', action: 'clearSort' },
      { type: 'separator' },
      { label: 'Filter', action: 'filter' },
      { label: 'Pin Column', action: 'pin' },
      { type: 'separator' },
      { label: 'Auto-Size Column', action: 'autoSize' },
      { label: 'Reset Columns', action: 'reset' },
    ];

    menuItems.forEach(item => {
      if (item.type === 'separator') {
        const sep = document.createElement('div');
        sep.className = 'db-grid-menu-separator';
        sep.style.cssText = 'border-top: 1px solid #eee; margin: 4px 0;';
        menu.appendChild(sep);
      } else {
        const menuItem = document.createElement('div');
        menuItem.className = 'db-grid-menu-item';
        menuItem.textContent = item.label!;
        menuItem.style.cssText = `
          padding: 8px 16px;
          cursor: pointer;
          font-size: 14px;
        `;

        menuItem.addEventListener('mouseenter', () => {
          menuItem.style.background = '#f5f5f5';
        });
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.background = '';
        });

        menu.appendChild(menuItem);
      }
    });

    document.body.appendChild(menu);

    // 点击其他地方关闭菜单
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  }

  // ========== 列拖拽实现 ==========

  /** 设置列拖拽回调（由 DbGridComponent 调用） */
  setOnColDragEnd(callback: (fromColId: string, toColId: string) => void): void {
    this.onColDragEnd = callback;
  }

  /** 给拖拽手柄绑定事件 */
  private setupColumnDrag(handle: HTMLElement, colDef: ColDef, colId: string): void {
    handle.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      this.isDragging = true;
      this.dragColDef = colDef;
      this.dragColId = colId;
      this.dragStartX = e.clientX;

      const headerCell = handle.closest('.db-grid-header-cell') as HTMLElement;
      if (!headerCell) return;

      // 创建 ghost 元素（跟随鼠标的半透明副本）
      this.createGhostElement(headerCell);

      // 创建放置指示器（竖线）
      this.createDragIndicator();

      // 全局 mousemove / mouseup
      const onMove = (ev: MouseEvent) => this.onDragMove(ev);
      const onUp = (ev: MouseEvent) => this.onDragUp(ev, onMove, onUp);

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  /** 创建 ghost 拖拽元素 */
  private createGhostElement(sourceHeader: HTMLElement): void {
    this.ghostEl = sourceHeader.cloneNode(true) as HTMLElement;
    this.ghostEl.className = 'db-grid-drag-ghost';
    Object.assign(this.ghostEl.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '10000',
      opacity: '0.7',
      width: sourceHeader.offsetWidth + 'px',
      height: sourceHeader.offsetHeight + 'px',
      background: getComputedStyle(sourceHeader).background || '#f0f0f0',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      overflow: 'hidden',
    });
    document.body.appendChild(this.ghostEl);
  }

  /** 创建放置指示线 */
  private createDragIndicator(): void {
    this.dragIndicatorEl = document.createElement('div');
    this.dragIndicatorEl.className = 'db-grid-drag-indicator';
    Object.assign(this.dragIndicatorEl.style, {
      position: 'fixed',
      top: '0',
      width: '3px',
      height: '100vh',
      background: '#1890ff',
      zIndex: '9999',
      display: 'none',
      pointerEvents: 'none',
      boxShadow: '0 0 6px rgba(24,144,255,0.5)',
    });
    document.body.appendChild(this.dragIndicatorEl);
  }

  /** 拖拽移动中 */
  private onDragMove(e: MouseEvent): void {
    if (!this.isDragging || !this.ghostEl) return;

    // 移动 ghost
    const gw = this.ghostEl.offsetWidth;
    const gh = this.ghostEl.offsetHeight;
    this.ghostEl.style.left = (e.clientX - gw / 2) + 'px';
    this.ghostEl.style.top = (e.clientY - gh / 2) + 'px';

    // 找到目标列，更新指示线位置
    const targetInfo = this.findDropTarget(e.clientX);
    if (targetInfo && this.dragIndicatorEl) {
      this.dragIndicatorEl.style.display = 'block';
      this.dragIndicatorEl.style.left = targetInfo.x + 'px';
    } else if (this.dragIndicatorEl) {
      this.dragIndicatorEl.style.display = 'none';
    }
  }

  /** 根据鼠标 X 坐标找到放置目标 */
  private findDropTarget(mouseX: number): { colId: string; x: number } | null {
    const headers = document.querySelectorAll('.db-grid-header-cell[data-col-id]');
    let bestTarget: { colId: string; x: number } | null = null;
    let minDist = Infinity;

    headers.forEach((h) => {
      const el = h as HTMLElement;
      const rect = el.getBoundingClientRect();
      const colId = el.getAttribute('data-col-id') || '';

      // 跳过自身
      if (colId === this.dragColId) return;

      // 鼠标在列范围内
      if (mouseX >= rect.left && mouseX <= rect.right) {
        const dist = Math.abs(mouseX - (rect.left + rect.width / 2));
        if (dist < minDist) {
          minDist = dist;
          // 放在左边还是右边
          const insertLeft = mouseX - rect.left < rect.width / 2;
          bestTarget = { colId, x: insertLeft ? rect.left : rect.right };
        }
      }
    });

    return bestTarget;
  }

  /** 拖拽释放 */
  private onDragUp(
    e: MouseEvent,
    onMove: (ev: MouseEvent) => void,
    onUp: (ev: MouseEvent) => void,
  ): void {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);

    if (!this.isDragging) {
      this.cleanupDrag();
      return;
    }

    // 找到目标列
    const target = this.findDropTarget(e.clientX);
    if (target && this.dragColId && target.colId !== this.dragColId) {
      // 触发回调通知 DbGridComponent 重排
      this.onColDragEnd?.(this.dragColId, target.colId);
    }

    this.cleanupDrag();
  }

  /** 清理拖拽状态 */
  private cleanupDrag(): void {
    this.isDragging = false;
    this.dragColDef = null;
    this.dragColId = '';
    this.ghostEl?.remove();
    this.ghostEl = null;
    this.dragIndicatorEl?.remove();
    this.dragIndicatorEl = null;
  }

  /** 销毁 */
  destroy(): void {
    this.cleanupDrag();
    document.querySelectorAll('.db-grid-header-menu').forEach(menu => menu.remove());
  }
}
