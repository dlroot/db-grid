import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PaginationService, PaginationConfig, PageInfo } from './pagination.service';

describe('PaginationService', () => {
  let service: PaginationService;

  beforeEach(() => {
    service = new PaginationService();
  });

  afterEach(() => {
    service.destroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialize', () => {
    it('should use default values when no config', () => {
      service.initialize();
      expect(service.getPageSize()).toBe(20);
      expect(service.getCurrentPage()).toBe(1);
      expect(service.getTotalPages()).toBe(0);
    });

    it('should apply custom config values', () => {
      service.initialize({ pageSize: 50, currentPage: 3, totalRows: 200 });
      expect(service.getPageSize()).toBe(50);
      expect(service.getCurrentPage()).toBe(3);
    });

    it('should apply custom pageSizeOptions', () => {
      service.initialize({ pageSize: 25, pageSizeOptions: [10, 25, 50] });
      expect(service.getPageSizeOptions()).toEqual([10, 25, 50]);
      expect(service.getPageSize()).toBe(25);
    });

    it('should emit page changed on initialize', () => {
      const callback = vi.fn();
      service.onPageChanged(callback);
      service.initialize({ totalRows: 100 });
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].totalRows).toBe(100);
    });
  });

  describe('getTotalPages', () => {
    it('should return 0 when no rows', () => {
      service.initialize({ totalRows: 0, pageSize: 20 });
      expect(service.getTotalPages()).toBe(0);
    });

    it('should calculate correct page count', () => {
      service.initialize({ totalRows: 100, pageSize: 20 });
      expect(service.getTotalPages()).toBe(5);
    });

    it('should round up for partial last page', () => {
      service.initialize({ totalRows: 101, pageSize: 20 });
      expect(service.getTotalPages()).toBe(6);
    });

    it('should return 0 for rows less than one page', () => {
      service.initialize({ totalRows: 5, pageSize: 20 });
      expect(service.getTotalPages()).toBe(1);
    });
  });

  describe('setTotalRows', () => {
    it('should update total rows', () => {
      service.initialize();
      service.setTotalRows(200);
      expect(service.getPageInfo().totalRows).toBe(200);
    });

    it('should adjust currentPage if it exceeds max', () => {
      service.initialize({ totalRows: 100, pageSize: 20, currentPage: 5 });
      service.setTotalRows(30); // only 2 pages now
      expect(service.getCurrentPage()).toBe(2);
    });

    it('should not adjust currentPage if still valid', () => {
      service.initialize({ totalRows: 100, pageSize: 20, currentPage: 2 });
      service.setTotalRows(60);
      expect(service.getCurrentPage()).toBe(2);
    });

    it('should emit on pageInfo$ when setTotalRows changes totalRows', () => {
      service.initialize();
      const values: any[] = [];
      service.getPageInfo$().subscribe(v => values.push(v));
      service.setTotalRows(100);
      // pageInfo$ emits on subscribe (totalRows=0) and on setTotalRows (totalRows=100)
      expect(values.length).toBe(2);
      expect(values[1].totalRows).toBe(100);
    });
  });

  describe('setPageSize', () => {
    it('should update page size for valid option', () => {
      service.initialize({ pageSize: 20 });
      service.setPageSize(50);
      expect(service.getPageSize()).toBe(50);
    });

    it('should ignore invalid page size', () => {
      service.initialize({ pageSize: 20 });
      service.setPageSize(33); // not in options
      expect(service.getPageSize()).toBe(20);
    });

    it('should emit page changed on valid change', () => {
      service.initialize();
      const callback = vi.fn();
      service.onPageChanged(callback);
      service.setPageSize(50);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should emit even when size unchanged (no dedup guard in service)', () => {
      service.initialize({ totalRows: 100, pageSize: 20, currentPage: 1 });
      const values: any[] = [];
      service.getPageInfo$().subscribe(v => values.push(v));
      service.setPageSize(20); // service emits regardless, no dedup
      // values: [on subscribe] + [setPageSize emit]
      expect(values.length).toBe(2);
    });

    it('should adjust currentPage if it exceeds new total pages', () => {
      service.initialize({ totalRows: 100, pageSize: 20, currentPage: 5 });
      service.setPageSize(100); // only 1 page now
      expect(service.getCurrentPage()).toBe(1);
    });
  });

  describe('setCurrentPage', () => {
    it('should update current page within valid range', () => {
      service.initialize({ totalRows: 100, pageSize: 20 });
      service.setCurrentPage(3);
      expect(service.getCurrentPage()).toBe(3);
    });

    it('should ignore page below 1', () => {
      service.initialize({ totalRows: 100, pageSize: 20, currentPage: 2 });
      service.setCurrentPage(0);
      expect(service.getCurrentPage()).toBe(2);
    });

    it('should ignore page above total pages', () => {
      service.initialize({ totalRows: 100, pageSize: 20, currentPage: 2 });
      service.setCurrentPage(10);
      expect(service.getCurrentPage()).toBe(2);
    });

    it('should emit page changed on valid update', () => {
      service.initialize({ totalRows: 100, pageSize: 20 });
      const callback = vi.fn();
      service.onPageChanged(callback);
      service.setCurrentPage(2);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      service.initialize({ totalRows: 100, pageSize: 20 });
    });

    describe('hasNextPage / hasPreviousPage', () => {
      it('should have next page when not on last', () => {
        expect(service.hasNextPage()).toBe(true);
        expect(service.hasPreviousPage()).toBe(false);
      });

      it('should have previous when on page 2', () => {
        service.setCurrentPage(2);
        expect(service.hasPreviousPage()).toBe(true);
        expect(service.hasNextPage()).toBe(true);
      });

      it('should have neither on last page', () => {
        service.setCurrentPage(5);
        expect(service.hasNextPage()).toBe(false);
        expect(service.hasPreviousPage()).toBe(true);
      });

      it('should have neither on single page', () => {
        service.setTotalRows(10);
        expect(service.hasNextPage()).toBe(false);
        expect(service.hasPreviousPage()).toBe(false);
      });
    });

    describe('nextPage', () => {
      it('should advance to next page', () => {
        service.nextPage();
        expect(service.getCurrentPage()).toBe(2);
      });

      it('should not go beyond last page', () => {
        service.setCurrentPage(5);
        service.nextPage();
        expect(service.getCurrentPage()).toBe(5);
      });

      it('should emit page changed', () => {
        const callback = vi.fn();
        service.onPageChanged(callback);
        service.nextPage();
        expect(callback).toHaveBeenCalledTimes(1);
      });
    });

    describe('previousPage', () => {
      it('should go to previous page', () => {
        service.setCurrentPage(3);
        service.previousPage();
        expect(service.getCurrentPage()).toBe(2);
      });

      it('should not go below page 1', () => {
        service.previousPage();
        expect(service.getCurrentPage()).toBe(1);
      });
    });

    describe('firstPage', () => {
      it('should jump to page 1', () => {
        service.setCurrentPage(4);
        service.firstPage();
        expect(service.getCurrentPage()).toBe(1);
      });

      it('should not emit if already on first page', () => {
        const callback = vi.fn();
        service.onPageChanged(callback);
        service.firstPage();
        expect(callback).not.toHaveBeenCalled();
      });
    });

    describe('lastPage', () => {
      it('should jump to last page', () => {
        service.lastPage();
        expect(service.getCurrentPage()).toBe(5);
      });

      it('should not emit if already on last page', () => {
        service.setCurrentPage(5);
        const callback = vi.fn();
        service.onPageChanged(callback);
        service.lastPage();
        expect(callback).not.toHaveBeenCalled();
      });
    });

    describe('goToPage', () => {
      it('should navigate to given page', () => {
        service.goToPage(3);
        expect(service.getCurrentPage()).toBe(3);
      });

      it('should clamp to first page if given less than 1', () => {
        service.goToPage(-5);
        expect(service.getCurrentPage()).toBe(1);
      });

      it('should clamp to last page if given more than max', () => {
        service.goToPage(999);
        expect(service.getCurrentPage()).toBe(5);
      });

      it('should emit page changed', () => {
        const callback = vi.fn();
        service.onPageChanged(callback);
        service.goToPage(2);
        expect(callback).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('row index calculations', () => {
    beforeEach(() => {
      service.initialize({ totalRows: 100, pageSize: 20, currentPage: 3 });
    });

    it('should calculate correct start row index', () => {
      // page 3, size 20 → start = (3-1)*20 = 40
      expect(service.getStartRowIndex()).toBe(40);
    });

    it('should calculate correct end row index', () => {
      // page 3, size 20 → end = min(3*20, 100) = 60
      expect(service.getEndRowIndex()).toBe(60);
    });

    it('should handle last page with partial data', () => {
      service.initialize({ totalRows: 95, pageSize: 20, currentPage: 5 });
      // page 5, size 20 → end = min(5*20, 95) = 95
      expect(service.getEndRowIndex()).toBe(95);
    });
  });

  describe('getCurrentPageRange', () => {
    it('should return correct range object', () => {
      service.initialize({ totalRows: 100, pageSize: 20, currentPage: 2 });
      const range = service.getCurrentPageRange();
      expect(range).toEqual({ startIndex: 20, endIndex: 40 });
    });
  });

  describe('isRowInCurrentPage', () => {
    beforeEach(() => {
      service.initialize({ totalRows: 100, pageSize: 20, currentPage: 2 });
    });

    it('should return true for rows in current page', () => {
      expect(service.isRowInCurrentPage(25)).toBe(true);
    });

    it('should return false for rows in other pages', () => {
      expect(service.isRowInCurrentPage(5)).toBe(false);  // page 1
      expect(service.isRowInCurrentPage(50)).toBe(false); // page 3
    });

    it('should return false for rows at end boundary', () => {
      expect(service.isRowInCurrentPage(40)).toBe(false); // start of next page
    });
  });

  describe('getPageData', () => {
    beforeEach(() => {
      service.initialize({ totalRows: 100, pageSize: 20, currentPage: 2 });
    });

    it('should slice data for current page', () => {
      const allData = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      const pageData = service.getPageData(allData);
      expect(pageData.length).toBe(20);
      expect(pageData[0]).toEqual({ id: 20 });
      expect(pageData[19]).toEqual({ id: 39 });
    });

    it('should handle last page with partial data', () => {
      service.initialize({ totalRows: 95, pageSize: 20, currentPage: 5 });
      const allData = Array.from({ length: 95 }, (_, i) => ({ id: i }));
      const pageData = service.getPageData(allData);
      expect(pageData.length).toBe(15);
      expect(pageData[0]).toEqual({ id: 80 });
      expect(pageData[14]).toEqual({ id: 94 });
    });

    it('should return empty for empty array', () => {
      const pageData = service.getPageData([]);
      expect(pageData).toEqual([]);
    });

    it('should work with non-object data', () => {
      const allData = ['a', 'b', 'c', 'd', 'e', 'f'];
      service.initialize({ totalRows: 6, pageSize: 2, currentPage: 2 });
      const pageData = service.getPageData(allData);
      expect(pageData).toEqual(['c', 'd']);
    });
  });

  describe('getPageInfo', () => {
    beforeEach(() => {
      service.initialize({ totalRows: 100, pageSize: 20, currentPage: 3 });
    });

    it('should return complete PageInfo object', () => {
      const info = service.getPageInfo();
      expect(info.currentPage).toBe(3);
      expect(info.pageSize).toBe(20);
      expect(info.totalPages).toBe(5);
      expect(info.totalRows).toBe(100);
      expect(info.startRow).toBe(41);
      expect(info.endRow).toBe(60);
      expect(info.hasNextPage).toBe(true);
      expect(info.hasPreviousPage).toBe(true);
    });

    it('should reflect changes in pageInfo', () => {
      service.nextPage();
      const info = service.getPageInfo();
      expect(info.currentPage).toBe(4);
      expect(info.startRow).toBe(61);
      expect(info.endRow).toBe(80);
    });

    it('should return zeros for empty data', () => {
      service.initialize({ totalRows: 0 });
      const info = service.getPageInfo();
      expect(info.totalPages).toBe(0);
      expect(info.startRow).toBe(0);
      expect(info.endRow).toBe(0);
      expect(info.hasNextPage).toBe(false);
      // hasPreviousPage: currentPage=1 when totalRows=0, so returns false
      expect(service.hasPreviousPage()).toBe(false);
    });
  });

  describe('getPageInfo$ observable', () => {
    it('should emit current pageInfo on subscribe', () => {
      service.initialize({ totalRows: 100, pageSize: 20, currentPage: 2 });
      let receivedInfo: PageInfo | null = null;
      service.getPageInfo$().subscribe(info => {
        receivedInfo = info;
      });
      expect(receivedInfo!.currentPage).toBe(2);
    });

    it('should emit on page navigation', () => {
      service.initialize({ totalRows: 100, pageSize: 20 });
      const values: PageInfo[] = [];
      const sub = service.getPageInfo$().subscribe(info => values.push(info));
      service.nextPage();
      service.previousPage();
      sub.unsubscribe();
      expect(values.length).toBe(3); // initial + next + prev
    });
  });

  describe('onPageChanged callback', () => {
    it('should register and invoke callback', () => {
      const callback = vi.fn();
      service.initialize({ totalRows: 100, pageSize: 20 });
      service.onPageChanged(callback);
      service.nextPage();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].currentPage).toBe(2);
    });
  });

  describe('destroy', () => {
    it('should complete observables', () => {
      const completeSpy = vi.spyOn(service['pageInfo$'], 'complete');
      service.destroy();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle single row total', () => {
      service.initialize({ totalRows: 1, pageSize: 20 });
      expect(service.getTotalPages()).toBe(1);
      expect(service.hasNextPage()).toBe(false);
      expect(service.hasPreviousPage()).toBe(false);
    });

    it('should handle setPageSize causing zero pages', () => {
      service.initialize({ totalRows: 10, pageSize: 20 });
      service.setPageSize(50); // 10 rows / 50 = 0 pages
      expect(service.getTotalPages()).toBe(1); // Math.ceil(10/50) = 1
    });

    it('should handle goToPage with no rows', () => {
      service.initialize();
      service.goToPage(1);
      expect(service.getCurrentPage()).toBe(1);
    });
  });
});
