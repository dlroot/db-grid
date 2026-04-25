/**
 * 数据服务
 * 处理数据管理、虚拟滚动、多列排序、筛选等核心功能
 */

import { Injectable } from '@angular/core';
import { ColDef, GridOptions, SortModelItem, RowNode, createEmptyRowNode } from '../models';
import { FilterService } from './filter.service';

interface VirtualScrollConfig {
  rowHeight: number;
  viewportHeight: number;
  bufferSize: number;
}

@Injectable()
export class DataService {
  private rowData: any[] = [];
  private rowNodeMap: Map<string, RowNode> = new Map();
  private scrollConfig: VirtualScrollConfig = {
    rowHeight: 40,
    viewportHeight: 400,
    bufferSize: 5,
  };
  private scrollTop = 0;
  private sortModel: SortModelItem[] = [];
  private filterModel: Record<string, any> = {};
  private gridOptions: GridOptions = {};
  private colDefs: ColDef[] = [];

  // 可选注入 FilterService（若未注入则使用内置简单筛选）
  private filterService: FilterService | null = null;

  /** 注入 FilterService（由主组件调用） */
  setFilterService(fs: FilterService): void {
    this.filterService = fs;
  }

  /** 初始化数据 */
  initialize(rowData: any[], gridOptions: GridOptions = {}, colDefs: ColDef[] = []): void {
    this.rowData = rowData || [];
    this.gridOptions = gridOptions;
    this.colDefs = colDefs;
    this.rowNodeMap.clear();

    this.rowData.forEach((data, index) => {
      const rowId = this.getRowId(data, index);
      const node = this.createRowNode(rowId, data, index);
      this.rowNodeMap.set(rowId, node);
    });
  }

  /** 初始化节点（分组/树模式） */
  initializeNodes(nodes: RowNode[], gridOptions: GridOptions = {}, colDefs: ColDef[] = []): void {
    this.gridOptions = gridOptions;
    this.colDefs = colDefs;
    this.rowNodeMap.clear();
    this.rowData = nodes.map(n => n.data);
    
    nodes.forEach((node, index) => {
      if (!node.id) node.id = `node-${index}`;
      node.rowIndex = index;
      node.rowHeight = this.scrollConfig.rowHeight;
      this.rowNodeMap.set(node.id, node);
    });
  }

  /** 更新列定义 */
  setColDefs(colDefs: ColDef[]): void {
    this.colDefs = colDefs;
  }

  /** 获取行ID */
  private getRowId(data: any, index: number): string {
    if (this.gridOptions.getRowId) {
      return this.gridOptions.getRowId({ data, index });
    }
    return data.id !== undefined ? String(data.id) : `row-${index}`;
  }

  /** 创建 RowNode */
  private createRowNode(id: string, data: any, index: number): RowNode {
    const node = createEmptyRowNode();
    node.id = id;
    node.data = data;
    node.rowIndex = index;
    node.rowHeight = this.scrollConfig.rowHeight;
    return node;
  }

  /** 设置虚拟滚动配置 */
  setScrollConfig(config: Partial<VirtualScrollConfig>): void {
    this.scrollConfig = { ...this.scrollConfig, ...config };
  }

  /** 更新滚动位置 */
  setScrollTop(scrollTop: number): void {
    this.scrollTop = Math.max(0, scrollTop);
  }

  /** 获取行数据 */
  getRowData(index: number): any | null {
    const nodes = this.getFilteredAndSortedNodes();
    if (index >= 0 && index < nodes.length) {
      return nodes[index].data;
    }
    return null;
  }

  /** 获取行节点 */
  getRowNode(id: string): RowNode | undefined {
    return this.rowNodeMap.get(id);
  }

  /** 获取行数 */
  getRowCount(): number {
    return this.getFilteredAndSortedNodes().length;
  }

  /** 获取总高度 */
  getTotalHeight(): number {
    return this.getRowCount() * this.scrollConfig.rowHeight;
  }

  /** 获取行高 */
  getRowHeight(): number {
    return this.scrollConfig.rowHeight;
  }

  /** 获取可视区域信息 */
  getViewportInfo(): { startIndex: number; endIndex: number; offsetY: number } {
    const rowHeight = this.scrollConfig.rowHeight;
    const viewportHeight = this.scrollConfig.viewportHeight;
    const bufferSize = this.scrollConfig.bufferSize;

    const startIndex = Math.max(0, Math.floor(this.scrollTop / rowHeight) - bufferSize);
    const visibleCount = Math.ceil(viewportHeight / rowHeight) + 2 * bufferSize;
    const endIndex = Math.min(this.getRowCount(), startIndex + visibleCount);

    return {
      startIndex,
      endIndex,
      offsetY: startIndex * rowHeight,
    };
  }

