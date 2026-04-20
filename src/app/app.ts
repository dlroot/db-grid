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

  @ViewChild("myGrid") myGrid!: DbGridComponent;

  basicColumnDefs = [
    { field: "id", headerName: "ID", width: 80, sortable: true, resizable: true },
    { field: "name", headerName: "姓名", width: 150, sortable: true, resizable: true },
    { field: "age", headerName: "年龄", width: 100, sortable: true },
    { field: "email", headerName: "邮箱", width: 220, resizable: true },
    { field: "department", headerName: "部门", width: 150, sortable: true },
    { field: "position", headerName: "职位", width: 150, resizable: true },
    { field: "salary", headerName: "薪资", width: 120, sortable: true },
    { field: "startDate", headerName: "入职日期", width: 130, sortable: true },
    { field: "status", headerName: "状态", width: 100 },
  ];

  basicRowData = this.generateEmployeeData(100);
  basicOptions = { rowSelection: "multiple", animateRows: true, sortable: true, filter: true };

  // Tree data
  treeColumnDefs = [
    { field: "name", headerName: "组织架构", width: 300, sortable: true },
    { field: "type", headerName: "类型", width: 120 },
    { field: "manager", headerName: "负责人", width: 150 },
    { field: "employees", headerName: "员工数", width: 100 },
    { field: "budget", headerName: "预算", width: 120 },
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
    { field: "product", headerName: "产品", width: 150, sortable: true },
    { field: "category", headerName: "分类", width: 120, sortable: true },
    { field: "region", headerName: "地区", width: 120, sortable: true },
    { field: "quarter", headerName: "季度", width: 100, sortable: true },
    { field: "sales", headerName: "销售额", width: 120, sortable: true },
    { field: "profit", headerName: "利润", width: 100, sortable: true },
    { field: "quantity", headerName: "数量", width: 100 },
  ];

  groupRowData = this.generateSalesData(50);
  groupConfig = { groupFields: ["category", "region"], autoCreateGroupColumn: true, expandAll: true };
  groupOptions = {};

  // Excel data
  excelColumnDefs = [
    { field: "id", headerName: "编号", width: 80 },
    { field: "productName", headerName: "产品名称", width: 200 },
    { field: "category", headerName: "类别", width: 150 },
    { field: "price", headerName: "单价", width: 100 },
    { field: "quantity", headerName: "数量", width: 100 },
    { field: "amount", headerName: "金额", width: 120 },
    { field: "customer", headerName: "客户", width: 150 },
    { field: "salesman", headerName: "业务员", width: 120 },
    { field: "orderDate", headerName: "订单日期", width: 130 },
    { field: "status", headerName: "状态", width: 100 },
  ];

  excelRowData = this.generateSalesOrderData(200);
  excelOptions = { rowSelection: "multiple" };

  // Span data
  spanColumnDefs = [
    { field: "region", headerName: "地区", width: 150 },
    { field: "product", headerName: "产品", width: 150 },
    { field: "q1", headerName: "Q1销售额", width: 120 },
    { field: "q2", headerName: "Q2销售额", width: 120 },
    { field: "q3", headerName: "Q3销售额", width: 120 },
    { field: "q4", headerName: "Q4销售额", width: 120 },
    { field: "total", headerName: "年度总计", width: 130 },
  ];

  spanRowData = this.generateRegionalData();
  spanOptions = {};

  // ========== 行内编辑数据 ==========
  editColumnDefs = [
    { field: "id", headerName: "ID", width: 80, editable: false },
    { field: "name", headerName: "姓名", width: 150, editable: true, sortable: true },
    { field: "age", headerName: "年龄", width: 100, editable: true, cellEditor: "number" },
    { field: "email", headerName: "邮箱", width: 220, editable: true },
    { field: "department", headerName: "部门", width: 150, editable: true, cellEditor: "select", cellEditorParams: { values: ["技术部", "产品部", "市场部", "人力资源部", "财务部", "研发部", "运营部", "客服部"] } },
    { field: "position", headerName: "职位", width: 150, editable: true },
    { field: "salary", headerName: "薪资", width: 120, editable: true, cellEditor: "number" },
    { field: "status", headerName: "状态", width: 100, editable: true, cellEditor: "select", cellEditorParams: { values: ["在职", "出差", "休假", "离职"] } },
  ];
  editRowData = this.generateEmployeeData(30);
  editOptions = { rowSelection: "multiple" };

  // ========== 列固定数据 ==========
  pinColumnDefs = [
    { field: "id", headerName: "ID", width: 80, pinnedLeft: true },
    { field: "name", headerName: "姓名", width: 150, pinnedLeft: true },
    { field: "age", headerName: "年龄", width: 100 },
    { field: "email", headerName: "邮箱", width: 220 },
    { field: "department", headerName: "部门", width: 150 },
    { field: "position", headerName: "职位", width: 150 },
    { field: "salary", headerName: "薪资", width: 120 },
    { field: "startDate", headerName: "入职日期", width: 130 },
    { field: "status", headerName: "状态", width: 100, pinnedRight: true },
  ];
  pinOptions = { rowSelection: "multiple" };

  // ========== 拖拽排序数据 ==========
  dragRowData = this.generateEmployeeData(20);
  dragOptions = { rowSelection: "multiple", animateRows: true };

  // ========== P0 功能演示：筛选器 + 编辑器 + 多列排序 ==========
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

  // ========== 分页状态 ==========
  currentPage = signal<number>(1);
  totalPages = signal<number>(5);

  ngOnInit(): void {}

  onGridReady(event: any): void {
    this.gridApi = event.api;
    this.apiStatus.set("已连接");
    if (this.currentDemo() === "span" && this.gridApi) {
      const service = this.gridApi.getCellSpanService?.();
      if (service) service.initialize(this.spanColumnDefs, this.spanRowData, { autoMerge: true, mergeColumns: ["region"] });
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
}
