/**
 * 核心模型统一导出
 * @packageDocumentation
 */

// ============ 列定义 ============

export type ColDefLike = ColDef | ColGroupDef;

export interface ColDef {
  // 基础属性
  field?: string;
  colId?: string;
  headerName?: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  pinnedLeft?: boolean;
  pinnedRight?: boolean;
  flex?: number;
  colSpan?: number;
  pinnedLeftIndex?: number;
  pinnedRightIndex?: number;

  // 列类型
  type?: string | string[];
  cellType?: string;

  // 交互
  sortable?: boolean;
  filter?: string | boolean | null;
  filterParams?: FilterParams;
  filterActive?: boolean;
  resizable?: boolean;
  suppressMovable?: boolean;

  // 固定列
  lockPosition?: boolean;
  lockPinned?: boolean;
  lockVisible?: boolean;

  // 显示
  hide?: boolean;
  suppressSizeToFit?: boolean;
  suppressAutoSize?: boolean;

  // 编辑
  editable?: boolean | ((params: any) => boolean);
  cellEditor?: string;
  cellEditorParams?: any;

  // 值处理
  valueGetter?: (params: ValueGetterParams) => any;
  valueSetter?: (params: ValueSetterParams) => any;
  valueFormatter?: (params: ValueFormatterParams) => any;
  valueParser?: (params: ValueParserParams) => any;

  // 渲染器
  cellRenderer?: any;
  cellRendererFramework?: any;
  cellRendererParams?: any;

  // 样式
  cellStyle?: CellStyle | ((params: any) => CellStyle);
  cellClass?: string | string[] | ((params: any) => string | string[] | object);
  cellClassRules?: CellClassRules;

  // 对齐
  headerAlign?: 'left' | 'center' | 'right';
  cellAlign?: 'left' | 'center' | 'right';

  // 复选框
  checkboxSelection?: boolean;
  headerCheckboxSelection?: boolean;

  // 工具提示
  tooltipField?: string;
  tooltipValueGetter?: (params: TooltipValueGetterParams) => string;

  // 排序
  sort?: 'asc' | 'desc' | null;
  sortIndex?: number;
  sortOrder?: number;

  // 动作列
  actions?: Array<{
    name: string;
    text?: string;
    icon?: string;
    disabled?: boolean;
    action?: (params: any) => void;
  }>;

  // 其他
  menuTabs?: string[];
  suppressHeaderMenuButton?: boolean;
  suppressHeaderFilterButton?: boolean;
  suppressHeaderSortButton?: boolean;
}

export interface ColGroupDef {
  headerName?: string;
  children: (ColDef | ColGroupDef)[];
  pinnedLeft?: boolean;
  pinnedRight?: boolean;
  width?: number;
  openByDefault?: boolean;
}

export type CellStyle = Record<string, string | number>;

export interface CellClassRules {
  [className: string]: ((params: any) => boolean) | boolean;
}

export interface CellClassParams {
  value: any;
  data: any;
  node: IRowNode;
  colDef: ColDef;
  rowIndex: number;
  api: any;
  columnApi: any;
  context: any;
}

export interface CellRendererParams {
  value: any;
  data: any;
  node: IRowNode;
  colDef: ColDef;
  column: ColDef;
  $scope: any;
  rowIndex: number;
  api: any;
  columnApi: any;
  context: any;
  rowId?: string;
}

export interface CellEditorParams {
  value: any;
  data: any;
  node: IRowNode;
  colDef: ColDef;
  column: ColDef;
  api: any;
  cellStartedEdit: boolean;
  charPress?: string;
  oldValue: any;
  newValue: any;
}

export interface ValueGetterParams {
  data?: any;
  node?: IRowNode;
  colDef?: ColDef;
  column?: ColDef;
  getValue?: () => any;
  api?: any;
  columnApi?: any;
  context?: any;
}

export interface ValueSetterParams {
  data: any;
  newValue: any;
  oldValue: any;
  node: IRowNode;
  colDef: ColDef;
  column: ColDef;
  api: any;
  context: any;
}

