/**
 * 单元格渲染器
 * 处理单元格内容渲染和编辑
 * 
 * 支持的渲染器类型：
 * - string: 简单文本
 * - function: 自定义渲染函数
 * - Angular Component: Angular 原生组件（ICellRendererAngularComp）
 */

import { Injectable, ComponentRef, Injector } from '@angular/core';
import { ColDef, CellRendererParams, ValueFormatterParams, CellStyle, RowNode, ChartCellRendererConfig, ICellRendererAngularComp, CellRendererAngularParams } from '../../models';
import { ColumnService } from '../../services/column.service';
import { ChartsService } from '../../services/charts.service';
import { AngularComponentRendererService, AngularCompUtils } from '../../services/angular-component-renderer.service';
import { AngularComponentWrapper } from '../../../angular/services/angular-component-wrapper.service';

export interface CellRenderResult {
  value: any;
  textValue: string;
  element: HTMLElement | null;
  rendered: boolean;
}

@Injectable()
export class CellRendererService {
  /** 树模式配置 */
  private _isTreeMode = false;
  private _firstColumnField: string | null = null;

  /** Quick Filter 文本（用于高亮匹配） */
  private _quickFilterText: string = '';

  /** Angular 组件渲染器服务 */
  private angularRendererService: AngularComponentRendererService | null = null;

  /** Angular 组件缓存 */
  private angularComponentCache: Map<string, { ref: ComponentRef<any>; instance: any }> = new Map();

  /** 模块引用（用于动态组件创建） */
  private _moduleRef: any = null;

  constructor(
    private columnService: ColumnService, 
    private chartsService?: ChartsService,
    private injector?: Injector
  ) {
    // 初始化 Angular 组件渲染器服务
    this.angularRendererService = new AngularComponentRendererService();
  }

  /**
   * 设置模块引用（用于动态组件创建）
   */
  setModuleRef(moduleRef: any): void {
    this._moduleRef = moduleRef;
  }

  /**
   * 检查是否是 Angular 组件渲染器
   */
  isAngularComponentRenderer(rendererRef: any): boolean {
    if (!rendererRef) return false;
    
    // 检查是否是 Angular 组件类（有 @Component 装饰器或实现了 ICellRendererAngularComp）
    if (typeof rendererRef === 'function') {
      // 函数类型，可能是组件类
      if (rendererRef.prototype?.agInit || rendererRef.prototype?.refresh || rendererRef.prototype?.getGui) {
        return true;
      }
    }
    
    // 检查是否是对象实例
    if (typeof rendererRef === 'object') {
      if (typeof rendererRef.agInit === 'function' || typeof rendererRef.getGui === 'function') {
        return true;
      }
    }
    
    return false;
  }

  /** 设置 Quick Filter 文本 */
  setQuickFilterText(text: string): void {
    this._quickFilterText = text.toLowerCase().trim();
  }

  /** 获取 Quick Filter 文本 */
  getQuickFilterText(): string {
    return this._quickFilterText;
  }

  /** 设置树模式 */
  setTreeMode(isTreeMode: boolean, firstColumnField: string | null): void {
    this._isTreeMode = isTreeMode;
    this._firstColumnField = firstColumnField;
  }

  /** 获取是否为树模式 */
  get isTreeMode(): boolean {
    return this._isTreeMode;
  }

  /** 单元格编辑状态 */
  private editingCells: Map<string, HTMLElement> = new Map();

  /** 自定义渲染器缓存 */
  private rendererCache: Map<string, any> = new Map();

  /** 渲染单元格 */
  render(
    rowIndex: number,
    colDef: ColDef,
    value: any,
    data: any,
    params?: Partial<CellRendererParams>
  ): CellRenderResult {
    // 获取显示值
    const displayValue = this.getDisplayValue(value, colDef, data);
    const textValue = this.getTextValue(displayValue);

    return {
      value: displayValue,
      textValue,
      element: null,
      rendered: true,
    };
  }

