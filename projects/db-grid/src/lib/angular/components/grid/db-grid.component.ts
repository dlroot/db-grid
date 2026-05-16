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
  input,
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
  RowNode,
  GridApi,
  DetailChartConfig,
} from '../../../core/models';
import { PdfExportService } from '../../../core/services';

import {
  DataService,
  ColumnService,
  SelectionService,
  TreeService,
  GroupService,
  ExcelExportService,
  CellSpanService,
  ChartsService,
  CellEditService,
  ColumnPinningService,
  PaginationService,
  ContextMenuService,
  ColumnMenuService,
  ColumnMenuItem as ColumnMenuItemType,
  DragDropService,
  FilterService,
  EditorService,
  RowDragService,
  TreeNodeConfig,
  GroupConfig,
  CellDataTypeService,
  KeyboardNavigationService,
  AccessibilityService,
  AggregationService,
  RangeSelectionService,
  SideBarService,
  StatusBarService,
  MasterDetailService,
  UndoRedoService,
  ServerSideService,
  PivotService,
  I18nService,
  Locale,
  IServerSideDatasource,
  ServerSideConfig,
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
          @if (pinnedLeftColumnIds.length > 0) {
            <div #pinnedLeftContainer class="db-grid-pinned-left"></div>
          }
        </div>
      </div>
      <div #footerContainer class="db-grid-footer-container"></div>
      @if (loading) {
        <div class="db-grid-overlay">
          <div class="db-grid-overlay-content">
            <span class="db-grid-spinner">⟳</span>
            <span>{{ loadingMessage || (i18nService.t('grid.loading')) }}</span>
          </div>
        </div>
      }
      @if (!loading && rowCount() === 0) {
        <div class="db-grid-no-rows">{{ noRowsMessage || (i18nService.t('grid.noRows')) }}</div>
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

      <!-- Grid Menu 浮层 -->
      @if (gridMenuVisible()) {
        <div class="db-grid-menu-overlay" (click)="closeGridMenu()"></div>
        <div class="db-grid-menu" [style.left.px]="gridMenuPosition().x" [style.top.px]="gridMenuPosition().y">
          @for (item of gridMenuItems(); track item.id) {
            @if (item.type === 'separator') {
              <div class="db-grid-menu-sep"></div>
            } @else if (item.type === 'submenu') {
              <div class="db-grid-menu-item db-grid-menu-submenu" (mouseenter)="openSubmenu(item)" (click)="$event.stopPropagation()">
                <span class="db-grid-menu-icon">{{ item.icon || '' }}</span>
                <span class="db-grid-menu-label">{{ item.label }}</span>
                <span class="db-grid-menu-arrow">▸</span>
              </div>
            } @else {
              <div class="db-grid-menu-item" [class.db-grid-menu-item-disabled]="item.disabled" (click)="onGridMenuItemClick(item)">
                <span class="db-grid-menu-icon">{{ item.icon || '' }}</span>
                <span class="db-grid-menu-label">{{ item.label }}</span>
                @if (item.checked !== undefined) {
                  <span class="db-grid-menu-check">{{ item.checked ? '✓' : '' }}</span>
                }
                @if (item.shortcut) {
                  <span class="db-grid-menu-shortcut">{{ item.shortcut }}</span>
                }
              </div>
            }
          }
        </div>
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
    .db-grid-header-container { flex-shrink: 0; overflow-x: hidden; overflow-y: hidden; box-sizing: border-box; width: 100%; }
    .db-grid-body-container { flex: 1; overflow-y: auto; overflow-x: auto; position: relative; box-sizing: border-box; width: 100%; }
    .db-grid-virtual-scroll { position: relative; min-width: 100%; }
    .db-grid-rows { display: flex; flex-direction: column; position: absolute; left: 0; min-width: 100%; }
    .db-grid-pinned-left { position: absolute; left: 0; top: 0; z-index: 2; overflow: hidden; }
    .db-grid-pinned-left .db-grid-row { position: sticky; left: 0; }
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

    /* ========== Grid Menu ========== */
    .db-grid-menu-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      z-index: 199;
    }
    .db-grid-menu {
      position: absolute;
      z-index: 200;
      min-width: 200px;
      background: var(--db-grid-bg, #fff);
      border: 1px solid var(--db-grid-border-color, #ddd);
      border-radius: 6px;
      box-shadow: 0 6px 24px rgba(0,0,0,0.12);
      padding: 4px 0;
      font-size: var(--db-grid-font-size, 14px);
      animation: db-grid-menu-fadein 0.12s ease-out;
    }
    @keyframes db-grid-menu-fadein {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .db-grid-menu-item {
      display: flex; align-items: center; gap: 8px;
      padding: 7px 14px;
      cursor: pointer;
      transition: background 0.1s;
      white-space: nowrap;
    }
    .db-grid-menu-item:hover:not(.db-grid-menu-item-disabled) {
      background: var(--db-grid-row-hover-bg, #f0f7ff);
    }
    .db-grid-menu-item-disabled {
      opacity: 0.4; cursor: default;
    }
    .db-grid-menu-icon { width: 20px; text-align: center; flex-shrink: 0; }
    .db-grid-menu-label { flex: 1; }
    .db-grid-menu-check { margin-left: auto; color: var(--db-grid-accent, #2196f3); font-weight: 600; }
    .db-grid-menu-shortcut { margin-left: auto; opacity: 0.5; font-size: 12px; }
    .db-grid-menu-arrow { margin-left: auto; opacity: 0.5; }
    .db-grid-menu-submenu { position: relative; }
    .db-grid-menu-sep {
      height: 1px;
      margin: 4px 8px;
      background: var(--db-grid-border-color, #eee);
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
  private _gridOptions: GridOptions = {};
  @Input() set gridOptions(value: GridOptions) { this._gridOptions = value || {}; }
  get gridOptions(): GridOptions { return this._gridOptions; }
  theme = input<'alpine' | 'balham' | 'material' | 'custom'>('alpine');
  @Input() rowHeight: number = 40;
  @Input() headerHeight: number = 40;
  @Input() loading: boolean = false;
  @Input() loadingMessage: string = '';
  @Input() noRowsMessage: string = '';
  @Input() masterDetail = false;
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

  // ============ Pivot Inputs ============
  /** 启用数据透视模式 */
  @Input() pivotMode = false;
  /** 透视列（作为列头的字段） */
  @Input() pivotColumn = '';
  /** 透视行分组列 */
  @Input() pivotRowGroupColumns: string[] = [];
  /** 透视值列（需聚合的字段和聚合函数） */
  @Input() pivotValueColumns: { field: string; aggFunc: string }[] = [];

  // ============ Column Virtualization Input ============
  /** 启用列虚拟化（大量列时自动只渲染可见列） */
  @Input() enableColVirtualization = false;

  // ============ Server-Side Inputs ============
  /** 启用服务端行模型 */
  @Input() enableServerSide: boolean = false;
  /** 服务端配置 */
  @Input() serverSideConfig: ServerSideConfig | null = null;
  /** 服务端数据源 */
  @Input() serverSideDatasource: IServerSideDatasource | null = null;

  // ============ Menu Inputs ============
  /** 启用列头菜单按钮（三横线图标） */
  @Input() enableColumnMenu: boolean = true;
  /** 启用右键菜单 */
  @Input() enableContextMenu: boolean = true;

  // ============ i18n ============
  /** Grid 语言 locale：'en' | 'zh'，默认英文 */
  @Input() locale: Locale = 'en';

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
  @Output() colDragMoved = new EventEmitter<{ fromIndex: number; toIndex: number; column: any }>();
  @Output() nodeExpanded = new EventEmitter<any>();
  @Output() nodeCollapsed = new EventEmitter<any>();
  @Output() groupExpanded = new EventEmitter<any>();
  @Output() groupCollapsed = new EventEmitter<any>();
  @Output() viewportChanged = new EventEmitter<{ startIndex: number; endIndex: number; offsetY: number }>();

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
  @Input() rowDragMultiRow: boolean = false;
  @Input() colDragEnabled: boolean = false;

  // 单元格合并
  @Input() enableCellSpan: boolean = false;
  @Input() cellSpanConfig: { autoMerge?: boolean; mergeColumns?: string[] } | null = null;

  // ============ ViewChild ============
  @ViewChild('gridContainer') gridContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('headerContainer') headerContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('bodyContainer') bodyContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('virtualScroll') virtualScroll!: ElementRef<HTMLDivElement>;
  @ViewChild('rowsContainer') rowsContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('pinnedLeftContainer') pinnedLeftContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('footerContainer') footerContainer!: ElementRef<HTMLDivElement>;

  // ============ Signals ============
  rowCount = signal(0);
  viewportInfo = signal<{ startIndex: number; endIndex: number; offsetY: number }>({
    startIndex: 0, endIndex: 0, offsetY: 0,
  });
  pinnedLeftColumnIds = signal<string[]>([]);
  themeClass = computed(() => `db-grid-theme-${this.theme()}`);

  // ============ Services ============
  private dataService: DataService;
  private columnService: ColumnService;
  private selectionService: SelectionService;
  private treeService: TreeService;
  private groupService: GroupService;
  private excelExportService: ExcelExportService;
  private pdfExportService: PdfExportService;
  private cellSpanService: CellSpanService;
  private chartsService: ChartsService;
  private cellRenderer: CellRendererService;
  private rowRenderer: RowRendererService;
  private headerRenderer: HeaderRendererService;

  // ============ 新增服务 ============
  private cellEditService: CellEditService;
  private pinningService: ColumnPinningService;
  private paginationService: PaginationService;
  private contextMenuService: ContextMenuService;
  private columnMenuService: ColumnMenuService;
  private dragDropService: DragDropService;
  private rowDragService: RowDragService;
  private filterService: FilterService;
  private editorService: EditorService;
  private cellDataTypeService: CellDataTypeService;
  private keyboardNavigationService: KeyboardNavigationService;
  private accessibilityService: AccessibilityService;
  private aggregationService: AggregationService;
  private rangeSelectionService: RangeSelectionService;
  private sidebarService: SideBarService;
  private statusBarService: StatusBarService;
  private masterDetailService: MasterDetailService;
  private undoRedoService: UndoRedoService;
  private serverSideService: ServerSideService;
  private pivotService: PivotService;
  private i18nService: I18nService;
  private _dataTypesApplied = false;

  // ============ State ============
  private destroy$ = new Subject<void>();
  private scrollTop = 0;
  private scrollLeft = 0;
  private isDestroyed = false;
  private gridApi: any = null;
  private isTreeMode = false;
  private isGroupMode = false;
  private isPivotMode = false;
  private originalColumnDefs: any[] | null = null;
  private isPaginated = false;
  // 列虚拟化
  private lastColRenderScrollLeft = -1;
  private colVirtualBuffer = 3;

  // Grid Menu
  gridMenuVisible = signal<boolean>(false);
  gridMenuPosition = signal<{x: number; y: number}>({x: 0, y: 0});
  gridMenuItems = signal<ColumnMenuItemType[]>([]);
  private gridMenuColId = '';
  private _pendingRefresh = false; // 标记是否需要在视图就绪后重试刷新

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
    this.aggregationService = new AggregationService();
    this.groupService = new GroupService(this.aggregationService);
    this.excelExportService = new ExcelExportService();
    this.pdfExportService = new PdfExportService();
    this.cellSpanService = new CellSpanService();
    this.chartsService = new ChartsService();
    this.cellRenderer = new CellRendererService(this.columnService);
    this.rowRenderer = new RowRendererService(this.cellRenderer, this.columnService);
    
    // 设置树形切换回调
    this.rowRenderer.onTreeToggle = (node: RowNode) => {
      this.onTreeNodeToggled(node);
    };
    this.headerRenderer = new HeaderRendererService(this.columnService);

    // 新增服务
    this.cellEditService = new CellEditService();
    this.pinningService = new ColumnPinningService();
    this.paginationService = new PaginationService();
    this.contextMenuService = new ContextMenuService();
    this.columnMenuService = new ColumnMenuService();
    this.dragDropService = new DragDropService();
    this.rowDragService = new RowDragService();
    this.filterService = new FilterService();
    this.editorService = new EditorService();
    this.cellDataTypeService = new CellDataTypeService();
    this.keyboardNavigationService = new KeyboardNavigationService();
    this.accessibilityService = new AccessibilityService();
    this.rangeSelectionService = new RangeSelectionService();
    this.sidebarService = new SideBarService();
    this.statusBarService = new StatusBarService();
    this.masterDetailService = new MasterDetailService();
    this.undoRedoService = new UndoRedoService();
    this.serverSideService = new ServerSideService();
    this.pivotService = new PivotService();
    this.i18nService = new I18nService();
    this.i18nService.setLocale(this.locale);
  }

  // ============ Lifecycle ============

  ngOnInit(): void {
    // 初始化列服务
    this.columnService.initialize(this.columnDefs);
    this.pinnedLeftColumnIds.set(this.pinningService.getPinnedLeftIds());
    this.dataService.setScrollConfig({ rowHeight: this.rowHeight, viewportHeight: 400, bufferSize: 5 });
    // 注入筛选服务（支持列筛选 + 快速筛选）
    this.dataService.setFilterService(this.filterService);

    // 自动推断列数据类型（Cell Data Types）
    if (this.rowData && this.rowData.length > 0) {
      this.cellDataTypeService.applyAutoTypes(this.columnDefs, this.rowData, this.gridOptions);
      // 重新初始化列服务（类型推断可能修改了 columnDefs）
      this.columnService.initialize(this.columnDefs);
      this.pinnedLeftColumnIds.set(this.pinningService.getPinnedLeftIds());
    }

    // 初始化主从表服务
    if (this.masterDetail || (this.gridOptions as any)?.masterDetail) {
      this.masterDetailService.initialize({ masterDetail: true, detailRowAutoHeight: true, detailRowHeight: 200 });
    }

    // 注册主从表回调（展开/折叠时触发重绘）
    this.masterDetailService.onDetailExpandedEvent((event: any) => {
      this.ngZone.run(() => this.renderRows());
    });
    this.masterDetailService.onDetailCollapsedEvent((event: any) => {
      this.ngZone.run(() => this.renderRows());
    });

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
      rowDragMultiDrag: this.rowDragMultiRow,
      colDragEnabled: this.colDragEnabled,
    });
    this.rowDragService.initialize({
      rowDragEnabled: this.rowDragEnabled,
      rowDragMultiRow: this.rowDragMultiRow,
    });

    // 初始化服务端行模型
    if (this.enableServerSide) {
      console.log('[DBGrid] initServerSideService', {
        hasServerSideDatasource: !!this.serverSideDatasource,
        datasourceHasGetRows: !!(this.serverSideDatasource && this.serverSideDatasource.getRows),
        enableServerSide: this.enableServerSide,
      });
      this.serverSideService.initialize(this.serverSideConfig ?? {});
      this.serverSideService.onRowsUpdatedEvent(() => {
        console.log('[DBGrid] serverSide onRowsUpdatedEvent - callback fired');
        const ssRowCount = this.serverSideService.getRowCount();
        console.log('[DBGrid] serverSide onRowsUpdatedEvent', { ssRowCount, viewReady: !!(this.bodyContainer?.nativeElement) });
        // 使用 ngZone.run 确保 Angular 感知 signal 变更并触发变更检测
        this.ngZone.run(() => {
          this.rowCount.set(ssRowCount);
          this.refreshView();
          this.cdr.detectChanges();
          console.log('[DBGrid] serverSide onRowsUpdatedEvent - refresh completed', { ssRowCount });
        });
      });
      // 注意：setDatasource 移至 ngAfterViewInit，确保视图先初始化
    }

    this.rowCount.set(this.dataService.getRowCount());
    this.createGridApi();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rowData'] && !changes['rowData'].firstChange) {
      this.setRowData(changes['rowData'].currentValue);
    }
    if (changes['columnDefs'] && !changes['columnDefs'].firstChange) {
      this.columnService.initialize(changes['columnDefs'].currentValue);
      this.pinnedLeftColumnIds.set(this.pinningService.getPinnedLeftIds());
      this.refreshHeader();
    }
    // 语言变更
    if (changes['locale'] && !changes['locale'].firstChange) {
      this.i18nService?.setLocale(this.locale);
      this.refreshHeader();
      this.renderRows();
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
    if (changes['rowDragEnabled'] || changes['colDragEnabled'] || changes['rowDragMultiRow']) {
      this.dragDropService.initialize({
        rowDragEnabled: this.rowDragEnabled,
        rowDragMultiDrag: this.rowDragMultiRow,
        colDragEnabled: this.colDragEnabled,
      });
      this.rowDragService.initialize({
        rowDragEnabled: this.rowDragEnabled,
        rowDragMultiRow: this.rowDragMultiRow,
      });
    }
    // 透视配置变更
    if (changes['pivotMode'] || changes['pivotColumn'] || changes['pivotRowGroupColumns'] || changes['pivotValueColumns']) {
      if (this.rowData && this.rowData.length > 0) {
        if (this.pivotMode) {
          this.setRowData(this.rowData);
        } else if (this.isPivotMode) {
          // 透视清除：恢复原始 columnDefs 和数据
          this.isPivotMode = false;
          this.columnDefs = this.originalColumnDefs || this.columnDefs;
          this.columnService.initialize(this.columnDefs);
          this.pivotService.disablePivotMode();
          this.setRowData(this.rowData);
        }
      }
    }

    // 分组配置变更
    if ((changes['enableGrouping'] || changes['groupConfig']) && !changes['enableGrouping']?.firstChange) {
      if (this.enableGrouping && this.groupConfig && this.rowData && this.rowData.length > 0) {
        this.setRowData(this.rowData);
      }
    }

    // 单元格合并配置变更
    if ((changes['enableCellSpan'] || changes['cellSpanConfig']) && !changes['enableCellSpan']?.firstChange) {
      if (this.enableCellSpan && this.rowData && this.rowData.length > 0) {
        this.setRowData(this.rowData);
      }
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    // Guard: ensure ViewChildren are initialized before accessing them
    if (!this.bodyContainer?.nativeElement) {
      console.log('[DBGrid] ngAfterViewInit skipped: bodyContainer not initialized');
      return;
    }
    
    const bodyHeight = this.bodyContainer.nativeElement.clientHeight;
    this.dataService.setScrollConfig({ viewportHeight: bodyHeight, rowHeight: this.rowHeight });

    // 初始化数据服务（即使 rowData 为空也要初始化，确保 grid 状态正确）
    console.log('[DBGrid] ngAfterViewInit setRowData', { rowData: this.rowData?.length, enableGrouping: this.enableGrouping, groupConfig: !!this.groupConfig });
    this.setRowData(this.rowData || []);

    // 初始化 viewportInfo（确保在 renderRows 之前）
    this.viewportInfo.set(this.dataService.getViewportInfo());

    this.renderHeader();
    this.renderRows();
    if (this.pagination) {
      this.renderFooter();
    }

    // ========== 服务端模式：视图就绪后发起数据请求 ==========
    // 将 setDatasource 从 ngOnInit 移至 ngAfterViewInit，确保视图先初始化
    // 这样当数据到达时，refreshView 不会被跳过
    if (this.enableServerSide && this.serverSideDatasource && this.serverSideService.isEnabled()) {
      console.log('[DBGrid] ngAfterViewInit: calling setDatasource (view now ready)');
      this.serverSideService.setDatasource(this.serverSideDatasource);
      // 保底轮询：确保数据被渲染（最多重试 20 次，每 100ms 一次）
      let pollCount = 0;
      const pollInterval = setInterval(() => {
        pollCount++;
        const currentRowCount = this.serverSideService.getRowCount();
        console.log(`[DBGrid] server-side poll #${pollCount}`, { currentRowCount });
        if (currentRowCount > 0) {
          this.rowCount.set(currentRowCount);
          this.refreshView();
          console.log('[DBGrid] server-side poll: data rendered', { currentRowCount });
          clearInterval(pollInterval);
        } else if (pollCount >= 20) {
          console.log('[DBGrid] server-side poll: giving up after 20 attempts');
          clearInterval(pollInterval);
        }
      }, 100);
    } else if (this._pendingRefresh) {
      // 非 server-side 模式下，如果有待刷新的标记，也执行刷新
      console.log('[DBGrid] ngAfterViewInit: pending refresh detected, refreshing view');
      this.refreshView();
    }

    // ========== 初始化 Accessibility Service ==========
    if (this.gridContainer?.nativeElement) {
      this.accessibilityService.setGridElement(this.gridContainer.nativeElement);

      // 订阅焦点变化事件，播报焦点位置
      this.keyboardNavigationService.onFocusChange.subscribe(event => {
        this.ngZone.run(() => {
          this.onFocusChanged(event.current);
          const colIndex = this.columnService.getVisibleColumns().findIndex(
            c => (c.colId || c.field) === event.current.colId
          );
          const value = this.dataService.getRowData(event.current.rowIndex)?.[event.current.colId];
          this.accessibilityService.announceFocus(event.current.rowIndex, event.current.colId, value);
        });
      });
    }

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
    this.keyboardNavigationService.destroy();
    this.accessibilityService.destroy();
    this.aggregationService.destroy();
    this.rangeSelectionService.destroy();
    this.sidebarService.destroy();
    this.statusBarService.destroy();
    this.masterDetailService.destroy();
    this.undoRedoService.destroy();
    this.serverSideService.destroy();
  }

  // ============ Grid API ============

  private createGridApi(): void {
    this.gridApi = {
      // ========== 通用事件 ==========
      addEventListener: (eventType: string, handler: (event: any) => void) => {
        if (eventType === 'viewportChanged') {
          this.viewportChanged.subscribe((e) => handler(e));
        }
      },
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
      ensureColumnVisible: (colId: string) => {
        // 横向滚动使指定列可见（列虚拟化模式下需要计算并滚动）
        if (!this.enableColVirtualization) return;
        const bodyWidth = this.bodyContainer?.nativeElement?.clientWidth || 800;
        const colRange = this.columnService.getVisibleColumnsInRange(this.scrollLeft, bodyWidth, this.colVirtualBuffer);
        const allCols = [...(colRange?.leftPinned || []), ...(colRange?.center || []), ...(colRange?.rightPinned || [])];
        const colIndex = allCols.findIndex(c => (c.colId || c.field) === colId);
        if (colIndex < 0) return;
        // 计算当前滚动位置中该列的左边界
        let offsetX = colRange?.offsetX || 0;
        for (let i = 0; i < colIndex; i++) {
          const col = allCols[i];
          offsetX += (this.columnService.getColumnState(col)?.width || 200);
        }
        const colWidth = this.columnService.getColumnState(allCols[colIndex])?.width || 200;
        // 如果列不在可见范围内，滚动到合适位置
        if (offsetX < this.scrollLeft) {
          this.bodyContainer.nativeElement.scrollLeft = offsetX;
        } else if (offsetX + colWidth > this.scrollLeft + bodyWidth) {
          this.bodyContainer.nativeElement.scrollLeft = offsetX + colWidth - bodyWidth;
        }
      },
      getColumnDef: (colId: string) => this.columnService.getColumn(colId) || this.columnDefs.find(c => (c.colId || c.field) === colId),
      getViewportInfo: () => this.viewportInfo(),

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
      getAccessibilityService: () => this.accessibilityService,
      getAggregationService: () => this.aggregationService,

      // ========== Excel 导出 ==========
      exportDataAsCsv: (params?: any) => this.exportDataAsCsv(params),
      exportDataAsPdf: (options?: any) => this.exportDataAsPdf(options),
      addChart: (containerId: string, config: any) => this.chartsService.createChart(containerId, config),
      destroyChart: (containerId: string) => this.chartsService.destroyChart(containerId),
      downloadExcel: (options?: any) => this.downloadExcel(options),
      importCsv: (csvText: string, options?: any) => this.importCsv(csvText, options),

      // ========== PDF 导出 ==========
      exportToPdf: (options?: any) => this.exportToPdf(options),

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
      getColumnMenuService: () => this.columnMenuService,
      getI18nService: () => this.i18nService,
      showGridMenu: (colId: string, event: MouseEvent) => this.showColumnGridMenu(colId, event),
      hideGridMenu: () => this.closeGridMenu(),

      // ========== 范围选择 & 剪贴板 ==========
      copyToClipboard: (data?: any[], columns?: any[]) => this.copyToClipboard(data, columns),
      cutToClipboard: (data?: any[], columns?: any[]) => this.cutToClipboard(data, columns),
      pasteFromClipboard: () => this.pasteFromClipboard(),
      getRangeSelectionService: () => this.rangeSelectionService,

      // ========== 侧边栏 ==========
      showSidebar: (panelId?: string) => this.sidebarService.show(panelId),
      hideSidebar: () => this.sidebarService.hide(),
      toggleSidebar: (panelId?: string) => this.toggleSidebar(panelId),
      getSidebarService: () => this.sidebarService,

      // ========== 状态栏 ==========
      getStatusBarService: () => this.statusBarService,

      // ========== 主从表 ==========
      expandDetail: (nodeId: string, data?: any) => this.masterDetailService.expandDetail(nodeId, data),
      collapseDetail: (nodeId: string) => this.masterDetailService.collapseDetail(nodeId),
      toggleDetail: (nodeId: string, data?: any) => this.masterDetailService.toggleDetail(nodeId, data),
      isDetailExpanded: (nodeId: string) => this.masterDetailService.isDetailExpanded(nodeId),
      getMasterDetailService: () => this.masterDetailService,

      // ========== 撤销/重做 ==========
      undo: () => this.undo(),
      redo: () => this.redo(),
      canUndo: () => this.undoRedoService.canUndo(),
      canRedo: () => this.undoRedoService.canRedo(),
      getUndoRedoService: () => this.undoRedoService,

      // ========== 拖拽排序 ==========
      startDrag: (rowNodes: any[], event: MouseEvent) => this.startDrag(rowNodes, event),
      endDrag: (targetIndex: number, event: MouseEvent) => this.endDrag(targetIndex, event),
      getDragDropService: () => this.dragDropService,
      getRowDragService: () => this.rowDragService,

      // ========== 服务端行模型 ==========
      getServerSideService: () => this.serverSideService,
      refreshServerSide: () => this.serverSideService.refresh(),

      // ========== 刷新 ==========
      refreshView: () => this.refreshView(),

    };
  }

  // ============ 实现 ============

  // --- 数据 ---
  setRowData(rowData: any[]): void {
    // 服务端模式下跳过本地数据处理
    if (this.enableServerSide) {
      this.rowCount.set(this.serverSideService.getRowCount());
      this.refreshView();
      this.rowDataUpdated.emit({ type: 'rowDataUpdated', api: this.gridApi });
      return;
    }

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
      
      // 设置树模式渲染器配置
      const firstColumnField = this.columnDefs[0]?.field || null;
      this.cellRenderer.setTreeMode(true, firstColumnField);
      
      this.dataService.initialize(this.treeService.getFlattenedNodes().map(n => n.data), this.gridOptions, this.columnDefs);
      this.rowCount.set(this.treeService.getDisplayCount());
    } else if (this.enableGrouping && this.groupConfig) {
      console.log('[DBGrid] 分组模式初始化', { rowDataLength: rowData?.length, groupConfig: this.groupConfig });
      this.isGroupMode = true;
      this.groupService.initialize(rowData, this.groupConfig);
      const result = this.groupService.getResult();
      // 合并分组列
      if (result.groupColumnDefs.length > 0) {
        const existingIds = this.columnDefs.map(c => c.colId);
        const newCols = result.groupColumnDefs.filter(c => !existingIds.includes(c.colId!));
        this.columnDefs = [...result.groupColumnDefs, ...this.columnDefs];
        this.columnService.initialize(this.columnDefs);
        this.pinnedLeftColumnIds.set(this.pinningService.getPinnedLeftIds());
        this.refreshHeader();
      }
      // 使用 initializeNodes 直接传入节点数组
      this.dataService.initializeNodes(result.flatNodes, this.gridOptions, this.columnDefs);
      this.rowCount.set(this.groupService.getFlattenedNodes().length);
      console.log('[DBGrid] 分组模式 rowCount:', this.groupService.getFlattenedNodes().length, 'flatNodes:', this.groupService.getResult().flatNodes.length);
    } else if (this.pivotMode && this.pivotColumn && this.pivotRowGroupColumns.length > 0) {
      // ========== 透视模式 ==========
      this.isPivotMode = true;
      // 保存原始列定义和数据，以便清除透视时恢复
      if (!this.originalColumnDefs) {
        this.originalColumnDefs = [...this.columnDefs];
      }
      this.dataService.setOriginalRowData(rowData);
      this.pivotService.initialize({
        enabled: true,
        pivotMode: true,
        pivotColumns: [this.pivotColumn],
        rowGroupColumns: this.pivotRowGroupColumns,
        valueColumns: this.pivotValueColumns.map(v => ({ field: v.field, aggFunc: v.aggFunc as any })),
      });
      const pivotResult = this.pivotService.compute(rowData);
      // 生成透视后的列定义
      const pivotColDefs = this.pivotService.getPivotColumnDefs();
      // 使用展平的透视结果初始化数据服务
      this.dataService.initialize(pivotResult.flatRows, this.gridOptions, pivotColDefs);
      // 更新 columnDefs 和 columnService，使 header 和 body 列定义一致
      this.columnDefs = pivotColDefs as any;
      this.columnService.initialize(this.columnDefs);
      this.rowCount.set(pivotResult.flatRows.length);
    } else {
      this.isPivotMode = false;
      // 透视清除时恢复原始列定义
      if (this.dataService.getOriginalRowData && (this.dataService as any).getOriginalRowData()) {
        // columnDefs 仍为原始值，无需恢复
      }
      this.dataService.initialize(rowData, this.gridOptions, this.columnDefs);
      this.rowCount.set(this.dataService.getRowCount());
    }
    // 初始化单元格合并服务
    if (this.enableCellSpan) {
      this.cellSpanService.initialize(this.columnDefs, rowData, {
        autoMerge: this.cellSpanConfig?.autoMerge ?? false,
        mergeColumns: this.cellSpanConfig?.mergeColumns ?? [],
      });
    }
    this.renderHeader();
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
    if (colDef) { colDef.sort = direction; this.dataService.sort(this.columnDefs); this.refreshHeader(); this.refreshView(); }
  }

  clearSort(): void { this.columnDefs.forEach(c => c.sort = undefined); this.dataService.sort(this.columnDefs); this.refreshHeader(); this.refreshView(); }

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
    // Guard: skip if view is not yet initialized
    if (!this.bodyContainer?.nativeElement || !this.rowsContainer?.nativeElement || !this.virtualScroll?.nativeElement) {
      console.log('[DBGrid] refreshView skipped: view not initialized, setting _pendingRefresh = true');
      this._pendingRefresh = true;
      return;
    }
    this._pendingRefresh = false;
    // 服务端模式下，rowCount 由 onRowsUpdatedEvent 回调管理，不要覆盖
    if (!this.enableServerSide) {
      this.rowCount.set(this.dataService.getRowCount());
      this.viewportInfo.set(this.dataService.getViewportInfo());
    } else {
      // 服务端模式：使用 serverSideService 的行数来计算 viewport
      const ssRowCount = this.serverSideService.getRowCount();
      const viewportHeight = this.bodyContainer?.nativeElement?.clientHeight || 600;
      const scrollTop = this.scrollTop || 0;
      const startIndex = Math.floor(scrollTop / this.rowHeight);
      const visibleCount = Math.ceil(viewportHeight / this.rowHeight) + 1;
      const endIndex = Math.min(startIndex + visibleCount, ssRowCount);
      this.viewportInfo.set({
        startIndex,
        endIndex,
        offsetY: startIndex * this.rowHeight,
      });
    }
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

    // 应用分页 - 临时禁用以便测试
    // if (this.pagination) {
    //   const pageInfo = this.paginationService.getPageInfo();
    //   if (pageInfo && pageInfo.totalRows > 0) {
    //     const startIndex = this.paginationService.getStartRowIndex();
    //     const endIndex = this.paginationService.getEndRowIndex();
    //     return rows.slice(startIndex, endIndex);
    //   }
    // }

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

  /** 树节点展开/折叠切换回调 */
  private onTreeNodeToggled(node: RowNode): void {
    // 先切换 treeService 内部状态
    this.treeService.toggleNode(node.id);
    // 重新获取扁平化的节点数据
    const flattenedNodes = this.treeService.getFlattenedNodes();
    this.dataService.initialize(flattenedNodes.map(n => n.data), this.gridOptions, this.columnDefs);
    this.rowCount.set(this.treeService.getDisplayCount());
    this.refreshView();
  }

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

  // ========== 数据透视 API ==========
  setPivotMode(pivotColumn: string, rowGroupColumns: string[], valueColumns: { field: string; aggFunc: string }[]): void {
    this.pivotMode = true;
    this.pivotColumn = pivotColumn;
    this.pivotRowGroupColumns = rowGroupColumns;
    this.pivotValueColumns = valueColumns;
    this.setRowData(this.getRowData());
  }

  removePivotMode(): void {
    this.pivotMode = false;
    this.isPivotMode = false;
    this.pivotService.disablePivotMode();
    // 恢复原始数据
    const original = this.dataService.getOriginalRowData();
    if (original && original.length > 0) {
      this.dataService.initialize(original, this.gridOptions, this.columnDefs);
      this.rowCount.set(this.dataService.getRowCount());
    }
    this.refreshView();
  }

  getPivotResult(): any { return this.pivotService.getResult(); }

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

  exportDataAsPdf(options?: any): void {
    const colDefs = this.columnService.getVisibleColumns();
    const rows = this.getDisplayedRows();
    this.pdfExportService.exportToPdf(colDefs, rows, options);
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

  // ========== PDF 导出 ==========
  /** 导出当前数据为 PDF（通过 gridApi 调用） */
  exportToPdf(options?: any): void {
    const colDefs = this.columnDefs || [];
    const rowData = options?.allRows ? this.getRowData() : this.getSelectedRows();
    if (!rowData || rowData.length === 0) {
      console.warn('PDF Export: 没有可导出的数据');
      return;
    }
    this.pdfExportService.exportToPdf(colDefs, rowData, options);
  }

  /** 获取当前所有行数据（用于导出） */
  // ========== 右键菜单 API ==========

  showContextMenu(position: { x: number; y: number }, context: any): void {
    this.contextMenuService.show(position, context);
  }

  hideContextMenu(): void {
    this.contextMenuService.hide();
  }

  // ========== Grid Menu 方法 ==========

  /** 显示列头菜单 */
  showColumnGridMenu(colId: string, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.enableColumnMenu) return;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const gridRect = this.gridContainer.nativeElement.getBoundingClientRect();
    const x = rect.left - gridRect.left;
    const y = rect.bottom - gridRect.top;

    this.gridMenuColId = colId;
    this.columnMenuService.initialize(this.columnDefs);
    const items = this.columnMenuService.getGeneralMenuItems(colId);
    // 附加「列显隐」子菜单
    const colVisibilityItems = this.getColumnVisibilityItems();
    items.push(
      { id: 'sepCols', type: 'separator' },
      { id: 'columnsMenu', label: `${this.i18nService.t('menu.columns')}`, icon: '🔲', type: 'submenu', subItems: colVisibilityItems }
    );

    this.gridMenuPosition.set({ x, y });
    this.gridMenuItems.set(items);
    this.gridMenuVisible.set(true);
  }

  /** 显示右键菜单（单元格/行） */
  showCellContextMenu(event: MouseEvent, context: { rowData?: any; rowIndex?: number; colDef?: any }): void {
    if (!this.enableContextMenu) return;
    event.preventDefault();

    const gridRect = this.gridContainer.nativeElement.getBoundingClientRect();
    const x = event.clientX - gridRect.left;
    const y = event.clientY - gridRect.top;

    const items: ColumnMenuItemType[] = [
      { id: 'copyCell', label: `${this.i18nService.t('menu.copyCell')}`, icon: '📋', action: 'copyCell', shortcut: 'Ctrl+C' },
      { id: 'copyRow', label: `${this.i18nService.t('menu.copyRow')}`, icon: '📄', action: 'copyRow' },
      { id: 'sep1', type: 'separator' },
    ];
    if (context.colDef?.editable !== false) {
      items.push({ id: 'editCell', label: `${this.i18nService.t('menu.editCell')}`, icon: '✏️', action: 'editCell', shortcut: 'Enter' });
    }
    items.push(
      { id: 'sep2', type: 'separator' },
      { id: 'selectRow', label: `${this.i18nService.t('menu.selectRow')}`, icon: '✓', action: 'selectRow' },
      { id: 'clearSelection', label: `${this.i18nService.t('menu.clearSelection')}`, icon: '✕', action: 'clearSelection' }
    );

    this.gridMenuColId = context.colDef?.field || '';
    this.gridMenuPosition.set({ x, y });
    this.gridMenuItems.set(items);
    this.gridMenuVisible.set(true);
  }

  /** 关闭菜单 */
  closeGridMenu(): void {
    this.gridMenuVisible.set(false);
    this.gridMenuColId = '';
  }

  /** 菜单项点击处理 */
  onGridMenuItemClick(item: ColumnMenuItemType): void {
    if (item.disabled) return;

    // 子菜单项点击
    if (item.action === 'toggleColumn') {
      this.toggleColumnVisibility(item.id);
      this.closeGridMenu();
      return;
    }

    const colId = this.gridMenuColId;
    this.closeGridMenu();

    switch (item.action) {
      case 'sortAsc':
        this.dataService.setSortModel([{ colId, sort: 'asc' }]);
        this.syncSortState();
        this.refreshHeader();
        this.refreshView();
        break;
      case 'sortDesc':
        this.dataService.setSortModel([{ colId, sort: 'desc' }]);
        this.syncSortState();
        this.refreshHeader();
        this.refreshView();
        break;
      case 'clearSort':
        this.dataService.setSortModel([]);
        this.syncSortState();
        this.refreshHeader();
        this.refreshView();
        break;
      case 'pinLeft':
        this.columnService.setColumnPinned(colId, 'left');
        this.refreshView();
        break;
      case 'pinRight':
        this.columnService.setColumnPinned(colId, 'right');
        this.refreshView();
        break;
      case 'clearPinned':
        this.columnService.setColumnPinned(colId, null);
        this.refreshView();
        break;
      case 'hideColumn':
        this.columnService.setColumnHidden(colId, true);
        this.refreshHeader();
        this.refreshView();
        break;
      case 'autoSizeThis':
        this.autoSizeColumn(colId);
        break;
      case 'autoSizeAll':
        this.autoSizeAllColumns();
        break;
      case 'copyCell':
        this.copyCellToClipboard();
        break;
      case 'copyRow':
        this.copyRowToClipboard();
        break;
      case 'editCell':
        this.openCellEditor(0, this.columnDefs.find(c => (c.colId || c.field) === colId)!, undefined, { click: true });
        break;
      case 'selectRow':
        // 由上下文决定
        break;
      case 'clearSelection':
        this.deselectAll();
        break;
    }
  }

  /** 获取列显隐子菜单项 */
  private getColumnVisibilityItems(): ColumnMenuItemType[] {
    return this.columnService.getAllColumns().map(col => {
      const state = this.columnService.getColumnState(col);
      const colId = col.colId || col.field || '';
      return {
        id: colId,
        label: col.headerName || col.field || colId,
        icon: state?.hide ? '☐' : '☑',
        action: 'toggleColumn',
        checked: !state?.hide,
        disabled: col.lockVisible === true,
      };
    });
  }

  /** 切换列显隐 */
  private toggleColumnVisibility(colId: string): void {
    const state = this.columnService.getColumnState(this.columnService.getColumn(colId)!);
    if (state) {
      this.columnService.setColumnHidden(colId, !state.hide);
      this.refreshHeader();
      this.refreshView();
    }
  }

  /** 同步排序状态到 columnDefs */
  private syncSortState(): void {
    this.columnDefs.forEach(cd => {
      const state = this.dataService.getColumnSortState(cd.colId || cd.field);
      cd.sort = state.sort;
      cd.sortIndex = state.sortIndex ?? undefined;
    });
  }

  /** 自适应列宽 */
  private autoSizeColumn(colId: string): void {
    const col = this.columnService.getColumn(colId);
    if (!col) return;
    const field = col.field;
    if (!field) return;

    // 遍历可见行，计算最大内容宽度
    let maxWidth = 60; // 最小宽度
    const visibleData = this.dataService.getVisibleRows();
    const allData = this.getRowData();
    for (const row of allData) {
      const value = row[field];
      if (value !== undefined && value !== null) {
        const textWidth = String(value).length * 9 + 24; // 估算: 每字符9px + padding
        maxWidth = Math.max(maxWidth, textWidth);
      }
    }
    const headerWidth = (col.headerName || col.field || '').length * 9 + 40;
    maxWidth = Math.max(maxWidth, headerWidth, 80);
    this.columnService.setColumnWidth(colId, maxWidth);
    this.refreshHeader();
    this.refreshView();
  }

  /** 自适应所有列宽 */
  private autoSizeAllColumns(): void {
    const columns = this.columnService.getVisibleColumns();
    const allData = this.getRowData();
    for (const col of columns) {
      const field = col.field;
      if (!field) continue;
      let maxWidth = 60;
      for (const row of allData) {
        const value = row[field];
        if (value !== undefined && value !== null) {
          const textWidth = String(value).length * 9 + 24;
          maxWidth = Math.max(maxWidth, textWidth);
        }
      }
      const headerWidth = (col.headerName || col.field || '').length * 9 + 40;
      maxWidth = Math.max(maxWidth, headerWidth, 80);
      const colId = col.colId || col.field || '';
      this.columnService.setColumnWidth(colId, maxWidth);
    }
    this.refreshHeader();
    this.refreshView();
  }

  /** 复制单元格到剪贴板 */
  private copyCellToClipboard(): void {
    // 简单实现 - 后续可通过 SelectionService 获取当前选中单元格
    if (navigator.clipboard) {
      navigator.clipboard.writeText('').catch(() => {});
    }
  }

  /** 复制整行到剪贴板 */
  private copyRowToClipboard(): void {
    const selectedNodes = this.selectionService.getSelectedNodes();
    if (selectedNodes.length === 0) return;
    const text = selectedNodes.map(n => {
      const data = n.data;
      return Object.values(data).join('\t');
    }).join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  /** 打开子菜单（预留） */
  openSubmenu(item: ColumnMenuItemType): void {
    // 子菜单项的 hover 展开 — 当前用 inline 方式处理
  }

  // ========== 拖拽排序 API ==========

  startDrag(rowNodes: any[], event: MouseEvent): void {
    this.dragDropService.startRowDrag(rowNodes, event);
  }

  endDrag(targetIndex: number, event: MouseEvent): void {
    this.dragDropService.endRowDrag(targetIndex, event);
  }

  // ========== 范围选择 & 剪贴板 API ==========

  copyToClipboard(data?: any[], columns?: any[]): void {
    const rowData = data || this.getRowData();
    const cols = columns || this.columnDefs;
    this.rangeSelectionService.copyToClipboard(rowData, cols);
  }

  cutToClipboard(data?: any[], columns?: any[]): string {
    const rowData = data || this.getRowData();
    const cols = columns || this.columnDefs;
    return this.rangeSelectionService.cutToClipboard(rowData, cols);
  }

  async pasteFromClipboard(): Promise<string[][]> {
    return await this.rangeSelectionService.pasteFromClipboard();
  }

  toggleSidebar(panelId?: string): void {
    if (this.sidebarService.isVisible()) {
      this.sidebarService.hide();
    } else {
      this.sidebarService.show(panelId);
    }
  }

  // ========== 撤销/重做 API ==========

  undo(): void {
    const action = this.undoRedoService.undo();
    if (action) {
      this.applyUndoAction(action);
    }
  }

  redo(): void {
    const action = this.undoRedoService.redo();
    if (action) {
      this.applyRedoAction(action);
    }
  }

  private applyUndoAction(action: any): void {
    switch (action.type) {
      case 'edit':
        // 恢复旧值
        const rowNode = this.dataService.getRowNode(action.rowIndex);
        if (rowNode && action.colId) {
          rowNode.data[action.colId] = action.oldValue;
          this.refreshView();
        }
        break;
      case 'rowAdd':
        // 撤销添加 = 删除行
        // TODO: 实现行删除
        break;
      case 'rowDelete':
        // 撤销删除 = 添加行
        // TODO: 实现行添加
        break;
    }
  }

  private applyRedoAction(action: any): void {
    switch (action.type) {
      case 'edit':
        // 重做新值
        const rowNode = this.dataService.getRowNode(action.rowIndex);
        if (rowNode && action.colId) {
          rowNode.data[action.colId] = action.newValue;
          this.refreshView();
        }
        break;
      case 'rowAdd':
        // 重做添加
        // TODO: 实现行添加
        break;
      case 'rowDelete':
        // 重做删除
        // TODO: 实现行删除
        break;
    }
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
    // 撤销/重做快捷键
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'z' || event.key === 'Z') {
        if (event.shiftKey) {
          // Ctrl+Shift+Z = Redo
          if (this.undoRedoService.canRedo()) {
            this.redo();
            event.preventDefault();
            event.stopPropagation();
          }
        } else {
          // Ctrl+Z = Undo
          if (this.undoRedoService.canUndo()) {
            this.undo();
            event.preventDefault();
            event.stopPropagation();
          }
        }
        return;
      }
      if (event.key === 'y' || event.key === 'Y') {
        // Ctrl+Y = Redo
        if (this.undoRedoService.canRedo()) {
          this.redo();
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
    }

    if (!this.keyboardNavigationService) return;
    const result = this.keyboardNavigationService.handleKeyDown(event);
    if (result.consumed) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private refreshHeader(): void { this.renderHeader(); }

  /** 列拖拽重排：将 fromColId 移动到 toColId 的位置 */
  private reorderColumn(fromColId: string, toColId: string): void {
    const colDefs = this.columnDefs;
    if (!colDefs) return;

    const fromIdx = colDefs.findIndex(c => (c.colId || c.field) === fromColId);
    const toIdx = colDefs.findIndex(c => (c.colId || c.field) === toColId);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;

    // 移动列定义
    const [moved] = colDefs.splice(fromIdx, 1);
    // 如果向右拖，toIdx 需要减1（因为已经移除了一个元素）
    const insertIdx = fromIdx < toIdx ? toIdx - 1 : toIdx;
    colDefs.splice(insertIdx, 0, moved);

    // 触发事件
    this.colDragMoved.emit({ fromIndex: fromIdx, toIndex: insertIdx, column: moved });

    // 重新渲染
    this.refreshView();
  }

  private renderHeader(): void {
    const container = this.headerContainer.nativeElement;
    let headerElement: HTMLElement;
    let totalColWidth: number;

    if (this.enableColVirtualization) {
      // 列虚拟化：只渲染可见列的表头
      const bodyWidth = this.bodyContainer?.nativeElement?.clientWidth || 800;
      const colRange = this.columnService.getVisibleColumnsInRange(this.scrollLeft, bodyWidth, this.colVirtualBuffer);
      const result = this.headerRenderer.renderWithColumns(colRange);
      headerElement = result.headerElement as HTMLElement;
      // 列虚拟化模式下，计算可见列的总宽度（leftPinned + center + rightPinned）
      const pinnedLeftWidth = (colRange?.leftPinned || []).reduce((t, c) => t + (this.columnService.getColumnState(c)?.width || c.width || 200), 0);
      const centerWidth = (colRange?.center || []).reduce((t, c) => t + (this.columnService.getColumnState(c)?.width || c.width || 200), 0);
      const pinnedRightWidth = (colRange?.rightPinned || []).reduce((t, c) => t + (this.columnService.getColumnState(c)?.width || c.width || 200), 0);
      totalColWidth = pinnedLeftWidth + centerWidth + pinnedRightWidth;
    } else {
      // 常规模式：渲染所有列
      const result = this.headerRenderer.render();
      headerElement = result.headerElement as HTMLElement;
      totalColWidth = this.calculateTotalColumnWidth();
    }

    headerElement.style.height = `${this.headerHeight}px`;
    headerElement.style.width = `${totalColWidth}px`;
    headerElement.style.minWidth = `${totalColWidth}px`;
    container.innerHTML = '';
    container.appendChild(headerElement);

    headerElement.addEventListener('headerClick', ((e: CustomEvent) => { this.onHeaderClick(e.detail); }) as EventListener);
    headerElement.addEventListener('filterClick', ((e: CustomEvent) => {
      const { colDef, event } = e.detail;
      this.ngZone.run(() => this.openFilterPopup(colDef, event));
    }) as EventListener);
    headerElement.addEventListener('columnMenuClick', ((e: CustomEvent) => {
      const { colId, event } = e.detail;
      this.ngZone.run(() => this.showColumnGridMenu(colId, event));
    }) as EventListener);
    headerElement.addEventListener('headerContextMenu', ((e: CustomEvent) => {
      const { colDef, event } = e.detail;
      this.ngZone.run(() => this.showColumnGridMenu(colDef?.colId || colDef?.field || '', event));
    }) as EventListener);

    // 列拖拽回调
    this.headerRenderer.setOnColDragEnd((fromColId, toColId) => {
      this.reorderColumn(fromColId, toColId);
    });
    this.headerRenderer.setOnColumnResize((colId, newWidth) => {
      console.log('[DbGrid] Column resize callback:', colId, 'newWidth:', newWidth);
      const colDef = this.columnDefs.find(c => (c.colId || c.field) === colId);
      if (colDef) {
        colDef.width = newWidth;
        this.columnService.setColumnWidth(colId, newWidth);
        console.log('[DbGrid] Refreshing header and rows');
        this.refreshHeader();
        this.renderRows();
      }
    });
  }

  /** 渲染分页控件 */
  private renderFooter(): void {
    const container = this.footerContainer?.nativeElement;
    if (!container) return;

    const pageInfo = this.paginationService.getPageInfo();
    const totalRows = pageInfo.totalRows || 0;
    const pageSize = pageInfo.pageSize || 20;
    const currentPage = pageInfo.currentPage || 1;
    const totalPages = this.paginationService.getTotalPages();
    const startRow = totalRows > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const endRow = Math.min(currentPage * pageSize, totalRows);

    container.innerHTML = `
      <div class="db-grid-pagination">
        <span class="db-grid-pagination-info">
          显示 ${startRow}-${endRow} 条，共 ${totalRows} 条
        </span>
        <div class="db-grid-pagination-controls">
          <button class="db-grid-pagination-btn" data-action="first" ${currentPage <= 1 ? 'disabled' : ''}>|&lt;</button>
          <button class="db-grid-pagination-btn" data-action="prev" ${currentPage <= 1 ? 'disabled' : ''}>&lt;</button>
          ${this.renderPageButtons(currentPage, totalPages)}
          <button class="db-grid-pagination-btn" data-action="next" ${currentPage >= totalPages ? 'disabled' : ''}>&gt;</button>
          <button class="db-grid-pagination-btn" data-action="last" ${currentPage >= totalPages ? 'disabled' : ''}>&gt;|</button>
        </div>
        <select class="db-grid-pagination-size">
          <option value="10" ${pageSize === 10 ? 'selected' : ''}>10条/页</option>
          <option value="20" ${pageSize === 20 ? 'selected' : ''}>20条/页</option>
          <option value="50" ${pageSize === 50 ? 'selected' : ''}>50条/页</option>
          <option value="100" ${pageSize === 100 ? 'selected' : ''}>100条/页</option>
        </select>
      </div>
    `;

    // 绑定分页按钮事件
    container.querySelectorAll('.db-grid-pagination-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const action = target.dataset['action'];
        const page = target.dataset['page'] ? parseInt(target.dataset['page'], 10) : null;

        if (action === 'first') this.paginationService.setCurrentPage(1);
        else if (action === 'prev') this.paginationService.setCurrentPage(currentPage - 1);
        else if (action === 'next') this.paginationService.setCurrentPage(currentPage + 1);
        else if (action === 'last') this.paginationService.setCurrentPage(totalPages);
        else if (page) this.paginationService.setCurrentPage(page);

        this.renderFooter();
        this.renderRows();
      });
    });

    // 绑定每页条数选择事件
    const sizeSelect = container.querySelector('.db-grid-pagination-size') as HTMLSelectElement;
    if (sizeSelect) {
      sizeSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.paginationService.setPageSize(parseInt(target.value, 10));
        this.renderFooter();
        this.renderRows();
      });
    }
  }

  /** 渲染分页页码按钮 */
  private renderPageButtons(currentPage: number, totalPages: number): string {
    if (totalPages <= 1) return '';

    const buttons: string[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      buttons.push(`<button class="db-grid-pagination-btn" data-page="1">1</button>`);
      if (startPage > 2) buttons.push(`<span class="db-grid-pagination-ellipsis">...</span>`);
    }

    for (let i = startPage; i <= endPage; i++) {
      const active = i === currentPage ? 'active' : '';
      buttons.push(`<button class="db-grid-pagination-btn ${active}" data-page="${i}">${i}</button>`);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) buttons.push(`<span class="db-grid-pagination-ellipsis">...</span>`);
      buttons.push(`<button class="db-grid-pagination-btn" data-page="${totalPages}">${totalPages}</button>`);
    }

    return buttons.join('');
  }

  /** 刷新页脚 */
  refreshFooter(): void {
    if (this.pagination) this.renderFooter();
  }

  private renderRows(): void {
    // Guard: skip if view references are not yet initialized (called before ngAfterViewInit)
    // Guard: skip if view references are not yet initialized
    // Note: pinnedLeftContainer only exists when there are pinned left columns, so we check conditionally
    const hasRequiredContainers = this.rowsContainer?.nativeElement && this.virtualScroll?.nativeElement && this.bodyContainer?.nativeElement;
    const needsPinnedLeft = this.pinnedLeftColumnIds.length > 0;
    if (!hasRequiredContainers || (needsPinnedLeft && !this.pinnedLeftContainer?.nativeElement)) {
      this._pendingRefresh = true;
      return;
    }

    const viewport = this.viewportInfo();
    const rowsContainer = this.rowsContainer?.nativeElement;
    const virtualScroll = this.virtualScroll?.nativeElement;

    // Safety check: if containers are still not available, skip rendering
    if (!rowsContainer || !virtualScroll) {
      console.log('[DBGrid] renderRows skipped: rowsContainer or virtualScroll not available', {
        rowsContainer: !!rowsContainer,
        virtualScroll: !!virtualScroll,
      });
      return;
    }

    // 服务端模式：使用 serverSideService 获取数据
    if (this.enableServerSide && this.serverSideService.isEnabled()) {
      const totalHeight = this.serverSideService.getTotalHeight(this.rowHeight);
      virtualScroll.style.height = `${totalHeight}px`;

      // 设置总列宽以支持横向滚动
      const totalColWidth = this.calculateTotalColumnWidth();
      if (totalColWidth > 0) {
        virtualScroll.style.width = `${totalColWidth}px`;
        rowsContainer.style.width = `${totalColWidth}px`;
      }

      rowsContainer.innerHTML = '';
      if (this.pinnedLeftColumnIds.length > 0 && this.pinnedLeftContainer?.nativeElement) {
        this.pinnedLeftContainer.nativeElement.innerHTML = '';
      }
      rowsContainer.style.transform = `translateY(${viewport.offsetY}px)`;

      const visibleData = this.serverSideService.getRowsInRange(viewport.startIndex, viewport.endIndex);
      visibleData.forEach((data, i) => {
        if (!data) return;
        const rowIndex = viewport.startIndex + i;
        const rowId = data.id !== undefined ? String(data.id) : `row-${rowIndex}`;
        const rowNode = {
          id: rowId,
          data,
          rowIndex,
          selected: false,
          rowHeight: this.rowHeight,
          uiLevel: 0,
          isFloating: () => false,
          isFloatingRow: () => false,
          isSelected: () => false,
          setSelected: () => {},
          floatLeft: () => {},
          floatRight: () => {},
        } as any;
        const rowElement = this.rowRenderer.render(rowIndex, data, rowNode).rowElement;
        rowsContainer.appendChild(rowElement);
      });
      this.cdr.detectChanges();
      return;
    }

    const totalHeight = this.dataService.getTotalHeight();
    virtualScroll.style.height = `${totalHeight}px`;

    // 计算总列宽，设置到 virtualScroll 和 rowsContainer 以支持横向滚动
    const totalColWidth = this.calculateTotalColumnWidth();
    if (totalColWidth > 0) {
      virtualScroll.style.width = `${totalColWidth}px`;
      rowsContainer.style.width = `${totalColWidth}px`;
    }

    rowsContainer.innerHTML = '';
    rowsContainer.style.transform = `translateY(${viewport.offsetY}px)`;

    const visibleData = this.dataService.getVisibleRows();

    // 列虚拟化：计算可见列范围
    let colRange: { leftPinned: ColDef[]; center: ColDef[]; rightPinned: ColDef[]; offsetX: number; totalScrollableWidth: number } | null = null;
    if (this.enableColVirtualization) {
      const bodyWidth = this.bodyContainer?.nativeElement?.clientWidth || 800;
      colRange = this.columnService.getVisibleColumnsInRange(this.scrollLeft, bodyWidth, this.colVirtualBuffer);
      // 用可滚动区域的总宽度作为虚拟滚动宽度
      if (colRange) {
        const pinnedLeftWidth = colRange.leftPinned.reduce((t, c) => t + (this.columnService.getColumnState(c)?.width || 200), 0);
        const pinnedRightWidth = colRange.rightPinned.reduce((t, c) => t + (this.columnService.getColumnState(c)?.width || 200), 0);
        const totalW = pinnedLeftWidth + colRange.totalScrollableWidth + pinnedRightWidth;
        virtualScroll.style.width = `${totalW}px`;
        rowsContainer.style.width = `${totalW}px`;
        // 设置 pinned left 容器宽度（容器可能不存在，需要防御性检查）
        if (this.pinnedLeftContainer?.nativeElement) {
          this.pinnedLeftContainer.nativeElement.style.width = `${pinnedLeftWidth}px`;
          this.pinnedLeftContainer.nativeElement.style.height = `${totalHeight}px`;
        }
      }
    }

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
        // 树模式：合并树节点属性（children, hasChildren, level, expanded）
        if (this.isTreeMode) {
          const treeNode = this.treeService.getNode(rowId);
          if (treeNode) {
            rowNode.children = treeNode.children;
            rowNode.hasChildren = treeNode.hasChildren;
            rowNode.level = treeNode.level;
            rowNode.expanded = treeNode.expanded;
          }
        }

        if (this.enableColVirtualization && colRange) {
          // 列虚拟化：只渲染可见列（不含 pinned left，pinned 在独立层渲染）
          const renderResult = this.rowRenderer.render(rowIndex, data, rowNode);
          const rowElement = renderResult.rowElement;
          // 先清空默认渲染的所有列单元格
          rowElement.innerHTML = '';
          // 重新渲染仅可见列（排除 pinned left）
          const visibleCols = [...colRange.center, ...colRange.rightPinned];
          this.rowRenderer.renderCellsForColumns(rowElement, rowIndex, data, rowNode, visibleCols);
          // 为中间列设置偏移（pinned left 宽度）
          if (colRange.offsetX > 0) {
            for (let ci = 0; ci < colRange.center.length; ci++) {
              const cell = rowElement.children[ci] as HTMLElement;
              if (cell) {
                const existingTransform = cell.style.transform || '';
                cell.style.transform = `translateX(${colRange.offsetX}px) ${existingTransform}`.trim();
              }
            }
          }
          rowsContainer.appendChild(rowElement);
          this.setupRowEvents(rowElement, rowIndex, data, rowNode);

          // 渲染 pinned left 列到独立层
          if (colRange.leftPinned.length > 0) {
            const pinnedRowEl = document.createElement('div');
            pinnedRowEl.className = 'db-grid-row';
            pinnedRowEl.style.cssText = `display: flex; position: absolute; left: 0; transform: translateY(${viewport.offsetY + (viewport.startIndex + i) * this.rowHeight}px); z-index: 2;`;
            this.rowRenderer.renderCellsForColumns(pinnedRowEl, rowIndex, data, rowNode, colRange.leftPinned);
            if (this.pinnedLeftContainer?.nativeElement) {
              this.pinnedLeftContainer.nativeElement.appendChild(pinnedRowEl);
            }
          }
        } else {
          // 非列虚拟化模式：渲染全部列（pinned 列的 sticky 样式会生效）
          const { rowElement } = this.rowRenderer.render(rowIndex, data, rowNode);
          rowsContainer.appendChild(rowElement);
          this.setupRowEvents(rowElement, rowIndex, data, rowNode);

          // pinned left 独立层渲染（当有 pinned 列时）
          if (this.pinnedLeftColumnIds().length > 0) {
            const pinnedCols = this.columnService.getVisibleColumns().filter(c => c.pinnedLeft);
            if (pinnedCols.length > 0) {
              const pinnedRowEl = document.createElement('div');
              pinnedRowEl.className = 'db-grid-row';
              pinnedRowEl.style.cssText = `display: flex; position: absolute; left: 0; transform: translateY(${viewport.offsetY + (viewport.startIndex + i) * this.rowHeight}px); z-index: 2;`;
              this.rowRenderer.renderCellsForColumns(pinnedRowEl, rowIndex, data, rowNode, pinnedCols);
              if (this.pinnedLeftContainer?.nativeElement) {
                this.pinnedLeftContainer.nativeElement.appendChild(pinnedRowEl);
              }
            }
          }
        }
      }
    });

    // 应用单元格合并
    if (this.enableCellSpan) {
      this.applyCellSpans(rowsContainer);
    }

    // 渲染详情图表（主从表展开行）
    this.renderDetailCharts(viewport);

    this.cdr.detectChanges();
  }

  /** 应用单元格合并 */
  private applyCellSpans(rowsContainer: HTMLElement): void {
    if (!this.enableCellSpan || !this.cellSpanService) return;

    const rows = rowsContainer.querySelectorAll('.db-grid-row');
    rows.forEach((rowEl) => {
      const rowId = (rowEl as HTMLElement).dataset['rowId'] || '';
      // 通过 rowId 推算 rowIndex（data-row-index）
      const rowIndex = parseInt((rowEl as HTMLElement).dataset['rowIndex'] || '0', 10);

      // 遍历行中的单元格
      const cells = rowEl.querySelectorAll('.db-grid-cell');
      cells.forEach((cellEl) => {
        const colId = (cellEl as HTMLElement).dataset['colId'] || '';
        if (!colId) return;

        // 检查是否被合并掉
        if (this.cellSpanService.isSwappedOut(rowIndex, colId)) {
          (cellEl as HTMLElement).style.display = 'none';
          return;
        }

        // 获取合并信息
        const colSpan = this.cellSpanService.getColSpan(rowIndex, colId);
        const rowSpan = this.cellSpanService.getRowSpan(rowIndex, colId);

        if (colSpan > 1) {
          // 计算合并后的宽度
          let totalWidth = 0;
          const visibleCols = this.columnService.getVisibleColumns();
          const startIdx = visibleCols.findIndex(c => (c.colId || c.field) === colId);
          for (let c = startIdx; c < Math.min(startIdx + colSpan, visibleCols.length); c++) {
            totalWidth += this.columnService.getColumnState(visibleCols[c])?.width || visibleCols[c].width || 200;
          }
          (cellEl as HTMLElement).style.width = `${totalWidth}px`;
          (cellEl as HTMLElement).style.minWidth = `${totalWidth}px`;
          (cellEl as HTMLElement).style.flex = 'none';
        }

        if (rowSpan > 1) {
          // 计算合并后的高度
          const totalHeight = rowSpan * this.rowHeight;
          (cellEl as HTMLElement).style.height = `${totalHeight}px`;
        }
      });
    });
  }

  /** 渲染详情图表（主从表展开行） */
  private renderDetailCharts(viewport: { startIndex: number; endIndex: number; offsetY: number }): void {
    if (!this.masterDetailService?.isMasterDetail()) return;
    const gridOpts = this.gridOptions || {};
    const detailChart = (gridOpts as any).detailChartRenderer as DetailChartConfig | undefined;
    if (!detailChart) return;

    const rowsContainer = this.rowsContainer?.nativeElement;
    if (!rowsContainer) return;

    // 移除旧的详情行
    rowsContainer.querySelectorAll('.db-grid-detail-chart-row').forEach(el => el.remove());

    const expandedIds = this.masterDetailService.getExpandedNodeIds();
    if (expandedIds.length === 0) return;

    const visibleData = this.dataService.getVisibleRows();
    const detailHeight = detailChart.height || 200;

    visibleData.forEach((data, i) => {
      if (!data) return;
      const rowId = data.id !== undefined ? String(data.id) : `row-${viewport.startIndex + i}`;
      if (!expandedIds.includes(rowId)) return;

      const detailRow = document.createElement('div');
      detailRow.className = 'db-grid-detail-chart-row';
      detailRow.style.cssText = `display:flex;align-items:center;justify-content:center;padding:8px;background:#fafafa;border-top:1px solid #e0e0e0;border-bottom:1px solid #e0e0e0;`;
      detailRow.style.height = `${detailHeight}px`;

      const chartContainer = document.createElement('div');
      chartContainer.style.cssText = `width:100%;height:100%;max-width:${detailChart.type === 'bar' ? '100%' : '300px'};margin:0 auto;`;
      detailRow.appendChild(chartContainer);

      let chartData = detailChart.dataField ? data[detailChart.dataField] : undefined;
      let chartLabels = detailChart.labelsField ? data[detailChart.labelsField] : undefined;

      if (chartData && Array.isArray(chartData)) {
        this.chartsService.createDetailChart(chartContainer, {
          type: detailChart.type,
          title: detailChart.title,
          data: chartData,
          labels: chartLabels,
          colors: detailChart.colors,
          height: detailHeight,
          options: detailChart.options,
        });
      }

      // 插入到对应行之后（通过 data-row-id 精确定位，避免插入详情行后索引错位）
      const targetRow = rowsContainer.querySelector(`[data-row-id="${rowId}"]`) as HTMLElement;
      if (targetRow) {
        targetRow.after(detailRow);
      } else {
        rowsContainer.appendChild(detailRow);
      }
    });
  }

  // ============ 事件 ============

  onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const newScrollTop = target.scrollTop;
    const newScrollLeft = target.scrollLeft;

    // 同步表头横向滚动
    if (newScrollLeft !== this.scrollLeft) {
      this.scrollLeft = newScrollLeft;
      this.headerContainer.nativeElement.scrollLeft = newScrollLeft;

      // 列虚拟化：横向滚动时重新渲染
      if (this.enableColVirtualization) {
        const bodyWidth = this.bodyContainer.nativeElement.clientWidth;
        // 只在滚动超过一列宽度时才重新渲染，避免频繁重绘
        if (Math.abs(newScrollLeft - this.lastColRenderScrollLeft) > 50) {
          this.lastColRenderScrollLeft = newScrollLeft;
          this.renderRows();
          this.renderHeader();
        }
      }
    }

    if (newScrollTop !== this.scrollTop) {
      this.scrollTop = newScrollTop;
      this.dataService.setScrollTop(newScrollTop);

      // 服务端模式：使用 serverSideService 计算正确的 viewport
      if (this.enableServerSide && this.serverSideService.isEnabled()) {
        const ssRowCount = this.serverSideService.getRowCount();
        const bodyHeight = this.bodyContainer.nativeElement.clientHeight;
        const startIndex = Math.floor(newScrollTop / this.rowHeight);
        const visibleCount = Math.ceil(bodyHeight / this.rowHeight) + 1;
        const endIndex = Math.min(startIndex + visibleCount, ssRowCount);
        this.viewportInfo.set({
          startIndex,
          endIndex,
          offsetY: startIndex * this.rowHeight,
        });
        this.serverSideService.onScroll(newScrollTop, bodyHeight, this.rowHeight);
      } else {
        this.viewportInfo.set(this.dataService.getViewportInfo());
      }

      this.renderRows();
    }
    // 触发 viewportChanged 事件（用于行虚拟化性能追踪）
    this.ngZone.run(() => this.viewportChanged.emit(this.viewportInfo()));
  }

  private onWindowResize(): void {
    const bodyHeight = this.bodyContainer.nativeElement.clientHeight;
    this.dataService.setScrollConfig({ viewportHeight: bodyHeight });
    // 服务端模式：使用 serverSideService 计算正确的 viewport
    if (this.enableServerSide && this.serverSideService.isEnabled()) {
      const ssRowCount = this.serverSideService.getRowCount();
      const startIndex = Math.floor(this.scrollTop / this.rowHeight);
      const visibleCount = Math.ceil(bodyHeight / this.rowHeight) + 1;
      const endIndex = Math.min(startIndex + visibleCount, ssRowCount);
      this.viewportInfo.set({ startIndex, endIndex, offsetY: startIndex * this.rowHeight });
    } else {
      this.viewportInfo.set(this.dataService.getViewportInfo());
    }
    this.renderRows();
  }

  /** 计算所有可见列的总宽度 */
  private calculateTotalColumnWidth(): number {
    const columns = this.columnService.getVisibleColumns();
    return columns.reduce((total, col) => total + (col.width || 200), 0);
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
    this.refreshHeader(); // 刷新表头以更新排序图标 (▲/▼/⇅)
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

    // 右键菜单
    rowElement.addEventListener('contextmenu', (e: MouseEvent) => {
      const cell = (e.target as HTMLElement).closest('.db-grid-cell') as HTMLElement;
      const colId = cell?.dataset?.['colId'] || '';
      const colDef = this.columnDefs.find(c => (c.colId || c.field) === colId);
      this.ngZone.run(() => this.showCellContextMenu(e, { rowData: data, rowIndex, colDef }));
    });
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