export interface ValueFormatterParams {
  value: any;
  data: any;
  node?: IRowNode;
  colDef: ColDef;
  column: ColDef;
  api: any;
  columnApi: any;
  context: any;
}

export interface ValueParserParams {
  value: any;
  oldValue: any;
  data: any;
  node: IRowNode;
  colDef: ColDef;
  column: ColDef;
  api: any;
  context: any;
}

export interface TooltipValueGetterParams {
  value: any;
  data: any;
  node: IRowNode;
  colDef: ColDef;
  column: ColDef;
  context: any;
}

export interface FilterParams {
  // 通用
  filterOptions?: string[];
  defaultOption?: string;

  // 数值筛选
  min?: number;
  max?: number;
  step?: number;

  // 集合筛选
  values?: any[];

  // 日期筛选
  minValidDate?: Date;
  maxValidDate?: Date;
  comparator?: (filterDate: Date, cellValue: Date) => number;

  // 其他
  debounceMs?: number;
  suppressAndOrCondition?: boolean;
  alwaysShowBothConditions?: boolean;
}

// ============ Grid 选项 ============

export interface GridOptions {
  // 列定义
  columnDefs?: ColDef[];
  defaultColDef?: Partial<ColDef>;
  columnTypes?: Record<string, Partial<ColDef>>;

  // 数据
  rowData?: any[];
  getRowId?: (params: GetRowIdParams) => string;
  getRowHeight?: (params: GetRowHeightParams) => number | null;
  getRowStyle?: (params: GetRowStyleParams) => CellStyle | null;
  getRowClass?: (params: GetRowClassParams) => string | string[] | ((params: GetRowClassParams) => string | string[] | null | undefined) | null | undefined;

  // 选择
  rowSelection?: RowSelectionType;
  suppressRowClickSelection?: boolean;
  enableRangeSelection?: boolean;
  suppressCopyRowsToClipboard?: boolean;

  // 排序
  animateRows?: boolean;
  multiSortKey?: MultiSortKeyType;

  // 筛选
  enableFilter?: boolean;

  // 布局
  domLayout?: DomLayoutType;
  rowHeight?: number;
  headerHeight?: number;
  floatingFiltersHeight?: number;
  groupHeaderHeight?: number;

  // 样式
  theme?: string;
  rowBuffer?: number;

  // 停用功能
  suppressCellFocus?: boolean;
  suppressRowDeselection?: boolean;
  suppressScrollOnNewData?: boolean;

  // 回调
  onGridReady?: (event: GridReadyEvent) => void;
  onRowDataUpdated?: (event: RowDataUpdatedEvent) => void;
  onSelectionChanged?: (event: SelectionChangedEvent) => void;
  onCellValueChanged?: (event: CellValueChangedEvent) => void;
}

export type RowModelType = 'clientSide' | 'serverSide' | 'infinite' | 'viewport';

export type RowSelectionType = 'single' | 'multiple' | ((params: IsRowSelectableParams) => boolean);

export type DomLayoutType = 'normal' | 'autoHeight' | 'print';

export type MultiSortKeyType = 'ctrl' | 'ctrlCmd';

export type SortDirection = 'asc' | 'desc';

export interface GetRowIdParams {
  data: any;
  index: number;
}

export interface GetRowHeightParams {
  data: any;
  node: IRowNode;
  index: number;
}

export interface GetRowStyleParams {
  data: any;
  node: IRowNode;
  index: number;
}

export interface GetRowClassParams {
  data: any;
  node: IRowNode;
  index: number;
}

export interface IsRowSelectableParams {
  node: IRowNode;
  data: any;
}

export interface DoesExternalFilterPassParams {
  node: IRowNode;
  data: any;
}

export interface StatusBarDef {
  statusPanels: StatusPanelDef[];
}

export interface StatusPanelDef {
  statusPanel: string;
  align: string;
  key: string;
}

