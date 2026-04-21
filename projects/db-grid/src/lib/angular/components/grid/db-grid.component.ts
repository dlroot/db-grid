/**
 * Grid 主组件
 * 核心入口组件
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  SimpleChanges,
  ElementRef,
  ViewChild,
  NgZone,
  Inject,
  PLATFORM_ID,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subject, fromEvent, debounceTime, takeUntil } from 'rxjs';

import {
  ColDef,
  GridOptions,
  GridReadyEvent,
  RowDataUpdatedEvent,
  ModelUpdatedEvent,
  RowClickedEvent,
  RowDoubleClickedEvent,
  CellClickedEvent,
  CellDoubleClickedEvent,
  SortChangedEvent,
  FilterChangedEvent,
  SelectionChangedEvent,
  ColumnResizedEvent,
} from '../../../core/models';

import {
  DataService,
  ColumnService,
  SelectionService,
  TreeService,
  GroupService,
  ExcelExportService,
  CellSpanService,
  CellEditService,
  ColumnPinningService,
  PaginationService,
  ContextMenuService,
  DragDropService,
  FilterService,
  EditorService,
  TreeNodeConfig,
  GroupConfig,
  CellDataTypeService,
  KeyboardNavigationService,
} from '../../../core/services';

import { DbCellEditorComponent } from '../cell-editor/db-cell-editor.component';
import { DbFilterPopupComponent } from '../filter-popup/db-filter-popup.component';

import {
  CellRendererService,
  RowRendererService,
  HeaderRendererService,
} from '../../../core/rendering';

@Component({
  selector: 'db-grid',
  standalone: true,
  imports: [CommonModule, DbCellEditorComponent, DbFilterPopupComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #gridContainer class="db-grid-container" [class]="themeClass()" (keydown)="onKeyDown($event)"
         tabindex="0" style="outline: none;">
      <div #headerContainer class="db-grid-header-container"></div>
      <div #bodyContainer class="db-grid-body-container" (scroll)="onScroll($event)">
        <div #virtualScroll class="db-grid-virtual-scroll">
          <div #rowsContainer class="db-grid-rows"></div>
        </div>
      </div>
      <div #footerContainer class="db-grid-footer-container"></div>
      @if (loading) {
        <div class="db-grid-overlay">
          <div class="db-grid-overlay-content">
            <span class="db-grid-spinner">⟳</span>
            <span>{{ loadingMessage || '加载中...' }}</span>
          </div>
        </div>
      }
      @if (!loading && rowCount() === 0) {
        <div class="db-grid-no-rows">{{ noRowsMessage || '暂无数据' }}</div>
      }

      <!-- 筛选器弹出层 -->
      @if (activeFilterPopup) {
        <div class="db-filter-popup-wrapper">
          <db-filter-popup
            [colDef]="activeFilterPopup.colDef"
            [rowData]="rowData"
            (filterApplied)="onFilterApplied($event)"
            (filterClosed)="closeFilterPopup()">
          </db-filter-popup>
        </div>
      }

      <!-- 单元格编辑器 -->
      @if (activeCellEditor) {
        <db-cell-editor
          [value]="activeCellEditor.value"
          [editorType]="activeCellEditor.editorType"
          [editorParams]="activeCellEditor.editorParams"
          (valueChange)="onEditorValueChange($event)"
          (editingStopped)="onEditorStopped($event)"
          (navigate)="onEditorNavigate($event)">
        </db-cell-editor>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .db-grid-container {
      display: flex; flex-direction: column;
      width: 100%; height: 100%;
      position: relative; overflow: hidden;
      border: 1px solid var(--db-grid-border-color, #ddd);
      border-radius: 4px;
      background: var(--db-grid-bg, #fff);
      font-family: var(--db-grid-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      font-size: var(--db-grid-font-size, 14px);
    }
    .db-grid-header-container { flex-shrink: 0; overflow: hidden; }
    .db-grid-body-container { flex: 1; overflow: auto; position: relative; }
    .db-grid-virtual-scroll { position: relative; width: 100%; }
    .db-grid-rows { display: flex; flex-direction: column; position: absolute; left: 0; right: 0; }
    .db-grid-footer-container { flex-shrink: 0; border-top: 1px solid var(--db-grid-border-color, #ddd); }
    .db-grid-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255, 255, 255, 0.8);
      display: flex; align-items: center; justify-content: center; z-index: 10;
    }
    .db-grid-overlay-content { display: flex; align-items: center; gap: 8px; }
    .db-grid-spinner { font-size: 20px; animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .db-grid-no-rows {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      color: var(--db-grid-text-secondary, #999); text-align: center; padding: 20px;
    }
    .db-filter-popup-wrapper {
      position: absolute;
      z-index: 100;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    /* ========== Keyboard Focus Styles ========== */
    .db-grid-cell-focused {
      background: var(--db-grid-range-selection-background, rgba(33, 150, 243, 0.15)) !important;
      outline: 2px solid var(--db-grid-range-selection-border-color, #2196f3);
      outline-offset: -2px;
    }
    .db-grid-cell-focused.db-grid-cell-editing {
      outline: 2px solid var(--db-grid-cell-editing-border-color, #ff9800);
      background: rgba(255, 152, 0, 0.08);
    }
    :host(:focus) { outline: none; }
  `],
})
export class DbGridComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  // ============ Inputs ============
  @Input() columnDefs: ColDef[] = [];
  @Input() rowData: any[] = [];
  @Input() gridOptions: GridOptions = {};
  @Input() theme: 'alpine' | 'balham' | 'material' | 'custom' = 'alpine';
  @Input() rowHeight: number = 40;
  @Input() headerHeight: number = 40;
  @Input() loading: boolean = false;
  @Input() loadingMessage: string = '';
  @Input() noRowsMessage: string = '';
  @Input() animateRows: boolean = false;
  @Input() suppressVirtualScroll: boolean = false;
  @Input() getRowId: ((data: any) => string) | undefined;

  // ============ Tree Data Inputs ============
  /** 启用树形数据模式 */
  @Input() treeData: boolean = false;
  /** 树形数据配置 */
  @Input() treeConfig: TreeNodeConfig | null = null;

  // ============ Grouping Inputs ============
  /** 启用行分组 */
  @Input() enableGrouping: boolean = false;
  /** 分组配置 */
  @Input() groupConfig: GroupConfig | null = null;

  // ============ Outputs ============
  @Output() gridReady = new EventEmitter<GridReadyEvent>();
  @Output() rowDataUpdated = new EventEmitter<RowDataUpdatedEvent>();
  @Output() modelUpdated = new EventEmitter<ModelUpdatedEvent>();
  @Output() rowClicked = new EventEmitter<RowClickedEvent>();
  @Output() rowDoubleClicked = new EventEmitter<RowDoubleClickedEvent>();
  @Output() cellClicked = new EventEmitter<CellClickedEvent>();
  @Output() cellDoubleClicked = new EventEmitter<CellDoubleClickedEvent>();
  @Output() sortChanged = new EventEmitter<SortChangedEvent>();
  @Output() filterChanged = new EventEmitter<FilterChangedEvent>();
  @Output() selectionChanged = new EventEmitter<SelectionChangedEvent>();
  @Output() columnResized = new EventEmitter<ColumnResizedEvent>();
  @Output() nodeExpanded = new EventEmitter<any>();
  @Output() nodeCollapsed = new EventEmitter<any>();
  @Output() groupExpanded = new EventEmitter<any>();
  @Output() groupCollapsed = new EventEmitter<any>();

  // ============ 编辑 Inputs ============
  @Input() enableCellEdit: boolean = false;
  @Input() editOnDoubleClick: boolean = true;
  @Input() editOnClick: boolean = false;
  @Input() singleClickEdit: boolean = false;

  // ============ 列固定 Inputs ============
  @Input() pinnedLeftColumns: string[] = [];
  @Input() pinnedRightColumns: string[] = [];

  // ============ 分页 Inputs ============
  @Input() pagination: boolean = false;
  @Input() paginationPageSize: number = 20;
  @Input() paginationPageSizeOptions: number[] = [10, 20, 50, 100];

  // ============ 拖拽排序 Inputs ============
  @Input() rowDragEnabled: boolean = false;
  @Input() colDragEnabled: boolean = false;

  // ============ ViewChild ============
  @ViewChild('gridContainer') gridContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('headerContainer') headerContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('bodyContainer') bodyContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('virtualScroll') virtualScroll!: ElementRef<HTMLDivElement>;
  @ViewChild('rowsContainer') rowsContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('footerContainer') footerContainer!: ElementRef<HTMLDivElement>;

  // ============ Signals ============
  rowCount = signal(0);
  viewportInfo = signal<{ startIndex: number; endIndex: number; offsetY: number }>({
    startIndex: 0, endIndex: 0, offsetY: 0,
  });
  themeClass = computed(() => `db-grid-theme-${this.theme}`);

  // ============ Services ============
  private dataService: DataService;
  private columnService: ColumnService;
  private selectionService: SelectionService;
  private treeService: TreeService;
  private groupService: GroupService;
  private excelExportService: ExcelExportService;
  private cellSpanService: CellSpanService;
  private cellRenderer: CellRendererService;
  private rowRenderer: RowRendererService;
  private headerRenderer: HeaderRendererService;

  // ============ 新增服务 ============
  private cellEditService: CellEditService;
  private pinningService: ColumnPinningService;
  private paginationService: PaginationService;
  private contextMenuService: ContextMenuService;
  private dragDropService: DragDropService;
  private filterService: FilterService;
  private editorService: EditorService;
  private cellDataTypeService: CellDataTypeService;
  private keyboardNavigationService: KeyboardNavigationService;
  private _dataTypesApplied = false;

  // ============ State ============
  private destroy$ = new Subject<void>();
  private scrollTop = 0;
  private isDestroyed = false;
  private gridApi: any = null;
  private isTreeMode = false;
  private isGroupMode = false;
  private isPaginated = false;

  // ============ Filter Popup State ============
  activeFilterPopup: { colDef: ColDef; position: { x: number; y: number } } | null = null;

  // ============ Cell Editor State ============
  activeCellEditor: {
    value: any;
    editorType: any;
    editorParams: any;
  } | null = null;

  constructor(
    private elementRef: ElementRef,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    // 核心服务
    this.dataService = new DataService();
    this.columnService = new ColumnService();
    this.selectionService = new SelectionService();
    this.treeService = new TreeService();
    this.groupService = new GroupService();
    this.excelExportService = new ExcelExportService();
    this.cellSpanService = new CellSpanService();
    this.cellRenderer = new CellRendererService();
    this.rowRenderer = new RowRendererService(this.cellRenderer, this.columnService);
    this.headerRenderer = new HeaderRendererService(this.columnService);

    // 新增服务
    this.cellEditService = new CellEditService();
    this.pinningService = new ColumnPinningService();
    this.paginationService = new PaginationService();
    this.contextMenuService = new ContextMenuService();
    this.dragDropService = new DragDropService();
    this.filterService = new FilterService();
    this.editorService = new EditorService();
    this.cellDataTypeService = new CellDataTypeService();
    this.keyboardNavigationService = new KeyboardNavigationService();
  }

  // ============ Lifecycle ============

  ngOnInit(): void {
    // 初始化列服务
    this.columnService.initialize(this.columnDefs);
    this.dataService.setScrollConfig({ rowHeight: this.rowHeight, viewportHeight: 400, bufferSize: 5 });
    // 注入筛选服务（支持列筛选 + 快速筛选）
    this.dataService.setFilterService(this.filterService);

    // 自动推断列数据类型（Cell Data Types）
    if (this.rowData && this.rowData.length > 0) {
      this.cellDataTypeService.applyAutoTypes(this.columnDefs, this.rowData, this.gridOptions);
      // 重新初始化列服务（类型推断可能修改了 columnDefs）
      this.columnService.initialize(this.columnDefs);
    }

    // 初始化选择服务
    const rowSelection = this.gridOptions.rowSelection;
    this.selectionService.initialize({ mode: rowSelection as any, multiSortKey: this.gridOptions.multiSortKey === 'ctrl' });

    // 选择事件
    this.selectionService.setOnSelectionChanged((event) => {
      this.ngZone.run(() => this.selectionChanged.emit({ type: 'selectionChanged', source: 'api', api: this.gridApi }));
    });

    // 树形数据事件
    this.treeService.setOnExpandChange((event) => {
      this.ngZone.run(() => {
        if (event.type === 'expand') this.nodeExpanded.emit({ type: 'nodeExpanded', node: event.node, nodes: event.nodes });
        else this.nodeCollapsed.emit({ type: 'nodeCollapsed', node: event.node, nodes: event.nodes });
        this.refreshView();
      });
    });

    // 分组事件
    this.groupService.setOnGroupChange((event) => {
      this.ngZone.run(() => {
        if (event.type === 'groupOpened') this.groupExpanded.emit({ type: 'groupExpanded', node: event.groupNode });
        else if (event.type === 'groupClosed') this.groupCollapsed.emit({ type: 'groupCollapsed', node: event.groupNode });
        this.refreshView();
      });
    });

    // 初始化编辑服务
    this.cellEditService.initialize({
      enableCellEdit: this.enableCellEdit,
      editOnDoubleClick: this.editOnDoubleClick,
      editOnClick: this.editOnClick,
      singleClickEdit: this.singleClickEdit,
    });

    // 初始化列固定服务
    this.pinningService.initialize(this.columnDefs, {
      pinnedLeftColumns: this.pinnedLeftColumns,
      pinnedRightColumns: this.pinnedRightColumns,
    });

    // 初始化分页服务
    this.paginationService.initialize({
      pageSize: this.paginationPageSize,
      pageSizeOptions: this.paginationPageSizeOptions,
    });
    this.paginationService.onPageChanged((info) => {
      this.ngZone.run(() => this.refreshView());
    });

    // 初始化右键菜单服务
    this.contextMenuService.initialize(this.contextMenuService.getDefaultMenuItems('grid'));

    // 初始化拖拽服务
    this.dragDropService.initialize({
      rowDragEnabled: this.rowDragEnabled,
      colDragEnabled: this.colDragEnabled,
    });

    this.rowCount.set(this.dataService.getRowCount());
    this.createGridApi();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rowData'] && !changes['rowData'].firstChange) {
      this.setRowData(changes['rowData'].currentValue);
    }
    if (changes['columnDefs'] && !changes['columnDefs'].firstChange) {
      this.columnService.initialize(changes['columnDefs'].currentValue);
      this.refreshHeader();
    }
    // 编辑配置变更
    if (changes['enableCellEdit'] && !changes['enableCellEdit'].firstChange) {
      this.cellEditService.initialize({
        enableCellEdit: this.enableCellEdit,
        editOnDoubleClick: this.editOnDoubleClick,
        editOnClick: this.editOnClick,
      });
    }
    // 列固定配置变更
    if (changes['pinnedLeftColumns'] || changes['pinnedRightColumns']) {
      this.pinningService.initialize(this.columnDefs, {
        pinnedLeftColumns: this.pinnedLeftColumns,
        pinnedRightColumns: this.pinnedRightColumns,
      });
      this.refreshHeader();
    }
    // 分页配置变更
    if (changes['pagination'] || changes['paginationPageSize']) {
      if (this.pagination) {
        this.isPaginated = true;
        this.paginationService.setPageSize(this.paginationPageSize);
      } else {
        this.isPaginated = false;
      }
      this.refreshView();
    }
    // 拖拽配置变更
    if (changes['rowDragEnabled'] || changes['colDragEnabled']) {
      this.dragDropService.initialize({
        rowDragEnabled: this.rowDragEnabled,
        colDragEnabled: this.colDragEnabled,
      });
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const bodyHeight = this.bodyContainer.nativeElement.clientHeight;
    this.dataService.setScrollConfig({ viewportHeight: bodyHeight, rowHeight: this.rowHeight });
    
    // 初始化数据（首次渲染时 rowData 已传入但 ngOnChanges 不会触发 firstChange）
    if (this.rowData && this.rowData.length > 0) {
      this.setRowData(this.rowData);
    }
    
    this.renderHeader();
    this.renderRows();

    // ========== 初始化 Keyboard Navigation Service ==========
    if (this.gridContainer?.nativeElement) {
      this.keyboardNavigationService.setGrid(
        this.gridApi,
        this.gridContainer.nativeElement,
        this.columnService,
        this.rowRenderer
      );
      this.keyboardNavigationService.setRowHeight(this.rowHeight);
      // 订阅焦点变化事件
      this.keyboardNavigationService.onFocusChange.subscribe(event => {
        this.ngZone.run(() => this.onFocusChanged(event.current));
      });
      // 订阅编辑事件
      this.keyboardNavigationService.onCellEditStart.subscribe(pos => {
        this.ngZone.run(() => this.startEditingCell(pos.rowIndex, pos.colId));
      });
      this.keyboardNavigationService.onCellEditStop.subscribe(() => {
        this.ngZone.run(() => this.stopEditingCell(true));
      });
      // 默认聚焦第一个单元格
      setTimeout(() => this.keyboardNavigationService.focusFirstCell(), 0);
    }

    this.ngZone.runOutsideAngular(() => {
      fromEvent(window, 'resize')
        .pipe(debounceTime(100), takeUntil(this.destroy$))
        .subscribe(() => this.onWindowResize());
    });

    this.ngZone.run(() => {
      this.gridReady.emit({ type: 'gridReady', api: this.gridApi, columnApi: null });
    });
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
    // 核心服务
    this.cellRenderer.destroy();
    this.rowRenderer.destroy();
    this.headerRenderer.destroy();
    this.treeService.destroy();
    this.groupService.destroy();
    this.cellSpanService.destroy();
    // 新增服务
    this.cellEditService.destroy();
    this.pinningService.destroy();
    this.paginationService.destroy();
    this.contextMenuService.destroy();
    this.dragDropService.destroy();
  }

  // ============ Grid API ============

  private createGridApi(): void {
    this.gridApi = {
      // ========== 数据操作 ==========
      setRowData: (rowData: any[]) => this.setRowData(rowData),
      getRowData: () => this.getRowData(),
      setGridOption: (key: string, value: any) => this.setGridOption(key, value),
      getGridOption: (key: string) => this.getGridOption(key),

      // ========== 选择 ==========
      selectAll: () => this.selectAll(),
      deselectAll: () => this.deselectAll(),
      selectNode: (node: any, clearSelection?: boolean) => this.selectNode(node, clearSelection),
      deselectNode: (node: any) => this.deselectNode(node),
      getSelectedNodes: () => this.getSelectedNodes(),
      getSelectedRows: () => this.getSelectedRows(),
      getSelectedRowNodes: () => this.getSelectedRowNodes(),

      // ========== 排序 ==========
      sortByColumn: (colDef: ColDef, sortDirection?: 'asc' | 'desc') => this.sortByColumn(colDef, sortDirection),
      setSort: (field: string, direction: 'asc' | 'desc' | null) => this.setSort(field, direction),
      clearSort: () => this.clearSort(),

      // ========== 筛选 ==========
      setFilterModel: (model: Record<string, any>) => this.setFilterModel(model),
      getFilterModel: () => this.getFilterModel(),
      setQuickFilter: (text: string) => this.setQuickFilter(text),
      getQuickFilter: () => this.getQuickFilter(),
      clearQuickFilter: () => this.clearQuickFilter(),

      // ========== 视图 ==========
      refreshCells: (params?: any) => this.refreshCells(params),
      redrawRows: (params?: any) => this.refreshRows(params),
      sizeColumnsToFit: () => this.sizeColumnsToFit(),
      resetColumnState: () => this.resetColumnState(),

      // ========== 行 ==========
      getDisplayedRowCount: () => this.rowCount(),
      getDisplayedRows: () => this.getDisplayedRows(),
      getRowNode: (id: string) => this.dataService.getRowNode(id),
      forEachNode: (callback: (node: any) => void) => this.forEachNode(callback),

      // ========== 滚动 ==========
      ensureIndexVisible: (index: number, align?: string) => this.ensureIndexVisible(index, align),
      ensureNodeVisible: (node: any, align?: string) => this.ensureNodeVisible(node, align),

      // ========== 树形数据 ==========
      expandNode: (nodeId: string) => this.expandNode(nodeId),
      collapseNode: (nodeId: string) => this.collapseNode(nodeId),
      toggleNode: (nodeId: string) => this.toggleNode(nodeId),
      expandAll: () => this.expandAllNodes(),
      collapseAll: () => this.collapseAllNodes(),
      isNodeExpanded: (nodeId: string) => this.isNodeExpanded(nodeId),
      getNodeLevel: (nodeId: string) => this.getNodeLevel(nodeId),
      getTreeDataService: () => this.treeService,

      // ========== 行分组 ==========
      setRowGroupColumns: (fields: string[]) => this.setRowGroupColumns(fields),
      removeRowGroupColumns: (fields?: string[]) => this.removeRowGroupColumns(fields),
      expandGroup: (nodeId: string) => this.expandGroup(nodeId),
      collapseGroup: (nodeId: string) => this.collapseGroup(nodeId),
      toggleGroup: (nodeId: string) => this.toggleGroup(nodeId),
      expandAllGroups: () => this.expandAllGroups(),
      collapseAllGroups: () => this.collapseAllGroups(),
      getGroupService: () => this.groupService,

      // ========== 单元格合并 ==========
      getCellSpan: (rowIndex: number, colId: string) => this.getCellSpan(rowIndex, colId),
      setCellSpan: (rowIndex: number, colId: string, colspan: number, rowspan: number) => this.setCellSpan(rowIndex, colId, colspan, rowspan),
      getCellSpanService: () => this.cellSpanService,
      getAllSpans: () => this.cellSpanService.getAllSpans(),

      // ========== Cell Data Types ==========
      getCellDataTypeService: () => this.cellDataTypeService,
      getKeyboardNavigationService: () => this.keyboardNavigationService,

      // ========== Excel 导出 ==========
      exportDataAsCsv: (params?: any) => this.exportDataAsCsv(params),
      downloadExcel: (options?: any) => this.downloadExcel(options),
      importCsv: (csvText: string, options?: any) => this.importCsv(csvText, options),

      // ========== 单元格编辑 ==========
      startCellEdit: (rowIndex: number, colId: string) => this.startCellEdit(rowIndex, colId),
      stopCellEdit: (cancel?: boolean) => this.stopCellEdit(cancel),
      getCellEditor: () => this.cellEditService,
      isCellEditing: () => this.isCellEditing(),

      // ========== 列固定 ==========
      pinColumn: (colId: string, side: 'left' | 'right') => this.pinColumn(colId, side),
      unpinColumn: (colId: string) => this.unpinColumn(colId),
      getPinnedColumns: () => this.getPinnedColumns(),
      getPinningService: () => this.pinningService,

      // ========== 分页 ==========
      setPageSize: (size: number) => this.setPageSize(size),
      setCurrentPage: (page: number) => this.setCurrentPage(page),
      getCurrentPage: () => this.getCurrentPage(),
      getTotalPages: () => this.getTotalPages(),
      nextPage: () => this.nextPage(),
      previousPage: () => this.previousPage(),
      firstPage: () => this.firstPage(),
      lastPage: () => this.lastPage(),
      getPaginationInfo: () => this.getPaginationInfo(),

      // ========== 右键菜单 ==========
      showContextMenu: (position: any, context: any) => this.showContextMenu(position, context),
      hideContextMenu: () => this.hideContextMenu(),
      getContextMenuService: () => this.contextMenuService,

      // ========== 拖拽排序 ==========
      startDrag: (rowNodes: any[], event: MouseEvent) => this.startDrag(rowNodes, event),
      endDrag: (targetIndex: number, event: MouseEvent) => this.endDrag(targetIndex, event),
      getDragDropService: () => this.dragDropService,

      // ========== 刷新 ==========
      refreshView: () => this.refreshView(),
    };
  }

  // ============ 实现 ============

  // --- 数据 ---
  setRowData(rowData: any[]): void {
    // 首次加载数据时自动推断列类型
    if (rowData && rowData.length > 0 && !this._dataTypesApplied) {
      this.cellDataTypeService.applyAutoTypes(this.columnDefs, rowData, this.gridOptions);
      this._dataTypesApplied = true;
    }

    // 更新分页服务的总行数
    if (this.pagination) {
      this.paginationService.setTotalRows(rowData.length);
    }

    if (this.treeData && this.treeConfig) {
      this.isTreeMode = true;
      this.treeService.initialize(rowData, this.treeConfig);
      this.dataService.initialize(this.treeService.getFlattenedNodes().map(n => n.data), this.gridOptions, this.columnDefs);
      this.rowCount.set(this.treeService.getDisplayCount());
    } else if (this.enableGrouping && this.groupConfig) {
      this.isGroupMode = true;
      this.groupService.initialize(rowData, this.groupConfig);
      const result = this.groupService.getResult();
      // 合并分组列
      if (result.groupColumnDefs.length > 0) {
        const existingIds = this.columnDefs.map(c => c.colId);
        const newCols = result.groupColumnDefs.filter(c => !existingIds.includes(c.colId!));
        this.columnDefs = [...result.groupColumnDefs, ...this.columnDefs];
        this.columnService.initialize(this.columnDefs);
      }
      this.dataService.initialize(result.flatNodes.map(n => n.data), this.gridOptions, this.columnDefs);
      this.rowCount.set(this.groupService.getFlattenedNodes().length);
    } else {
      this.isTreeMode = false;
      this.isGroupMode = false;
      this.dataService.initialize(rowData, this.gridOptions, this.columnDefs);
      this.rowCount.set(this.dataService.getRowCount());
    }
    this.refreshView();
    this.rowDataUpdated.emit({ type: 'rowDataUpdated', api: this.gridApi });
  }

  getRowData(): any[] {
    if (this.isTreeMode) return this.treeService.getRootNodes().map(n => n.data);
    if (this.isGroupMode) return this.groupService['originalRowData'];
    // Fallback: iterate through all rows
    const rows: any[] = [];
    const count = this.dataService.getRowCount();
    for (let i = 0; i < count; i++) {
      const data = this.dataService.getRowData(i);
      if (data) rows.push(data);
    }
    return rows;
  }

  // --- 排序 ---
  sortByColumn(colDef: ColDef, sortDirection?: 'asc' | 'desc'): void {
    const direction = sortDirection || (colDef.sort === 'asc' ? 'desc' : 'asc');
    colDef.sort = direction;
    this.dataService.sort(this.columnDefs);
    this.refreshView();
    this.sortChanged.emit({ type: 'sortChanged', colDef, column: colDef, columns: this.columnDefs, source: 'api', api: this.gridApi });
  }

  setSort(field: string, direction: 'asc' | 'desc' | null): void {
    const colDef = this.columnDefs.find(c => c.field === field);
    if (colDef) { colDef.sort = direction; this.dataService.sort(this.columnDefs); this.refreshView(); }
  }

  clearSort(): void { this.columnDefs.forEach(c => c.sort = undefined); this.dataService.sort(this.columnDefs); this.refreshView(); }

  // --- 筛选 ---
  setFilterModel(model: Record<string, any>): void {
    this.filterService.setFilterModel(model);
    this.refreshView();
    this.filterChanged.emit({ type: 'filterChanged', api: this.gridApi });
  }

  getFilterModel(): Record<string, any> {
    return this.filterService.getFilterModel();
  }

  setQuickFilter(text: string): void {
    this.filterService.setQuickFilter(text);
    this.refreshView();
    this.filterChanged.emit({ type: 'filterChanged', api: this.gridApi });
  }

  getQuickFilter(): string {
    return this.filterService.getQuickFilter();
  }

  clearQuickFilter(): void {
    this.filterService.setQuickFilter('');
    this.refreshView();
    this.filterChanged.emit({ type: 'filterChanged', api: this.gridApi });
  }

  // --- 视图 ---
  refreshCells(params?: any): void { this.renderRows(); }
  refreshRows(params?: any): void { this.refreshView(); }
  refreshView(): void {
    this.rowCount.set(this.dataService.getRowCount());
    this.viewportInfo.set(this.dataService.getViewportInfo());
    this.renderRows();
  }

  sizeColumnsToFit(): void {
    const bodyWidth = this.bodyContainer.nativeElement.clientWidth;
    const visibleColumns = this.columnService.getVisibleColumns();
    const totalWidth = this.columnService.getTotalWidth();
    if (totalWidth === 0) return;
    const scale = bodyWidth / totalWidth;
    visibleColumns.forEach(colDef => { colDef.width = Math.floor((colDef.width || 200) * scale); });
    this.refreshHeader();
  }

  resetColumnState(): void { this.columnService.resetColumnState(); this.refreshHeader(); }

  // --- 行 ---
  getDisplayedRows(): any[] {
    const rows: any[] = [];
    for (let i = 0; i < this.dataService.getRowCount(); i++) {
      const data = this.dataService.getRowData(i);
      if (data) rows.push(data);
    }
    return rows;
  }

  forEachNode(callback: (node: any) => void): void {
    for (let i = 0; i < this.dataService.getRowCount(); i++) {
      const node = this.dataService.getRowNode(`row-${i}`);
      if (node) callback(node);
    }
  }

  // --- 滚动 ---
  ensureIndexVisible(index: number, align: string = 'auto'): void {
    const rowHeight = this.dataService.getRowHeight();
    const viewportHeight = this.bodyContainer.nativeElement.clientHeight;
    const currentScrollTop = this.bodyContainer.nativeElement.scrollTop;
    let targetScrollTop: number;

    switch (align) {
      case 'top': targetScrollTop = index * rowHeight; break;
      case 'bottom': targetScrollTop = index * rowHeight - viewportHeight + rowHeight; break;
      case 'middle': targetScrollTop = index * rowHeight - viewportHeight / 2; break;
      default:
        if (currentScrollTop > index * rowHeight) targetScrollTop = index * rowHeight;
        else if (currentScrollTop + viewportHeight < (index + 1) * rowHeight) targetScrollTop = (index + 1) * rowHeight - viewportHeight;
        else return;
    }
    this.bodyContainer.nativeElement.scrollTop = Math.max(0, targetScrollTop);
  }

  ensureNodeVisible(node: any, align: string = 'auto'): void {
    if (node.rowIndex !== undefined) this.ensureIndexVisible(node.rowIndex, align);
  }

  // ========== 树形数据 API ==========

  expandNode(nodeId: string): void { this.treeService.expandNode(nodeId); this.refreshView(); }
  collapseNode(nodeId: string): void { this.treeService.collapseNode(nodeId); this.refreshView(); }
  toggleNode(nodeId: string): void { this.treeService.toggleNode(nodeId); this.refreshView(); }
  expandAllNodes(): void { this.treeService.expandAll(); this.refreshView(); }
  collapseAllNodes(): void { this.treeService.collapseAll(); this.refreshView(); }
  isNodeExpanded(nodeId: string): boolean { const n = this.treeService.getNode(nodeId); return n?.expanded || false; }
  getNodeLevel(nodeId: string): number { const n = this.treeService.getNode(nodeId); return n?.level || 0; }

  // ========== 分组 API ==========

  setRowGroupColumns(fields: string[]): void {
    if (fields.length === 0) return;
    this.enableGrouping = true;
    this.groupConfig = { groupFields: fields, autoCreateGroupColumn: true, expandAll: true };
    this.setRowData(this.getRowData());
  }

  removeRowGroupColumns(fields?: string[]): void {
    this.enableGrouping = false;
    this.isGroupMode = false;
    this.refreshView();
  }

  expandGroup(nodeId: string): void { this.groupService.setGroupExpanded(nodeId, true); this.refreshView(); }
  collapseGroup(nodeId: string): void { this.groupService.setGroupExpanded(nodeId, false); this.refreshView(); }
  toggleGroup(nodeId: string): void { this.groupService.toggleGroup(nodeId); this.refreshView(); }
  expandAllGroups(): void { this.groupService.expandAll(); this.refreshView(); }
  collapseAllGroups(): void { this.groupService.collapseAll(); this.refreshView(); }

  // ========== 单元格合并 API ==========

  getCellSpan(rowIndex: number, colId: string): any { return this.cellSpanService.getSpan(rowIndex, colId); }
  setCellSpan(rowIndex: number, colId: string, colspan: number, rowspan: number): void {
    this.cellSpanService.setManualSpan(rowIndex, colId, colspan, rowspan);
    this.refreshRows(null);
  }

  // ========== Excel 导出 API ==========

  exportDataAsCsv(params?: any): string {
    return this.excelExportService.exportAsCsv(this.columnDefs, this.getDisplayedRows(), params);
  }

  downloadExcel(options?: any): void {
    const exportMode = options?.exportMode || 'csv';
    if (exportMode === 'csv') {
      this.excelExportService.downloadAsCsv(this.columnDefs, this.getDisplayedRows(), options);
    } else {
      this.excelExportService.downloadAsXlsx(this.columnDefs, this.getDisplayedRows(), options);
    }
  }

  importCsv(csvText: string, options?: any): any[] {
    return this.excelExportService.importCsv(csvText, options);
  }

  // ========== 单元格编辑 API ==========

  private editingCell: { rowIndex: number; colId: string; editor: any } | null = null;

  startCellEdit(rowIndex: number, colId: string): void {
    const data = this.dataService.getRowData(rowIndex);
    const colDef = this.columnDefs.find(c => (c.colId || c.field) === colId);
    if (!data || !colDef) return;

    const editorType = colDef.cellEditor || 'text';
    const editors = this.cellEditService.getDefaultEditors();
    const editorFactory = editors[editorType];

    if (editorFactory) {
      const params = { value: data[colDef.field], data, colDef, rowIndex };
      const editor = editorFactory.createEditor(params);
      this.editingCell = { rowIndex, colId, editor };
      this.refreshView();
    }
  }

  stopCellEdit(cancel = false): void {
    if (!this.editingCell) return;

    if (!cancel) {
      const { rowIndex, colId, editor } = this.editingCell;
      const newValue = editor.getValue();
      const data = this.dataService.getRowData(rowIndex);
      const colDef = this.columnDefs.find(c => (c.colId || c.field) === colId);

      if (data && colDef) {
        const oldValue = data[colDef.field];
        data[colDef.field] = newValue;
        this.cellEditService.emitCellValueChanged({ rowIndex, colDef, oldValue, newValue });
      }
    }

    this.editingCell?.editor.destroy();
    this.editingCell = null;
    this.refreshView();
  }

  isCellEditing(): boolean {
    return this.editingCell !== null;
  }

  // ========== 列固定 API ==========

  pinColumn(colId: string, side: 'left' | 'right'): void {
    this.pinningService.pinColumn(colId, side);
    this.refreshHeader();
  }

  unpinColumn(colId: string): void {
    this.pinningService.unpinColumn(colId);
    this.refreshHeader();
  }

  getPinnedColumns(): { left: string[]; right: string[] } {
    return {
      left: this.pinningService.getPinnedLeftIds(),
      right: this.pinningService.getPinnedRightIds(),
    };
  }

  // ========== 分页 API ==========

  setPageSize(size: number): void {
    this.paginationService.setPageSize(size);
    this.refreshView();
  }

  setCurrentPage(page: number): void {
    this.paginationService.goToPage(page);
    this.refreshView();
  }

  getCurrentPage(): number {
    return this.paginationService.getCurrentPage();
  }

  getTotalPages(): number {
    return this.paginationService.getTotalPages();
  }

  nextPage(): void { this.paginationService.nextPage(); this.refreshView(); }
  previousPage(): void { this.paginationService.previousPage(); this.refreshView(); }
  firstPage(): void { this.paginationService.firstPage(); this.refreshView(); }
  lastPage(): void { this.paginationService.lastPage(); this.refreshView(); }

  getPaginationInfo(): any {
    return this.paginationService.getPageInfo();
  }

  // ========== 右键菜单 API ==========

  showContextMenu(position: { x: number; y: number }, context: any): void {
    this.contextMenuService.show(position, context);
  }

  hideContextMenu(): void {
    this.contextMenuService.hide();
  }

  // ========== 拖拽排序 API ==========

  startDrag(rowNodes: any[], event: MouseEvent): void {
    this.dragDropService.startRowDrag(rowNodes, event);
  }

  endDrag(targetIndex: number, event: MouseEvent): void {
    this.dragDropService.endRowDrag(targetIndex, event);
  }

  // ========== 选择 API ==========

  selectAll(): void {
    const nodes: any[] = [];
    this.forEachNode(n => nodes.push(n));
    this.selectionService.selectAll(nodes);
  }

  deselectAll(): void { this.selectionService.clearSelection(); }

  selectNode(node: any, clearSelection = false): void {
    if (clearSelection) this.selectionService.clearSelection();
    this.selectionService.selectNode(node);
  }

  deselectNode(node: any): void { this.selectionService.deselectNode(node); }
  getSelectedNodes(): any[] { return this.selectionService.getSelectedNodes(); }
  getSelectedRows(): any[] { return this.selectionService.getSelectedData(); }
  getSelectedRowNodes(): any[] { return this.selectionService.getSelectedNodes(); }

  setGridOption(key: string, value: any): void {
    (this.gridOptions as any)[key] = value;
    switch (key) {
      case 'rowHeight': this.dataService.setScrollConfig({ rowHeight: value }); this.refreshView(); break;
      case 'rowSelection': this.selectionService.initialize({ mode: value as any }); break;
    }
  }

  getGridOption(key: string): any { return (this.gridOptions as any)[key]; }

  // ============ 渲染方法 ============

  /** 键盘事件处理 */
  onKeyDown(event: KeyboardEvent): void {
    if (!this.keyboardNavigationService) return;
    const result = this.keyboardNavigationService.handleKeyDown(event);
    if (result.consumed) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private refreshHeader(): void { this.renderHeader(); }

  private renderHeader(): void {
    const container = this.headerContainer.nativeElement;
    const { headerElement } = this.headerRenderer.render();
    (headerElement as HTMLElement).style.height = `${this.headerHeight}px`;
    container.innerHTML = '';
    container.appendChild(headerElement);
    headerElement.addEventListener('headerClick', ((e: CustomEvent) => { this.onHeaderClick(e.detail); }) as EventListener);
    headerElement.addEventListener('filterClick', ((e: CustomEvent) => {
      const { colDef, event } = e.detail;
      this.ngZone.run(() => this.openFilterPopup(colDef, event));
    }) as EventListener);
  }

  private renderRows(): void {
    const viewport = this.viewportInfo();
    const rowsContainer = this.rowsContainer.nativeElement;
    const virtualScroll = this.virtualScroll.nativeElement;
    const totalHeight = this.dataService.getTotalHeight();
    virtualScroll.style.height = `${totalHeight}px`;
    rowsContainer.innerHTML = '';
    rowsContainer.style.transform = `translateY(${viewport.offsetY}px)`;

    const visibleData = this.dataService.getVisibleRows();
    visibleData.forEach((data, i) => {
      const rowIndex = viewport.startIndex + i;
      // 使用和 dataService 相同的 ID 生成逻辑
      let rowId: string;
      if (this.getRowId) {
        rowId = this.getRowId(data);
      } else if (data.id !== undefined) {
        rowId = String(data.id);
      } else {
        rowId = `row-${rowIndex}`;
      }
      const rowNode = this.dataService.getRowNode(rowId);
      if (rowNode) {
        const { rowElement } = this.rowRenderer.render(rowIndex, data, rowNode);
        rowsContainer.appendChild(rowElement);
        this.setupRowEvents(rowElement, rowIndex, data, rowNode);
      }
    });
    this.cdr.detectChanges();
  }

  // ============ 事件 ============

  onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const newScrollTop = target.scrollTop;
    if (newScrollTop !== this.scrollTop) {
      this.scrollTop = newScrollTop;
      this.dataService.setScrollTop(newScrollTop);
      this.viewportInfo.set(this.dataService.getViewportInfo());
      this.renderRows();
    }
  }

  private onWindowResize(): void {
    const bodyHeight = this.bodyContainer.nativeElement.clientHeight;
    this.dataService.setScrollConfig({ viewportHeight: bodyHeight });
    this.viewportInfo.set(this.dataService.getViewportInfo());
    this.renderRows();
  }

  private onHeaderClick(detail: { colDef: any; colId: string; column: any; shiftKey?: boolean }): void {
    const colDef = detail.colDef;
    if (!colDef.sortable) return;
    const multiSort = detail.shiftKey ?? false;
    // 使用 dataService.toggleSort 处理多列排序
    const newSortModel = this.dataService.toggleSort(colDef.colId || colDef.field, multiSort);
    // 同步 colDef.sort 状态
    this.columnDefs.forEach(cd => {
      const state = this.dataService.getColumnSortState(cd.colId || cd.field);
      cd.sort = state.sort;
      cd.sortIndex = state.sortIndex ?? undefined;
    });
    this.refreshView();
    this.sortChanged.emit({ type: 'sortChanged', colDef, column: colDef, columns: this.columnDefs, source: 'ui', api: this.gridApi } as any);
  }

  private setupRowEvents(rowElement: HTMLElement, rowIndex: number, data: any, rowNode: any): void {
    rowElement.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.db-grid-cell')) return;
      this.selectionService.selectNode(rowNode, e);
      this.ngZone.run(() => this.rowClicked.emit({ type: 'rowClicked', data, node: rowNode, rowIndex, event: e, api: this.gridApi }));
    });

    rowElement.addEventListener('dblclick', (e: MouseEvent) => {
      this.ngZone.run(() => this.rowDoubleClicked.emit({ type: 'rowDoubleClicked', data, node: rowNode, rowIndex, event: e, api: this.gridApi }));
    });

    rowElement.addEventListener('cellClicked', ((e: CustomEvent) => {
      const { rowData, rowNode: rn, colDef, event: ev } = e.detail;
      this.ngZone.run(() => this.cellClicked.emit({ type: 'cellClicked', data: rowData, node: rn, colDef, column: colDef, value: rowData[colDef.field], rowIndex, event: ev, api: this.gridApi }));
    }) as EventListener);

    rowElement.addEventListener('cellDoubleClicked', ((e: CustomEvent) => {
      const { rowData, rowNode: rn, colDef, event: ev } = e.detail;
      this.ngZone.run(() => this.cellDoubleClicked.emit({ type: 'cellDoubleClicked', data: rowData, node: rn, colDef, column: colDef, value: rowData[colDef.field], rowIndex, event: ev, api: this.gridApi }));
    }) as EventListener);

    // 单元格编辑开始事件
    rowElement.addEventListener('cellEditStart', ((e: CustomEvent) => {
      const { rowIndex: ri, colDef: cd, value: val } = e.detail;
      this.ngZone.run(() => this.openCellEditor(ri, cd, val, { click: true }));
    }) as EventListener);

    // 树形节点展开/折叠事件
    rowElement.addEventListener('nodeToggle', ((e: CustomEvent) => {
      const { nodeId } = e.detail;
      this.ngZone.run(() => { this.toggleNode(nodeId); });
    }) as EventListener);

    // 分组展开/折叠事件
    rowElement.addEventListener('groupToggle', ((e: CustomEvent) => {
      const { nodeId } = e.detail;
      this.ngZone.run(() => { this.toggleGroup(nodeId); });
    }) as EventListener);
  }

  // ============ 筛选器事件 ============

  /** 打开列筛选器弹出层 */
  openFilterPopup(colDef: ColDef, event?: MouseEvent): void {
    const position = event ? { x: event.clientX, y: event.clientY } : { x: 200, y: 200 };
    this.activeFilterPopup = { colDef, position };
    this.activeCellEditor = null;
    this.cdr.detectChanges();
  }

  /** 关闭筛选器弹出层 */
  closeFilterPopup(): void {
    this.activeFilterPopup = null;
    this.cdr.detectChanges();
  }

  /** 筛选器应用回调 */
  onFilterApplied(model: any): void {
    if (!this.activeFilterPopup) return;
    const colId = this.activeFilterPopup.colDef.colId || this.activeFilterPopup.colDef.field || '';
    if (model === null) {
      this.filterService.setColumnFilter(colId, null);
    } else {
      this.filterService.setColumnFilter(colId, model);
    }
    this.activeFilterPopup = null;
    this.ngZone.run(() => {
      this.filterChanged.emit({ type: 'filterChanged', api: this.gridApi });
      this.refreshView();
    });
  }

  /** 打开单元格编辑器 */
  openCellEditor(rowIndex: number, colDef: ColDef, value: any, trigger?: { key?: string; click?: boolean }): void {
    const session = this.editorService.startEditing(`row-${rowIndex}`, colDef, value, trigger);
    if (!session) return;

    this.activeCellEditor = {
      value: session.currentValue,
      editorType: session.editorType,
      editorParams: session.editorParams,
    };
    this.activeFilterPopup = null;
    this.cdr.detectChanges();
  }

  /** 通过 KeyboardNavigation 启动编辑 */
  startEditingCell(rowIndex: number, colId: string): void {
    const colDef = this.columnService.getColumn(colId) || this.columnDefs.find(c => (c.colId || c.field) === colId);
    if (!colDef) return;
    const rowData = this.dataService.getRowData(rowIndex);
    const value = rowData?.[colDef.field ?? colId];
    this.openCellEditor(rowIndex, colDef, value, { key: 'keyboard' });
  }

  /** 通过 KeyboardNavigation 停止编辑 */
  stopEditingCell(commit: boolean): void {
    if (this.activeCellEditor) {
      if (commit) {
        this.editorService.commitEdit();
      } else {
        this.editorService.cancelEdit();
      }
      this.activeCellEditor = null;
      this.cdr.detectChanges();
    }
  }

  /** 焦点单元格变化回调 */
  onFocusChanged(cell: { rowIndex: number; colId: string }): void {
    // 通知 rowRenderer 高亮焦点单元格
    const bodyContainer = this.bodyContainer?.nativeElement;
    if (bodyContainer) {
      bodyContainer.querySelectorAll('.db-grid-cell-focused').forEach(el => el.classList.remove('db-grid-cell-focused'));
      const selector = `.db-grid-row[data-row-index="${cell.rowIndex}"] > [data-col-id="${cell.colId}"]`;
      bodyContainer.querySelector(selector)?.classList.add('db-grid-cell-focused');
    }
  }

  /** 编辑器值变化 */
  onEditorValueChange(value: any): void {
    this.editorService.updateValue(value);
  }

  /** 编辑器停止（提交或取消） */
  onEditorStopped(event: { committed: boolean; value: any }): void {
    if (event.committed) {
      const commit = this.editorService.commitEdit();
      if (commit) {
        this.ngZone.run(() => {
          // 触发 cellValueChanged 事件（可通过 gridApi 访问）
          this.refreshView();
        });
      }
    } else {
      this.editorService.cancelEdit();
    }
    this.activeCellEditor = null;
    this.cdr.detectChanges();
  }

  /** 编辑器键盘导航 */
  onEditorNavigate(direction: { direction: 'up' | 'down' | 'left' | 'right' }): void {
    // TODO: 实现编辑器键盘导航
    // 方向键移动到相邻单元格
  }

  /** 在列头右键打开筛选器（可由外部或 cellRenderer 调用） */
  showColumnFilter(colDef: ColDef, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.openFilterPopup(colDef, event);
  }
}
