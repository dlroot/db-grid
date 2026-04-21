/**
 * 行渲染器
 * 处理行的创建、更新和回收
 */

import { Injectable } from '@angular/core';
import { ColDef, RowNode } from '../../models';
import { CellRendererService } from './cell-renderer';
import { ColumnService } from '../../services/column.service';

export interface RowRenderResult {
  rowElement: HTMLElement;
  cellElements: Map<string, HTMLElement>;
}

@Injectable()
export class RowRendererService {
  constructor(
    private cellRenderer: CellRendererService,
    private columnService: ColumnService
  ) {}

  /** 渲染行 */
  render(
    rowIndex: number,
    rowData: any,
    rowNode: RowNode
  ): RowRenderResult {
    const rowElement = this.createRowElement(rowIndex, rowNode);
    const cellElements = this.renderCells(rowElement, rowIndex, rowData, rowNode);

    return { rowElement, cellElements };
  }

  /** 创建行元素 */
  createRowElement(rowIndex: number, rowNode: RowNode): HTMLElement {
    const row = document.createElement('div');
    row.className = this.getRowClass(rowNode);
    row.style.cssText = this.getRowStyle(rowNode);
    row.dataset['rowIndex'] = String(rowIndex);
    row.dataset['rowId'] = rowNode.id;

    // ARIA 属性
    row.setAttribute('role', 'row');
    row.setAttribute('aria-rowindex', String(rowIndex + 1)); // ARIA 是 1-indexed
    const isSelected = rowNode.isSelected?.() ?? rowNode.selected;
    row.setAttribute('aria-selected', String(!!isSelected));
    if (rowNode.group) {
      row.setAttribute('aria-label', `分组行第${rowIndex + 1}行`);
    }

    // 添加行索引和层级
    if (rowNode.uiLevel !== undefined) {
      row.style.paddingLeft = `${rowNode.uiLevel * 20}px`;
    }

    return row;
  }

  /** 获取行类名 */
  private getRowClass(rowNode: RowNode): string {
    const classes = ['db-grid-row'];

    // 选中状态
    if (rowNode.isSelected?.() ?? rowNode.selected) {
      classes.push('db-grid-row-selected');
    }

    // 浮动行
    if (rowNode.isFloating()) {
      classes.push('db-grid-row-floating');
    }

    // 斑马纹
    if (rowNode.rowIndex !== null && rowNode.rowIndex % 2 === 1) {
      classes.push('db-grid-row-odd');
    }

    // 拖拽状态
    if (rowNode.isEditing) {
      classes.push('db-grid-row-editing');
    }

    return classes.join(' ');
  }

  /** 获取行样式 */
  private getRowStyle(rowNode: RowNode): string {
    const styles: string[] = [];

    // 行高
    if (rowNode.rowHeight) {
      styles.push(`height: ${rowNode.rowHeight}px`);
    }

    // 固定位置（用于虚拟滚动）
    // 位置由容器控制，这里不需要设置 top

    return styles.join('; ');
  }

  /** 渲染行中的所有单元格 */
  private renderCells(
    rowElement: HTMLElement,
    rowIndex: number,
    rowData: any,
    rowNode: RowNode
  ): Map<string, HTMLElement> {
    const cells = new Map<string, HTMLElement>();
    const columns = this.columnService.getVisibleColumns();

    columns.forEach((colDef, colIndex) => {
      const cellElement = this.renderCell(rowIndex, rowData, rowNode, colDef, colIndex);
      rowElement.appendChild(cellElement);
      cells.set(colDef.field || colDef.colId || '', cellElement);
    });

    return cells;
  }

  /** 渲染单个单元格 */
  private renderCell(
    rowIndex: number,
    rowData: any,
    rowNode: RowNode,
    colDef: ColDef,
    colIndex: number
  ): HTMLElement {
    // 获取单元格值
    const value = this.getCellValue(rowData, colDef);

    // 创建单元格元素
    const cellElement = this.cellRenderer.createCellElement(
      rowIndex,
      colDef,
      value,
      rowData,
      colIndex
    );

    // 设置单元格位置
    const colId = colDef.field || `col-${this.columnService.getVisibleIndex(colDef.colId || colDef.field || '')}`;
    cellElement.dataset['colId'] = colId;

    // 添加单元格点击事件
    this.setupCellEvents(cellElement, rowIndex, rowData, rowNode, colDef);

    return cellElement;
  }