  /** 获取可见行 */
  getVisibleRows(): any[] {
    const { startIndex, endIndex } = this.getViewportInfo();
    const nodes = this.getFilteredAndSortedNodes();
    return nodes.slice(startIndex, endIndex).map(node => node.data);
  }

  /** 获取过滤和排序后的节点 */
  private getFilteredAndSortedNodes(): RowNode[] {
    let nodes = Array.from(this.rowNodeMap.values());

    // 应用筛选（优先使用 FilterService，否则用内置简单筛选）
    if (this.filterService) {
      if (this.filterService.isFilterActive()) {
        nodes = nodes.filter(node =>
          this.filterService!.passesAllFilters(node.data, this.colDefs)
        );
      }
    } else if (Object.keys(this.filterModel).length > 0) {
      nodes = this.applyFilterToNodes(nodes);
    }

    // 应用多列排序
    if (this.sortModel.length > 0) {
      nodes = this.applySortToNodes(nodes);
    }

    return nodes;
  }

  /** 内置简单筛选（兼容旧接口） */
  private applyFilterToNodes(nodes: RowNode[]): RowNode[] {
    return nodes.filter(node => {
      for (const [field, filterValue] of Object.entries(this.filterModel)) {
        const cellValue = this.getCellValue(node.data, field);
        if (!this.passesFilter(cellValue, filterValue)) {
          return false;
        }
      }
      return true;
    });
  }

  /** 内置简单筛选逻辑 */
  private passesFilter(cellValue: any, filterValue: any): boolean {
    const filterType = filterValue?.filterType || 'text';
    const filterText = filterValue?.filter?.toString().toLowerCase() || '';

    switch (filterType) {
      case 'text':
      case 'agTextColumnFilter':
        return String(cellValue ?? '').toLowerCase().includes(filterText);
      case 'number':
      case 'agNumberColumnFilter': {
        const num = Number(cellValue);
        const f = Number(filterText);
        if (filterValue.type === 'greaterThan') return num > f;
        if (filterValue.type === 'lessThan') return num < f;
        if (filterValue.type === 'inRange') return num >= f && num <= Number(filterValue.filterTo);
        return num === f;
      }
      case 'date':
      case 'agDateColumnFilter': {
        const cellDate = new Date(cellValue).getTime();
        const fromDate = new Date(filterValue.dateFrom).getTime();
        const toDate = new Date(filterValue.dateTo).getTime();
        return cellDate >= fromDate && cellDate <= toDate;
      }
      case 'set':
      case 'agSetColumnFilter': {
        const values = filterValue.values || [];
        return values.length === 0 || values.includes(cellValue);
      }
      case 'boolean':
        if (filterValue.value === null) return true;
        return Boolean(cellValue) === filterValue.value;
      default:
        return true;
    }
  }

  // ── 多列排序 ──────────────────────────────────────────────────────────────

  /**
   * 应用多列排序
   * sortModel 按 sortIndex 升序排列，index 小的优先级高
   */
  private applySortToNodes(nodes: RowNode[]): RowNode[] {
    // 按 sortIndex 排序（确保多列排序优先级正确）
    const sortedModel = [...this.sortModel].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

    return [...nodes].sort((a, b) => {
      for (const sortItem of sortedModel) {
        const colDef = this.colDefs.find(c => (c.colId || c.field) === sortItem.colId || c.field === sortItem.colId);
        const valueA = colDef?.valueGetter
          ? colDef.valueGetter({ data: a.data, node: a as any, colDef, api: null, context: null } as any)
          : this.getCellValue(a.data, sortItem.colId);
        const valueB = colDef?.valueGetter
          ? colDef.valueGetter({ data: b.data, node: b as any, colDef, api: null, context: null } as any)
          : this.getCellValue(b.data, sortItem.colId);

        let result = this.compareValues(valueA, valueB, colDef);

        if (result !== 0) {
          return sortItem.sort === 'desc' ? -result : result;
        }
      }
      return 0;
    });
  }

  /** 比较两个值（支持自定义 comparator） */
  private compareValues(a: any, b: any, colDef?: ColDef): number {
    // 空值处理：null/undefined 排最后
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;

    // 自定义比较器
    if ((colDef as any)?.comparator) {
      return (colDef as any).comparator(a, b);
    }

    // 数字比较
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    // 日期比较
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }

