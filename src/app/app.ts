import { Component, OnInit, signal, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { DbGridComponent } from "../../projects/db-grid/src/lib/angular/components/grid/db-grid.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, DbGridComponent],
  templateUrl: "./app.html",
  styleUrl: "./app.scss",
})
export class AppComponent implements OnInit {
  gridApi: any = null;
  currentDemo = signal<string>("basic");
  selectedCount = signal<number>(0);
  apiStatus = signal<string>("未连接");
  quickFilter = signal<string>("");
  rowCount = signal<number>(0);

  @ViewChild("myGrid") myGrid!: DbGridComponent;

  basicColumnDefs = [
    { field: "id", headerName: "ID", width: 80, sortable: true, resizable: true, filter: false },
    { field: "name", headerName: "姓名", width: 150, sortable: true, resizable: true, filter: "text" },
    { field: "age", headerName: "年龄", width: 100, sortable: true, resizable: true, filter: "number" },
    { field: "email", headerName: "邮箱", width: 220, sortable: true, resizable: true, filter: "text" },
    { field: "department", headerName: "部门", width: 150, sortable: true, resizable: true, filter: "set" },
    { field: "position", headerName: "职位", width: 150, sortable: true, resizable: true, filter: "set" },
    { field: "salary", headerName: "薪资", width: 120, sortable: true, resizable: true, filter: "number" },
    { field: "startDate", headerName: "入职日期", width: 130, sortable: true, resizable: true, filter: "date" },
    { field: "status", headerName: "状态", width: 100, sortable: true, resizable: true, filter: "set" },
  ];

  basicRowData = this.generateEmployeeData(100);
  basicOptions = { rowSelection: "multiple", animateRows: true, sortable: true, filter: true };

  // Tree data
  treeColumnDefs = [
    { field: "name", headerName: "组织架构", width: 300, sortable: true, filter: "text" },
    { field: "type", headerName: "类型", width: 120, filter: "set" },
    { field: "manager", headerName: "负责人", width: 150, filter: "text" },
    { field: "employees", headerName: "员工数", width: 100, filter: "number" },
    { field: "budget", headerName: "预算", width: 120, filter: "text" },
  ];

  treeRowData = [
    { id: "1", name: "总公司", type: "company", manager: "张三", employees: 500, budget: "1亿", parentId: null },
    { id: "2", name: "技术部", type: "department", manager: "李四", employees: 100, budget: "2000万", parentId: "1" },
    { id: "3", name: "前端组", type: "team", manager: "王五", employees: 30, budget: "500万", parentId: "2" },
    { id: "4", name: "后端组", type: "team", manager: "赵六", employees: 35, budget: "600万", parentId: "2" },
    { id: "5", name: "运维组", type: "team", manager: "孙七", employees: 15, budget: "300万", parentId: "2" },
    { id: "6", name: "基础架构组", type: "team", manager: "周八", employees: 20, budget: "600万", parentId: "2" },
    { id: "7", name: "产品部", type: "department", manager: "吴九", employees: 50, budget: "800万", parentId: "1" },
    { id: "8", name: "产品设计组", type: "team", manager: "郑十", employees: 25, budget: "400万", parentId: "7" },
    { id: "9", name: "产品运营组", type: "team", manager: "钱十一", employees: 25, budget: "400万", parentId: "7" },
    { id: "10", name: "市场部", type: "department", manager: "陈十二", employees: 80, budget: "1500万", parentId: "1" },
    { id: "11", name: "销售组", type: "team", manager: "林十三", employees: 50, budget: "1000万", parentId: "10" },
    { id: "12", name: "市场推广组", type: "team", manager: "黄十四", employees: 30, budget: "500万", parentId: "10" },
    { id: "13", name: "人力资源部", type: "department", manager: "刘十五", employees: 30, budget: "500万", parentId: "1" },
    { id: "14", name: "招聘组", type: "team", manager: "杨十六", employees: 15, budget: "200万", parentId: "13" },
    { id: "15", name: "培训组", type: "team", manager: "许十七", employees: 15, budget: "300万", parentId: "13" },
    { id: "16", name: "财务部", type: "department", manager: "何十八", employees: 40, budget: "600万", parentId: "1" },
    { id: "17", name: "财务会计组", type: "team", manager: "罗十九", employees: 25, budget: "350万", parentId: "16" },
    { id: "18", name: "成本控制组", type: "team", manager: "胡二十", employees: 15, budget: "250万", parentId: "16" },
    { id: "19", name: "研发部", type: "department", manager: "朱廿一", employees: 200, budget: "4000万", parentId: "1" },
    { id: "20", name: "算法组", type: "team", manager: "潘廿二", employees: 40, budget: "800万", parentId: "19" },
    { id: "21", name: "数据组", type: "team", manager: "冯廿三", employees: 50, budget: "1000万", parentId: "19" },
    { id: "22", name: "移动开发组", type: "team", manager: "董廿四", employees: 60, budget: "1200万", parentId: "19" },
    { id: "23", name: "安全组", type: "team", manager: "萧廿五", employees: 25, budget: "500万", parentId: "19" },
    { id: "24", name: "测试组", type: "team", manager: "程廿六", employees: 25, budget: "500万", parentId: "19" },
  ];

