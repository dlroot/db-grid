/**
 * Drag Drop Service
 * 拖拽排序服务
 */

import { Subject, BehaviorSubject } from 'rxjs';
import { ColDef } from '../models';

export interface DragDropConfig {
  rowDragEnabled?: boolean;
  rowDragMultiDrag?: boolean;
  colDragEnabled?: boolean;
}

export interface DragStartedEvent {
  type: 'dragStarted';
  rowNodes: any[];
  initialX: number;
  initialY: number;
}

export interface DragEndedEvent {
  type: 'dragEnded';
  rowNodes: any[];
  finalX: number;
  finalY: number;
  targetIndex: number;
  success: boolean;
}

export interface ColDragEvent {
  type: 'colDragStart' | 'colDragEnd';
  colDef: ColDef;
  targetIndex: number;
}

/**
 * 列拖拽重排序配置（Phase 6.5 增强）
 */
export interface ColumnReorderConfig {
  /** 是否启用列拖拽重排序 */
  enabled?: boolean;
  /** 单列禁用拖拽（覆盖 colDef.suppressMovable） */
  suppressMovable?: string[];
  /** 拖拽到边缘时隐藏列 */
  suppressDragLeaveHidesColumns?: boolean;
  /** 列组整体拖拽 */
  dragGroupColumns?: boolean;
  /** 拖拽可视化类型：'column' | 'ghost' */
  dragType?: 'column' | 'ghost';
}


/**
 * 列拖拽状态
 */
export interface ColumnDragState {
  /** 正在拖拽的列 */
  draggingCol: ColDef | null;
  /** 拖拽起始位置 */
  startIndex: number;
  /** 当前目标位置 */
  targetIndex: number;
  /** 拖拽指示器位置 */
  indicatorPosition: number;
  /** 是否显示插入指示器 */
  showIndicator: boolean;
}

export class DragDropService {
  private rowDragEnabled = false;
  private colDragEnabled = false;
  private rowDragMultiDrag = false;

  private isDragging = false;
  private draggedRows: any[] = [];
  private dragStartIndex = -1;
  private dragStartPos = { x: 0, y: 0 };


  // Column drag state (Phase 6.5)
  private colDragState: ColumnDragState = {
    draggingCol: null,
    startIndex: -1,
    targetIndex: -1,
    indicatorPosition: 0,
    showIndicator: false,
  };
  private colReorderConfig: ColumnReorderConfig = {};
  private suppressMovableCols = new Set<string>();

  private onDragStarted$ = new Subject<DragStartedEvent>();
  private onDragEnded$ = new Subject<DragEndedEvent>();
  private onRowDragEnter$ = new Subject<number>();
  private onRowDragLeave$ = new Subject<number>();
  private onRowDrop$ = new Subject<{ fromIndex: number; toIndex: number }>();

  private onColDragStart$ = new Subject<ColDragEvent>();
  private onColDragMove$ = new Subject<ColumnDragState>();
  private onColumnMoved$ = new Subject<{ fromIndex: number; toIndex: number }>();
  private onColDragEnd$ = new Subject<ColDragEvent>();

  initialize(config?: DragDropConfig): void {
    if (config) {
      this.rowDragEnabled = config.rowDragEnabled ?? false;
      this.rowDragMultiDrag = config.rowDragMultiDrag ?? false;
      this.colDragEnabled = config.colDragEnabled ?? false;
    }
  }

  isRowDragEnabled(): boolean {
    return this.rowDragEnabled;
  }

  isColDragEnabled(): boolean {
    return this.colDragEnabled;
  }

  enableRowDrag(): void {
    this.rowDragEnabled = true;
  }

  disableRowDrag(): void {
    this.rowDragEnabled = false;
  }

  enableColDrag(): void {
    this.colDragEnabled = true;
  }

  disableColDrag(): void {
    this.colDragEnabled = false;
  }

  // Row Drag methods
  startRowDrag(rowNodes: any[], event: MouseEvent): void {
    if (!this.rowDragEnabled) return;

    this.isDragging = true;
    this.draggedRows = rowNodes;
    this.dragStartIndex = rowNodes[0]?.rowIndex ?? -1;
    this.dragStartPos = { x: event.clientX, y: event.clientY };

    this.onDragStarted$.next({
      type: 'dragStarted',
      rowNodes,
      initialX: event.clientX,
      initialY: event.clientY,
    });
  }

  endRowDrag(targetIndex: number, event: MouseEvent): void {
    if (!this.isDragging) return;

    const success = targetIndex !== this.dragStartIndex && targetIndex >= 0;

    this.onDragEnded$.next({
      type: 'dragEnded',
      rowNodes: this.draggedRows,
      finalX: event.clientX,
      finalY: event.clientY,
      targetIndex,
      success,
    });

    if (success) {
      this.onRowDrop$.next({
        fromIndex: this.dragStartIndex,
        toIndex: targetIndex,
      });
    }

    this.isDragging = false;
    this.draggedRows = [];
    this.dragStartIndex = -1;
  }

