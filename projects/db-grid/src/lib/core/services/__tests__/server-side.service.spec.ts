import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServerSideService, IServerSideDatasource, IServerSideGetRowsParams } from '../server-side.service';

function createMockDatasource(): IServerSideDatasource {
  return {
    getRows: vi.fn(),
  };
}

function createRows(start: number, count: number): any[] {
  return Array.from({ length: count }, (_, i) => ({ id: start + i, value: `row-${start + i}` }));
}

describe('ServerSideService', () => {
  let service: ServerSideService;
  let mockDatasource: IServerSideDatasource;

  beforeEach(() => {
    service = new ServerSideService();
    mockDatasource = createMockDatasource();
  });

  // ===== initialize =====
  describe('initialize', () => {
    it('should initialize with default config', () => {
      service.initialize();
      expect(service.isEnabled()).toBe(true);
      expect(service.getConfig().pageSize).toBe(100);
      expect(service.getConfig().cacheBlockSize).toBe(100);
    });

    it('should initialize with custom config', () => {
      service.initialize({
        pageSize: 50,
        cacheBlockSize: 50,
        maxBlocksInCache: 5,
        rowCount: 1000,
      });
      expect(service.getConfig().pageSize).toBe(50);
      expect(service.getConfig().cacheBlockSize).toBe(50);
      expect(service.getConfig().maxBlocksInCache).toBe(5);
    });

    it('should clear cache on initialize', () => {
      service.setDatasource(mockDatasource);
      service.initialize();
      expect(service.getCacheSize()).toBe(0);
    });

    it('should set infinite mode when infinite=true', () => {
      service.initialize({ infinite: true });
      expect(service.getRowModelType()).toBe('infinite');
    });

    it('should set serverSide mode when rowModelType=serverSide', () => {
      service.initialize({ rowModelType: 'serverSide' });
      expect(service.getRowModelType()).toBe('serverSide');
    });
  });

  // ===== setDatasource =====
  describe('setDatasource', () => {
    it('should accept datasource and trigger initial request', () => {
      const getRowsSpy = vi.spyOn(mockDatasource, 'getRows');
      service.initialize({ cacheBlockSize: 100 });
      service.setDatasource(mockDatasource);
      // Initial rows are requested
      expect(getRowsSpy).toHaveBeenCalled();
    });

    it('should handle same datasource instance', () => {
      service.initialize({ cacheBlockSize: 100 });
      const getRowsSpy = vi.spyOn(mockDatasource, 'getRows');
      service.setDatasource(mockDatasource);
      service.setDatasource(mockDatasource); // same instance
      // Implementation may or may not skip, just check it doesn't crash
      expect(getRowsSpy).toHaveBeenCalled();
    });
  });

  // ===== Data loading / callbacks =====
  describe('data loading callbacks', () => {
    it('should handle successCallback with rows and lastRow', () => {
      const callbackSpy = vi.fn();
      service.onRowsUpdatedEvent(callbackSpy);
      service.initialize({ cacheBlockSize: 100 });
      service.setDatasource(mockDatasource);

      // Trigger the internal request
      const params = mockDatasource.getRows.mock.calls[0][0] as IServerSideGetRowsParams;
      params.successCallback(createRows(0, 100), 500);

      expect(service.getRowCount()).toBe(500);
      expect(service.isLastRowKnown()).toBe(true);
      expect(callbackSpy).toHaveBeenCalled();
    });

    it('should handle successCallback with partial rows (last page)', () => {
      service.initialize({ cacheBlockSize: 100 });
      service.setDatasource(mockDatasource);

      const params = mockDatasource.getRows.mock.calls[0][0] as IServerSideGetRowsParams;
      // Return fewer rows than blockSize → implies last page
      params.successCallback(createRows(0, 50));

      expect(service.getRowCount()).toBe(50);
      expect(service.isLastRowKnown()).toBe(true);
    });

    it('should handle failCallback', () => {
      const errorSpy = vi.fn();
      service.onErrorEvent(errorSpy);
      service.initialize({ cacheBlockSize: 100 });
      service.setDatasource(mockDatasource);

      const params = mockDatasource.getRows.mock.calls[0][0] as IServerSideGetRowsParams;
      params.failCallback();

      expect(errorSpy).toHaveBeenCalledWith('Failed to load block 0');
    });

    it('should track loading state', () => {
      const loadingSpy = vi.fn();
      service.onLoadingChangedEvent(loadingSpy);
      service.initialize({ cacheBlockSize: 100 });
      service.setDatasource(mockDatasource);

      // Should emit loading=true when requesting
      expect(loadingSpy).toHaveBeenLastCalledWith(true);

      // After success
      const params = mockDatasource.getRows.mock.calls[0][0] as IServerSideGetRowsParams;
      params.successCallback(createRows(0, 100));
      expect(loadingSpy).toHaveBeenLastCalledWith(false);
    });
  });

  // ===== getRow / getRows =====
  describe('getRow / getRows', () => {
    beforeEach(() => {
      service.initialize({ cacheBlockSize: 100 });
      service.setDatasource(mockDatasource);
      const params = mockDatasource.getRows.mock.calls[0][0] as IServerSideGetRowsParams;
      params.successCallback(createRows(0, 200), 200);
    });

    it('should get row by index', () => {
      const row = service.getRow(0);
      expect(row?.id).toBe(0);
    });

    it('should return null for out of bounds index', () => {
      expect(service.getRow(-1)).toBeNull();
      expect(service.getRow(999)).toBeNull();
    });

    it('should get all loaded rows', () => {
      const rows = service.getRows();
      expect(rows.length).toBe(200);
    });

    it('should get rows in range', () => {
      const rows = service.getRowsInRange(5, 15);
      expect(rows.length).toBe(10);
      expect(rows[0].id).toBe(5);
    });

    it('should clamp range to available rows', () => {
      const rows = service.getRowsInRange(0, 999);
      expect(rows.length).toBe(200);
    });
  });

  // ===== getTotalHeight =====
  describe('getTotalHeight', () => {
    beforeEach(() => {
      service.initialize({ cacheBlockSize: 100 });
      service.setDatasource(mockDatasource);
    });

    it('should calculate height based on row count', () => {
      const params = mockDatasource.getRows.mock.calls[0][0] as IServerSideGetRowsParams;
      params.successCallback(createRows(0, 100), 500);
      expect(service.getTotalHeight(30)).toBe(15000);
    });

    it('should use allRows length when rowCount unknown', () => {
      const params = mockDatasource.getRows.mock.calls[0][0] as IServerSideGetRowsParams;
      params.successCallback(createRows(0, 100)); // no lastRow
      // rowCount not set, uses allRows.length
      expect(service.getTotalHeight(40)).toBeGreaterThan(0);
    });
  });

  // ===== Sorting / Filtering =====
  describe('sorting and filtering', () => {
    it('should set sort model and trigger reload', () => {
      const getRowsSpy = vi.spyOn(mockDatasource, 'getRows');
      service.initialize({ cacheBlockSize: 100 });
      service.setDatasource(mockDatasource);
      getRowsSpy.mockClear();

      service.setSortModel([{ colId: 'name', sort: 'asc' }]);
      expect(getRowsSpy).toHaveBeenCalled();
    });

    it('should set filter model and trigger reload', () => {
      const getRowsSpy = vi.spyOn(mockDatasource, 'getRows');
      service.initialize({ cacheBlockSize: 100 });
      service.setDatasource(mockDatasource);
      getRowsSpy.mockClear();

      service.setFilterModel({ name: 'test' });
      expect(getRowsSpy).toHaveBeenCalled();
    });

    it('should pass sort/filter model in getRows call', () => {
      service.initialize({ cacheBlockSize: 100 });
      service.setSortModel([{ colId: 'age', sort: 'desc' }]);
      service.setFilterModel({ city: 'NYC' });
      service.setDatasource(mockDatasource);

      const params = mockDatasource.getRows.mock.calls[0][0] as IServerSideGetRowsParams;
      expect(params.sortModel).toEqual([{ colId: 'age', sort: 'desc' }]);
      expect(params.filterModel).toEqual({ city: 'NYC' });
    });

    it('should get sort model', () => {
      service.initialize();
      service.setSortModel([{ colId: 'name', sort: 'asc' }]);
      const model = service.getSortModel();
      expect(model).toEqual([{ colId: 'name', sort: 'asc' }]);
    });

    it('should get filter model', () => {
      service.initialize();
      service.setFilterModel({ age: { filterType: 'number', filter: 25 } });
      const model = service.getFilterModel();
      expect(model.age).toBeDefined();
    });
  });

  // ===== Pagination =====
  describe('pagination', () => {
    beforeEach(() => {
      service.initialize({ pageSize: 100, cacheBlockSize: 100 });
      service.setDatasource(mockDatasource);
      const params = mockDatasource.getRows.mock.calls[0][0] as IServerSideGetRowsParams;
      params.successCallback(createRows(0, 500), 500);
    });

    it('should get current page from first visible row', () => {
      expect(service.getCurrentPage(0)).toBe(0);
      expect(service.getCurrentPage(100)).toBe(1);
      expect(service.getCurrentPage(250)).toBe(2);
    });

    it('should get total pages', () => {
      expect(service.getTotalPages()).toBe(5);
    });

    it('should return -1 for total pages when rowCount unknown', () => {
      service.clearCache();
      service.setDatasource(mockDatasource);
      const params = mockDatasource.getRows.mock.calls[0][0] as IServerSideGetRowsParams;
      params.successCallback(createRows(0, 100)); // no lastRow
      expect(service.getTotalPages()).toBe(-1);
    });

    it('should get page row ranges', () => {
      const range = service.getPageRows(2);
      expect(range.startRow).toBe(200);
      expect(range.endRow).toBe(300);
    });
  });

  // ===== refresh / clearCache =====
  describe('refresh / clearCache', () => {
    it('should clear all cache and reload', () => {
      const getRowsSpy = vi.spyOn(mockDatasource, 'getRows');
      service.initialize({ cacheBlockSize: 100 });
      service.setDatasource(mockDatasource);

      const params = mockDatasource.getRows.mock.calls[0][0] as IServerSideGetRowsParams;
      params.successCallback(createRows(0, 100), 200);

      getRowsSpy.mockClear();
      service.refresh();
      expect(getRowsSpy).toHaveBeenCalled();
      // After refresh, clearCache() is called then requestInitialRows() creates a new loading block
      expect(service.getCacheSize()).toBe(1);
    });

    it('should clear all data on clearCache', () => {
      service.initialize();
      service.setDatasource(mockDatasource);
      const params = mockDatasource.getRows.mock.calls[0][0] as IServerSideGetRowsParams;
      params.successCallback(createRows(0, 100), 200);

      service.clearCache();
      expect(service.getRows().length).toBe(0);
    });
  });

  // ===== requestRows / onScroll =====
  describe('requestRows / onScroll', () => {
    it('should not request if no datasource', () => {
      service.initialize();
      expect(() => service.requestRows(0, 100)).not.toThrow();
    });

    it('should handle scroll trigger', () => {
      service.initialize({ cacheBlockSize: 100 });
      service.setDatasource(mockDatasource);

      service.onScroll(0, 400, 40);
      expect(mockDatasource.getRows).toHaveBeenCalled();
    });

    it('should handle scroll with no rows', () => {
      service.initialize({ cacheBlockSize: 100 });
      service.setDatasource(mockDatasource);
      // Should not crash
      expect(() => service.onScroll(0, 400, 40)).not.toThrow();
    });
  });

  // ===== State queries =====
  describe('state queries', () => {
    beforeEach(() => {
      service.initialize({ cacheBlockSize: 100 });
      service.setDatasource(mockDatasource);
    });

    it('should report isLoading during pending request', () => {
      expect(service.isLoading()).toBe(true);
      const params = mockDatasource.getRows.mock.calls[0][0] as IServerSideGetRowsParams;
      params.successCallback(createRows(0, 100));
      expect(service.isLoading()).toBe(false);
    });

    it('should get pending request count', () => {
      expect(service.getPendingRequestCount()).toBeGreaterThanOrEqual(0);
    });

    it('should check hasMoreData', () => {
      // Load first block with lastRow=200 (total rows)
      const params = mockDatasource.getRows.mock.calls[0][0] as IServerSideGetRowsParams;
      params.successCallback(createRows(0, 100), 200);
      expect(service.hasMoreData()).toBe(true);

      // Load second block to complete all data
      service.requestRows(100, 200);
      const params2 = mockDatasource.getRows.mock.calls[1][0] as IServerSideGetRowsParams;
      params2.successCallback(createRows(100, 100), 200);
      expect(service.hasMoreData()).toBe(false);
    });

    it('should get displayed row count', () => {
      const params = mockDatasource.getRows.mock.calls[0][0] as IServerSideGetRowsParams;
      params.successCallback(createRows(0, 100), 500);
      expect(service.getDisplayedRowCount()).toBe(500);
    });

    it('should get current data', () => {
      const params = mockDatasource.getRows.mock.calls[0][0] as IServerSideGetRowsParams;
      params.successCallback(createRows(0, 100));
      const data = service.getCurrentData();
      expect(data.length).toBe(100);
    });
  });

  // ===== destroy =====
  describe('destroy', () => {
    it('should clear all state', () => {
      service.initialize();
      service.setDatasource(mockDatasource);
      service.destroy();
      expect(service.getCacheSize()).toBe(0);
    });
  });

  // ===== Edge cases =====
  describe('edge cases', () => {
    it('should handle multiple blocks loading', () => {
      service.initialize({ cacheBlockSize: 50 });
      service.setDatasource(mockDatasource);

      // Load block 0
      const params0 = mockDatasource.getRows.mock.calls[0][0] as IServerSideGetRowsParams;
      params0.successCallback(createRows(0, 50), 200);

      // Request block 1
      service.requestRows(50, 100);
      const params1 = mockDatasource.getRows.mock.calls[1][0] as IServerSideGetRowsParams;
      params1.successCallback(createRows(50, 50));

      expect(service.getCacheSize()).toBe(2);
    });

    it('should evict old blocks beyond maxBlocksInCache', () => {
      service.initialize({ cacheBlockSize: 50, maxBlocksInCache: 2 });
      service.setDatasource(mockDatasource);

      for (let i = 0; i < 5; i++) {
        service.requestRows(i * 50, (i + 1) * 50);
        const params = mockDatasource.getRows.mock.calls[i][0] as IServerSideGetRowsParams;
        params.successCallback(createRows(i * 50, 50));
      }

      expect(service.getCacheSize()).toBeLessThanOrEqual(2);
    });
  });
});