  /** 获取单元格值 */
  private getCellValue(rowData: any, colDef: ColDef): any {
    const field = colDef.field;

    if (!field) return undefined;

    if (colDef.valueGetter) {
      const params: any = {
        data: rowData,
        colDef,
        column: colDef,
        getValue: () => this.getFieldValue(rowData, field),
        node: null,
        context: {},
        api: null,
      };
      return colDef.valueGetter(params);
    }

    return this.getFieldValue(rowData, field);
  }

  /** 获取字段值（支持嵌套） */
  private getFieldValue(data: any, field: string): any {
    if (!data || !field) return undefined;

    const keys = field.split('.');
    let value: any = data;

    for (const key of keys) {
      if (value == null) return undefined;
      value = value[key];
    }

    return value;
  }

  /** 设置单元格事件 */
  private setupCellEvents(
    cellElement: HTMLElement,
    rowIndex: number,
    rowData: any,
    rowNode: RowNode,
    colDef: ColDef
  ): void {
    // 点击事件
    cellElement.addEventListener('click', (e: MouseEvent) => {
      const event = new CustomEvent('cellClicked', {
        bubbles: true,
        detail: {
          rowIndex,
          rowData,
          rowNode,
          colDef,
          cellElement,
          event: e,
        },
      });
      cellElement.dispatchEvent(event);
    });

    // 双击事件 - 开始编辑
    cellElement.addEventListener('dblclick', (e: MouseEvent) => {
      // 只有可编辑的单元格才开启编辑
      if (colDef.editable !== false) {
        const value = this.getCellValue(rowData, colDef);
        // 触发 Angular 编辑器事件
        const editEvent = new CustomEvent('cellEditStart', {
          bubbles: true,
          detail: {
            rowIndex,
            rowData,
            rowNode,
            colDef,
            value,
            cellElement,
            event: e,
          },
        });
        cellElement.dispatchEvent(editEvent);
      }

      const event = new CustomEvent('cellDoubleClicked', {
        bubbles: true,
        detail: {
          rowIndex,
          rowData,
          rowNode,
          colDef,
          cellElement,
          event: e,
        },
      });
      cellElement.dispatchEvent(event);
    });

    // 值变更事件
    cellElement.addEventListener('cellValueChanged', (e: Event) => {
      const customEvent = e as CustomEvent;
      rowNode.updateData?.(rowData);
    });
  }

  /** 更新行样式（选中状态变化等） */
  updateRowStyle(rowElement: HTMLElement, rowNode: RowNode): void {
    rowElement.className = this.getRowClass(rowNode);
  }

  /** 高亮行 */
  highlightRow(rowElement: HTMLElement): void {
    rowElement.classList.add('db-grid-row-highlight');
    setTimeout(() => {
      rowElement.classList.remove('db-grid-row-highlight');
    }, 300);
  }

  /** 设置行样式 */
  setRowStyle(rowElement: HTMLElement, styles: Record<string, string>): void {
    Object.assign(rowElement.style, styles);
  }

  /** 获取行数据 */
  getRowData(rowElement: HTMLElement): { rowIndex: number; rowId: string } | null {
    const rowIndex = rowElement.dataset['rowIndex'];
    const rowId = rowElement.dataset['rowId'];

    if (rowIndex === undefined) return null;

    return {
      rowIndex: parseInt(rowIndex, 10),
      rowId: rowId || '',
    };
  }

  /** 显示行加载动画 */
  showLoading(rowElement: HTMLElement): void {
    rowElement.classList.add('db-grid-row-loading');

    // 添加加载指示器
    const spinner = document.createElement('div');
    spinner.className = 'db-grid-row-spinner';
    spinner.innerHTML = '<span>⟳</span>';
    rowElement.appendChild(spinner);
  }

  /** 隐藏行加载动画 */
  hideLoading(rowElement: HTMLElement): void {
    rowElement.classList.remove('db-grid-row-loading');
    const spinner = rowElement.querySelector('.db-grid-row-spinner');
    if (spinner) {
      spinner.remove();
    }
  }

  /** 销毁 */
  destroy(): void {
    // 清理工作
  }
}
