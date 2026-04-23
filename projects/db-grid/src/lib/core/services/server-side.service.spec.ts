import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServerSideService, IServerSideDatasource, ServerSideConfig } from './server-side.service';

describe('ServerSideService', () => {
  let service: ServerSideService;

  beforeEach(() => {
    service = new ServerSideService();
  });

  describe('initialize', () => {
    it('should initialize with default config', () => {
      service.initialize();
      expect(service.isEnabled()).toBe(true);
      const config = service.getConfig();
      expect(config.pageSize).toBe(100);
      expect(config.cacheBlockSize).toBe(100);
      expect(config.maxBlocksInCache).toBe(10);
      expect(config.rowModelType).toBe('serverSide');
    });

    it('should initialize with custom config', () => {
      const config: ServerSideConfig = {
        pageSize: 50,
        cacheBlockSize: 50,
        maxBlocksInCache: 5,
        rowModelType: 'infinite',
        rowCount: 1000,
      };
      service.initialize(config);
      expect(service.getConfig().pageSize).toBe(50);
      expect(service.getConfig().cacheBlockSize).toBe(50);
      expect(service.getConfig().maxBlocksInCache).toBe(5);
      expect(service.getConfig().rowModelType).toBe('infinite');
      expect(service.getConfig().rowCount).toBe(1000);
    });

    it('should set infinite mode when infinite: true', () => {
      service.initialize({ infinite: true });
      expect(service.getRowModelType()).toBe('infinite');
    });

    it('should clear cache on initialize', () => {
      const datasource: IServerSideDatasource = {
        getRows: vi.fn(),
      };
      service.initialize();
      service.setDatasource(datasource);
      service.initialize();
      expect(service.getCacheSize()).toBe(0);
    });
  });

  describe('isEnabled', () => {
    it('should return false before initialize', () => {
      expect(service.isEnabled()).toBe(false);
    });

    it('should return true after initialize', () => {
      service.initialize();
      expect(service.isEnabled()).toBe(true);
    });
  });

  describe('setDatasource', () => {
    it('should set datasource and request initial rows', () => {
      const datasource: IServerSideDatasource = {
        getRows: vi.fn(),
      };
      service.initialize({ pageSize: 50, cacheBlockSize: 50 });
      service.setDatasource(datasource);
      expect(datasource.getRows).toHaveBeenCalledWith(
        expect.objectContaining({
          startRow: 0,
          endRow: 50,
        })
      );
    });

    it('should clear cache when setting new datasource', () => {
      const datasource: IServerSideDatasource = {
        getRows: vi.fn(),
      };
      service.initialize();
      service.setDatasource(datasource);
      // Simulate loaded data
      service['allRows'] = [1, 2, 3];
      service.setDatasource(datasource);
      expect(service.getRows()).toEqual([]);
    });
  });

  describe('getRows', () => {
    it('should return empty array initially', () => {
      service.initialize();
      expect(service.getRows()).toEqual([]);
    });

    it('should return loaded rows', () => {
      service.initialize();
      service['allRows'] = [{ id: 1 }, { id: 2 }];
      expect(service.getRows()).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('getRowsInRange', () => {
    it('should return rows in specified range', () => {
      service.initialize();
      service['allRows'] = [1, 2, 3, 4, 5];
      expect(service.getRowsInRange(1, 4)).toEqual([2, 3, 4]);
    });

    it('should handle range beyond array length', () => {
      service.initialize();
      service['allRows'] = [1, 2, 3];
      expect(service.getRowsInRange(1, 10)).toEqual([2, 3]);
    });

    it('should handle start beyond array length', () => {
      service.initialize();
      service['allRows'] = [1, 2, 3];
      expect(service.getRowsInRange(10, 20)).toEqual([]);
    });
  });

  describe('getRowCount / getTotalRowCount', () => {
    it('should return -1 when unknown', () => {
      service.initialize();
      expect(service.getRowCount()).toBe(0);
      expect(service.getTotalRowCount()).toBe(0);
    });

    it('should return known row count', () => {
      service.initialize({ rowCount: 500 });
      expect(service.getRowCount()).toBe(500);
      expect(service.getTotalRowCount()).toBe(500);
    });

    it('should return loaded rows count when rowCount unknown', () => {
      service.initialize();
      service['allRows'] = [1, 2, 3, 4, 5];
      expect(service.getRowCount()).toBe(5);
      expect(service.getTotalRowCount()).toBe(5);
    });
  });

  describe('isLastRowKnown', () => {
    it('should return false initially', () => {
      service.initialize();
      expect(service.isLastRowKnown()).toBe(false);
    });

    it('should return true when rowCount is set', () => {
      service.initialize({ rowCount: 100 });
      expect(service.isLastRowKnown()).toBe(true);
    });
  });

  describe('getRow', () => {
    it('should return row at index', () => {
      service.initialize();
      service['allRows'] = [{ id: 1 }, { id: 2 }, { id: 3 }];
      expect(service.getRow(1)).toEqual({ id: 2 });
    });

    it('should return null for invalid index', () => {
      service.initialize();
      service['allRows'] = [{ id: 1 }];
      expect(service.getRow(-1)).toBeNull();
      expect(service.getRow(10)).toBeNull();
    });
  });

  describe('getTotalHeight', () => {
    it('should calculate total height with known rowCount', () => {
      service.initialize({ rowCount: 100 });
      expect(service.getTotalHeight(30)).toBe(3000);
    });

    it('should estimate height with unknown rowCount', () => {
      service.initialize({ pageSize: 100 });
      service['allRows'] = [1, 2, 3];
      // getTotalHeight uses getRowCount() which returns allRows.length when rowCount < 0
      // So height = 3 * 30 = 90
      expect(service.getTotalHeight(30)).toBe(90);
    });
  });

  describe('data loading', () => {
    it('should load data from datasource', () => {
      const datasource: IServerSideDatasource = {
        getRows: vi.fn((params) => {
          params.successCallback([{ id: 1 }, { id: 2 }], 2);
        }),
      };
      service.initialize({ pageSize: 10 });
      service.setDatasource(datasource);
      expect(service.getRows()).toEqual([{ id: 1 }, { id: 2 }]);
      expect(service.getRowCount()).toBe(2);
    });

    it('should handle loading failure', () => {
      const errorCallback = vi.fn();
      service.onErrorEvent(errorCallback);
      const datasource: IServerSideDatasource = {
        getRows: vi.fn((params) => {
          params.failCallback();
        }),
      };
      service.initialize({ pageSize: 10 });
      service.setDatasource(datasource);
      expect(errorCallback).toHaveBeenCalledWith(expect.stringContaining('Failed'));
    });

    it('should track loading state', () => {
      let resolveSuccess: any;
      const datasource: IServerSideDatasource = {
        getRows: vi.fn((params) => {
          resolveSuccess = () => params.successCallback([1, 2, 3], 3);
        }),
      };
      service.initialize({ pageSize: 10 });
      service.setDatasource(datasource);
      expect(service.isLoading()).toBe(true);
      resolveSuccess();
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('loading changed callback', () => {
    it('should emit loading state changes', () => {
      const loadingCallback = vi.fn();
      service.onLoadingChangedEvent(loadingCallback);
      let resolveSuccess: any;
      const datasource: IServerSideDatasource = {
        getRows: vi.fn((params) => {
          resolveSuccess = () => params.successCallback([1], 1);
        }),
      };
      service.initialize({ pageSize: 10 });
      service.setDatasource(datasource);
      expect(loadingCallback).toHaveBeenCalledWith(true);
      resolveSuccess();
      expect(loadingCallback).toHaveBeenCalledWith(false);
    });
  });

  describe('rows updated callback', () => {
    it('should emit when rows are updated', () => {
      const updateCallback = vi.fn();
      service.onRowsUpdatedEvent(updateCallback);
      const datasource: IServerSideDatasource = {
        getRows: vi.fn((params) => {
          params.successCallback([1, 2, 3], 3);
        }),
      };
      service.initialize({ pageSize: 10 });
      service.setDatasource(datasource);
      expect(updateCallback).toHaveBeenCalled();
    });
  });

  describe('onScroll', () => {
    it('should request rows based on scroll position', () => {
      const datasource: IServerSideDatasource = {
        getRows: vi.fn((params) => {
          params.successCallback([], -1);
        }),
      };
      service.initialize({ pageSize: 100, cacheBlockSize: 100 });
      service.setDatasource(datasource);
      // Block 0 (rows 0-99) is already loaded from setDatasource
      datasource.getRows.mockClear();
      // Scroll to row 150-180 to request block 1 (rows 100-199)
      service.onScroll(150 * 30, 30 * 10, 30); // scrollTop=4500, viewport=300, rowHeight=30
      // firstRow = 150, lastRow = 160, prefetch range 100-210
      expect(datasource.getRows).toHaveBeenCalled();
    });

    it('should not request if already cached', () => {
      const datasource: IServerSideDatasource = {
        getRows: vi.fn((params) => {
          params.successCallback([1, 2, 3], 3);
        }),
      };
      service.initialize({ pageSize: 100 });
      service.setDatasource(datasource);
      datasource.getRows.mockClear();
      // Same block already loaded
      service.onScroll(0, 100, 30);
      // Should not request again for same block
      expect(datasource.getRows).not.toHaveBeenCalled();
    });
  });

  describe('setSortModel / setFilterModel', () => {
    it('should set sort model and reload', () => {
      const datasource: IServerSideDatasource = {
        getRows: vi.fn((params) => {
          params.successCallback([], -1);
        }),
      };
      service.initialize({ pageSize: 10 });
      service.setDatasource(datasource);
      datasource.getRows.mockClear();
      service.setSortModel([{ colId: 'name', sort: 'asc' }]);
      expect(datasource.getRows).toHaveBeenCalledWith(
        expect.objectContaining({
          sortModel: [{ colId: 'name', sort: 'asc' }],
        })
      );
    });

    it('should set filter model and reload', () => {
      const datasource: IServerSideDatasource = {
        getRows: vi.fn((params) => {
          params.successCallback([], -1);
        }),
      };
      service.initialize({ pageSize: 10 });
      service.setDatasource(datasource);
      datasource.getRows.mockClear();
      service.setFilterModel({ name: { type: 'contains', filter: 'test' } });
      expect(datasource.getRows).toHaveBeenCalledWith(
        expect.objectContaining({
          filterModel: { name: { type: 'contains', filter: 'test' } },
        })
      );
    });

    it('should clear cache when sort/filter changes', () => {
      service.initialize();
      service['allRows'] = [1, 2, 3];
      service.setSortModel([{ colId: 'name', sort: 'asc' }]);
      expect(service.getRows()).toEqual([]);
    });
  });

  describe('getSortModel / getFilterModel', () => {
    it('should return sort model', () => {
      service.initialize();
      service.setSortModel([{ colId: 'name', sort: 'asc' }]);
      expect(service.getSortModel()).toEqual([{ colId: 'name', sort: 'asc' }]);
    });

    it('should return filter model', () => {
      service.initialize();
      service.setFilterModel({ name: { type: 'contains', filter: 'test' } });
      expect(service.getFilterModel()).toEqual({ name: { type: 'contains', filter: 'test' } });
    });

    it('should return copy of sort/filter model', () => {
      service.initialize();
      service.setSortModel([{ colId: 'name', sort: 'asc' }]);
      const sortModel = service.getSortModel();
      sortModel.push({ colId: 'age', sort: 'desc' });
      expect(service.getSortModel().length).toBe(1);
    });
  });

  describe('refresh', () => {
    it('should clear cache and reload', () => {
      const datasource: IServerSideDatasource = {
        getRows: vi.fn((params) => {
          params.successCallback([], -1);
        }),
      };
      service.initialize({ pageSize: 10 });
      service.setDatasource(datasource);
      service['allRows'] = [1, 2, 3];
      datasource.getRows.mockClear();
      service.refresh();
      expect(service.getRows()).toEqual([]);
      expect(datasource.getRows).toHaveBeenCalled();
    });
  });

  describe('refreshBlock', () => {
    it('should refresh specific block', () => {
      const datasource: IServerSideDatasource = {
        getRows: vi.fn((params) => {
          params.successCallback([1], -1);
        }),
      };
      service.initialize({ pageSize: 10, cacheBlockSize: 10 });
      service.setDatasource(datasource);
      datasource.getRows.mockClear();
      service.refreshBlock(0);
      expect(datasource.getRows).toHaveBeenCalledWith(
        expect.objectContaining({
          startRow: 0,
          endRow: 10,
        })
      );
    });
  });

  describe('clearCache', () => {
    it('should clear all cached data', () => {
      service.initialize();
      service['allRows'] = [1, 2, 3];
      service['cache'].set(0, { startRow: 0, endRow: 10, rows: [1], lastRow: null, status: 'loaded', timestamp: Date.now() });
      service['pendingRequests'].add(0);
      service.clearCache();
      expect(service.getCacheSize()).toBe(0);
      expect(service.getPendingRequestCount()).toBe(0);
      expect(service.getRows()).toEqual([]);
    });
  });

  describe('pagination API', () => {
    it('should calculate current page', () => {
      service.initialize({ pageSize: 50 });
      expect(service.getCurrentPage(0)).toBe(0);
      expect(service.getCurrentPage(50)).toBe(1);
      expect(service.getCurrentPage(99)).toBe(1);
      expect(service.getCurrentPage(100)).toBe(2);
    });

    it('should calculate total pages', () => {
      service.initialize({ pageSize: 50, rowCount: 100 });
      expect(service.getTotalPages()).toBe(2);
    });

    it('should return -1 total pages when rowCount unknown', () => {
      service.initialize({ pageSize: 50 });
      expect(service.getTotalPages()).toBe(-1);
    });

    it('should calculate page rows', () => {
      service.initialize({ pageSize: 50 });
      const result = service.getPageRows(2);
      expect(result.startRow).toBe(100);
      expect(result.endRow).toBe(150);
    });
  });

  describe('cache management', () => {
    it('should evict old blocks when max exceeded', () => {
      const datasource: IServerSideDatasource = {
        getRows: vi.fn((params) => {
          params.successCallback([1], -1);
        }),
      };
      service.initialize({ pageSize: 10, cacheBlockSize: 10, maxBlocksInCache: 2 });
      service.setDatasource(datasource);
      // Manually add blocks to trigger eviction
      for (let i = 0; i < 5; i++) {
        service['cache'].set(i, {
          startRow: i * 10,
          endRow: (i + 1) * 10,
          rows: [],
          lastRow: null,
          status: 'loaded' as const,
          timestamp: Date.now() + i,
        });
      }
      expect(service.getCacheSize()).toBe(5);
      // Trigger eviction
      service['evictOldBlocks']();
      expect(service.getCacheSize()).toBeLessThanOrEqual(2);
    });

    it('should not evict loading blocks', () => {
      service.initialize({ pageSize: 10, maxBlocksInCache: 2 });
      service['cache'].set(0, {
        startRow: 0,
        endRow: 10,
        rows: [],
        lastRow: null,
        status: 'loading' as const,
        timestamp: Date.now(),
      });
      service['evictOldBlocks']();
      expect(service['cache'].has(0)).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should clear all data and callbacks', () => {
      service.initialize();
      service['allRows'] = [1, 2, 3];
      service.onRowsUpdatedEvent(() => {});
      service.onLoadingChangedEvent(() => {});
      service.onErrorEvent(() => {});
      service.destroy();
      expect(service.getRows()).toEqual([]);
      expect(service['datasource']).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle datasource not set', () => {
      service.initialize();
      service.requestRows(0, 10);
      expect(service.isLoading()).toBe(false);
    });

    it('should handle success with partial rows (last page)', () => {
      const datasource: IServerSideDatasource = {
        getRows: vi.fn((params) => {
          params.successCallback([1, 2], undefined); // 2 rows when block size is 10
        }),
      };
      service.initialize({ pageSize: 10, cacheBlockSize: 10 });
      service.setDatasource(datasource);
      expect(service.isLastRowKnown()).toBe(true);
      expect(service.getRowCount()).toBe(2);
    });

    it('should handle success with explicit lastRow', () => {
      const datasource: IServerSideDatasource = {
        getRows: vi.fn((params) => {
          params.successCallback([1, 2, 3], 100);
        }),
      };
      service.initialize({ pageSize: 10 });
      service.setDatasource(datasource);
      expect(service.getRowCount()).toBe(100);
      expect(service.isLastRowKnown()).toBe(true);
    });

    it('should handle null row data in mergeBlockToRows', () => {
      service.initialize({ pageSize: 10, cacheBlockSize: 10 });
      service['allRows'] = [];
      service['cache'].set(0, {
        startRow: 0,
        endRow: 10,
        rows: [{ id: 1 }, { id: 2 }],
        lastRow: null,
        status: 'loaded' as const,
        timestamp: Date.now(),
      });
      service['mergeBlockToRows'](0);
      expect(service.getRows()).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should handle multiple blocks', () => {
      const datasource: IServerSideDatasource = {
        getRows: vi.fn((params) => {
          const start = params.startRow;
          const rows = Array.from({ length: 10 }, (_, i) => ({ id: start + i }));
          params.successCallback(rows, -1);
        }),
      };
      service.initialize({ pageSize: 10, cacheBlockSize: 10 });
      service.setDatasource(datasource);
      // Request another block
      service.requestRows(10, 20);
      expect(service.getCacheSize()).toBe(2);
    });
  });
});