export interface SideBarDef {
  toolPanels: ToolPanelDef[];
  defaultToolPanel: string;
}

export interface ToolPanelDef {
  id: string;
  labelDefault: string;
  labelKey: string;
  iconKey: string;
  toolPanel: string;
}

export interface RowDataAsyncParams {
  successCallback: (rowData: any[]) => void;
  failCallback: () => void;
  reject?: () => void;
}

export interface SortModelItem {
  colId: string;
  sort: SortDirection;
  index?: number;
}

export interface FilterModel {
  [field: string]: {
    filterType: string;
    type: string;
    filter?: string | number;
    filterTo?: string | number;
    values?: any[];
    dateFrom?: string;
    dateTo?: string;
  };
}

// ============ Grid API ============

export interface GridApi {
  // 数据
  setRowData(rowData: any[]): void;
  getDisplayedRowCount(): number;
  getDisplayedRows(): any[];
  forEachNode(callback: (node: IRowNode, index: number) => void): void;
  getRowNode(id: string): IRowNode | undefined;

  // 选择
  selectAll(): void;
  deselectAll(): void;
  selectNode(node: IRowNode, clearSelection?: boolean): void;
  deselectNode(node: IRowNode): void;
  getSelectedNodes(): IRowNode[];
  getSelectedRows(): any[];
  getSelectedRowNodes(): IRowNode[];

  // 排序
  setSortModel(model: SortModelItem[]): void;
  getSortModel(): SortModelItem[];
  sortByColumn(column: ColDef, sortDirection?: SortDirection): void;
  setSort(field: string, direction: SortDirection | null): void;
  clearSort(): void;

  // 筛选
  setFilterModel(model: FilterModel): void;
  getFilterModel(): FilterModel;
  onFilterChanged(): void;

  // 刷新
  refreshCells(params?: RefreshCellsParams): void;
  redrawRows(params?: RedrawRowsParams): void;
  sizeColumnsToFit(): void;
  resetColumnState(): void;

  // 滚动
  ensureIndexVisible(index: number, align?: string): void;
  ensureNodeVisible(node: IRowNode, align?: string): void;

  // 导出
  exportDataAsCsv(params?: CsvExportParams): string;
  getDataAsCsv(params?: CsvExportParams): string;

  // 列操作
  getColumnDef(colId: string): ColDef | null;
  getAllColumnDefs(): ColDef[];
  sizeColumnsToFit(): void;
}

export interface RowDataTransaction {
  add?: any[];
  remove?: any[];
  update?: any[];
}

export interface RowNodeTransaction {
  add?: IRowNode[];
  remove?: IRowNode[];
  update?: IRowNode[];
}

export interface RefreshCellsParams {
  rowNodes?: IRowNode[];
  columns?: string[];
  force?: boolean;
}

export interface RedrawRowsParams {
  rowNodes?: IRowNode[];
}

export interface SetFocusedCellParams {
  rowIndex: number;
  colId: string;
  floating?: string;
}

export interface RangeSelection {
  start: { rowIndex: number; columnId: string };
  end: { rowIndex: number; columnId: string };
}

export interface AddRangeSelectionParams {
  rowStart: number;
  rowEnd: number;
  columnStart: string;
  columnEnd: string;
}

export interface CsvExportParams {
  fileName?: string;
  columnKeys?: string[];
  skipRows?: number;
  skipColumns?: number;
  allColumns?: boolean;
  onlySelected?: boolean;
  onlySelectedAllPages?: boolean;
  filePrefix?: string;
  suffix?: string;
  columnSeparator?: string;
  customHeader?: string;
  customFooter?: string;
}

export interface ExcelExportParams {
  fileName?: string;
  sheetName?: string;
}

export interface IFilterComp {
  isFilterActive(): boolean;
  doesFilterPass(params: DoesExternalFilterPassParams): boolean;
  getModel(): any;
  setModel(model: any): void | Promise<void>;
  onFilterChanged(): void;
  onNewRowsLoaded(): void;
  destroy(): void;
}

// ============ 事件 ============

