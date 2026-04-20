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

export class DragDropService {
  private rowDragEnabled = false;
  private colDragEnabled = false;
  private rowDragMultiDrag = false;

  private isDragging = false;
  private draggedRows: any[] = [];
  private dragStartIndex = -1;
  private dragStartPos = { x: 0, y: 0 };

  private onDragStarted$ = new Subject<DragStartedEvent>();
  private onDragEnded$ = new Subject<DragEndedEvent>();
  private onRowDragEnter$ = new Subject<number>();
  private onRowDragLeave$ = new Subject<number>();
  private onRowDrop$ = new Subject<{ fromIndex: number; toIndex: number }>();

  private onColDragStart$ = new Subject<ColDragEvent>();
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