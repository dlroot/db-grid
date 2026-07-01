/**
 * DbGrid Angular Elements - TypeScript 类型定义
 * 
 * 使用方式:
 * import { DbGridElement } from './db-grid-element';
 * 
 * const grid = document.querySelector<DbGridElement>('db-grid-element');
 * grid.rowData = [...];
 */

// ========== 核心类型 ==========

export interface RowData {
  [key: string]: any;
}

export interface ColumnDef {
  field?: string;
  headerName?: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  type?: string;
  cellRenderer?: string;
  cellEditor?: string;
  sortable?: boolean;
  filter?: boolean;
  resizable?: boolean;
  pinned?: 'left' | 'right';
  hide?: boolean;
  [key: string]: any;
}

export interface GridOptions {
  rowSelection?: 'single' | 'multiple';
  pagination?: boolean;
  paginationPageSize?: number;
  enableUndoRedo?: boolean;
  enableStatePersistence?: boolean;
  [key: string]: any;
}

// ========== 事件类型 ==========

export interface GridReadyEvent {
  api: any;
  columnApi: any;
}

export interface CellClickEvent {
  rowIndex: number;
  colKey: string;
  value: any;
  data: RowData;
}

export interface CellDoubleClickEvent extends CellClickEvent {}

export interface SelectionChangedEvent {
  selectedRows: RowData[];
  selectedNodes: any[];
}

export interface SortChangedEvent {
  sortModel: any[];
}

export interface FilterChangedEvent {
  filterModel: any;
}

export interface RowClickedEvent {
  rowIndex: number;
  data: RowData;
  event: MouseEvent;
}

export interface RowDoubleClickedEvent extends RowClickedEvent {}

// ========== DbGridElement 接口 ==========

export interface DbGridElement extends HTMLElement {
  // ========== 属性 ==========
  
  /** 行数据 */
  rowData: RowData[];
  
  /** 列定义 */
  columnDefs: ColumnDef[];
  
  /** Grid 配置选项 */
  gridOptions: GridOptions;

  // ========== 方法 ==========

  /**
   * 获取 Grid API（同步）
   * @returns Grid API 对象，如果 grid 未就绪则返回 null
   */
  getGridApi(): any | null;

  /**
   * 获取 Grid API（异步，推荐）
   * @returns Promise<GridApi>
   */
  getGridApiAsync(): Promise<any>;

  /**
   * 设置行数据
   * @param data 新的行数据
   */
  setRowData(data: RowData[]): void;

  /**
   * 更新列定义
   * @param cols 新的列定义
   */
  setColumnDefs(cols: ColumnDef[]): void;

  /**
   * 导出为 Excel
   * @param fileName 文件名（可选，默认 'export.xlsx'）
   */
  exportToExcel(fileName?: string): void;

  /**
   * 刷新数据
   */
  refreshData(): void;

  /**
   * 重置状态（列宽、排序、过滤等）
   */
  resetState(): void;

  /**
   * 撤销
   */
  undo(): void;

  /**
   * 重做
   */
  redo(): void;

  // ========== 事件监听 ==========

  addEventListener(type: 'gridReady', listener: (event: CustomEvent<{ detail: GridReadyEvent }>) => void): void;
  addEventListener(type: 'cellClick', listener: (event: CustomEvent<{ detail: CellClickEvent }>) => void): void;
  addEventListener(type: 'cellDoubleClick', listener: (event: CustomEvent<{ detail: CellDoubleClickEvent }>) => void): void;
  addEventListener(type: 'selectionChanged', listener: (event: CustomEvent<{ detail: SelectionChangedEvent }>) => void): void;
  addEventListener(type: 'sortChanged', listener: (event: CustomEvent<{ detail: SortChangedEvent }>) => void): void;
  addEventListener(type: 'filterChanged', listener: (event: CustomEvent<{ detail: FilterChangedEvent }>) => void): void;
  addEventListener(type: 'rowClicked', listener: (event: CustomEvent<{ detail: RowClickedEvent }>) => void): void;
  addEventListener(type: 'rowDoubleClicked', listener: (event: CustomEvent<{ detail: RowDoubleClickedEvent }>) => void): void;

  removeEventListener(type: string, listener: EventListener): void;
}

// ========== 声明全局 ==========

declare global {
  interface HTMLElementTagNameMap {
    'db-grid-element': DbGridElement;
  }

  interface Window {
    DbGridElements: {
      version: string;
      register: () => void;
      getElement: (id: string) => DbGridElement | null;
    };
  }
}

// ========== 导出辅助函数 ==========

/**
 * 等待 DbGridElement 注册
 * @returns Promise<void>
 */
export function waitForDbGrid(): Promise<void> {
  return new Promise((resolve) => {
    if (customElements.get('db-grid-element')) {
      resolve();
    } else {
      customElements.whenDefined('db-grid-element').then(resolve);
    }
  });
}

/**
 * 创建并初始化 DbGridElement
 * @param container 容器元素
 * @param rowData 行数据
 * @param columnDefs 列定义
 * @returns Promise<DbGridElement>
 */
export async function createDbGrid(
  container: HTMLElement,
  rowData: RowData[],
  columnDefs: ColumnDef[]
): Promise<DbGridElement> {
  await waitForDbGrid();

  const grid = document.createElement('db-grid-element') as DbGridElement;
  grid.rowData = rowData;
  grid.columnDefs = columnDefs;
  grid.style.width = '100%';
  grid.style.height = '500px';
  grid.style.display = 'block';

  container.appendChild(grid);
  return grid;
}

// ========== 默认导出 ==========

export default DbGridElement;
