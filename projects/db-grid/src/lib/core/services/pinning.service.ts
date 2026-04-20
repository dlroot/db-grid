/**
 * Column Pinning Service
 * 列固定服务
 */

import { Subject } from 'rxjs';
import { ColDef } from '../models';

export interface PinConfig {
  pinnedLeftColumns?: string[];
  pinnedRightColumns?: string[];
}

export class ColumnPinningService {
  private pinnedLeft: Set<string> = new Set();
  private pinnedRight: Set<string> = new Set();

  private onPinnedChanged$ = new Subject<{ columnId: string; side: 'left' | 'right' | null }>();

  initialize(columns: ColDef[], config?: PinConfig): void {
    this.pinnedLeft.clear();
    this.pinnedRight.clear();

    // 从 column definitions 读取
    columns.forEach(col => {
      const colId = col.colId || col.field;
      if (col.pinnedLeft === true) {
        this.pinnedLeft.add(colId);
      } else if (col.pinnedRight === true) {
        this.pinnedRight.add(colId);
      }
    });

    // 从 config 读取
    if (config?.pinnedLeftColumns) {
      config.pinnedLeftColumns.forEach(id => this.pinnedLeft.add(id));
    }
    if (config?.pinnedRightColumns) {
      config.pinnedRightColumns.forEach(id => this.pinnedRight.add(id));
    }
  }

  isPinnedLeft(colId: string): boolean {
    return this.pinnedLeft.has(colId);
  }

  isPinnedRight(colId: string): boolean {
    return this.pinnedRight.has(colId);
  }

  isPinned(colId: string): boolean {
    return this.isPinnedLeft(colId) || this.isPinnedRight(colId);
  }

  getPinnedSide(colId: string): 'left' | 'right' | null {
    if (this.isPinnedLeft(colId)) return 'left';
    if (this.isPinnedRight(colId)) return 'right';
    return null;
  }

  getPinnedLeftIds(): string[] {
    return Array.from(this.pinnedLeft);
  }

  getPinnedRightIds(): string[] {
    return Array.from(this.pinnedRight);
  }

  pinColumn(colId: string, side: 'left' | 'right'): void {
    this.unpinColumn(colId);
    if (side === 'left') {
      this.pinnedLeft.add(colId);
    } else {
      this.pinnedRight.add(colId);
    }
    this.onPinnedChanged$.next({ columnId: colId, side });
  }

  unpinColumn(colId: string): void {
    const wasPinned = this.getPinnedSide(colId);
    this.pinnedLeft.delete(colId);
    this.pinnedRight.delete(colId);
    if (wasPinned) {
      this.onPinnedChanged$.next({ columnId: colId, side: null });
    }
  }

  moveToPinned(colId: string, side: 'left' | 'right', position?: number): void {
    this.pinColumn(colId, side);
  }

  onPinnedChanged(callback: (event: { columnId: string; side: 'left' | 'right' | null }) => void): void {
    this.onPinnedChanged$.subscribe(callback);
  }

  getPinnedWidth(columns: ColDef[], side: 'left' | 'right'): number {
    const pinnedIds = side === 'left' ? this.pinnedLeft : this.pinnedRight;
    let width = 0;
    columns.forEach(col => {
      const colId = col.colId || col.field;
      if (pinnedIds.has(colId)) {
        width += col.width || 100;
      }
    });
    return width;
  }

  destroy(): void {
    this.onPinnedChanged$.complete();
  }
}