  treeConfig = { idField: "id", parentField: "parentId" };
  treeOptions = { rowSelection: "multiple" };

  // Group data
  groupColumnDefs = [
    { field: "product", headerName: "产品", width: 150, sortable: true, filter: "text" },
    { field: "category", headerName: "分类", width: 120, sortable: true, filter: "set" },
    { field: "region", headerName: "地区", width: 120, sortable: true, filter: "set" },
    { field: "quarter", headerName: "季度", width: 100, sortable: true, filter: "set" },
    { field: "sales", headerName: "销售额", width: 120, sortable: true, filter: "number" },
    { field: "profit", headerName: "利润", width: 100, sortable: true, filter: "number" },
    { field: "quantity", headerName: "数量", width: 100, filter: "number" },
  ];

  groupRowData = this.generateSalesData(50);
  groupConfig = { groupFields: ["category", "region"], autoCreateGroupColumn: true, expandAll: true };
  groupOptions = {};

  // Excel data
  excelColumnDefs = [
    { field: "id", headerName: "编号", width: 80, filter: "number" },
    { field: "productName", headerName: "产品名称", width: 200, filter: "text" },
    { field: "category", headerName: "类别", width: 150, filter: "set" },
    { field: "price", headerName: "单价", width: 100, filter: "number" },
    { field: "quantity", headerName: "数量", width: 100, filter: "number" },
    { field: "amount", headerName: "金额", width: 120, filter: "number" },
    { field: "customer", headerName: "客户", width: 150, filter: "text" },
    { field: "salesman", headerName: "业务员", width: 120, filter: "text" },
    { field: "orderDate", headerName: "订单日期", width: 130, filter: "date" },
    { field: "status", headerName: "状态", width: 100, filter: "set" },
  ];

  excelRowData = this.generateSalesOrderData(200);
  excelOptions = { rowSelection: "multiple" };

  // Span data
  spanColumnDefs = [
    { field: "region", headerName: "地区", width: 150, filter: "set" },
    { field: "product", headerName: "产品", width: 150, filter: "set" },
    { field: "q1", headerName: "Q1销售额", width: 120, filter: "number" },
    { field: "q2", headerName: "Q2销售额", width: 120, filter: "number" },
    { field: "q3", headerName: "Q3销售额", width: 120, filter: "number" },
    { field: "q4", headerName: "Q4销售额", width: 120, filter: "number" },
    { field: "total", headerName: "年度总计", width: 130, filter: "number" },
  ];

  spanRowData = this.generateRegionalData();
  spanOptions = {};

  // ========== 行内编辑数据 ==========
  editColumnDefs = [
    { field: "id", headerName: "ID", width: 80, editable: false, filter: "number" },
    { field: "name", headerName: "姓名", width: 150, editable: true, sortable: true, filter: "text" },
    { field: "age", headerName: "年龄", width: 100, editable: true, sortable: true, cellEditor: "number", filter: "number" },
    { field: "email", headerName: "邮箱", width: 220, editable: true, filter: "text" },
    { field: "department", headerName: "部门", width: 150, editable: true, filter: "set", cellEditor: "select", cellEditorParams: { values: ["技术部", "产品部", "市场部", "人力资源部", "财务部", "研发部", "运营部", "客服部"] } },
    { field: "position", headerName: "职位", width: 150, editable: true, filter: "set" },
    { field: "salary", headerName: "薪资", width: 120, editable: true, cellEditor: "number", filter: "number" },
    { field: "status", headerName: "状态", width: 100, editable: true, filter: "set", cellEditor: "select", cellEditorParams: { values: ["在职", "出差", "休假", "离职"] } },
  ];
  editRowData = this.generateEmployeeData(30);
  editOptions = { rowSelection: "multiple" };

  // ========== 列固定数据 ==========
  pinColumnDefs = [
    { field: "id", headerName: "ID", width: 80, pinnedLeft: true, filter: "number" },
    { field: "name", headerName: "姓名", width: 150, pinnedLeft: true, filter: "text" },
    { field: "age", headerName: "年龄", width: 100, filter: "number" },
    { field: "email", headerName: "邮箱", width: 220, filter: "text" },
    { field: "department", headerName: "部门", width: 150, filter: "set" },
    { field: "position", headerName: "职位", width: 150, filter: "set" },
    { field: "salary", headerName: "薪资", width: 120, filter: "number" },
    { field: "startDate", headerName: "入职日期", width: 130, filter: "date" },
    { field: "status", headerName: "状态", width: 100, pinnedRight: true, filter: "set" },
  ];
  pinOptions = { rowSelection: "multiple" };

  // ========== 拖拽排序数据 ==========
  dragRowData = this.generateEmployeeData(20);
  dragOptions = { rowSelection: "multiple", animateRows: true };

  // ========== 数据透视数据 ==========
  pivotColumnDefs = [
    { field: 'country', headerName: '国家', width: 100, filter: 'set' },
    { field: 'product', headerName: '产品', width: 120, filter: 'set' },
    { field: 'year', headerName: '年份', width: 100, filter: 'set' },
    { field: 'sales', headerName: '销售额', width: 120, filter: 'number' },
    { field: 'profit', headerName: '利润', width: 100, filter: 'number' },
    { field: 'quantity', headerName: '销量', width: 100, filter: 'number' },
  ];
  pivotRowData = this.generatePivotData();
  pivotOptions = {};

