/**
 * Angular 组件渲染器接口
 * 用于 Angular 原生组件作为 Cell Renderer / Filter / Editor
 * 
 * AG Grid 对应：ICellRendererAngularComp / ICellEditorAngularComp
 */

import { IRowNode, ColDef, CellRendererParams, CellEditorParams } from '../models';

/**
 * Angular 单元格渲染器接口
 * 
 * 使用方式：
 * ```typescript
 * @Component({
 *   selector: 'app-star-renderer',
 *   template: `<span [class.selected]="value >= rating">★</span>`
 * })
 * export class StarRendererComponent implements ICellRendererAngularComp {
 *   value: number = 0;
 *   rating: number = 5;
 *   
 *   agInit(params: StarRendererParams): void {
 *     this.value = params.value;
 *     this.rating = params.rating || 5;
 *   }
 *   
 *   refresh(params: StarRendererParams): boolean {
 *     this.value = params.value;
 *     return true;
 *   }
 * }
 * ```
 */
export interface ICellRendererAngularComp {
  /**
   * 组件初始化时调用
   * @param params 渲染器参数
   */
  agInit?(params: CellRendererParams): void;
  
  /**
   * 刷新渲染器
   * @param params 新的参数
   * @returns true 表示组件自行处理刷新，false 表示框架需要重新创建组件
   */
  refresh?(params: CellRendererParams): boolean;
  
  /**
   * 获取渲染器的 GUI
   * @returns 渲染组件的 DOM 元素
   */
  getGui?(): HTMLElement;
  
  /**
   * 组件销毁时调用
   */
  destroy?(): void;
}

/**
 * Angular 单元格编辑器接口
 * 
 * 使用方式：
 * ```typescript
 * @Component({
 *   selector: 'app-progress-editor',
 *   template: `<input type="number" [(ngModel)]="value" min="0" max="100">`
 * })
 * export class ProgressEditorComponent implements ICellEditorAngularComp {
 *   value: number = 0;
 *   
 *   agInit(params: ProgressEditorParams): void {
 *     this.value = params.value;
 *   }
 *   
 *   getValue(): number {
 *     return this.value;
 *   }
 *   
 *   isCancelBeforeStart(): boolean {
 *     return false;
 *   }
 *   
 *   isCancelAfterEnd(): boolean {
 *     return false;
 *   }
 * }
 * ```
 */
export interface ICellEditorAngularComp {
  /**
   * 编辑器初始化时调用
   * @param params 编辑器参数
   */
  agInit?(params: CellEditorParams): void;
  
  /**
   * 获取编辑器返回的值
   */
  getValue(): any;
  
  /**
   * 是否在编辑开始前取消
   * @default false
   */
  isCancelBeforeStart?(): boolean;
  
  /**
   * 编辑完成后是否取消
   * @default false
   */
  isCancelAfterEnd?(): boolean;
  
  /**
   * 是否为弹出式编辑器
   * @default false
   */
  isPopup?(): boolean;
  
  /**
   * 获取焦点
   */
  focusIn?(): void;
  
  /**
   * 失去焦点
   */
  focusOut?(): void;
  
  /**
   * 获取编辑器 GUI
   */
  getGui?(): HTMLElement;
  
  /**
   * 销毁编辑器
   */
  destroy?(): void;
}

/**
 * Angular 筛选器接口
 */
export interface IFilterAngularComp {
  /**
   * 筛选器初始化
   */
  agInit?(params: any): void;
  
  /**
   * 是否激活
   */
  isFilterActive(): boolean;
  
  /**
   * 获取筛选模型
   */
  getModel(): any;
  
  /**
   * 设置筛选模型
   */
  setModel(model: any): void | Promise<void>;
  
  /**
   * 筛选器值变化时调用
   */
  onFilterChanged(): void;
  
  /**
   * 新行加载时调用
   */
  onNewRowsLoaded?(): void;
  
  /**
   * 获取筛选器 GUI
   */
  getGui?(): HTMLElement;
  
  /**
   * 销毁筛选器
   */
  destroy?(): void;
}

/**
 * Angular 组件渲染器配置
 */
export interface AngularCompConfig {
  /** Angular 组件类 */
  component: any;
  /** 组件参数 */
  params?: any;
}

/**
 * 单元格渲染器参数（扩展版）
 */
export interface CellRendererAngularParams<TData = any> extends CellRendererParams {
  /** 行数据 */
  data: TData;
  /** 行节点 */
  node: IRowNode;
  /** 列定义 */
  colDef: ColDef;
  /** 列定义（别名） */
  column: ColDef;
  /** 单元格值 */
  value: any;
  /** 行索引 */
  rowIndex: number;
  /** API */
  api: any;
  /** 列 API */
  columnApi: any;
  /** 上下文 */
  context: any;
  /** 组件实例（用户可设置） */
  $scope?: any;
}

/**
 * Full-width 组件渲染器接口
 * 用于渲染整行宽度的自定义组件
 */
export interface IFullWidthCellRendererAngularComp {
  /**
   * 初始化
   */
  agInit?(params: any): void;
  
  /**
   * 刷新
   */
  refresh?(params: any): boolean;
  
  /**
   * 获取 GUI
   */
  getGui?(): HTMLElement;
  
  /**
   * 销毁
   */
  destroy?(): void;
}
