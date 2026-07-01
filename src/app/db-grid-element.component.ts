import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { DbGridComponent } from '../../projects/db-grid/src/lib/angular/components/grid/db-grid.component';

/**
 * Angular Elements 包装组件
 * 将 DbGridComponent 暴露为 Web Component (Custom Element)
 * 
 * 使用方式:
 * <db-grid-element
 *   [rowData]="[{...}]"
 *   [columnDefs]="[...]"
 *   (cellClick)="onCellClick($event)"
 * ></db-grid-element>
 */
@Component({
  selector: 'db-grid-element',
  template: `
    <db-grid
      #grid
      [rowData]="rowData"
      [columnDefs]="columnDefs"
      [gridOptions]="gridOptions"
      (gridReady)="onGridReady($event)"
      (cellClick)="onCellClick($event)"
      (cellDoubleClick)="onCellDoubleClick($event)"
      (selectionChanged)="onSelectionChanged($event)"
      (sortChanged)="onSortChanged($event)"
      (filterChanged)="onFilterChanged($event)"
      (rowClicked)="onRowClicked($event)"
      (rowDoubleClicked)="onRowDoubleClicked($event)"
    ></db-grid>
  `,
  imports: [DbGridComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  encapsulation: ViewEncapsulation.ShadowDom, // 使用 Shadow DOM 隔离样式
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class DbGridElementComponent implements OnInit {
  @ViewChild('grid') gridComponent!: DbGridComponent;

  // ========== 数据输入 ==========
  @Input() rowData: any[] = [];
  @Input() columnDefs: any[] = [];
  @Input() gridOptions: any = {};

  // ========== 事件输出 ==========
  @Output() gridReady = new EventEmitter<any>();
  @Output() cellClick = new EventEmitter<any>();
  @Output() cellDoubleClick = new EventEmitter<any>();
  @Output() selectionChanged = new EventEmitter<any>();
  @Output() sortChanged = new EventEmitter<any>();
  @Output() filterChanged = new EventEmitter<any>();
  @Output() rowClicked = new EventEmitter<any>();
  @Output() rowDoubleClicked = new EventEmitter<any>();

  // 内部 gridApi 引用
  private gridApi: any = null;

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    // 可以在这里添加初始化逻辑
  }

  // ========== Grid 事件处理 ==========
  onGridReady(event: any): void {
    this.gridApi = event.api;
    this.gridReady.emit(event);
  }

  onCellClick(event: any): void {
    this.cellClick.emit(event);
  }

  onCellDoubleClick(event: any): void {
    this.cellDoubleClick.emit(event);
  }

  onSelectionChanged(event: any): void {
    this.selectionChanged.emit(event);
  }

  onSortChanged(event: any): void {
    this.sortChanged.emit(event);
  }

  onFilterChanged(event: any): void {
    this.filterChanged.emit(event);
  }

  onRowClicked(event: any): void {
    this.rowClicked.emit(event);
  }

  onRowDoubleClicked(event: any): void {
    this.rowDoubleClicked.emit(event);
  }

  // ========== 公共 API（供外部 JavaScript 调用）==========
  
  /**
   * 获取 gridApi（用于高级操作）
   */
  getGridApi(): any {
    return this.gridApi;
  }

  /**
   * 获取 GridApi 包装器（Promise 接口，便于异步使用）
   */
  getGridApiAsync(): Promise<any> {
    return new Promise((resolve) => {
      if (this.gridApi) {
        resolve(this.gridApi);
      } else {
        // 等待 gridReady 事件
        const subscription = this.gridReady.subscribe((event: any) => {
          resolve(event.api);
          subscription.unsubscribe();
        });
      }
    });
  }

  /**
   * 设置行数据
   * @param data 新的行数据
   */
  setRowData(data: any[]): void {
    this.rowData = data;
  }

  /**
   * 更新列定义
   * @param cols 新的列定义
   */
  setColumnDefs(cols: any[]): void {
    this.columnDefs = cols;
  }

  /**
   * 导出为 Excel
   */
  exportToExcel(fileName: string = 'export.xlsx'): void {
    if (this.gridApi) {
      this.gridApi.exportToExcel(fileName);
    }
  }

  /**
   * 刷新数据
   */
  refreshData(): void {
    if (this.gridComponent) {
      this.gridComponent.refreshData();
    }
  }

  /**
   * 重置状态（列宽、排序、过滤等）
   */
  resetState(): void {
    if (this.gridComponent) {
      this.gridComponent.resetState();
    }
  }

  /**
   * 撤销
   */
  undo(): void {
    if (this.gridComponent) {
      this.gridComponent.undo();
    }
  }

  /**
   * 重做
   */
  redo(): void {
    if (this.gridComponent) {
      this.gridComponent.redo();
    }
  }
}