  // ========== 当前主题 ==========
  currentTheme = signal<string>("alpine");
  p0ColumnDefs = [
    { field: "id", headerName: "ID", width: 80, sortable: true, filter: false, editable: false },
    { field: "name", headerName: "姓名", width: 120, sortable: true, filter: "text", editable: true },
    { field: "age", headerName: "年龄", width: 90, sortable: true, filter: "number", editable: true, cellEditor: "number" },
    { field: "email", headerName: "邮箱", width: 200, sortable: true, filter: "text", editable: true },
    { field: "department", headerName: "部门", width: 130, sortable: true, filter: "set", editable: true, cellEditor: "select", cellEditorParams: { values: ["技术部", "产品部", "市场部", "人力资源部", "财务部", "研发部", "运营部", "客服部"] } },
    { field: "position", headerName: "职位", width: 120, sortable: true, filter: "set", editable: true },
    { field: "salary", headerName: "薪资", width: 110, sortable: true, filter: "number", editable: true, cellEditor: "number" },
    { field: "startDate", headerName: "入职日期", width: 120, sortable: true, filter: "date", editable: true, cellEditor: "date" },
    { field: "status", headerName: "状态", width: 100, sortable: true, filter: "set", editable: true, cellEditor: "select", cellEditorParams: { values: ["在职", "出差", "休假", "离职"] } },
    { field: "active", headerName: "激活", width: 80, sortable: true, filter: "boolean", editable: true, cellEditor: "checkbox" },
  ];
  p0RowData = this.generateEmployeeData(50);
  p0Options = { 
    rowSelection: "multiple", 
    animateRows: true,
    multiSortKey: "shift",
    enableCellEdit: true,
    editOnDoubleClick: true,
  };
  p0FilterModel = signal<string>("无");

  // ========== 服务端数据演示 ==========
  serverColumnDefs = [
    { field: "id", headerName: "ID", width: 80, sortable: true, filter: "number" },
    { field: "name", headerName: "姓名", width: 150, sortable: true, filter: "text" },
    { field: "email", headerName: "邮箱", width: 220, filter: "text" },
    { field: "department", headerName: "部门", width: 150, filter: "set" },
    { field: "position", headerName: "职位", width: 150, filter: "set" },
    { field: "salary", headerName: "薪资", width: 120, sortable: true, filter: "number" },
    { field: "status", headerName: "状态", width: 100, filter: "set" },
  ];
  serverSideDatasource = {
    getRows: (params: any) => {
      // 模拟服务端延迟
      setTimeout(() => {
        const rows = this.generateEmployeeData(params.endRow - params.startRow).map((row, i) => ({
          ...row,
          id: params.startRow + i + 1,
        }));
        // 模拟总行数 1000
        const lastRow = params.endRow >= 1000 ? 1000 : undefined;
        params.successCallback(rows, lastRow);
      }, 300);
    }
  };
  serverConfig = { pageSize: 50, cacheBlockSize: 50, maxBlocksInCache: 10 };
  serverLoading = signal<boolean>(false);
  serverRowCount = signal<number>(-1);

  // ========== Master-Detail 演示 ==========
  masterColumnDefs = [
    { field: "id", headerName: "订单ID", width: 100 },
    { field: "customer", headerName: "客户", width: 150 },
    { field: "date", headerName: "日期", width: 120 },
    { field: "total", headerName: "总金额", width: 120 },
    { field: "status", headerName: "状态", width: 100 },
  ];
  masterRowData = this.generateOrdersWithDetails(20);
  detailColumnDefs = [
    { field: "productId", headerName: "产品ID", width: 100 },
    { field: "productName", headerName: "产品名称", width: 200 },
    { field: "quantity", headerName: "数量", width: 100 },
    { field: "price", headerName: "单价", width: 100 },
    { field: "subtotal", headerName: "小计", width: 120 },
  ];
  masterDetailConfig = {
    masterDetail: true,
    detailCellRendererParams: {
      detailGridOptions: {
        columnDefs: this.detailColumnDefs,
      },
      getDetailRowData: (params: any) => {
        params.successCallback(params.data.details);
      },
    },
  };

  // ========== Undo/Redo 演示 ==========
  undoRedoColumnDefs = [
    { field: "id", headerName: "ID", width: 80, editable: false },
    { field: "name", headerName: "姓名", width: 150, editable: true },
    { field: "age", headerName: "年龄", width: 100, editable: true, cellEditor: "number" },
    { field: "department", headerName: "部门", width: 150, editable: true, cellEditor: "select", cellEditorParams: { values: ["技术部", "产品部", "市场部", "财务部"] } },
    { field: "salary", headerName: "薪资", width: 120, editable: true, cellEditor: "number" },
  ];
  undoRedoRowData = this.generateEmployeeData(50);
  undoRedoOptions = { enableCellEdit: true, editOnDoubleClick: true };
  canUndo = signal<boolean>(false);
  canRedo = signal<boolean>(false);
  undoStackSize = signal<number>(0);
  redoStackSize = signal<number>(0);