  /** 获取显示值 */
  private getDisplayValue(value: any, colDef: ColDef, data: any): any {
    // 如果有 valueGetter，优先使用
    if (colDef.valueGetter) {
      const params: any = { data, colDef, column: colDef, context: {}, node: null };
      return colDef.valueGetter(params);
    }

    // 如果有 refData 映射，返回映射后的值
    if (colDef.refData && value != null) {
      const key = String(value);
      if (key in colDef.refData) {
        return colDef.refData[key];
      }
    }

    return value;
  }

  /** 获取文本值 */
  private getTextValue(value: any): string {
    if (value == null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /** 格式化单元格值 */
  formatValue(colDef: ColDef, value: any, data: any): string {
    if (colDef.valueFormatter) {
      const params: any = {
        value,
        data,
        colDef,
        column: colDef,
        context: {},
        node: null,
        api: null,
      };
      return colDef.valueFormatter(params) || '';
    }
    return this.getTextValue(value);
  }

  /** 获取单元格样式 */
  getCellStyle(colDef: ColDef, value: any, data: any): CellStyle | null {
    if (!colDef.cellStyle) return null;

    if (typeof colDef.cellStyle === 'function') {
      const params: any = {
        data,
        value,
        colDef,
        column: colDef,
        context: {},
        node: null,
        api: null as any,
      };
      return colDef.cellStyle(params);
    }

    return colDef.cellStyle;
  }

  /** 获取单元格类名 */
  getCellClass(colDef: ColDef, value: any, data: any): string {
    const classes: string[] = ['db-grid-cell'];

    // 基础类
    if (colDef.cellClass) {
      if (typeof colDef.cellClass === 'function') {
        const params: any = {
          data,
          value,
          colDef,
          column: colDef,
          context: {},
          node: null,
        };
        const result = colDef.cellClass(params);
        if (typeof result === 'string') {
          classes.push(result);
        } else if (Array.isArray(result)) {
          classes.push(...result);
        } else if (typeof result === 'object') {
          Object.entries(result).forEach(([key, val]) => {
            if (val) classes.push(key);
          });
        }
      } else if (typeof colDef.cellClass === 'string') {
        classes.push(colDef.cellClass);
      }
    }

    return classes.join(' ');
  }

  /** 创建单元格元素 */
  createCellElement(
    rowIndex: number,
    colDef: ColDef,
    value: any,
    data: any,
    colIndex?: number,
    rowNode?: RowNode
  ): HTMLElement {
    const cell = document.createElement('div');
    cell.className = this.getCellClass(colDef, value, data);
    cell.style.cssText = this.getCellStyleString(colDef);

    // ARIA 属性
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-rowindex', String(rowIndex + 1)); // ARIA 是 1-indexed
    if (colIndex !== undefined) {
      cell.setAttribute('aria-colindex', String(colIndex + 1));
    }
    cell.setAttribute('tabindex', '-1');
    if (value !== undefined && value !== null) {
      cell.setAttribute('aria-label', String(value));
    }
    if (colDef.editable === false) {
      cell.setAttribute('aria-readonly', 'true');
    }

    // 设置对齐方式
    if (colDef.cellAlign) {
      cell.style.justifyContent = colDef.cellAlign;
      cell.style.textAlign = colDef.cellAlign as any;
    }

    // 渲染内容
    const content = this.renderContent(cell, rowIndex, colDef, value, data, rowNode, {});

    // 添加tooltip
    if (colDef.tooltipField || colDef.tooltipValueGetter) {
      const tooltip = this.getTooltip(colDef, value, data);
      if (tooltip) {
        cell.title = tooltip;
      }
    }

    return cell;
  }

  /** 渲染单元格内容 */
  private renderContent(
    container: HTMLElement,
    rowIndex: number,
    colDef: ColDef,
    value: any,
    data: any,
    rowNode?: RowNode,
    params?: { api?: any; context?: any }
  ): void {
    const displayValue = this.getDisplayValue(value, colDef, data);
    const formattedValue = this.formatValue(colDef, displayValue, data);

    // 如果是树模式且是第一列，渲染树形单元格
    if (this._isTreeMode && colDef.field === this._firstColumnField && rowNode) {
      this.renderTreeCell(container, formattedValue, rowNode);
      return;
    }

    // 如果有图表单元格渲染器
    if (colDef.chartCellRenderer) {
      this.renderChartCell(container, colDef.chartCellRenderer, data);
      return;
    }

    // 如果有自定义渲染器
    if (colDef.cellRenderer) {
      this.renderCustomCellRenderer(container, colDef, displayValue, data, rowNode, {
        rowIndex,
        api: params?.api,
        context: params?.context,
      });
      return;
    }

    // 如果是复选框列
    if (colDef.checkboxSelection) {
      // 使用 rowNode.selected 而不是 value
      const isSelected = rowNode?.isSelected?.() ?? rowNode?.selected ?? false;
      this.renderCheckbox(container, isSelected, rowIndex, rowNode?.id);
      return;
    }

    // 如果是动作按钮列
    if (colDef.actions && Array.isArray(colDef.actions)) {
      this.renderActions(container, colDef.actions);
      return;
    }

    // 默认文本渲染（支持高亮）
    this.renderTextWithHighlight(container, formattedValue);
  }

  /** 渲染文本并高亮 Quick Filter 匹配 */
  private renderTextWithHighlight(container: HTMLElement, text: string): void {
    if (!this._quickFilterText || !text) {
      container.textContent = text;
      return;
    }

    const lowerText = text.toLowerCase();
    const filterLower = this._quickFilterText;
    
    if (!lowerText.includes(filterLower)) {
      container.textContent = text;
      return;
    }

    // 找到匹配并高亮
    container.innerHTML = '';
    let lastIndex = 0;
    let index = lowerText.indexOf(filterLower);

    while (index !== -1) {
      // 添加匹配前的普通文本
      if (index > lastIndex) {
        container.appendChild(document.createTextNode(text.slice(lastIndex, index)));
      }

      // 添加高亮的匹配文本
      const highlightSpan = document.createElement('span');
      highlightSpan.className = 'db-grid-quick-filter-highlight';
      highlightSpan.textContent = text.slice(index, index + filterLower.length);
      highlightSpan.style.backgroundColor = '#fff3cd'; // 黄色高亮
      highlightSpan.style.borderRadius = '2px';
      highlightSpan.style.padding = '0 2px';
      container.appendChild(highlightSpan);

      lastIndex = index + filterLower.length;
      index = lowerText.indexOf(filterLower, lastIndex);
    }

    // 添加剩余文本
    if (lastIndex < text.length) {
      container.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
  }

  /**
   * 渲染自定义单元格渲染器
   * 支持：
   * - string: 简单文本
   * - function: 自定义渲染函数
   * - Angular Component: Angular 原生组件（实现 ICellRendererAngularComp）
   */
  private renderCustomCellRenderer(
    container: HTMLElement,
    colDef: ColDef,
    value: any,
    data: any,
    rowNode: RowNode | undefined,
    extra: { rowIndex: number; api?: any; context?: any }
  ): void {
    const rendererRef = colDef.cellRenderer;
    const cacheKey = `${extra.rowIndex}-${colDef.field || colDef.colId}`;

    // 构建渲染器参数
    const params: CellRendererParams = {
      value,
      data,
      node: rowNode as any,
      colDef,
      column: colDef,
      $scope: null,
      rowIndex: extra.rowIndex,
      api: extra.api || null,
      columnApi: null,
      context: extra.context || {},
      rowId: data?.id,
    };

    // 1. 检查是否是 Angular 组件
    if (this.isAngularComponentRenderer(rendererRef)) {
      this.renderAngularComponent(container, rendererRef, params, cacheKey, extra);
      return;
    }

    // 2. 函数渲染器
    const renderer = this.getRenderer(rendererRef);
    if (typeof renderer === 'function') {
      const result = renderer(params);

      if (result instanceof HTMLElement) {
        container.appendChild(result);
      } else if (typeof result === 'string') {
        container.innerHTML = result;
      } else if (result && typeof result === 'object') {
        // Angular 组件返回（已废弃，直接使用 Angular 组件检测）
        this.rendererCache.set(cacheKey, result);
      }
      return;
    }

    // 3. 字符串渲染器（内联 HTML）
    if (typeof rendererRef === 'string') {
      // 安全处理：只允许基本 HTML
      container.innerHTML = this.sanitizeHtml(rendererRef);
      return;
    }

    // 4. 对象配置渲染器
    if (typeof rendererRef === 'object' && rendererRef !== null) {
      if (rendererRef.component) {
        // cellRendererFramework 格式
        this.renderAngularComponent(container, rendererRef.component, { ...params, ...rendererRef.params }, cacheKey, extra);
      } else if (rendererRef.renderer) {
        // 函数式
        const result = rendererRef.renderer(params);
        if (result instanceof HTMLElement) {
          container.appendChild(result);
        }
      }
    }
  }

  /**
   * 渲染 Angular 组件
   */
  private renderAngularComponent(
    container: HTMLElement,
    component: any,
    params: CellRendererParams,
    cacheKey: string,
    extra: { rowIndex: number }
  ): void {
    // 清理旧的组件
    this.destroyAngularComponent(cacheKey);

    try {
      // 方式 1：使用 injector 创建组件
      if (this.injector) {
        const componentRef = this.createAngularComponent(component, params, container, cacheKey);
        if (componentRef) {
          return;
        }
      }

      // 方式 2：直接调用 agInit（用于纯渲染，无 Angular 上下文）
      this.renderAngularComponentLegacy(component, params, container, cacheKey);
    } catch (e) {
      console.warn('[CellRenderer] Failed to render Angular component:', e);
      container.textContent = String(params.value ?? '');
    }
  }

  /**
   * 创建 Angular 组件（使用 Injector）
   */
  private createAngularComponent(
    component: any,
    params: CellRendererParams,
    container: HTMLElement,
    cacheKey: string
  ): ComponentRef<any> | null {
    if (!this.injector) return null;

    try {
      // 使用动态组件创建
      // 注意：这里需要 ViewContainerRef，在实际 Angular 上下文中会被替换
      const wrapper = this.injector.get(AngularComponentWrapper, null);
      if (wrapper) {
        return wrapper.createComponent(component, params, container, cacheKey);
      }
    } catch (e) {
      // 没有 AngularComponentWrapper，继续使用 legacy 方式
    }

    return null;
  }

  /**
   * 渲染 Angular 组件（Legacy 方式）
   * 用于无 Angular 上下文的情况
   */
  private renderAngularComponentLegacy(
    component: any,
    params: CellRendererParams,
    container: HTMLElement,
    cacheKey: string
  ): void {
    // 创建组件实例
    let instance: any;
    if (typeof component === 'function') {
      instance = new component();
    } else {
      instance = component;
    }

    // 调用 agInit
    if (typeof instance.agInit === 'function') {
      instance.agInit(params);
    }

    // 尝试获取 GUI
    let gui: HTMLElement;
    if (typeof instance.getGui === 'function') {
      gui = instance.getGui();
    } else if (instance.element) {
      gui = instance.element;
    } else if (instance.nativeElement) {
      gui = instance.nativeElement;
    } else {
      // 回退：创建一个容器
      gui = document.createElement('span');
      gui.textContent = String(params.value ?? '');
    }

    // 缓存实例
    this.angularComponentCache.set(cacheKey, { ref: null, instance });

    // 添加到容器
    if (gui.parentElement !== container) {
      container.appendChild(gui);
    }
  }

  /**
   * 销毁 Angular 组件
   */
  private destroyAngularComponent(cacheKey: string): void {
    const cached = this.angularComponentCache.get(cacheKey);
    if (cached) {
      if (typeof cached.instance.destroy === 'function') {
        cached.instance.destroy();
      }
      this.angularComponentCache.delete(cacheKey);
    }
  }

  /**
   * 销毁所有 Angular 组件
   */
  destroyAllAngularComponents(): void {
    this.angularComponentCache.forEach((cached) => {
      if (typeof cached.instance.destroy === 'function') {
        cached.instance.destroy();
      }
    });
    this.angularComponentCache.clear();
  }

  /**
   * HTML 安全处理
   */
  private sanitizeHtml(html: string): string {
    // 移除 script、onclick 等危险属性
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '');
  }

  /** 获取渲染器实例 */
  private getRenderer(rendererRef: any): any {
    if (this.rendererCache.has(rendererRef)) {
      return this.rendererCache.get(rendererRef);
    }

    // 支持传入组件类或工厂函数
    if (typeof rendererRef === 'function') {
      const instance = rendererRef;
      this.rendererCache.set(rendererRef, instance);
      return instance;
    }

    return null;
  }

  /** 渲染复选框 */
  private renderCheckbox(container: HTMLElement, checked: boolean, rowIndex?: number, rowId?: string): void {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'db-grid-checkbox db-grid-row-checkbox';
    
    // 设置唯一 id（优先使用 rowId，否则使用 rowIndex）
    const checkboxId = rowId ? `db-grid-checkbox-${rowId}` : `db-grid-checkbox-row-${rowIndex ?? 0}`;
    checkbox.id = checkboxId;
    
    checkbox.checked = !!checked;
    checkbox.disabled = false;
    checkbox.style.cursor = 'pointer';

    // 点击事件：触发 rowCheckboxToggle 自定义事件
    checkbox.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      const event = new CustomEvent('rowCheckboxToggle', {
        bubbles: true,
        detail: { checked: checkbox.checked, event: e },
      });
      checkbox.dispatchEvent(event);
    });

    container.appendChild(checkbox);
  }