  cancelRowDrag(): void {
    this.isDragging = false;
    this.draggedRows = [];
    this.dragStartIndex = -1;
  }

  isDraggingRows(): boolean {
    return this.isDragging && this.rowDragEnabled;
  }

  getDraggedRows(): any[] {
    return [...this.draggedRows];
  }

  getDragStartIndex(): number {
    return this.dragStartIndex;
  }

  // Column Drag methods
  startColDrag(colDef: ColDef, targetIndex: number): void {
    if (!this.colDragEnabled) return;

    this.onColDragStart$.next({
      type: 'colDragStart',
      colDef,
      targetIndex,
    });
  }

  endColDrag(colDef: ColDef, targetIndex: number): void {
    this.onColDragEnd$.next({
      type: 'colDragEnd',
      colDef,
      targetIndex,
    });
  }


  // ========== Column Drag 重构（Phase 6.5）============
  
  /**
   * 配置列拖拽重排序
   */
  configureColReorder(config: ColumnReorderConfig): void {
    this.colReorderConfig = config;
    this.suppressMovableCols.clear();
    if (config.suppressMovable?.length) {
      config.suppressMovable.forEach(colId => this.suppressMovableCols.add(colId));
    }
  }

  /**
   * 检查列是否可以拖拽
   */
  canMoveColumn(colDef: ColDef): boolean {
    if (!this.colDragEnabled) return false;
    if (colDef.suppressMovable) return false;
    if (this.suppressMovableCols.has(colDef.colId || colDef.field || '')) return false;
    return true;
  }

  /**
   * 开始列拖拽
   */
  beginColumnDrag(colDef: ColDef, startIndex: number): void {
    if (!this.canMoveColumn(colDef)) return;
    
    this.colDragState = {
      draggingCol: colDef,
      startIndex,
      targetIndex: startIndex,
      indicatorPosition: 0,
      showIndicator: true,
    };
    
    this.onColDragStart$.next({
      type: 'colDragStart',
      colDef,
      targetIndex: startIndex,
    });
  }

  /**
   * 更新列拖拽目标位置
   */
  updateColumnDragTarget(targetIndex: number, indicatorPosition: number): void {
    if (!this.colDragState.draggingCol) return;
    
    this.colDragState.targetIndex = targetIndex;
    this.colDragState.indicatorPosition = indicatorPosition;
    this.colDragState.showIndicator = true;
  }

  /**
   * 结束列拖拽并执行重排序
   */
  finishColumnDrag(): { fromIndex: number; toIndex: number } | null {
    if (!this.colDragState.draggingCol) return null;
    
    const result = {
      fromIndex: this.colDragState.startIndex,
      toIndex: this.colDragState.targetIndex,
    };
    
    this.onColDragEnd$.next({
      type: 'colDragEnd',
      colDef: this.colDragState.draggingCol,
      targetIndex: this.colDragState.targetIndex,
    });
    
    this.resetColumnDragState();
    return result;
  }
  /**
   * 取消列拖拽
   */
  cancelColumnDrag(): void {
    this.resetColumnDragState();
  }
  /**
   * 获取列拖拽状态
   */
  getColumnDragState(): ColumnDragState {
    return { ...this.colDragState };
  }
  /**
   * 检查是否正在拖拽列
   */
  isDraggingColumn(): boolean {
    return this.colDragState.draggingCol !== null;
  }

  private resetColumnDragState(): void {
    this.colDragState = {
      draggingCol: null,
      startIndex: -1,
      targetIndex: -1,
      indicatorPosition: 0,
      showIndicator: false,
    };
  }

  // Event listeners
  onDragStarted(callback: (event: DragStartedEvent) => void): void {
    this.onDragStarted$.subscribe(callback);
  }

  onDragEnded(callback: (event: DragEndedEvent) => void): void {
    this.onDragEnded$.subscribe(callback);
  }

  onRowDragEnter(callback: (index: number) => void): void {
    this.onRowDragEnter$.subscribe(callback);
  }

  onRowDragLeave(callback: (index: number) => void): void {
    this.onRowDragLeave$.subscribe(callback);
  }

  onRowDrop(callback: (params: { fromIndex: number; toIndex: number }) => void): void {
    this.onRowDrop$.subscribe(callback);
  }

  onColDragStart(callback: (event: ColDragEvent) => void): void {
    this.onColDragStart$.subscribe(callback);
  }

  onColDragEnd(callback: (event: ColDragEvent) => void): void {
    this.onColDragEnd$.subscribe(callback);
  }
  onColDragMove(callback: (state: ColumnDragState) => void): void {
    this.onColDragMove$.subscribe(callback);
  }
  onColumnMoved(callback: (params: { fromIndex: number; toIndex: number }) => void): void {
    this.onColumnMoved$.subscribe(callback);
  }

  destroy(): void {
    this.onDragStarted$.complete();
    this.onDragEnded$.complete();
    this.onRowDragEnter$.complete();
    this.onRowDragLeave$.complete();
    this.onRowDrop$.complete();
    this.onColDragStart$.complete();
    this.onColDragEnd$.complete();
  }
}