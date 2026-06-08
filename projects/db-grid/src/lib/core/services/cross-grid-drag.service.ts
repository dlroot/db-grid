/**
 * Cross-Grid Row Drag Service
 * Supports dragging rows between two grids
 */

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface CrossGridDragCallbacks {
  getContainerElement: () => HTMLElement | null;
  getRowTop: (rowIndex: number) => number;
  getRowHeight: () => number;
  getRowCount: () => number;
  addRowAt: (rowIndex: number, data: any) => void;
  removeRowData: (data: any) => void;
}

export interface CrossGridDragEvent {
  type: 'dragStart' | 'dragEnter' | 'dragOver' | 'dragLeave' | 'drop' | 'dragEnd';
  sourceGridId: string;
  targetGridId?: string;
  rowNodes?: any[];
  data?: any[];
  targetRowIndex?: number;
  sourceEvent?: DragEvent;
}

export interface CrossGridDragOptions {
  cursorStyle?: string;
  removeOnDrag?: boolean;
  showPreview?: boolean;
}

@Injectable()
export class CrossGridDragService {
  private grids: Map<string, CrossGridDragCallbacks> = new Map();
  private isDragging = false;
  private dragSourceGridId: string | null = null;
  private dragData: any[] = [];
  private dragRowNodes: any[] = [];
  private options: CrossGridDragOptions = {
    cursorStyle: 'grabbing',
    removeOnDrag: true,
    showPreview: true,
  };
  private onDragEvent$ = new Subject<CrossGridDragEvent>();
  private previewElement: HTMLElement | null = null;

  constructor() {}

  registerGrid(gridId: string, callbacks: CrossGridDragCallbacks): void {
    this.grids.set(gridId, callbacks);
  }

  unregisterGrid(gridId: string): void {
    this.grids.delete(gridId);
  }

  isRegistered(gridId: string): boolean {
    return this.grids.has(gridId);
  }

  getRegisteredGridIds(): string[] {
    return Array.from(this.grids.keys());
  }

  startCrossGridDrag(
    gridId: string,
    rowNodes: any[],
    event?: DragEvent,
    options?: CrossGridDragOptions
  ): void {
    this.isDragging = true;
    this.dragSourceGridId = gridId;
    this.dragRowNodes = rowNodes;
    this.dragData = rowNodes.map(node => node.data || node);

    if (options) {
      Object.assign(this.options, options);
    }

    this.onDragEvent$.next({
      type: 'dragStart',
      sourceGridId: gridId,
      rowNodes,
      sourceEvent: event,
    });

    if (event?.dataTransfer) {
      event.dataTransfer.setData('application/json', JSON.stringify({
        sourceGridId: gridId,
        data: this.dragData,
      }));
      event.dataTransfer.effectAllowed = 'move';
    }

    if (this.options.showPreview && event) {
      this.createPreview(event);
    }

    document.body.style.cursor = this.options.cursorStyle || 'grabbing';
  }

