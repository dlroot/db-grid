// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { RowPinningService, PinnedRowConfig, PinnedRowEntry } from '../row-pinning.service';

describe('RowPinningService', () => {
  let service: RowPinningService;

  beforeEach(() => {
    service = new RowPinningService();
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with empty config', () => {
      service.initialize();
      expect(service.hasPinnedRows()).toBe(false);
      expect(service.getPinnedRowCount()).toBe(0);
    });

    it('should initialize with pinned top rows', () => {
      const config: PinnedRowConfig = {
        pinnedTopRowData: [
          { name: 'Summary', total: 100 },
          { name: 'Average', total: 50 },
        ],
      };
      service.initialize(config);

      expect(service.hasPinnedRows()).toBe(true);
      expect(service.getPinnedRowCount('top')).toBe(2);
      expect(service.getPinnedRowCount('bottom')).toBe(0);

      const topRows = service.getPinnedTopRows();
      expect(topRows[0].data.name).toBe('Summary');
      expect(topRows[1].data.name).toBe('Average');
    });

    it('should initialize with pinned bottom rows', () => {
      const config: PinnedRowConfig = {
        pinnedBottomRowData: [
          { name: 'Total', value: 500 },
        ],
      };
      service.initialize(config);

      expect(service.hasPinnedRows()).toBe(true);
      expect(service.getPinnedRowCount('bottom')).toBe(1);
    });

    it('should initialize with both top and bottom rows', () => {
      const config: PinnedRowConfig = {
        pinnedTopRowData: [{ name: 'Header' }],
        pinnedBottomRowData: [{ name: 'Footer' }],
      };
      service.initialize(config);

      expect(service.getPinnedRowCount()).toBe(2);
      expect(service.getPinnedRowCount('top')).toBe(1);
      expect(service.getPinnedRowCount('bottom')).toBe(1);
    });
  });

  describe('Pin / Unpin operations', () => {
    it('should pin a row to top', () => {
      service.pinRow(0, { name: 'Pinned' }, 'top');
      expect(service.isPinned(0, 'top')).toBe(true);
      expect(service.isPinned(0, 'bottom')).toBe(false);
      expect(service.getPinnedTopRows().length).toBe(1);
    });

    it('should pin a row to bottom', () => {
      service.pinRow(0, { name: 'Footer' }, 'bottom');
      expect(service.isPinned(0, 'bottom')).toBe(true);
      expect(service.getPinnedBottomRows().length).toBe(1);
    });

    it('should pin multiple rows', () => {
      service.pinRow(0, { id: 1 }, 'top');
      service.pinRow(1, { id: 2 }, 'top');
      service.pinRow(0, { id: 3 }, 'bottom');

      expect(service.getPinnedTopRows().length).toBe(2);
      expect(service.getPinnedBottomRows().length).toBe(1);
    });

    it('should unpin a row from top', () => {
      service.pinRow(0, { name: 'Test' }, 'top');
      const result = service.unpinRow(0, 'top');
      expect(result).toBe(true);
      expect(service.isPinned(0)).toBe(false);
    });

    it('should unpin a row without specifying position', () => {
      service.pinRow(5, { name: 'Test' }, 'bottom');
      const result = service.unpinRow(5);
      expect(result).toBe(true);
      expect(service.isPinned(5)).toBe(false);
    });

    it('should return false when unpinning non-existent row', () => {
      expect(service.unpinRow(999)).toBe(false);
    });

    it('should unpin all rows', () => {
      service.pinRow(0, {}, 'top');
      service.pinRow(1, {}, 'top');
      service.pinRow(0, {}, 'bottom');
      service.unpinAll();
      expect(service.hasPinnedRows()).toBe(false);
    });

    it('should unpin all rows from one side only', () => {
      service.pinRow(0, {}, 'top');
      service.pinRow(0, {}, 'bottom');
      service.unpinAll('top');
      expect(service.getPinnedTopRows().length).toBe(0);
      expect(service.getPinnedBottomRows().length).toBe(1);
    });
  });

  describe('Data retrieval', () => {
    it('should return pinned top row data', () => {
      service.pinRow(0, { name: 'A' }, 'top');
      service.pinRow(1, { name: 'B' }, 'top');

      const data = service.getPinnedTopRowData();
      expect(data).toEqual([{ name: 'A' }, { name: 'B' }]);
    });

    it('should return pinned bottom row data', () => {
      service.pinRow(0, { name: 'C' }, 'bottom');
      const data = service.getPinnedBottomRowData();
      expect(data).toEqual([{ name: 'C' }]);
    });

    it('should sort pinned rows by pinIndex', () => {
      service.pinRow(2, { order: 3 }, 'top');
      service.pinRow(0, { order: 1 }, 'top');
      service.pinRow(1, { order: 2 }, 'top');

      const rows = service.getPinnedTopRows();
      expect(rows[0].data.order).toBe(1);
      expect(rows[1].data.order).toBe(2);
      expect(rows[2].data.order).toBe(3);
    });
  });

  describe('Update', () => {
    it('should update pinned row data', () => {
      service.pinRow(0, { name: 'Old' }, 'top');
      const result = service.updatePinnedRowData(0, { name: 'New' }, 'top');
      expect(result).toBe(true);
      expect(service.getPinnedTopRowData()[0].name).toBe('New');
    });

    it('should move row when position changes', () => {
      service.pinRow(0, { name: 'Test' }, 'top');
      service.updatePinnedRowData(0, { name: 'Test' }, 'bottom');
      expect(service.getPinnedTopRows().length).toBe(0);
      expect(service.getPinnedBottomRows().length).toBe(1);
    });

    it('should return false when updating non-existent row', () => {
      expect(service.updatePinnedRowData(999, {})).toBe(false);
    });
  });

  describe('Events', () => {
    it('should emit event on pin', () => {
      const spy = vi.fn();
      service.onPinnedRowsChanged(spy);
      service.pinRow(0, {}, 'top');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should emit event on unpin', () => {
      service.pinRow(0, {}, 'top');
      const spy = vi.fn();
      service.onPinnedRowsChanged(spy);
      service.unpinRow(0);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Count', () => {
    it('should count pinned rows correctly', () => {
      service.pinRow(0, {}, 'top');
      service.pinRow(1, {}, 'top');
      service.pinRow(0, {}, 'bottom');

      expect(service.getPinnedRowCount()).toBe(3);
      expect(service.getPinnedRowCount('top')).toBe(2);
      expect(service.getPinnedRowCount('bottom')).toBe(1);
    });
  });

  describe('Destroy', () => {
    it('should destroy without error', () => {
      expect(() => service.destroy()).not.toThrow();
    });
  });
});