export interface BaseEvent {
  type: string;
  api?: GridApi;
  columnApi?: any;
}

export interface RowEvent extends BaseEvent {
  data: any;
  node: IRowNode;
  rowIndex: number | null;
  event?: Event;
  api: GridApi;
}

export interface CellEvent extends RowEvent {
  colDef: ColDef;
  column: ColDef;
  value: any;
  oldValue?: any;
  newValue?: any;
}

export interface ColumnEvent extends BaseEvent {
  colDef: ColDef;
  column: ColDef;
  source: string;
  columns: ColDef[];
}

export interface GridReadyEvent extends BaseEvent {
  api: GridApi;
  columnApi: any;
}

export interface RowDataUpdatedEvent extends BaseEvent {
  api: GridApi;
}

export interface ModelUpdatedEvent extends BaseEvent {
  api: GridApi;
  keepScrollPosition?: boolean;
}

export interface RowClickedEvent extends RowEvent {}

export interface RowDoubleClickedEvent extends RowEvent {}

export interface RowSelectedEvent extends RowEvent {}

export interface SelectionChangedEvent extends BaseEvent {
  source: string;
  api: GridApi;
}

export interface SortChangedEvent extends ColumnEvent {}

export interface FilterChangedEvent extends BaseEvent {
  api: GridApi;
}

export interface FilterOpenedEvent extends ColumnEvent {
  filterInstance: IFilterComp;
  event: Event;
}

export interface CellValueChangedEvent extends CellEvent {}

export interface CellClickedEvent extends CellEvent {}

export interface CellDoubleClickedEvent extends CellEvent {}

export interface CellFocusedEvent extends BaseEvent {
  rowIndex: number;
  columnId: string;
  floating: string | null;
  force: boolean;
}

export interface ColumnResizedEvent extends ColumnEvent {
  width: number;
  finished: boolean;
  source: string;
}

export interface ColumnMovedEvent extends ColumnEvent {}

export interface ColumnVisibleEvent extends ColumnEvent {}

export interface PaginationChangedEvent extends BaseEvent {
  type: string;
  newPage: number;
  allPages: boolean;
}

export interface RowDragEvent extends RowEvent {
  vDir: string;
  hDir: string;
  dragStartX: number;
  dragStartY: number;
}

export interface GridEvent extends BaseEvent {}

// ============ 行节点 ============

export interface IRowNode {
  id: string;
  data: any;
  rowIndex: number | null;
  uiLevel: number;

  // 选择状态
  selected?: boolean;
  isSelected?: () => boolean;
  setSelected?: (value: boolean, clearSelection?: boolean) => void;

  // 行操作
  setData(data: any): void;
  updateData(data: any): void;
  setRowHeight(height: number): void;
  resetRowHeight(): void;
  getRowTop(): number;
  getRowHeight(): number;

  // 父子关系
  allChildrenCount: number;
  childrenAfterFilter: IRowNode[];
  childrenAfterGroup: IRowNode[];
  childrenAfterSort: IRowNode[];
  field: string;
  firstChild: boolean;
  group: boolean;
  groupData: Record<string, any>;
  key: string;
  lastChild: boolean;
  level: number;
  parent: IRowNode | null;
  rowGroupIndex: number | null;
  siblingGroups: IRowNode[];
  allGroups: IRowNode[];
  childIndex: number;

  // 浮动行
  floating: 'top' | 'bottom' | null;
  isFloating(): boolean;

  // 编辑状态
  isEditing: boolean;
  hasEditPermission: boolean;

  // 事件
  addEventListener(eventType: string, listener: (event: any) => void): void;
  removeEventListener(eventType: string, listener: (event: any) => void): void;
  dispatchEvent(event: any): void;

  // 搜索
  depthFirstSearch(callback: (node: IRowNode) => void): void;
  breadthFirstSearch(callback: (node: IRowNode) => void): void;

  // 克隆
  clone(): IRowNode;
}

export { RowNode, createEmptyRowNode } from './row-node';