  /** 渲染动作按钮 */
  private renderActions(container: HTMLElement, actions: any[]): void {
    actions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = 'db-grid-action-btn';
      btn.textContent = action.name || action.text || '';
      btn.disabled = action.disabled || false;

      if (action.icon) {
        const icon = document.createElement('span');
        icon.className = 'db-grid-action-icon';
        icon.innerHTML = this.resolveIconSvg(typeof action.icon === 'string' ? action.icon : 'zap');
        btn.insertBefore(icon, btn.firstChild);
      }

      container.appendChild(btn);
    });
  }

  /** 渲染树形单元格 */
  private renderTreeCell(container: HTMLElement, value: string, node: RowNode): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'db-tree-cell';
    wrapper.style.cssText = 'display: flex; align-items: center; gap: 4px; width: 100%; height: 100%;';

    // 缩进
    const level = node.level || 0;
    const indentSize = 20;
    wrapper.style.paddingLeft = `${level * indentSize}px`;

    // 展开/折叠图标
    const hasChildren = !!(node.children && node.children.length > 0);
    console.log('[TreeCell]', 'node.id:', node.id, 'children:', node.children, 'hasChildren:', hasChildren);
    if (hasChildren) {
      const icon = document.createElement('span');
      icon.className = 'db-tree-icon' + (node.expanded ? ' expanded' : '');
      icon.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; cursor: pointer; color: #666; flex-shrink: 0;';
      
      // 使用 SVG 图标
      icon.innerHTML = node.expanded
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
      
      // 点击事件
      icon.addEventListener('click', (e) => {
        e.stopPropagation();
        node.expanded = !node.expanded;
        // 触发重新渲染（通过 dispatchEvent）
        container.dispatchEvent(new CustomEvent('treeToggle', { detail: { node } }));
      });
      
      wrapper.appendChild(icon);
    } else {
      // 无子节点，占位
      const spacer = document.createElement('span');
      spacer.style.cssText = 'width: 16px; height: 16px; flex-shrink: 0;';
      wrapper.appendChild(spacer);
    }

    // 文本值
    const textSpan = document.createElement('span');
    textSpan.className = 'db-tree-value';
    textSpan.style.cssText = 'flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    textSpan.textContent = value;
    textSpan.title = value;
    wrapper.appendChild(textSpan);

    container.appendChild(wrapper);
  }

  /** 获取单元格样式字符串 */
  private getCellStyleString(colDef: ColDef): string {
    const styles: string[] = [];

    // 直接使用 colDef.width，避免依赖 columnService（可能存在初始化时序问题）
    const width = colDef.width || 200;

    styles.push(`width: ${width}px`);
    styles.push(`min-width: ${width}px`);
    styles.push(`max-width: ${width}px`);
    styles.push(`flex: none`);
    styles.push(`box-sizing: border-box`); // 与 header 一致，padding 包含在 width 内

    // 固定列样式
    if (colDef.pinnedLeft) {
      styles.push(`position: sticky`);
      styles.push(`left: 0`);
      styles.push(`z-index: 1`);
    } else if (colDef.pinnedRight) {
      styles.push(`position: sticky`);
      styles.push(`right: 0`);
      styles.push(`z-index: 1`);
    }

    if (colDef.cellStyle) {
      if (typeof colDef.cellStyle === 'object') {
        Object.entries(colDef.cellStyle).forEach(([key, value]) => {
          styles.push(`${key}: ${value}`);
        });
      }
    }

    return styles.join('; ');
  }

  /** 获取tooltip内容 */
  private getTooltip(colDef: ColDef, value: any, data: any): string {
    if (colDef.tooltipValueGetter) {
      const params: any = {
        value,
        data,
        colDef,
        column: colDef,
        context: {},
        node: null,
      };
      return colDef.tooltipValueGetter(params) || '';
    }

    if (colDef.tooltipField) {
      const fieldValue = this.getFieldValue(data, colDef.tooltipField);
      return String(fieldValue ?? '');
    }

    return '';
  }

  /** 获取字段值 */
  private getFieldValue(data: any, field: string): any {
    const keys = field.split('.');
    let value: any = data;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  }

  /** 开始编辑单元格 */
  startEdit(
    cellElement: HTMLElement,
    rowIndex: number,
    colDef: ColDef,
    value: any,
    data: any,
    event?: Event
  ): void {
    const cellKey = `${rowIndex}-${colDef.field}`;
    const editingCell = this.editingCells.get(cellKey);

    if (editingCell) {
      // 已经有编辑器在运行
      return;
    }

    // 如果是自定义编辑器
    if (colDef.cellEditor) {
      this.startCustomEditor(cellElement, colDef, value, data, cellKey);
      return;
    }

    // 根据列类型创建编辑器
    switch ((colDef.filter as string)?.toLowerCase() || colDef.cellEditor) {
      case 'number':
      case 'agnumbercolumnfilter':
        this.startNumberEditor(cellElement, colDef, value, cellKey);
        break;

      case 'date':
      case 'agdatecolumnfilter':
        this.startDateEditor(cellElement, colDef, value, cellKey);
        break;

      default:
        this.startTextEditor(cellElement, colDef, value, cellKey);
    }
  }

  /** 开始文本编辑器 */
  private startTextEditor(
    cell: HTMLElement,
    colDef: ColDef,
    value: any,
    cellKey: string
  ): void {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'db-grid-cell-editor db-grid-cell-editor-text';
    input.value = value ?? '';

    if (colDef.editable?.toString() === 'function') {
      // 动态禁用
    }

    this.setupEditor(cell, input, cellKey);
  }

  /** 开始数字编辑器 */
  private startNumberEditor(
    cell: HTMLElement,
    colDef: ColDef,
    value: any,
    cellKey: string
  ): void {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'db-grid-cell-editor db-grid-cell-editor-number';
    input.value = value ?? '';
    input.step = 'any';

    if (colDef.filterParams) {
      const params = colDef.filterParams as any;
      if (params.min !== undefined) input.min = params.min;
      if (params.max !== undefined) input.max = params.max;
    }

    this.setupEditor(cell, input, cellKey);
  }

  /** 开始日期编辑器 */
  private startDateEditor(
    cell: HTMLElement,
    colDef: ColDef,
    value: any,
    cellKey: string
  ): void {
    const input = document.createElement('input');
    input.type = 'date';
    input.className = 'db-grid-cell-editor db-grid-cell-editor-date';
    input.value = value ?? '';

    this.setupEditor(cell, input, cellKey);
  }

  /** 开始自定义编辑器 */
  private startCustomEditor(
    cell: HTMLElement,
    colDef: ColDef,
    value: any,
    data: any,
    cellKey: string
  ): void {
    // 支持 select 下拉编辑器
    if (colDef.cellEditor === 'agSelectCellEditor' || colDef.cellEditor === 'select') {
      this.startSelectEditor(cell, colDef, value, cellKey);
      return;
    }

    // 默认使用文本编辑器
    this.startTextEditor(cell, colDef, value, cellKey);
  }

  /** 开始下拉编辑器 */
  private startSelectEditor(
    cell: HTMLElement,
    colDef: ColDef,
    value: any,
    cellKey: string
  ): void {
    const select = document.createElement('select');
    select.className = 'db-grid-cell-editor db-grid-cell-editor-select';

    // 从 filterParams 获取选项
    const params = colDef.filterParams as any;
    const values = params?.values || [];

    values.forEach((optValue: any) => {
      const option = document.createElement('option');
      option.value = optValue;
      option.textContent = optValue;
      option.selected = optValue === value;
      select.appendChild(option);
    });

    this.setupEditor(cell, select, cellKey);
  }

  /** 设置编辑器 */
  private setupEditor(cell: HTMLElement, input: HTMLElement, cellKey: string): void {
    // 保存原始内容
    const originalContent = cell.innerHTML;
    (cell as any).__originalContent = originalContent;

    // 清空并添加编辑器
    cell.innerHTML = '';
    cell.appendChild(input);
    cell.classList.add('db-grid-cell-editing');
    input.focus();

    // 全选文本
    if (input instanceof HTMLInputElement) {
      input.select();
    }

    // 保存编辑器引用
    this.editingCells.set(cellKey, input);

    // 事件处理
    input.addEventListener('blur', () => this.onEditorBlur(cellKey));
    input.addEventListener('keydown', (e: Event) => this.onEditorKeyDown(e as KeyboardEvent, cellKey));
  }

  /** 编辑器失焦 */
  onEditorBlur(cellKey: string): void {
    // 延迟处理，因为可能触发其他事件
    setTimeout(() => {
      if (this.editingCells.has(cellKey)) {
        this.stopEdit(cellKey);
      }
    }, 100);
  }

  /** 编辑器按键 */
  onEditorKeyDown(event: KeyboardEvent, cellKey: string): void {
    const key = event.key;

    if (key === 'Enter') {
      event.preventDefault();
      this.stopEdit(cellKey, true);
    } else if (key === 'Escape') {
      event.preventDefault();
      this.stopEdit(cellKey, false);
    } else if (key === 'Tab') {
      event.preventDefault();
      this.stopEdit(cellKey, true);
      // TODO: 移动到下一个可编辑单元格
    }
  }

  /** 停止编辑 */
  stopEdit(cellKey: string, saveValue = true): void {
    const input = this.editingCells.get(cellKey);
    if (!input) return;

    const value = input instanceof HTMLInputElement || input instanceof HTMLSelectElement
      ? input.value
      : input.textContent;

    // 恢复原始样式
    const parent = input.parentElement;
    if (parent) {
      parent.classList.remove('db-grid-cell-editing');

      if (saveValue) {
        // 触发值变更事件
        const customEvent = new CustomEvent('cellValueChanged', {
          bubbles: true,
          detail: {
            cellKey,
            newValue: value,
          },
        });
        parent.dispatchEvent(customEvent);
      }

      // 恢复内容
      parent.innerHTML = (parent as any).__originalContent || value;
    }

    // 移除编辑器
    this.editingCells.delete(cellKey);
  }

  /** 销毁编辑器 */
  destroy(): void {
    this.editingCells.forEach((_, key) => {
      this.stopEdit(key, false);
    });
    this.editingCells.clear();
    this.rendererCache.clear();
    this.destroyAllAngularComponents();
  }

  /** 渲染图表单元格 */
  private renderChartCell(container: HTMLElement, config: ChartCellRendererConfig, data: any): void {
    if (!this.chartsService) return;
    let chartData = config.data;
    let chartLabels: string[] | undefined;
    if (config.dataField && data) {
      chartData = data[config.dataField];
      if (config.labelsField) {
        chartLabels = data[config.labelsField];
      }
    }
    if (!chartData || !Array.isArray(chartData) || chartData.length === 0) return;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;height:100%;';
    container.appendChild(wrapper);

    this.chartsService.createCellChart(wrapper, {
      type: config.type,
      data: chartData,
      labels: chartLabels,
      colors: config.colors,
      height: config.height,
      width: config.width,
      extraOptions: config.options,
    });
  }

  /** 根据图标名解析为 Lucide SVG HTML */
  resolveIconSvg(name: string): string {
    const icons: Record<string, string> = {
      'zap': `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
      'edit': `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`,
      'delete': `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`,
      'copy': `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`,
      'pencil': `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`,
      'trash': `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`,
      'download': `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
      'eye': `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    };
    return icons[name] || icons['zap'];
  }
}