  onDragEnterTarget(targetGridId: string, event: DragEvent): void {
    if (!this.isDragging || targetGridId === this.dragSourceGridId) return;

    this.onDragEvent$.next({
      type: 'dragEnter',
      sourceGridId: this.dragSourceGridId!,
      targetGridId,
      sourceEvent: event,
    });

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDragOverTarget(targetGridId: string, event: DragEvent): void {
    if (!this.isDragging || targetGridId === this.dragSourceGridId) return;

    const grid = this.grids.get(targetGridId);
    if (!grid) return;

    const container = grid.getContainerElement();
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const y = event.clientY - rect.top + container.scrollTop;
    const rowHeight = grid.getRowHeight();
    const targetRowIndex = Math.floor(y / rowHeight);

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    this.onDragEvent$.next({
      type: 'dragOver',
      sourceGridId: this.dragSourceGridId!,
      targetGridId,
      targetRowIndex,
      sourceEvent: event,
    });
  }

  onDragLeaveTarget(targetGridId: string): void {
    if (!this.isDragging) return;

    this.onDragEvent$.next({
      type: 'dragLeave',
      sourceGridId: this.dragSourceGridId!,
      targetGridId,
    });
  }

  onDropTarget(targetGridId: string, event: DragEvent, targetRowIndex?: number): boolean {
    if (!this.isDragging || targetGridId === this.dragSourceGridId) return false;

    const sourceGrid = this.grids.get(this.dragSourceGridId!);
    const targetGrid = this.grids.get(targetGridId);
    if (!targetGrid) return false;

    let dropData = this.dragData;
    let sourceId = this.dragSourceGridId!;

    if (event.dataTransfer) {
      try {
        const jsonData = event.dataTransfer.getData('application/json');
        if (jsonData) {
          const parsed = JSON.parse(jsonData);
          dropData = parsed.data || dropData;
          sourceId = parsed.sourceGridId || sourceId;
        }
      } catch {
        // fallback to in-memory data
      }
    }

    if (targetRowIndex === undefined) {
      const container = targetGrid.getContainerElement();
      if (container) {
        const rect = container.getBoundingClientRect();
        const y = event.clientY - rect.top + container.scrollTop;
        targetRowIndex = Math.floor(y / targetGrid.getRowHeight());
      } else {
        targetRowIndex = targetGrid.getRowCount();
      }
    }

    targetRowIndex = Math.max(0, Math.min(targetRowIndex, targetGrid.getRowCount()));

    dropData.forEach((data, i) => {
      targetGrid.addRowAt(targetRowIndex + i, data);
    });

    if (this.options.removeOnDrag && sourceGrid && sourceId !== targetGridId) {
      dropData.forEach(data => {
        sourceGrid.removeRowData(data);
      });
    }

    event.preventDefault();

    this.onDragEvent$.next({
      type: 'drop',
      sourceGridId: sourceId,
      targetGridId,
      data: dropData,
      targetRowIndex,
      sourceEvent: event,
    });

    return true;
  }

  endCrossGridDrag(): void {
    if (!this.isDragging) return;

    this.onDragEvent$.next({
      type: 'dragEnd',
      sourceGridId: this.dragSourceGridId!,
    });

    this.isDragging = false;
    this.dragSourceGridId = null;
    this.dragData = [];
    this.dragRowNodes = [];
    this.removePreview();
    document.body.style.cursor = '';
  }

  isCurrentlyDragging(): boolean {
    return this.isDragging;
  }

  getDragSourceGridId(): string | null {
    return this.dragSourceGridId;
  }

  getDragData(): any[] {
    return [...this.dragData];
  }

  onDragEvent(callback: (event: CrossGridDragEvent) => void): void {
    this.onDragEvent$.subscribe(callback);
  }

  private createPreview(event: DragEvent): void {
    this.removePreview();

    const preview = document.createElement('div');
    preview.className = 'db-grid-cross-drag-preview';
    preview.style.cssText = [
      'position: fixed',
      'z-index: 10000',
      'pointer-events: none',
      'opacity: 0.85',
      'padding: 8px 16px',
      'background: var(--db-grid-accent, #2196f3)',
      'color: white',
      'border-radius: 6px',
      'font-size: 13px',
      'box-shadow: 0 4px 12px rgba(0,0,0,0.2)',
      'white-space: nowrap',
    ].join(';');
    preview.textContent = this.dragData.length + ' rows';
    preview.style.left = (event.clientX + 12) + 'px';
    preview.style.top = (event.clientY + 12) + 'px';
    document.body.appendChild(preview);
    this.previewElement = preview;
  }

  private removePreview(): void {
    if (this.previewElement) {
      this.previewElement.remove();
      this.previewElement = null;
    }
  }

  destroy(): void {
    this.endCrossGridDrag();
    this.grids.clear();
    this.onDragEvent$.complete();
  }
}
