import { Injectable } from '@angular/core';
import { ColDef } from '../models';

/**
 * 行拖拽服务 — 行排序拖拽（补充 DragDropService，聚焦行拖拽视觉反馈和交叉行拖拽）
 * AG Grid 对应功能：Row Dragging, Full Row Drag
 */
@Injectable({ providedIn: 'root' })
export class RowDragService {
  private rowDragEnabled = false;
  private rowDragMultiRow = false;
  private dragType: RowDragType = 'standard';
  private draggedRowId: string | null = null;
  private draggedRowIds: string[] = [];
  private hoverIndex = -1;
  private ghostRow: DragGhostData | null = null;

  private onRowDragStart: ((params: RowDragStartEvent) => void) | null = null;
  private onRowDragMove: ((params: RowDragMoveEvent) => void) | null = null;
  private onRowDragEnd: ((params: RowDragEndEvent) => void) | null = null;
  private onRowDragCancel: (() => void) | null = null;

  /** 初始化 */
  initialize(config: RowDragConfig = {}): void {
    this.rowDragEnabled = config.rowDragEnabled ?? false;
    this.rowDragMultiRow = config.rowDragMultiRow ?? false;
    this.dragType = config.dragType ?? 'standard';
  }

  /** 是否启用行拖拽 */
  isRowDragEnabled(): boolean { return this.rowDragEnabled; }

  /** 启用 */
  enable(): void { this.rowDragEnabled = true; }

  /** 禁用 */
  disable(): void { this.rowDragEnabled = false; this.clearDragState(); }

  /** 是否支持多行拖拽 */
  isMultiRowDrag(): boolean { return this.rowDragMultiRow; }

  /** 获取拖拽类型 */
  getDragType(): RowDragType { return this.dragType; }

  /** 开始拖拽行 */
  startDrag(rowId: string, event: MouseEvent, rowData?: any): void {
    if (!this.rowDragEnabled) return;
    this.draggedRowId = rowId;
    this.ghostRow = {
      rowId,
      data: rowData,
      offsetX: event.offsetX,
      offsetY: event.offsetY,
      mouseX: event.clientX,
      mouseY: event.clientY
    };

    if (this.onRowDragStart) {
      this.onRowDragStart({
        rowId,
        event,
        data: rowData
      });
    }
  }

  /** 开始多行拖拽 */
  startMultiDrag(rowIds: string[], event: MouseEvent): void {
    if (!this.rowDragEnabled || !this.rowDragMultiRow) return;
    this.draggedRowIds = rowIds;
    this.draggedRowId = rowIds[0] ?? null;

    if (this.onRowDragStart) {
      this.onRowDragStart({
        rowId: this.draggedRowId!,
        event,
        data: null,
        rowIds
      });
    }
  }

  /** 拖拽移动 */
  onDragMove(event: MouseEvent, overIndex: number): void {
    this.hoverIndex = overIndex;
    if (this.ghostRow) {
      this.ghostRow.mouseX = event.clientX;
      this.ghostRow.mouseY = event.clientY;
    }

    if (this.onRowDragMove) {
      this.onRowDragMove({
        rowId: this.draggedRowId!,
        hoverIndex: this.hoverIndex,
        event,
        isOverTop: false,
        isOverBottom: false
      });
    }
  }

  /** 结束拖拽 */
  endDrag(targetIndex: number, event: MouseEvent): void {
    if (this.onRowDragEnd) {
      this.onRowDragEnd({
        rowId: this.draggedRowId!,
        rowIds: this.draggedRowIds,
        fromIndex: -1,
        toIndex: targetIndex,
        event
      });
    }
    this.clearDragState();
  }

  /** 取消拖拽 */
  cancelDrag(): void {
    if (this.onRowDragCancel) this.onRowDragCancel();
    this.clearDragState();
  }

  /** 获取当前拖拽状态 */
  getDragState(): RowDragState {
    return {
      isDragging: this.draggedRowId !== null,
      draggedRowId: this.draggedRowId,
      draggedRowIds: [...this.draggedRowIds],
      hoverIndex: this.hoverIndex,
      ghostRow: this.ghostRow ? { ...this.ghostRow } : null
    };
  }

  /** 判断列是否作为拖拽手柄 */
  isDragHandleCol(col: ColDef): boolean {
    return !!col.checkboxSelection || col.field === '__dragHandle__';
  }

  /** 注册拖拽开始回调 */
  onDragStarted(callback: (params: RowDragStartEvent) => void): void {
    this.onRowDragStart = callback;
  }

  /** 注册拖拽移动回调 */
  onDragMoved(callback: (params: RowDragMoveEvent) => void): void {
    this.onRowDragMove = callback;
  }

  /** 注册拖拽结束回调 */
  onDragEnded(callback: (params: RowDragEndEvent) => void): void {
    this.onRowDragEnd = callback;
  }

  /** 注册拖拽取消回调 */
  onDragCancelled(callback: () => void): void {
    this.onRowDragCancel = callback;
  }

  private clearDragState(): void {
    this.draggedRowId = null;
    this.draggedRowIds = [];
    this.hoverIndex = -1;
    this.ghostRow = null;
  }

  destroy(): void {
    this.clearDragState();
    this.onRowDragStart = null;
    this.onRowDragMove = null;
    this.onRowDragEnd = null;
    this.onRowDragCancel = null;
  }
}

/** 行拖拽配置 */
export interface RowDragConfig {
  rowDragEnabled?: boolean;
  rowDragMultiRow?: boolean;
  dragType?: RowDragType;
}

/** 行拖拽类型 */
export type RowDragType = 'standard' | 'fullRow' | 'handle';

/** 拖拽幽灵数据 */
export interface DragGhostData {
  rowId: string;
  data: any;
  offsetX: number;
  offsetY: number;
  mouseX: number;
  mouseY: number;
}

/** 拖拽状态 */
export interface RowDragState {
  isDragging: boolean;
  draggedRowId: string | null;
  draggedRowIds: string[];
  hoverIndex: number;
  ghostRow: DragGhostData | null;
}

/** 拖拽开始事件 */
export interface RowDragStartEvent {
  rowId: string;
  event: MouseEvent;
  data: any;
  rowIds?: string[];
}

/** 拖拽移动事件 */
export interface RowDragMoveEvent {
  rowId: string;
  hoverIndex: number;
  event: MouseEvent;
  isOverTop: boolean;
  isOverBottom: boolean;
}

/** 拖拽结束事件 */
export interface RowDragEndEvent {
  rowId: string;
  rowIds?: string[];
  fromIndex: number;
  toIndex: number;
  event: MouseEvent;
}
