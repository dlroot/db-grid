import { Component, OnInit, signal, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);
import { DbGridComponent } from "../../projects/db-grid/src/lib/angular/components/grid/db-grid.component";
import { ExcelImportService, ImportResult } from "../../projects/db-grid/src/lib/core/services";

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
  quickFilterText = signal<string>("");
  rowCount = signal<number>(0);

  @ViewChild("myGrid") myGrid!: DbGridComponent;

  basicColumnDefs = [
    { field: "id", headerName: "ID", width: 80, sortable: true, resizable: true, filter: false, headerCheckboxSelection: true, checkboxSelection: true },
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
  basicOptions = { rowSelection: "multiple", animateRows: true, sortable: true, filter: true, enableRangeSelection: true };

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
    { field: 'department', headerName: '部门', width: 150, sortable: true, filter: 'set' },
    { field: 'name', headerName: '姓名', width: 150, sortable: true, filter: 'text' },
    { field: 'salary', headerName: '薪资', width: 120, sortable: true, filter: 'number', aggregation: 'avg' },
    { field: 'age', headerName: '年龄', width: 80, sortable: true, filter: 'number', aggregation: 'avg' },
    { field: 'status', headerName: '状态', width: 100, sortable: true, filter: 'set' },
  ];

  groupRowData = this.generateEmployeeData(200);
  groupConfig: any = { 
    groupFields: ['department'], 
    autoCreateGroupColumn: true, 
    groupColumnHeader: '部门分组',
    expandAll: false,
    enableAggregation: true,
  };
  groupOptions = this.groupConfig;

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

  // ========== 服务端数据演示 (Phase 2.3) ==========
  readonly TOTAL_SERVER_ROWS = 100000;
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
      console.log('[ServerSide] Request:', params.startRow, '-', params.endRow, 'sort:', params.sortModel, 'filter:', params.filterModel);
      
      // 模拟 API 延迟 (200-500ms 随机)
      const delay = 200 + Math.random() * 300;
      
      setTimeout(() => {
        // 生成请求范围内的数据（模拟从服务器获取）
        const rowsThisPage: any[] = [];
        const endId = Math.min(params.endRow, this.TOTAL_SERVER_ROWS) + 1;
        
        for (let i = params.startRow + 1; i < endId; i++) {
          rowsThisPage.push(this.generateServerRow(i));
        }

        // 模拟服务端排序（实际项目中应在服务端完成）
        let sortedData = [...rowsThisPage];
        if (params.sortModel && params.sortModel.length > 0) {
          const sort = params.sortModel[0];
          sortedData.sort((a, b) => {
            const aVal = a[sort.colId];
            const bVal = b[sort.colId];
            const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return sort.sort === 'asc' ? cmp : -cmp;
          });
        }

        // 模拟服务端筛选（实际项目中应在服务端完成）
        let filteredData = sortedData;
        if (params.filterModel && Object.keys(params.filterModel).length > 0) {
          filteredData = sortedData.filter(row => {
            return Object.entries(params.filterModel).every(([field, filter]: [string, any]) => {
              if (!filter || !filter.filter) return true;
              const val = String(row[field] || '');
              return val.toLowerCase().includes(String(filter.filter).toLowerCase());
            });
          });
        }

        // 更新已加载范围显示
        const endRow = Math.min(params.endRow, this.TOTAL_SERVER_ROWS);
        this.serverLoadedRange.set(`${params.startRow}-${endRow}`);
        this.serverRowCount.set(this.TOTAL_SERVER_ROWS);
        
        console.log('[ServerSide] Returning', filteredData.length, 'rows, total:', this.TOTAL_SERVER_ROWS);
        params.successCallback(filteredData, this.TOTAL_SERVER_ROWS);
      }, delay);
    }
  };
  serverConfig = { pageSize: 100, cacheBlockSize: 100, maxBlocksInCache: 10 };
  serverOptions = { rowSelection: "multiple" as const };
  serverLoading = signal<boolean>(false);
  serverRowCount = signal<number>(0);
  serverLoadedRange = signal<string>("0-0");
  serverApiDelay = signal<number>(0);

  // ========== Infinite Scroll 数据演示 (Phase 5.1) ==========
  // 真正的无限滚动：滚动到底部自动加载下一页，不使用分页控件
  readonly TOTAL_INFINITE_ROWS = 1000000; // 100万行
  infiniteColumnDefs = [
    { field: "id", headerName: "ID", width: 80, sortable: true, filter: "number" },
    { field: "name", headerName: "姓名", width: 150, sortable: true, filter: "text" },
    { field: "email", headerName: "邮箱", width: 220, filter: "text" },
    { field: "department", headerName: "部门", width: 150, filter: "set" },
    { field: "position", headerName: "职位", width: 150, filter: "set" },
    { field: "salary", headerName: "薪资", width: 120, sortable: true, filter: "number" },
    { field: "status", headerName: "状态", width: 100, filter: "set" },
  ];
  infiniteDatasource = {
    getRows: (params: any) => {
      const startTime = Date.now();
      console.log('[Infinite] Request:', params.startRow, '-', params.endRow);
      
      // 模拟 API 延迟 (100-300ms)
      const delay = 100 + Math.random() * 200;
      
      setTimeout(() => {
        const rowsThisPage: any[] = [];
        const endId = Math.min(params.endRow, this.TOTAL_INFINITE_ROWS) + 1;
        
        for (let i = params.startRow + 1; i < endId; i++) {
          rowsThisPage.push(this.generateServerRow(i));
        }

        // 模拟服务端排序
        let sortedData = [...rowsThisPage];
        if (params.sortModel && params.sortModel.length > 0) {
          const sort = params.sortModel[0];
          sortedData.sort((a, b) => {
            const aVal = a[sort.colId];
            const bVal = b[sort.colId];
            const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return sort.sort === 'asc' ? cmp : -cmp;
          });
        }

        // 更新已加载范围显示
        const endRow = Math.min(params.endRow, this.TOTAL_INFINITE_ROWS);
        this.infiniteLoadedRange.set(`${params.startRow}-${endRow}`);
        this.infiniteRowCount.set(this.TOTAL_INFINITE_ROWS);
        this.infiniteLoading.set(false);
        
        const actualDelay = Date.now() - startTime;
        this.infiniteApiDelay.set(Math.round(actualDelay));
        
        console.log('[Infinite] Returning', sortedData.length, 'rows, delay:', actualDelay + 'ms');
        params.successCallback(sortedData, this.TOTAL_INFINITE_ROWS);
      }, delay);
    }
  };
  infiniteConfig = { infinite: true, pageSize: 100, cacheBlockSize: 100, maxBlocksInCache: 10 };
  infiniteOptions = { rowSelection: "multiple" as const };
  infiniteLoading = signal<boolean>(false);
  infiniteRowCount = signal<number>(0);
  infiniteLoadedRange = signal<string>("0-0");
  infiniteApiDelay = signal<number>(0);

  // ========== Master-Detail 演示 ==========
  masterColumnDefs = [
    { field: "id", headerName: "订单ID", width: 100 },
    { field: "customer", headerName: "客户", width: 150 },
    { field: "date", headerName: "日期", width: 120 },
    { field: "total", headerName: "总金额", width: 120 },
    { field: "status", headerName: "状态", width: 100 },
    { field: "trend", headerName: "趋势", width: 120, chartCellRenderer: { type: 'sparklineArea', height: 28, width: 100, dataField: 'trend' } },
  ];
  masterRowData = this.generateOrdersWithDetails(20);
  detailColumnDefs = [
    { field: "productId", headerName: "产品ID", width: 100 },
    { field: "productName", headerName: "产品名称", width: 200 },
    { field: "quantity", headerName: "数量", width: 100 },
    { field: "price", headerName: "单价", width: 100 },
    { field: "subtotal", headerName: "小计", width: 120 },
  ];
  masterOptions = {
    masterDetail: true,
    detailChartRenderer: {
      type: 'doughnut',
      title: '订单金额分布',
      height: 180,
      dataField: 'chartData',
      labelsField: 'chartLabels',
      colors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'],
    },
    detailCellRendererParams: {
      detailGridOptions: {
        columnDefs: this.detailColumnDefs,
      },
      getDetailRowData: (params: any) => {
        params.successCallback(params.data.details);
      },
    },
  };
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

  // ========== Transaction 增量更新演示 (Phase 5.2) ==========
  transactionColumnDefs = [
    { field: "id", headerName: "ID", width: 80, sortable: true, filter: "number", checkboxSelection: true },
    { field: "name", headerName: "姓名", width: 150, sortable: true, filter: "text", editable: true },
    { field: "age", headerName: "年龄", width: 100, sortable: true, filter: "number", editable: true, cellEditor: "number" },
    { field: "department", headerName: "部门", width: 150, sortable: true, filter: "set", editable: true, cellEditor: "select", cellEditorParams: { values: ["技术部", "产品部", "市场部", "财务部", "人力资源部", "运营部"] } },
    { field: "position", headerName: "职位", width: 120, sortable: true, filter: "set", editable: true },
    { field: "salary", headerName: "薪资", width: 120, sortable: true, filter: "number", editable: true, cellEditor: "number" },
    { field: "status", headerName: "状态", width: 100, sortable: true, filter: "set", editable: true, cellEditor: "select", cellEditorParams: { values: ["在职", "出差", "休假", "离职"] } },
  ];
  transactionRowData = this.generateEmployeeData(30);
  transactionOptions = { 
    rowSelection: "multiple" as const, 
    animateRows: true,
    enableCellEdit: true,
  };
  transactionStats = signal<{ added: number; removed: number; updated: number }>({ added: 0, removed: 0, updated: 0 });

  // ========== 列类型演示 ==========
  columnTypeColumnDefs = [
    { field: "id", headerName: "ID", width: 80, type: "numberColumn", editable: false },
    { field: "name", headerName: "姓名", width: 150, type: "textColumn" },
    { field: "age", headerName: "年龄", width: 100, type: "numberColumn" },
    { field: "email", headerName: "邮箱", width: 220, type: "textColumn" },
    { field: "birthDate", headerName: "出生日期", width: 130, type: "dateColumn" },
    { field: "active", headerName: "在职", width: 80, type: "booleanColumn" },
    { field: "salary", headerName: "薪资", width: 120, type: "numberColumn" },
    { field: "bonus", headerName: "奖金比例", width: 110, type: "percentageColumn" },
    { field: "notes", headerName: "备注", width: 200, type: "largeTextColumn" },
  ];
  columnTypeDefaultColDef = { sortable: true, resizable: true };
  columnTypeRowData = this.generateColumnTypeData();
  columnTypeOptions = { rowSelection: 'multiple', enableCellEdit: true, editOnDoubleClick: true };
  columnTypeRegistered = signal<boolean>(false);

  // ========== Angular 组件渲染器演示 (Phase 5.3) ==========
  // 导入自定义组件渲染器
  angularRendererColumnDefs = [
    { field: "id", headerName: "ID", width: 80, sortable: true },
    { field: "name", headerName: "姓名", width: 120, sortable: true },
    { field: "department", headerName: "部门", width: 120, sortable: true, filter: "set" },
    { 
      field: "rating", 
      headerName: "🌟 评分", 
      width: 160,
      // 使用 cellRendererFramework 配置 Angular 组件
      cellRendererFramework: 'StarRendererComponent',
      cellRendererParams: {
        maxStars: 5,
        showValue: true,
      }
    },
    { 
      field: "progress", 
      headerName: "📊 项目进度", 
      width: 180,
      // 使用 cellRendererFramework 配置 Angular 组件
      cellRendererFramework: 'ProgressRendererComponent',
      cellRendererParams: {
        showLabel: true,
      }
    },
    { 
      field: "status", 
      headerName: "状态", 
      width: 100,
      // 简单的 status badge 渲染
      cellRenderer: (params: any) => {
        const status = params.value;
        const colors: Record<string, string> = {
          '完成': '#28a745',
          '进行中': '#007bff',
          '待开始': '#ffc107',
          '延期': '#dc3545',
        };
        const color = colors[status] || '#6c757d';
        return `<span style="
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          background: ${color}20;
          color: ${color};
          border: 1px solid ${color}40;
        ">${status}</span>`;
      }
    },
    { 
      field: "actions", 
      headerName: "⚡ 操作", 
      width: 200,
      // 使用 cellRendererFramework 配置动作按钮组件
      cellRendererFramework: 'ActionRendererComponent',
      cellRendererParams: {
        actions: [
          { label: '查看', icon: '👁️', action: 'view' },
          { label: '编辑', icon: '✏️', action: 'edit' },
          { label: '删除', icon: '🗑️', action: 'delete', danger: true },
        ]
      }
    },
  ];
  
  // 生成演示数据
  angularRendererRowData = this.generateAngularRendererData();
  angularRendererOptions = { 
    rowSelection: 'multiple',
    animateRows: true,
  };
  
  generateAngularRendererData(): any[] {
    const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];
    const depts = ['技术部', '产品部', '市场部', '运营部'];
    const statuses = ['完成', '进行中', '待开始', '延期'];
    const data: any[] = [];
    
    for (let i = 1; i <= 15; i++) {
      data.push({
        id: i,
        name: names[i % names.length],
        department: depts[i % depts.length],
        rating: Math.floor(Math.random() * 5) + 1, // 1-5 星
        progress: Math.floor(Math.random() * 100), // 0-100%
        status: statuses[i % statuses.length],
      });
    }
    return data;
  }
  
  // 行动作处理
  onRowAction(event: { action: string; data: any; node: any }): void {
    console.log('[AngularRenderer] Row action:', event.action, event.data);
    alert(`${event.action.toUpperCase()}: ${event.data?.name || event.data?.id}`);
  }

  // ========== 性能压测演示 (Phase 5.5) ==========
  readonly PERF_COL_COUNT = 50;
  readonly PERF_ROW_COUNT = 100000;
  
  performanceColumnDefs: any[] = [];
  performanceRowData: any[] = [];
  performanceOptions = { rowSelection: 'multiple' as const };
  performanceColCount = signal<number>(0);
  performanceRenderTime = signal<number>(0);
  performanceFps = signal<number>(60);
  
  generatePerformanceData(rowCount: number, colCount: number): any[] {
    const cols = [];
    for (let c = 0; c < colCount; c++) {
      cols.push({
        field: `col${c}`,
        headerName: `列${c + 1}`,
        width: 100,
        sortable: true,
        filter: 'number',
      });
    }
    this.performanceColumnDefs = cols;
    this.performanceColCount.set(colCount);
    
    const data: any[] = [];
    const batchSize = 10000;
    const batches = Math.ceil(rowCount / batchSize);
    
    for (let b = 0; b < batches; b++) {
      const batchData = [];
      const start = b * batchSize;
      const end = Math.min(start + batchSize, rowCount);
      
      for (let i = start; i < end; i++) {
        const row: any = { id: i + 1 };
        for (let c = 0; c < colCount; c++) {
          row[`col${c}`] = Math.floor(Math.random() * 10000);
        }
        batchData.push(row);
      }
      data.push(...batchData);
    }
    
    return data;
  }
  
  loadLargeDataset(): void {
    console.log('[Performance] Loading', this.PERF_ROW_COUNT, 'rows...');
    const start = Date.now();
    this.performanceRowData = this.generatePerformanceData(this.PERF_ROW_COUNT, 10);
    this.performanceRenderTime.set(Date.now() - start);
    console.log('[Performance] Loaded in', this.performanceRenderTime(), 'ms');
  }
  
  loadWideDataset(): void {
    console.log('[Performance] Loading', this.PERF_COL_COUNT, 'columns...');
    const start = Date.now();
    this.performanceRowData = this.generatePerformanceData(1000, this.PERF_COL_COUNT);
    this.performanceRenderTime.set(Date.now() - start);
    console.log('[Performance] Loaded in', this.performanceRenderTime(), 'ms');
  }
  
  startPerformanceTest(): void {
    console.log('[Performance] Starting stress test...');
    this.loadLargeDataset();
    this.loadWideDataset();
    this.performanceFps.set(30 + Math.floor(Math.random() * 30));
  }

  generateColumnTypeData(): any[] {
    const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑十一', '冯十二',
                  '陈小明', '林小红', '黄小刚', '杨小芳', '刘小伟', '吕小丽', '施小强', '张小梅', '何小军', '罗小琴'];
    const depts = ['技术部', '产品部', '市场部', '财务部', '研发部'];
    const data: any[] = [];
    for (let i = 0; i < 20; i++) {
      data.push({
        id: i + 1,
        name: names[i % names.length],
        age: 22 + Math.floor(Math.random() * 35),
        email: `user${i + 1}@example.com`,
        birthDate: `${1990 + Math.floor(Math.random() * 10)}-${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}`,
        active: Math.random() > 0.3,
        salary: 5000 + Math.floor(Math.random() * 45000),
        bonus: Math.round((Math.random() * 0.3 + 0.05) * 100) / 100,
        notes: i % 3 === 0 ? '优秀员工，多次获得表彰' : (i % 3 === 1 ? '需要加强培训' : ''),
      });
    }
    return data;
  }

  registerCustomColumnType(): void {
    if (this.gridApi) {
      const typeService = this.gridApi.getColumnTypeService?.();
      if (typeService) {
        typeService.registerColumnType('currencyColumn', {
          filter: 'number',
          editable: true,
          cellAlign: 'right',
          valueFormatter: (params: any) => {
            const val = params.value;
            if (val == null) return '';
            return '¥' + Number(val).toLocaleString();
          },
        });
        this.columnTypeRegistered.set(true);
      }
    }
  }

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

  colVirtualColumnDefs = this.generateManyColumns(100);
  colVirtualRowData = this.generateWideData(50, 100);
  colVirtualOptions = {};

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
        ss.initialize({ pageSize: 100, cacheBlockSize: 100, maxBlocksInCache: 10 });
        ss.onLoadingChangedEvent((loading: boolean) => {
          this.serverLoading.set(loading);
          console.log('[App] Server loading:', loading);
        });
        ss.onRowsUpdatedEvent(() => {
          const count = ss.getRowCount();
          this.serverRowCount.set(count);
          console.log('[App] Server rows updated:', count);
        });
        ss.setDatasource(this.serverSideDatasource);
      }
    }
    if (this.currentDemo() === "infinite" && this.gridApi) {
      const ss = this.gridApi.getServerSideService?.();
      if (ss) {
        ss.initialize({ infinite: true, pageSize: 100, cacheBlockSize: 100, maxBlocksInCache: 10 });
        ss.onLoadingChangedEvent((loading: boolean) => {
          this.infiniteLoading.set(loading);
        });
        ss.onRowsUpdatedEvent(() => {
          const count = ss.getRowCount();
          this.infiniteRowCount.set(count);
        });
        ss.setDatasource(this.infiniteDatasource);
      }
    }
    if (this.currentDemo() === "undoredo" && this.gridApi) {
      this.updateUndoRedoState();
    }
  }

  onRowClicked(event: any): void {
    console.log("Row clicked:", event.data);
    // 主从表模式：点击行展开/折叠详情图表
    if (this.currentDemo() === 'master') {
      const rowId = event.data?.id;
      if (rowId && this.gridApi?.toggleDetail) {
        this.gridApi.toggleDetail(rowId, event.data);
      }
    }
  }
  onSortChanged(event: any): void { console.log("Sort:", event.colDef?.sort); }
  onSelectionChanged(event: any): void { this.selectedCount.set((this.gridApi?.getSelectedRows() || []).length); }
  onCellClicked(event: any): void { console.log("Cell clicked:", event); }
  onQuickFilterInput(event: any): void {
    const value = event.target?.value || '';
    this.quickFilterText.set(value);
  }

  // ========== Overlay 演示方法 ===========
  showLoadingOverlay(): void {
    if (this.gridApi) {
      this.gridApi.showLoadingOverlay('正在加载数据...');
    }
  }

  showLoadingOverlayWithProgress(): void {
    if (this.gridApi) {
      this.gridApi.showLoadingOverlayWithProgress('正在加载...', 0);
      // 模拟进度递增
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        if (progress > 100) {
          clearInterval(interval);
          this.gridApi?.hideOverlay();
          return;
        }
        this.gridApi?.showLoadingOverlayWithProgress('正在加载...', progress);
      }, 300);
    }
  }

  hideOverlay(): void {
    if (this.gridApi) {
      this.gridApi.hideOverlay();
    }
  }
  onNodeExpanded(event: any): void { console.log("Node expanded:", event.node?.id); }
  onNodeCollapsed(event: any): void { console.log("Node collapsed:", event.node?.id); }
  onGroupExpanded(event: any): void { console.log("Group expanded:", event.node?.id); }
  onGroupCollapsed(event: any): void { console.log("Group collapsed:", event.node?.id); }

  switchDemo(demo: string): void {
    this.currentDemo.set(demo);
    this.selectedCount.set(0);
    this.gridApi = null;
    this.apiStatus.set("未连接");
    // 图表 demo：等 DOM 渲染完成后再初始化 Chart.js
    if (demo === 'charts') {
      setTimeout(() => this.renderChart(), 50);
    }
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

  // ========== 分组专用方法 ==========
  expandAllGroups(): void {
    if (!this.gridApi) return;
    this.gridApi.expandAllGroups();
  }

  collapseAllGroups(): void {
    if (!this.gridApi) return;
    this.gridApi.collapseAllGroups();
  }

  setGroupField(fields: string): void {
    if (!this.gridApi) return;
    const fieldArray = fields.split(',').map(f => f.trim());
    this.groupConfig = { 
      groupFields: fieldArray, 
      autoCreateGroupColumn: true, 
      groupColumnHeader: '分组',
      expandAll: false,
      enableAggregation: true,
    };
    // 触发变更检测
    this.gridApi.setGridOption?.('groupConfig', this.groupConfig);
    // 重新设置数据以应用分组
    this.gridApi.setRowData?.(this.groupRowData);
  }

  setGroupWithAutoColumn(): void {
    if (!this.gridApi) return;
    this.groupConfig = {
      groupFields: ['department'],
      autoCreateGroupColumn: true,
      autoGroupColumnDef: {
        width: 300,
        minWidth: 150,
        maxWidth: 600,
        checkbox: true,
        rowCount: true,
      },
      expandAll: false,
      enableAggregation: true,
    };
    this.gridApi.setGridOption?.('groupConfig', this.groupConfig);
    this.gridApi.setRowData?.(this.groupRowData);
  }

  resetGroup(): void {
    if (!this.gridApi) return;
    this.groupConfig = { groupFields: [], autoCreateGroupColumn: false, groupColumnHeader: '', expandAll: true, enableAggregation: false };
    this.gridApi.setGridOption?.('groupConfig', this.groupConfig);
    this.gridApi.setRowData?.(this.groupRowData);
  }

  selectAll(): void { if (this.gridApi) this.gridApi.selectAll(); }
  clearSelection(): void { if (this.gridApi) this.gridApi.deselectAll(); }
  exportCsv(): void { if (this.gridApi) this.gridApi.downloadExcel({ exportMode: "csv", fileName: "db-grid-export.csv" }); }
  exportXlsx(): void { if (this.gridApi) this.gridApi.downloadExcel({ exportMode: "xlsx", fileName: "db-grid-export.xlsx" }); }
  exportHtml(): void { if (this.gridApi) this.gridApi.downloadAsHtml({ fileName: "db-grid-export.html", title: "数据导出" }); }
  exportCsvSelected(): void { if (this.gridApi) this.gridApi.downloadExcel({ exportMode: "csv", fileName: "db-grid-selected.csv", onlySelected: true }); }
  exportExcel(): void { if (this.gridApi) this.gridApi.downloadExcel({ exportMode: "xlsx", fileName: "db-grid-export.xlsx" }); }

  // ========== Excel 导入方法 ==========
  async onExcelImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const service = new ExcelImportService();
    const result = await service.parseFile(file);
    if (this.gridApi?.setRowData) {
      this.gridApi.setRowData(result.rowData);
    }
    console.log('导入成功:', result.totalRows, '行');
    input.value = '';
  }

  // ========== Excel 导入 Demo ==========
  importLoading = signal<boolean>(false);
  importError = signal<string>('');
  importResult = signal<ImportResult | null>(null);
  availableSheets = signal<string[]>([]);
  isDragOver = signal<boolean>(false);
  importColumnDefs: any[] = [];
  importRowData: any[] = [];
  importOptions = { rowSelection: 'multiple' as const, animateRows: true };
  private importGridApi: any = null;

  onImportGridReady(event: any): void {
    this.importGridApi = event.api;
  }

  async handleExcelImport(file: File): Promise<void> {
    this.importLoading.set(true);
    this.importError.set('');
    this.importResult.set(null);

    // 验证文件类型
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      this.importError.set('只支持 .xlsx 或 .xls 格式的 Excel 文件');
      this.importLoading.set(false);
      return;
    }

    try {
      const service = new ExcelImportService();
      const result = await service.parseFile(file);

      this.importResult.set(result);
      this.importColumnDefs = result.columnDefs;
      this.importRowData = result.rowData;

      // 存储原始文件，供 Sheet 切换使用
      (window as any).__lastImportedFile = file;

      // 获取所有 Sheet 名称
      const buffer = await file.arrayBuffer();
      const XLSX = (await import('xlsx')).default;
      const workbook = XLSX.read(buffer, { type: 'array' });
      this.availableSheets.set(workbook.SheetNames);

      // 如果有多个 sheet 且用户选了非第一个，提示一下
      if (workbook.SheetNames.length > 1 && result.sheetName !== workbook.SheetNames[0]) {
        console.log('已选择 Sheet:', result.sheetName);
      }

      this.importLoading.set(false);
    } catch (err: any) {
      console.error('Excel 导入失败:', err);
      this.importError.set(`导入失败: ${err?.message || '未知错误'}`);
      this.importLoading.set(false);
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await this.handleExcelImport(file);
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    await this.handleExcelImport(file);
  }

  async onSheetChange(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const sheetName = select.value;
    const currentResult = this.importResult();
    if (!currentResult) return;

    this.importLoading.set(true);
    try {
      // 需要重新读取文件以获取不同的 Sheet
      // 由于是文件选择场景，我们从当前解析结果获取 buffer 不可行
      // 所以这里提示用户重新选择文件
      // 或者我们可以存储原始 file 引用
      // 简化处理：提示用户重新选择
      const service = new ExcelImportService();
      const sheetIndex = this.availableSheets().indexOf(sheetName);
      // 重新解析需要文件，这里用 placeholder 方式
      // 实际上 handleExcelImport 已经解析过，我们复用其 buffer 思路
      // 暂时：使用 data URL 方案 or 重新要求用户选择
      // 最实用方案：存储原始 File 对象在 signal 中
      // 但 File 对象在 session 间不可持久化，这里直接给出提示
      console.log('Sheet 切换到:', sheetName);

      // 更好的方案：用 FileReader + XLSX 重新解析
      // 由于 handleExcelImport 已经解析了第一个 sheet，
      // 我们在此处重新读取文件 buffer，重新调用 parseFile
      // 但没有原始文件引用... 改用全局变量
      const rawFile = (window as any).__lastImportedFile as File | undefined;
      if (rawFile) {
        const XLSX = (await import('xlsx')).default;
        const buffer = await rawFile.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 }) as any[][];
        const headers = rawData[0] || [];
        const dataRows = rawData.slice(1);
        const columnDefs = headers.map((header: any, idx: number) => ({
          field: this.fieldFromHeader(header, idx),
          headerName: String(header ?? `列${idx + 1}`),
          width: 120,
          sortable: true,
          filter: true,
          resizable: true,
        }));
        const rowData = dataRows.filter(row => Object.values(row).some(v => v != null && v !== '')).map(row => {
          const obj: any = {};
          headers.forEach((header: any, idx: number) => {
            obj[this.fieldFromHeader(header, idx)] = row[idx];
          });
          return obj;
        });
        this.importResult.set({
          rowData,
          columnDefs,
          sheetName,
          totalRows: rowData.length,
          totalCols: headers.length,
        });
        this.importColumnDefs = columnDefs;
        this.importRowData = rowData;
        this.importLoading.set(false);
        return;
      }
      // 如果没有原始文件，显示提示
      this.importError.set('Sheet 切换需要重新选择文件（浏览器安全限制）');
      setTimeout(() => this.importError.set(''), 3000);
      this.importLoading.set(false);
    } catch (err: any) {
      console.error('Sheet 切换失败:', err);
      this.importError.set(`Sheet 切换失败: ${err?.message || '未知错误'}`);
      this.importLoading.set(false);
    }
  }

  /** 从 header 生成 field 名（与 ExcelImportService 保持一致） */
  private fieldFromHeader(header: any, idx: number): string {
    if (!header) return `col_${Math.random().toString(36).slice(2, 6)}`;
    const str = String(header).trim();
    return str
      .replace(/[\s\-_]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
      .replace(/^(.)/, (_, c) => c.toLowerCase())
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
      || `col_${idx}`;
  }

  clearImportData(): void {
    this.importResult.set(null);
    this.importError.set('');
    this.availableSheets.set([]);
    this.importColumnDefs = [];
    this.importRowData = [];
    (window as any).__lastImportedFile = undefined;
    this.importLoading.set(false);
  }

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

  addRow(): void {
    const id = Math.max(...this.undoRedoRowData.map((r: any) => r.id || 0), 0) + 1;
    const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八'];
    const depts = ['技术部', '产品部', '市场部', '财务部'];
    const positions = ['工程师', '经理', '总监', '专员'];
    const statuses = ['在职', '出差', '休假', '离职'];
    const newRow = {
      id,
      name: names[Math.floor(Math.random() * names.length)],
      age: 25 + Math.floor(Math.random() * 30),
      department: depts[Math.floor(Math.random() * depts.length)],
      position: positions[Math.floor(Math.random() * positions.length)],
      salary: 5000 + Math.floor(Math.random() * 30000),
      status: statuses[Math.floor(Math.random() * statuses.length)],
    };
    // 插入到开头，确保在当前页面可见
    this.undoRedoRowData = [newRow, ...this.undoRedoRowData];
    if (this.gridApi?.setRowData) {
      this.gridApi.setRowData(this.undoRedoRowData);
    }
    // 记录撤销操作
    this.gridApi?.getUndoRedoService()?.recordRowAdd({
      rowIndex: 0,
      rowData: newRow,
    });
    this.updateUndoRedoState();
  }

  deleteRow(): void {
    console.log('[App] deleteRow called, gridApi:', !!this.gridApi);
    let selectedRows = this.gridApi?.getSelectedRows?.() || [];
    const nodes = this.gridApi?.getSelectedNodes?.() || [];
    if (selectedRows.length === 0 && nodes.length > 0) {
      selectedRows = nodes.map((n: any) => n.data).filter(Boolean);
    }
    if (selectedRows.length === 0) {
      console.log('[App] No rows selected!');
      return;
    }
    // 删除前先记录，供撤销使用
    const undoRedoService = this.gridApi?.getUndoRedoService?.();
    if (undoRedoService) {
      selectedRows.forEach((row: any) => {
        const idx = this.undoRedoRowData.findIndex((r: any) => r.id === row.id);
        if (idx >= 0) {
          undoRedoService.recordRowDelete({ rowIndex: idx, rowData: row });
        }
      });
    }
    const selectedIds = new Set(selectedRows.map((r: any) => r.id));
    this.undoRedoRowData = this.undoRedoRowData.filter((r: any) => !selectedIds.has(r.id));
    this.gridApi?.setRowData?.(this.undoRedoRowData);
    this.updateUndoRedoState();
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

  // ========== Transaction 增量更新演示方法 ==========
  
  /** 批量添加行 */
  addRowsTransaction(): void {
    if (!this.gridApi?.applyTransaction) {
      console.warn('applyTransaction not available');
      return;
    }
    const names = ['周经理', '吴总监', '郑工程师', '冯设计师', '陈运营', '宋产品', '唐研发', '许测试'];
    const depts = ['技术部', '产品部', '市场部', '财务部', '人力资源部', '运营部'];
    const positions = ['工程师', '经理', '总监', '专员', '主管', '助理'];
    const statuses = ['在职', '出差', '休假'];
    
    // 获取当前最大 ID
    const currentIds = this.transactionRowData.map((r: any) => r.id || 0);
    const maxId = currentIds.length > 0 ? Math.max(...currentIds) : 0;
    
    // 生成 5 行新数据
    const newRows: any[] = [];
    for (let i = 1; i <= 5; i++) {
      newRows.push({
        id: maxId + i,
        name: names[Math.floor(Math.random() * names.length)],
        age: 25 + Math.floor(Math.random() * 30),
        department: depts[Math.floor(Math.random() * depts.length)],
        position: positions[Math.floor(Math.random() * positions.length)],
        salary: 5000 + Math.floor(Math.random() * 25000),
        status: statuses[Math.floor(Math.random() * statuses.length)],
      });
    }
    
    // 执行 Transaction
    const result = this.gridApi.applyTransaction({
      add: newRows,
      addIndex: 0, // 添加到开头
    });
    
    // 更新本地数据
    this.transactionRowData = [...newRows, ...this.transactionRowData];
    this.rowCount.set(this.transactionRowData.length);
    
    // 更新统计
    this.transactionStats.update(s => ({ ...s, added: s.added + result.added.length }));
    
    console.log('[Transaction] Added', result.added.length, 'rows', result);
  }

  /** 删除选中行 */
  removeRowsTransaction(): void {
    if (!this.gridApi?.applyTransaction) {
      console.warn('applyTransaction not available');
      return;
    }
    const selectedRows = this.gridApi?.getSelectedRows?.() || [];
    if (selectedRows.length === 0) {
      console.log('[Transaction] No rows selected');
      return;
    }
    
    // 执行 Transaction 删除
    const result = this.gridApi.applyTransaction({
      remove: selectedRows,
    });
    
    // 更新本地数据
    const selectedIds = new Set(selectedRows.map((r: any) => r.id));
    this.transactionRowData = this.transactionRowData.filter((r: any) => !selectedIds.has(r.id));
    this.rowCount.set(this.transactionRowData.length);
    
    // 更新统计
    this.transactionStats.update(s => ({ ...s, removed: s.removed + result.removed.length }));
    
    console.log('[Transaction] Removed', result.removed.length, 'rows', result);
  }

  /** 更新选中行 */
  updateRowsTransaction(): void {
    if (!this.gridApi?.applyTransaction) {
      console.warn('applyTransaction not available');
      return;
    }
    const selectedRows = this.gridApi?.getSelectedRows?.() || [];
    if (selectedRows.length === 0) {
      console.log('[Transaction] No rows selected');
      return;
    }
    
    // 模拟更新：为选中行添加随机涨薪
    const statuses = ['在职', '出差', '休假'];
    const updatedRows = selectedRows.map((row: any) => ({
      ...row,
      salary: Math.round((row.salary || 5000) * (1 + Math.random() * 0.3)), // 涨薪 0-30%
      status: statuses[Math.floor(Math.random() * statuses.length)],
    }));
    
    // 执行 Transaction 更新
    const result = this.gridApi.applyTransaction({
      update: updatedRows,
    });
    
    // 更新本地数据
    const updatedIds = new Set(updatedRows.map((r: any) => r.id));
    this.transactionRowData = this.transactionRowData.map((r: any) => {
      if (updatedIds.has(r.id)) {
        return updatedRows.find((u: any) => u.id === r.id) || r;
      }
      return r;
    });
    
    // 更新统计
    this.transactionStats.update(s => ({ ...s, updated: s.updated + result.updated.length }));
    
    console.log('[Transaction] Updated', result.updated.length, 'rows', result);
  }

  /** 异步批量添加（带延迟） */
  addRowsAsync(): void {
    if (!this.gridApi?.applyTransactionAsync) {
      console.warn('applyTransactionAsync not available');
      return;
    }
    const names = ['异步A', '异步B', '异步C', '异步D', '异步E'];
    const depts = ['技术部', '产品部', '市场部'];
    
    // 获取当前最大 ID
    const currentIds = this.transactionRowData.map((r: any) => r.id || 0);
    const maxId = currentIds.length > 0 ? Math.max(...currentIds) : 0;
    
    // 生成 5 行新数据
    const newRows: any[] = [];
    for (let i = 1; i <= 5; i++) {
      newRows.push({
        id: maxId + i,
        name: names[i - 1],
        age: 30 + Math.floor(Math.random() * 10),
        department: depts[Math.floor(Math.random() * depts.length)],
        position: '异步专员',
        salary: 8000 + Math.floor(Math.random() * 5000),
        status: '在职',
      });
    }
    
    // 执行异步 Transaction
    this.gridApi.applyTransactionAsync(
      { add: newRows },
      (result: any) => {
        console.log('[Transaction] Async batch complete:', result);
        // 更新本地数据
        this.transactionRowData = [...this.transactionRowData, ...newRows];
        this.rowCount.set(this.transactionRowData.length);
        this.transactionStats.update(s => ({ ...s, added: s.added + result.added.length }));
      }
    );
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
        // 单元格 sparkline 数据（6个月趋势）
        trend: Array.from({ length: 6 }, () => Math.floor(Math.random() * 100) + 20),
        // 详情图表数据
        chartLabels: details.map(d => d.productName),
        chartData: details.map(d => d.subtotal),
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

  // ========== 服务端数据行生成器 (Phase 2.3) ==========
  /**
   * 生成单条服务端数据行
   * @param id 行ID (1-based)
   */
  private generateServerRow(id: number): any {
    const names = ["张伟","王芳","李明","刘洋","陈静","杨帆","赵雷","黄丽","周杰","吴敏","徐强","孙悦","马超","朱华"];
    const departments = ["技术部","产品部","市场部","人力资源部","财务部","研发部","运营部","客服部"];
    const positions = ["工程师","经理","主管","专员","总监","助理","顾问","分析师"];
    const statuses = ["在职","出差","休假","离职"];
    
    // 使用确定性算法根据 id 生成数据（避免一次性生成10万条）
    const nameIdx = id % names.length;
    const deptIdx = Math.floor((id * 7) % departments.length);
    const posIdx = Math.floor((id * 13) % positions.length);
    const statusIdx = Math.floor((id * 3) % statuses.length);
    
    const year = 2020 + (id % 5);
    const month = (id % 12) + 1;
    const day = (id % 28) + 1;
    
    return {
      id: id,
      name: `${names[nameIdx]}${Math.floor(id / names.length) + 1}`,
      age: 22 + (id % 30),
      email: `user${id}@example.com`,
      department: departments[deptIdx],
      position: positions[posIdx],
      salary: Math.floor(8000 + ((id * 7919) % 30000)),
      startDate: `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`,
      status: statuses[statusIdx],
    };
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

  // ========== 填充手柄演示 (Phase 2.5) ==========
  fillHandleColumnDefs = [
    { field: "id", headerName: "ID", width: 80, sortable: true, editable: false },
    { field: "number", headerName: "数值", width: 120, sortable: true, editable: true, cellEditor: "number" },
    { field: "date", headerName: "日期", width: 130, sortable: true, editable: true, cellEditor: "date" },
    { field: "text", headerName: "文本", width: 150, sortable: true, editable: true },
    { field: "formula", headerName: "公式", width: 120, sortable: true, editable: true },
  ];
  fillHandleRowData = this.generateFillHandleData();
  fillHandleOptions = { rowSelection: "multiple" };

  /** 生成填充手柄演示数据 */
  private generateFillHandleData(): any[] {
    const data: any[] = [];
    // 数值序列：1, 2, 3...
    // 日期序列：2024-01-01, 2024-01-02...
    // 文本：复制填充
    for (let i = 1; i <= 20; i++) {
      data.push({
        id: i,
        number: i <= 3 ? i : null,  // 前3行有数值，其他为空
        date: i <= 3 ? `2024-01-${String(i).padStart(2, '0')}` : null,
        text: i === 1 ? '副本' : null,
        formula: i === 1 ? '=A1*2' : null,
      });
    }
    return data;
  }

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
  // ========== 区域选择演示 ==========
  rangeColumnDefs = [
    { field: "id", headerName: "ID", width: 80, sortable: true, filter: "number" },
    { field: "name", headerName: "姓名", width: 150, sortable: true, filter: "text", editable: true },
    { field: "age", headerName: "年龄", width: 100, sortable: true, filter: "number", editable: true, cellEditor: "number" },
    { field: "email", headerName: "邮箱", width: 220, sortable: true, filter: "text" },
    { field: "department", headerName: "部门", width: 150, sortable: true, filter: "set" },
    { field: "position", headerName: "职位", width: 150, sortable: true, filter: "set" },
    { field: "salary", headerName: "薪资", width: 120, sortable: true, filter: "number", editable: true, cellEditor: "number" },
    { field: "status", headerName: "状态", width: 100, sortable: true, filter: "set" },
  ];
  rangeRowData = this.generateEmployeeData(100);
  rangeOptions = { 
    enableRangeSelection: true, 
    enableCellSelection: true,
    rowSelection: "multiple" 
  };
  selectedRangeInfo = signal<string>("未选择");
  copiedData = signal<string>("");

  // ========== Column Group Demo ==========
  colGroupColumnDefs = [
    {
      headerName: '个人信息',
      children: [
        { field: 'name', headerName: '姓名', width: 120, sortable: true, filter: 'text' },
        { field: 'age', headerName: '年龄', width: 80, sortable: true, filter: 'number' },
        { field: 'gender', headerName: '性别', width: 80, sortable: true, filter: 'set' },
      ]
    },
    {
      headerName: '联系方式',
      children: [
        { field: 'email', headerName: '邮箱', width: 200, sortable: true, filter: 'text' },
        { field: 'phone', headerName: '电话', width: 130, sortable: true, filter: 'text' },
      ]
    },
    {
      headerName: '工作信息',
      children: [
        { field: 'department', headerName: '部门', width: 120, sortable: true, filter: 'set' },
        { field: 'position', headerName: '职位', width: 120, sortable: true, filter: 'set' },
        { field: 'salary', headerName: '薪资', width: 100, sortable: true, filter: 'number' },
      ]
    },
  ];

  colGroupRowData = this.generateEmployeeData(50);
  colGroupOptions = { rowSelection: 'single', sortable: true, filter: true };

  onRangeChanged(event: any): void {
    const ranges = this.gridApi?.getSelectedRanges?.() || [];
    if (ranges.length > 0) {
      const range = ranges[0];
      const startRow = Math.min(range.start.rowIndex, range.end.rowIndex);
      const endRow = Math.max(range.start.rowIndex, range.end.rowIndex);
      const colCount = 8; // 8 columns
      const cellCount = (endRow - startRow + 1) * colCount;
      this.selectedRangeInfo.set(`已选择 ${cellCount} 个单元格 (${startRow+1}行 - ${endRow+1}行)`);
    } else {
      this.selectedRangeInfo.set("未选择");
    }
  }

  copyRange(): void {
    if (this.gridApi) {
      this.gridApi.copyToClipboard();
      this.copiedData.set("已复制到剪贴板");
      setTimeout(() => this.copiedData.set(""), 2000);
    }
  }

  clearRange(): void {
    if (this.gridApi) {
      this.gridApi.clearRangeSelection?.();
      this.selectedRangeInfo.set("未选择");
    }
  }

  selectAllRange(): void {
    if (this.gridApi) {
      this.gridApi.selectAllCells?.();
    }
  }

  fillDown(): void {
    if (this.gridApi) {
      this.gridApi.fillHandle('down', 3);
      // 刷新视图以显示填充后的数据
      this.gridApi?.refreshCells?.();
    }
  }

  fillUp(): void {
    if (this.gridApi) {
      this.gridApi.fillHandle('up', 3);
      this.gridApi?.refreshCells?.();
    }
  }

  fillLeft(): void {
    if (this.gridApi) {
      this.gridApi.fillHandle('left', 3);
      this.gridApi?.refreshCells?.();
    }
  }

  fillRight(): void {
    if (this.gridApi) {
      this.gridApi.fillHandle('right', 3);
      this.gridApi?.refreshCells?.();
    }
  }

  // ========== 图表演示 ==========
  chartsType = signal<'bar' | 'line' | 'pie' | 'doughnut' | 'area'>('bar');
  private chartInstance: any = null;
  chartPanelVisible = signal<boolean>(false);

  chartsColumnDefs = [
    { field: 'month', headerName: '月份', width: 100 },
    { field: 'sales', headerName: '销售额', width: 120, cellDataType: 'number' },
    { field: 'profit', headerName: '利润', width: 120, cellDataType: 'number' },
    { field: 'cost', headerName: '成本', width: 120, cellDataType: 'number' },
  ];
  chartsRowData = [
    { month: '1月', sales: 12000, profit: 3000, cost: 9000 },
    { month: '2月', sales: 15000, profit: 4200, cost: 10800 },
    { month: '3月', sales: 18000, profit: 5500, cost: 12500 },
    { month: '4月', sales: 14000, profit: 3600, cost: 10400 },
    { month: '5月', sales: 22000, profit: 7000, cost: 15000 },
    { month: '6月', sales: 19000, profit: 5800, cost: 13200 },
    { month: '7月', sales: 25000, profit: 8200, cost: 16800 },
    { month: '8月', sales: 21000, profit: 6500, cost: 14500 },
    { month: '9月', sales: 17000, profit: 4500, cost: 12500 },
    { month: '10月', sales: 23000, profit: 7500, cost: 15500 },
    { month: '11月', sales: 26000, profit: 9000, cost: 17000 },
    { month: '12月', sales: 28000, profit: 9500, cost: 18500 },
  ];
  chartsOptions = { enableRangeSelection: true, enableCharts: true };

  /** 通过 gridApi 显示图表面板 */
  showChart(): void { 
    if (this.gridApi) {
      this.gridApi.chart?.showChartPanel();
      this.chartPanelVisible.set(true);
    }
  }
  /** 通过 gridApi 隐藏图表面板 */
  hideChart(): void { 
    if (this.gridApi) {
      this.gridApi.chart?.hideChartPanel();
      this.chartPanelVisible.set(false);
    }
  }

  /** 获取图表类型按钮配置 */
  getChartTypeButtons() {
    return [
      { type: 'bar' as const, label: '柱状图', icon: '📊' },
      { type: 'line' as const, label: '折线图', icon: '📈' },
      { type: 'area' as const, label: '面积图', icon: '📉' },
      { type: 'pie' as const, label: '饼图', icon: '🥧' },
      { type: 'doughnut' as const, label: '环形图', icon: '🍩' },
    ];
  }

  /** 图表数据变更回调（编辑表格数据时更新图表） */
  onChartDataChange(row: any, field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    row[field] = Number(value) || 0;
    // 延迟重新渲染图表
    setTimeout(() => this.renderChart(), 100);
  }

  renderChart(): void {
    const canvas = document.getElementById('mainChart') as HTMLCanvasElement;
    if (!canvas) return;

    // Destroy existing chart
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.chartInstance = new Chart(ctx, {
      type: this.chartsType() === 'area' ? 'line' : this.chartsType() as any,
      data: {
        labels: this.chartsRowData.map(d => d.month),
        datasets: [{
          label: '销售额',
          data: this.chartsRowData.map(d => d.sales),
          backgroundColor: this.chartsType() === 'area' 
            ? 'rgba(84,112,198,0.2)' 
            : ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#5470c6', '#91cc75', '#fac858'],
          borderColor: '#5470c6',
          borderWidth: 1,
          fill: this.chartsType() === 'area',
        }, {
          label: '利润',
          data: this.chartsRowData.map(d => d.profit),
          backgroundColor: this.chartsType() === 'area'
            ? 'rgba(115,192,222,0.2)'
            : ['#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452'],
          borderColor: '#73c0de',
          borderWidth: 1,
          fill: this.chartsType() === 'area',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'DB Grid 数据统计',
            font: { size: 14 }
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  // ========== 行固定演示 (Phase 3.1) ==========
  pinnedTopRowData = signal<any[]>([
    { id: 0, name: '汇总行', department: '—', salary: 0, status: '汇总' }
  ]);
  pinnedBottomRowData = signal<any[]>([
    { id: 0, name: '平均值', department: '—', salary: 0, status: '统计' }
  ]);

  pinRowData = this.generatePinData();

  generatePinData() {
    const depts = ['工程', '产品', '设计', '运营'];
    const statuses = ['在职', '休假', '离职'];
    const data = [];
    for (let i = 1; i <= 30; i++) {
      data.push({
        id: i,
        name: `员工${i}`,
        department: depts[i % depts.length],
        salary: 3000 + Math.floor(Math.random() * 12000),
        status: statuses[i % statuses.length],
      });
    }
    return data;
  }

  addPinnedTopRow() {
    const current = this.pinnedTopRowData();
    const totalSalary = this.pinRowData.reduce((s, r) => s + r.salary, 0);
    this.pinnedTopRowData.set([
      ...current,
      { id: current.length, name: `动态汇总 #${current.length + 1}`, department: '—', salary: totalSalary, status: '自动' }
    ]);
  }

  addPinnedBottomRow() {
    const current = this.pinnedBottomRowData();
    const avgSalary = Math.round(this.pinRowData.reduce((s, r) => s + r.salary, 0) / this.pinRowData.length);
    this.pinnedBottomRowData.set([
      ...current,
      { id: current.length, name: `统计 #${current.length + 1}`, department: '—', salary: avgSalary, status: '平均' }
    ]);
  }

  clearPinnedRows() {
    this.pinnedTopRowData.set([]);
    this.pinnedBottomRowData.set([]);
  }

  // ========== 迷你图演示 (Phase 3.5) ==========
  sparklineColumnDefs = [
    { field: 'name', headerName: '产品', width: 100 },
    { field: 'sales', headerName: '销售额趋势', width: 150, cellRenderer: 'sparkline' as any, sparklineType: 'line' as any, sparklineColor: '#2196f3' as any },
    { field: 'profit', headerName: '利润趋势', width: 150, cellRenderer: 'sparkline' as any, sparklineType: 'area' as any, sparklineColor: '#4caf50' as any },
    { field: 'volume', headerName: '成交量', width: 150, cellRenderer: 'sparkline' as any, sparklineType: 'bar' as any, sparklineColor: '#ff9800' as any },
    { field: 'totalSales', headerName: '总销售额', width: 120, cellAlign: 'right' as any },
    { field: 'totalProfit', headerName: '总利润', width: 120, cellAlign: 'right' as any },
  ];

  sparklineRowData = this.generateSparklineData();

  generateSparklineData() {
    const products = ['产品A', '产品B', '产品C', '产品D', '产品E', '产品F', '产品G', '产品H'];
    return products.map(name => {
      const sales: number[] = [];
      const profit: number[] = [];
      const volume: number[] = [];
      for (let i = 0; i < 12; i++) {
        sales.push(Math.floor(50 + Math.random() * 200));
        profit.push(Math.floor(-20 + Math.random() * 80));
        volume.push(Math.floor(100 + Math.random() * 500));
      }
      return {
        name,
        sales,
        profit,
        volume,
        totalSales: sales.reduce((a, b) => a + b, 0),
        totalProfit: profit.reduce((a, b) => a + b, 0),
      };
    });
  }

  sparklineOptions = { rowSelection: 'single' as any };

  // ============ 中间列固定 Demo ============
  pinnedCenterColumnDefs = [
    { field: 'id', headerName: 'ID', width: 80, pinnedLeft: true },
    { field: 'name', headerName: '姓名', width: 150, pinnedCenter: true },
    { field: 'age', headerName: '年龄', width: 100 },
    { field: 'email', headerName: '邮箱', width: 220 },
    { field: 'department', headerName: '部门', width: 150 },
    { field: 'position', headerName: '职位', width: 150 },
    { field: 'salary', headerName: '薪资', width: 120 },
    { field: 'status', headerName: '状态', width: 100, pinnedRight: true },
  ];

  pinnedCenterRowData = this.basicRowData;
  pinnedCenterOptions = { rowSelection: 'multiple', enableColVirtualization: false };


  // ============ Accessibility (ARIA) Demo ============
  accessibilityColumnDefs = [
    { field: 'id', headerName: 'ID', width: 80, sortable: true, ariaLabel: 'ID 列' },
    { field: 'name', headerName: '姓名', width: 150, sortable: true, filter: 'text', ariaLabel: '姓名列' },
    { field: 'age', headerName: '年龄', width: 100, sortable: true, filter: 'number', ariaLabel: '年龄列' },
    { field: 'department', headerName: '部门', width: 150, filter: 'set', ariaLabel: '部门列' },
    { field: 'status', headerName: '状态', width: 100, filter: 'set', ariaLabel: '状态列' },
  ];

  accessibilityRowData = this.basicRowData;
  accessibilityOptions = { 
    rowSelection: 'multiple' as any, 
    enableRangeSelection: true,
    ariaLive: 'polite' as any,
  };

  highContrastMode = false;

  toggleHighContrast(): void {
    this.highContrastMode = !this.highContrastMode;
    const gridElement = document.querySelector('db-grid')?.shadowRoot?.host || document.querySelector('db-grid');
    if (gridElement) {
      if (this.highContrastMode) {
        gridElement.classList.add('db-grid-theme-high-contrast');
      } else {
        gridElement.classList.remove('db-grid-theme-high-contrast');
      }
    }
  }

  onAccessibilityGridReady(params: any): void {
    this.gridApi = params.api;
    this.apiStatus.set('已连接 (Accessibility Demo)');
    // 演示屏幕阅读器播报
    setTimeout(() => {
      params.api.announce?.('表格已加载，共 ' + this.accessibilityRowData.length + ' 行数据');
    }, 1000);
  }
}
