/**
 * 单元格渲染器
 * 处理单元格内容渲染和编辑
 */

import { Injectable } from '@angular/core';
import { ColDef, CellRendererParams, ValueFormatterParams, CellStyle, RowNode } from '../../models';
import { ColumnService } from '../../services/column.service';

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

  constructor(private columnService: ColumnService) {}

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
    const content = this.renderContent(cell, rowIndex, colDef, value, data, rowNode);

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
    rowNode?: RowNode
  ): void {
    const displayValue = this.getDisplayValue(value, colDef, data);
    const formattedValue = this.formatValue(colDef, displayValue, data);

    // 如果是树模式且是第一列，渲染树形单元格
    if (this._isTreeMode && colDef.field === this._firstColumnField && rowNode) {
      this.renderTreeCell(container, formattedValue, rowNode);
      return;
    }

    // 如果有自定义渲染器
    if (colDef.cellRenderer) {
      this.renderCustomCellRenderer(container, colDef, displayValue, data, {
        rowIndex,
      });
      return;
    }

    // 如果是复选框列
    if (colDef.checkboxSelection) {
      this.renderCheckbox(container, displayValue);
      return;
    }

    // 如果是动作按钮列
    if (colDef.actions && Array.isArray(colDef.actions)) {
      this.renderActions(container, colDef.actions);
      return;
    }

    // 默认文本渲染
    container.textContent = formattedValue;
  }

  /** 渲染自定义单元格渲染器 */
  private renderCustomCellRenderer(
    container: HTMLElement,
    colDef: ColDef,
    value: any,
    data: any,
    extra: { rowIndex: number }
  ): void {
    const renderer = this.getRenderer(colDef.cellRenderer);

    if (typeof renderer === 'function') {
      const params: any = {
        value,
        data,
        colDef,
        column: colDef,
        context: {},
        node: null,
        api: null,
        rowIndex: extra.rowIndex,
        $scope: null,
        rowId: data?.id,
        columnApi: null,
      };

      const result = renderer(params);

      if (result instanceof HTMLElement) {
        container.appendChild(result);
      } else if (typeof result === 'string') {
        container.innerHTML = result;
      } else if (result && typeof result === 'object' && 'destroy' in result) {
        // Angular 组件返回
        this.rendererCache.set(`${extra.rowIndex}-${colDef.field}`, result);
      }
    }
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
  private renderCheckbox(container: HTMLElement, checked: boolean): void {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'db-grid-checkbox';
    checkbox.checked = !!checked;
    checkbox.disabled = false;
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
        icon.textContent = typeof action.icon === 'string' ? action.icon : '⚡';
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
    if (hasChildren) {
      const icon = document.createElement('span');
      icon.className = 'db-tree-icon' + (node.expanded ? ' expanded' : '');
      icon.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; cursor: pointer; color: #666; flex-shrink: 0;';
      
      // 使用字符图标（更可靠）
      icon.textContent = node.expanded ? '▼' : '▶';
      icon.style.fontSize = '10px';
      icon.style.lineHeight = '16px';
      
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
  }
}