    // 字符串比较（本地化）
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  }

  /** 获取单元格值（支持嵌套路径 a.b.c） */
  private getCellValue(data: any, field: string): any {
    if (!data || !field) return null;
    const keys = field.split('.');
    let value = data;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  }

  // ── 排序 API ──────────────────────────────────────────────────────────────

  /**
   * 从列定义中提取排序模型（支持多列排序）
   * 列定义中 sort + sortIndex 决定排序优先级
   */
  sort(columnDefs: ColDef[]): void {
    const sortedCols = columnDefs
      .filter(c => c.sort && c.field)
      .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));

    this.sortModel = sortedCols.map((c, index) => ({
      colId: c.field!,
      sort: c.sort!,
      index,
    }));
  }

  /**
   * 直接设置排序模型（支持多列）
   * items 按优先级顺序传入，index 自动分配
   */
  setSortModel(items: Array<{ colId: string; sort: 'asc' | 'desc' }>): void {
    this.sortModel = items.map((item, index) => ({
      colId: item.colId,
      sort: item.sort,
      index,
    }));
  }

  /**
   * 切换单列排序（支持 Shift 多列）
   * @param colId 列ID
   * @param multiSort 是否多列排序（Shift键）
   */
  toggleSort(colId: string, multiSort = false): SortModelItem[] {
    const existing = this.sortModel.find(s => s.colId === colId);

    if (!multiSort) {
      // 单列排序：清除其他列
      if (!existing) {
        this.sortModel = [{ colId, sort: 'asc', index: 0 }];
      } else if (existing.sort === 'asc') {
        this.sortModel = [{ colId, sort: 'desc', index: 0 }];
      } else {
        // desc → 清除排序
        this.sortModel = [];
      }
    } else {
      // 多列排序（Shift+点击）
      if (!existing) {
        this.sortModel = [...this.sortModel, { colId, sort: 'asc', index: this.sortModel.length }];
      } else if (existing.sort === 'asc') {
        this.sortModel = this.sortModel.map(s =>
          s.colId === colId ? { ...s, sort: 'desc' as const } : s
        );
      } else {
        // 移除该列排序，重新分配 index
        this.sortModel = this.sortModel
          .filter(s => s.colId !== colId)
          .map((s, i) => ({ ...s, index: i }));
      }
    }

    return this.sortModel;
  }

  getSortModel(): SortModelItem[] {
    return [...this.sortModel];
  }

  getColumnSortState(colId: string): { sort: 'asc' | 'desc' | null; sortIndex: number | null } {
    const item = this.sortModel.find(s => s.colId === colId);
    if (!item) return { sort: null, sortIndex: null };
    return { sort: item.sort, sortIndex: item.index ?? null };
  }

  clearSort(): void {
    this.sortModel = [];
  }

  // ── 筛选 API ──────────────────────────────────────────────────────────────

  filter(columnDefs: ColDef[], filterModel: Record<string, any>): void {
    this.filterModel = filterModel;
    if (this.filterService) {
      this.filterService.setFilterModel(filterModel as any);
    }
  }

  clearFilter(): void {
    this.filterModel = {};
    this.filterService?.clearAllFilters();
  }

  // ── 行操作 ────────────────────────────────────────────────────────────────

  addRow(data: any, index?: number): void {
    const newIndex = index ?? this.rowData.length;
    this.rowData.splice(newIndex, 0, data);
    this.reindexRows();
  }

  removeRow(id: string): void {
    this.rowData = this.rowData.filter((d, i) => this.getRowId(d, i) !== id);
    this.rowNodeMap.delete(id);
    this.reindexRows();
  }

  updateRow(id: string, data: any): void {
    const node = this.rowNodeMap.get(id);
    if (node) {
      node.data = data;
    }
  }

  private reindexRows(): void {
    this.rowNodeMap.clear();
    this.rowData.forEach((data, index) => {
      const rowId = this.getRowId(data, index);
      const node = this.createRowNode(rowId, data, index);
      this.rowNodeMap.set(rowId, node);
    });
  }

  // ── 选择 ──────────────────────────────────────────────────────────────────

  updateNodeSelection(nodeId: string, selected: boolean): void {
    const node = this.rowNodeMap.get(nodeId);
    if (node) node.selected = selected;
  }

  getSelectedNodes(): RowNode[] {
    return Array.from(this.rowNodeMap.values()).filter(node => node.selected);
  }

  selectAll(nodeIds?: string[]): void {
    const ids = nodeIds || Array.from(this.rowNodeMap.keys());
    ids.forEach(id => {
      const node = this.rowNodeMap.get(id);
      if (node) node.selected = true;
    });
  }

  clearSelection(): void {
    this.rowNodeMap.forEach(node => { node.selected = false; });
  }

  // ── 销毁 ──────────────────────────────────────────────────────────────────

  destroy(): void {
    this.rowData = [];
    this.rowNodeMap.clear();
    this.sortModel = [];
    this.filterModel = {};
  }
}