  // ========== 键盘导航演示 ==========
  keyboardColumnDefs = [
    { field: "id", headerName: "ID", width: 80, sortable: true, filter: "number" },
    { field: "name", headerName: "姓名", width: 150, sortable: true, filter: "text", editable: true },
    { field: "email", headerName: "邮箱", width: 220, filter: "text", editable: true },
    { field: "department", headerName: "部门", width: 150, filter: "set" },
    { field: "position", headerName: "职位", width: 150, filter: "set" },
    { field: "salary", headerName: "薪资", width: 120, filter: "number", editable: true, cellEditor: "number" },
    { field: "status", headerName: "状态", width: 100, filter: "set" },
  ];
  keyboardRowData = this.generateEmployeeData(30);
  keyboardOptions = { enableCellEdit: true, editOnDoubleClick: true };
  keyboardHint = signal<string>("使用方向键导航，Enter编辑，Tab跳转，F2编辑，Escape取消");
  currentPosition = signal<string>("");

  // ========== 聚合演示 ==========
  aggColumnDefs = [
    { field: "product", headerName: "产品", width: 150, rowGroup: true, filter: "text" },
    { field: "category", headerName: "分类", width: 120, rowGroup: true, filter: "set" },
    { field: "region", headerName: "地区", width: 120, filter: "set" },
    { field: "sales", headerName: "销售额", width: 120, aggFunc: "sum", filter: "number" },
    { field: "profit", headerName: "利润", width: 120, aggFunc: "sum", filter: "number" },
    { field: "quantity", headerName: "数量", width: 100, aggFunc: "avg", filter: "number" },
  ];
  aggRowData = this.generateSalesData(40);
  aggOptions = {};

  // ========== 单元格合并演示 ==========
  autoMergeEnabled = signal<boolean>(true);
  spanConfig = { autoMerge: true, mergeColumns: ['region', 'product'] };

  toggleAutoMerge(): void {
    this.autoMergeEnabled.update(v => !v);
    if (this.gridApi) {
      const service = this.gridApi.getCellSpanService?.();
      if (service) {
        service.initialize(this.spanColumnDefs, this.spanRowData, {
          autoMerge: this.autoMergeEnabled(),
          mergeColumns: ['region', 'product']
        });
      }
    }
  }

  setManualSpan(): void {
    if (this.gridApi) {
      const service = this.gridApi.getCellSpanService?.();
      if (service) {
        // 手动设置第一行 region 列跨2列
        service.setManualSpan(0, 'region', 2, 1);
      }
    }
  }

  // ========== 行拖拽演示 ==========
  rowDragEnabled = signal<boolean>(true);
  multiDragEnabled = signal<boolean>(false);
  dragColumnDefs = [
    { field: "id", headerName: "ID", width: 80, sortable: true },
    { field: "name", headerName: "姓名", width: 150, sortable: true },
    { field: "age", headerName: "年龄", width: 100, sortable: true },
    { field: "email", headerName: "邮箱", width: 220 },
    { field: "department", headerName: "部门", width: 150 },
    { field: "position", headerName: "职位", width: 150 },
    { field: "salary", headerName: "薪资", width: 120, sortable: true },
    { field: "status", headerName: "状态", width: 100 },
  ];

  toggleRowDrag(): void {
    this.rowDragEnabled.update(v => !v);
    if (this.gridApi) {
      const service = this.gridApi.getRowDragService?.();
      if (service) {
        this.rowDragEnabled() ? service.enable() : service.disable();
      }
    }
  }

  toggleMultiDrag(): void {
    this.multiDragEnabled.update(v => !v);
    if (this.gridApi) {
      const service = this.gridApi.getRowDragService?.();
      if (service) {
        service.initialize({ rowDragEnabled: this.rowDragEnabled(), rowDragMultiRow: this.multiDragEnabled() });
      }
    }
  }

  // ========== 数据透视演示 ==========
  pivotEnabled = signal<boolean>(false);
  pivotValueColumns = [
    { field: 'sales', aggFunc: 'sum' },
    { field: 'profit', aggFunc: 'sum' },
  ];

  applyPivot(): void {
    this.pivotEnabled.set(true);
  }

  clearPivot(): void {
    this.pivotEnabled.set(false);
  }

  private generatePivotData(): any[] {
    const countries = ['中国', '美国', '德国', '日本', '英国'];
    const products = ['手机', '笔记本', '平板', '耳机', '手表'];
    const years = ['2022', '2023', '2024'];
    const data: any[] = [];
    for (const country of countries) {
      for (const product of products) {
        for (const year of years) {
          const sales = Math.floor(500 + Math.random() * 2000);
          const profit = Math.floor(sales * (0.1 + Math.random() * 0.2));
          const quantity = Math.floor(50 + Math.random() * 500);
          data.push({ country, product, year, sales, profit, quantity });
        }
      }
    }
    return data;
  }

  // ========== 列虚拟化演示 ==========
  colVirtualColumnDefs = this.generateManyColumns(100);
  colVirtualRowData = this.generateWideData(50, 100);
  colVirtualOptions = {};

  /** 生成大量列定义 */
  generateManyColumns(count: number): any[] {
    const cols: any[] = [
      { field: 'id', headerName: 'ID', width: 80, pinnedLeft: true },
      { field: 'name', headerName: '名称', width: 120, pinnedLeft: true },
    ];
    for (let i = 0; i < count; i++) {
      cols.push({
        field: `col_${i}`,
        headerName: `列 ${i + 1}`,
        width: 120,
        sortable: i % 5 === 0,
        filter: i % 3 === 0 ? 'text' : undefined,
      });
    }
    cols.push({ field: 'total', headerName: '总计', width: 120, pinnedRight: true });
    return cols;
  }

  /** 生成宽表数据 */
  generateWideData(rows: number, cols: number): any[] {
    const data: any[] = [];
    for (let r = 0; r < rows; r++) {
      const row: any = { id: r + 1, name: `项目 ${r + 1}` };
      let total = 0;
      for (let c = 0; c < cols; c++) {
        const val = Math.round(Math.random() * 1000);
        row[`col_${c}`] = val;
        total += val;
      }
      row.total = total;
      data.push(row);
    }
    return data;
  }

  // ========== 分页状态 ==========
  currentPage = signal<number>(1);
  totalPages = signal<number>(5);

  ngOnInit(): void {}

  onGridReady(event: any): void {
    this.gridApi = event.api;
    this.apiStatus.set("已连接");
    const rowData = event.api.getRowData?.() || [];
    this.rowCount.set(rowData.length);
    if (this.currentDemo() === "span" && this.gridApi) {
      const service = this.gridApi.getCellSpanService?.();
      if (service) service.initialize(this.spanColumnDefs, this.spanRowData, { autoMerge: true, mergeColumns: ["region"] });
    }
    if (this.currentDemo() === "server" && this.gridApi) {
      const ss = this.gridApi.getServerSideService?.();
      if (ss) {
        ss.onLoadingChangedEvent((loading: boolean) => this.serverLoading.set(loading));
        ss.onRowsUpdatedEvent(() => this.serverRowCount.set(ss.getRowCount()));
      }
    }
    if (this.currentDemo() === "undoredo" && this.gridApi) {
      this.updateUndoRedoState();
    }
  }

  onRowClicked(event: any): void { console.log("Row clicked:", event.data); }
  onSortChanged(event: any): void { console.log("Sort:", event.colDef?.sort); }
  onSelectionChanged(event: any): void { this.selectedCount.set((this.gridApi?.getSelectedRows() || []).length); }
  onNodeExpanded(event: any): void { console.log("Node expanded:", event.node?.id); }
  onNodeCollapsed(event: any): void { console.log("Node collapsed:", event.node?.id); }
  onGroupExpanded(event: any): void { console.log("Group expanded:", event.node?.id); }
  onGroupCollapsed(event: any): void { console.log("Group collapsed:", event.node?.id); }

  switchDemo(demo: string): void {
    this.currentDemo.set(demo);
    this.selectedCount.set(0);
    this.gridApi = null;
    this.apiStatus.set("未连接");
  }


  switchTheme(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.currentTheme.set(select.value);
  }

  expandAll(): void {
    if (!this.gridApi) return;
    if (this.currentDemo() === "tree") this.gridApi.expandAll();
    if (this.currentDemo() === "group") this.gridApi.expandAllGroups();
  }

  collapseAll(): void {
    if (!this.gridApi) return;
    if (this.currentDemo() === "tree") this.gridApi.collapseAll();
    if (this.currentDemo() === "group") this.gridApi.collapseAllGroups();
  }

  selectAll(): void { if (this.gridApi) this.gridApi.selectAll(); }
  clearSelection(): void { if (this.gridApi) this.gridApi.deselectAll(); }
  exportCsv(): void { if (this.gridApi) this.gridApi.downloadExcel({ exportMode: "csv", fileName: "db-grid-export.csv" }); }
  exportExcel(): void { if (this.gridApi) this.gridApi.downloadExcel({ exportMode: "xlsx", fileName: "db-grid-export.xlsx" }); }

  // ========== 键盘导航方法 ==========
  onCellFocused(event: any): void {
    if (event?.column?.colId && event?.rowIndex !== undefined) {
      this.currentPosition.set(`行: ${event.rowIndex + 1}, 列: ${event.column.colId}`);
    }
  }

  // ========== 分页方法 ==========
  firstPage(): void { if (this.gridApi) { this.gridApi.firstPage(); this.updatePaginationInfo(); } }
  prevPage(): void { if (this.gridApi) { this.gridApi.previousPage(); this.updatePaginationInfo(); } }
  nextPage(): void { if (this.gridApi) { this.gridApi.nextPage(); this.updatePaginationInfo(); } }
  lastPage(): void { if (this.gridApi) { this.gridApi.lastPage(); this.updatePaginationInfo(); } }

  private updatePaginationInfo(): void {
    if (this.gridApi) {
      const info = this.gridApi.getPaginationInfo?.();
      if (info) {
        this.currentPage.set(info.currentPage);
        this.totalPages.set(info.totalPages);
      }
    }
  }

  // ========== P0 功能演示方法 ==========
  onFilterChanged(event: any): void {
    const model = this.gridApi?.getFilterModel?.();
    this.p0FilterModel.set(model ? JSON.stringify(model, null, 2) : "无");
  }

  clearAllFilters(): void {
    if (this.gridApi) {
      this.gridApi.setFilterModel({});
      this.gridApi.clearQuickFilter();
      this.quickFilter.set("");
      this.p0FilterModel.set("无");
    }
  }

  onQuickFilterChange(value: string): void {
    this.quickFilter.set(value);
    this.gridApi?.setQuickFilter(value);
  }

  getFilterSummary(): string {
    const model = this.gridApi?.getFilterModel?.();
    if (!model || Object.keys(model).length === 0) return "无筛选条件";
    return Object.entries(model).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("; ");
  }

  private generateEmployeeData(count: number): any[] {
    const names = ["张伟","王芳","李明","刘洋","陈静","杨帆","赵雷","黄丽","周杰","吴敏","徐强","孙悦","马超","朱华"];
    const departments = ["技术部","产品部","市场部","人力资源部","财务部","研发部","运营部","客服部"];
    const positions = ["工程师","经理","主管","专员","总监","助理","顾问","分析师"];
    const statuses = ["在职","出差","休假"];
    const data: any[] = [];
    for (let i = 1; i <= count; i++) {
      const year = 2020 + (i % 5);
      const month = (i % 12) + 1;
      const day = (i % 28) + 1;
      data.push({
        id: i,
        name: names[i % names.length],
        age: 22 + (i % 30),
        email: `user${i}@example.com`,
        department: departments[i % departments.length],
        position: positions[i % positions.length],
        salary: Math.floor(8000 + Math.random() * 30000),
        startDate: `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`,
        status: statuses[i % statuses.length],
      });
    }
    return data;
  }

  private generateSalesData(count: number): any[] {
    const categories = ["电子产品","办公用品","家具","服装","食品"];
    const regions = ["华东","华南","华北","华西","华中"];
    const quarters = ["Q1","Q2","Q3","Q4"];
    const products = ["笔记本电脑","打印机","办公桌","T恤","饮料","手机","显示器","椅子","裤子","零食"];
    const data: any[] = [];
    for (let i = 0; i < count; i++) {
      const sales = Math.floor(10000 + Math.random() * 100000);
      data.push({
        id: i+1,
        product: products[i % products.length],
        category: categories[i % categories.length],
        region: regions[Math.floor(i/5) % regions.length],
        quarter: quarters[Math.floor(i/25) % 4],
        sales: sales.toLocaleString(),
        profit: Math.floor(sales * (0.1 + Math.random() * 0.3)).toLocaleString(),
        quantity: Math.floor(10 + Math.random() * 500),
      });
    }
    return data;
  }

  private generateSalesOrderData(count: number): any[] {
    const categories = ["电子产品","办公用品","建材","图书","食品"];
    const customers = ["阿里巴巴","腾讯","百度","字节跳动","美团","京东","拼多多","网易","滴滴","小米"];
    const salesmen = ["张明","李华","王强","赵丽","陈军","刘芳","杨洋","周杰","吴静","徐磊"];
    const statuses = ["已完成","处理中","待发货","已取消"];
    const data: any[] = [];
    for (let i = 1; i <= count; i++) {
      const price = Math.floor(100 + Math.random() * 10000);
      const quantity = Math.floor(1 + Math.random() * 100);
      const amount = price * quantity;
      const month = (i % 12) + 1;
      const day = (i % 28) + 1;
      data.push({
        id: `ORD${String(i).padStart(6,"0")}`,
        productName: `产品${i}`,
        category: categories[i % categories.length],
        price: price.toLocaleString(),
        quantity,
        amount: amount.toLocaleString(),
        customer: customers[i % customers.length],
        salesman: salesmen[i % salesmen.length],
        orderDate: `2024-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`,
        status: statuses[i % statuses.length],
      });
    }
    return data;
  }

  // ========== Undo/Redo 演示方法 ==========
  undo(): void {
    if (this.gridApi) {
      this.gridApi.undo?.();
      this.updateUndoRedoState();
    }
  }

  redo(): void {
    if (this.gridApi) {
      this.gridApi.redo?.();
      this.updateUndoRedoState();
    }
  }

  private updateUndoRedoState(): void {
    const undoRedoService = this.gridApi?.getUndoRedoService?.();
    if (undoRedoService) {
      this.canUndo.set(undoRedoService.canUndo());
      this.canRedo.set(undoRedoService.canRedo());
      this.undoStackSize.set(undoRedoService.getUndoStackSize());
      this.redoStackSize.set(undoRedoService.getRedoStackSize());
    }
  }

  private generateOrdersWithDetails(count: number): any[] {
    const customers = ["阿里巴巴", "腾讯", "百度", "字节跳动", "美团", "京东", "拼多多", "网易"];
    const statuses = ["已完成", "处理中", "待发货", "已取消"];
    const products = [
      { id: "P001", name: "笔记本电脑", price: 5999 },
      { id: "P002", name: "显示器", price: 1299 },
      { id: "P003", name: "键盘", price: 299 },
      { id: "P004", name: "鼠标", price: 199 },
      { id: "P005", name: "耳机", price: 899 },
    ];
    const data: any[] = [];
    for (let i = 1; i <= count; i++) {
      const details = [];
      const itemCount = 1 + Math.floor(Math.random() * 3);
      let total = 0;
      for (let j = 0; j < itemCount; j++) {
        const product = products[j % products.length];
        const quantity = 1 + Math.floor(Math.random() * 5);
        const subtotal = product.price * quantity;
        total += subtotal;
        details.push({
          productId: product.id,
          productName: product.name,
          quantity,
          price: product.price,
          subtotal,
        });
      }
      const month = (i % 12) + 1;
      const day = (i % 28) + 1;
      data.push({
        id: `ORD${String(i).padStart(5, "0")}`,
        customer: customers[i % customers.length],
        date: `2024-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        total: total.toLocaleString(),
        status: statuses[i % statuses.length],
        details,
      });
    }
    return data;
  }

  private generateRegionalData(): any[] {
    const regions = ["华东","华南","华北","华西","华中"];
    const products = ["智能手机","笔记本电脑","平板电脑","智能手表","无线耳机","显示器"];
    const data: any[] = [];
    let id = 1;
    for (const region of regions) {
      for (const product of products) {
        const q1 = Math.floor(100 + Math.random() * 900);
        const q2 = Math.floor(100 + Math.random() * 900);
        const q3 = Math.floor(100 + Math.random() * 900);
        const q4 = Math.floor(100 + Math.random() * 900);
        data.push({ id: id++, region, product, q1, q2, q3, q4, total: q1+q2+q3+q4 });
      }
    }
    return data;
  }

  // ========== 行虚拟化演示 ==========
  rowVirtualColumnDefs = [
    { field: "id", headerName: "ID", width: 80, filter: "number" },
    { field: "name", headerName: "姓名", width: 120, sortable: true },
    { field: "age", headerName: "年龄", width: 80, sortable: true, filter: "number" },
    { field: "email", headerName: "邮箱", width: 220, sortable: true },
    { field: "department", headerName: "部门", width: 130, filter: "set" },
    { field: "position", headerName: "职位", width: 130, filter: "set" },
    { field: "salary", headerName: "薪资", width: 120, sortable: true, filter: "number" },
    { field: "status", headerName: "状态", width: 100, filter: "set" },
  ];
  rowVirtualRowData = this.generateLargeData(100000);
  rowVirtualOptions = { rowSelection: "multiple" };
  rowVirtualViewportRows = signal<number>(0);
  private rowVirtualGridApi: any = null;

  /** 生成大量行数据 */
  private generateLargeData(count: number): any[] {
    const names = ["张伟","王芳","李明","刘洋","陈静","杨帆","赵雷","黄丽","周杰","吴敏","徐强","孙悦","马超","朱华","何平","林涛","潘敏","韩伟","魏芳","冯勇"];
    const departments = ["技术部","产品部","市场部","人力资源部","财务部","研发部","运营部","客服部"];
    const positions = ["工程师","经理","主管","专员","总监","助理","顾问","分析师"];
    const statuses = ["在职","出差","休假"];
    const data: any[] = [];
    for (let i = 1; i <= count; i++) {
      data.push({
        id: i,
        name: names[i % names.length],
        age: 22 + (i % 30),
        email: `user${i}@example.com`,
        department: departments[i % departments.length],
        position: positions[i % positions.length],
        salary: Math.floor(8000 + ((i * 7919) % 30000)),
        status: statuses[i % statuses.length],
      });
    }
    return data;
  }

  onRowVirtualGridReady(api: any): void {
    this.rowVirtualGridApi = api;
    api.addEventListener('viewportChanged', () => {
      const vp = api.getViewportInfo?.();
      if (vp) {
        const count = vp.endIndex - vp.startIndex;
        this.rowVirtualViewportRows.set(Math.min(count, 50));
      }
    });
  }

  scrollToRowVirtual(rowIndex: number): void {
    if (this.rowVirtualGridApi) {
      this.rowVirtualGridApi.ensureIndexVisible(rowIndex);
    }
  }

  // ========== 国际化演示 ==========
  i18nLanguages = [
    { code: 'en', label: '🇺🇸 English' },
    { code: 'zh', label: '🇨🇳 中文' },
    { code: 'ja', label: '🇯🇵 日本語' },
    { code: 'ko', label: '🇰🇷 한국어' },
  ];
  currentI18n = signal<string>('zh');
  i18nColumnDefs = [
    { field: 'orderNo', headerName: '订单号', width: 130, filter: 'text', sortable: true },
    { field: 'product', headerName: '产品名称', width: 150, filter: 'text' },
    { field: 'category', headerName: '分类', width: 120, filter: 'set' },
    { field: 'quantity', headerName: '数量', width: 100, filter: 'number', cellEditor: 'number' },
    { field: 'unitPrice', headerName: '单价', width: 110, filter: 'number', cellEditor: 'number' },
    { field: 'amount', headerName: '金额', width: 120, filter: 'number' },
    { field: 'status', headerName: '状态', width: 100, filter: 'set', cellEditor: 'select', cellEditorParams: { values: ['待支付', '已支付', '已发货', '已完成', '已取消'] } },
  ];
  i18nRowData = [
    { orderNo: 'ORD-2024-0001', product: 'MacBook Pro 14"', category: '电子产品', quantity: 1, unitPrice: 14999, amount: 14999, status: '已完成' },
    { orderNo: 'ORD-2024-0002', product: 'iPhone 15 Pro', category: '电子产品', quantity: 2, unitPrice: 8999, amount: 17998, status: '已发货' },
    { orderNo: 'ORD-2024-0003', product: 'AirPods Pro', category: '电子产品', quantity: 3, unitPrice: 1899, amount: 5697, status: '已支付' },
    { orderNo: 'ORD-2024-0004', product: '人体工学椅', category: '家具', quantity: 2, unitPrice: 1299, amount: 2598, status: '已支付' },
    { orderNo: 'ORD-2024-0005', product: '机械键盘', category: '外设', quantity: 5, unitPrice: 699, amount: 3495, status: '待支付' },
    { orderNo: 'ORD-2024-0006', product: '显示器 27"', category: '电子产品', quantity: 1, unitPrice: 2499, amount: 2499, status: '已取消' },
    { orderNo: 'ORD-2024-0007', product: '移动硬盘 1TB', category: '存储', quantity: 4, unitPrice: 399, amount: 1596, status: '已完成' },
    { orderNo: 'ORD-2024-0008', product: '无线鼠标', category: '外设', quantity: 8, unitPrice: 199, amount: 1592, status: '已发货' },
  ];
  i18nOptions = { rowSelection: 'multiple' };

  switchI18n(locale: string): void {
    this.currentI18n.set(locale);
  }

  // ========== PDF导出演示 ==========
  pdfColumnDefs = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: '姓名', width: 120 },
    { field: 'department', headerName: '部门', width: 120 },
    { field: 'position', headerName: '职位', width: 120 },
    { field: 'salary', headerName: '薪资', width: 100 },
    { field: 'hireDate', headerName: '入职日期', width: 110 },
    { field: 'status', headerName: '状态', width: 80 },
  ];
  pdfRowData = this.generatePdfData(50);
  pdfOptions = { rowSelection: 'multiple' };

  private generatePdfData(count: number): any[] {
    const names = ['张伟','王芳','李明','刘洋','陈静','杨帆','赵雷','黄丽','周杰','吴敏'];
    const departments = ['技术部','产品部','市场部','财务部','人力资源部','运营部','客服部'];
    const positions = ['工程师','经理','主管','专员','总监','助理','顾问'];
    const statuses = ['在职','出差','休假','离职'];
    const data: any[] = [];
    for (let i = 1; i <= count; i++) {
      const year = 2018 + (i % 7);
      const month = (i % 12) + 1;
      data.push({
        id: i,
        name: names[i % names.length],
        department: departments[i % departments.length],
        position: positions[i % positions.length],
        salary: Math.floor(8000 + (i * 7919) % 30000),
        hireDate: `${year}-${String(month).padStart(2,'0')}-01`,
        status: statuses[i % statuses.length],
      });
    }
    return data;
  }

  exportPdf(): void {
    if (this.gridApi) {
      this.gridApi.exportDataAsPdf({
        fileName: 'db-grid-export.pdf',
        pageSize: 'a4',
        orientation: 'portrait',
      });
    }
  }

  exportPdfLandscape(): void {
    if (this.gridApi) {
      this.gridApi.exportDataAsPdf({
        fileName: 'db-grid-landscape.pdf',
        pageSize: 'a4',
        orientation: 'landscape',
      });
    }
  }

  exportPdfSelected(): void {
    if (this.gridApi) {
      const selectedRows = this.gridApi.getSelectedRows();
      if (selectedRows.length === 0) {
        alert('请先选择要导出的行');
        return;
      }
      this.gridApi.exportDataAsPdf({
        fileName: 'db-grid-selected.pdf',
        onlySelected: true,
        pageSize: 'a4',
      });
    }
  }
  setI18n(locale: string): void {
    this.currentI18n.set(locale);
  }

  // ========== 图表演示 ==========
  chartsType = signal<'bar' | 'line' | 'pie' | 'doughnut'>('bar');

  renderChart(): void {
    if (this.gridApi) {
      this.gridApi.destroyChart?.('mainChart');
      const config = this.gridApi.chartsService?.chartConfigFromGridData
        ? this.gridApi.chartsService.chartConfigFromGridData(
            this.chartsType(),
            'DB Grid 数据统计',
            ['Q1', 'Q2', 'Q3', 'Q4'],
            [
              { label: '销售额', data: [12000, 15000, 18000, 22000] },
              { label: '利润', data: [3000, 4000, 5500, 7000] },
            ]
          )
        : {
            type: this.chartsType(),
            title: 'DB Grid 数据统计',
            data: {
              labels: ['Q1', 'Q2', 'Q3', 'Q4'],
              datasets: [{
                label: '销售额',
                data: [12000, 15000, 18000, 22000],
                backgroundColor: ['#5470c6','#91cc75','#fac858','#ee6666'],
              }, {
                label: '利润',
                data: [3000, 4000, 5500, 7000],
                backgroundColor: ['#73c0de','#3ba272','#fc8452','#9a60b4'],
              }]
            }
          };
      this.gridApi.addChart?.('mainChart', config);
    }
  }
}
