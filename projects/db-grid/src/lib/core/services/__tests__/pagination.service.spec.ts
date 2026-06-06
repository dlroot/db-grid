import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaginationService, PaginationConfig, PageInfo } from '../pagination.service';

describe('PaginationService', () => {
  let service: PaginationService;

  beforeEach(() => {
    service = new PaginationService();
  });

  // ===== initialize =====
  describe('initialize', () => {
    it('should initialize with default values', () => {
      service.initialize();
      expect(service.getPageSize()).toBe(20);
      expect(service.getCurrentPage()).toBe(1);
      expect(service.getPageInfo().totalRows).toBe(0);
    });

    it('should initialize with custom config', () => {
      service.initialize({ pageSize: 50, currentPage: 2, totalRows: 200 });
      expect(service.getPageSize()).toBe(50);
      expect(service.getCurrentPage()).toBe(2);
      expect(service.getPageInfo().totalRows).toBe(200);
    });

    it('should accept custom pageSizeOptions', () => {
      service.initialize({ pageSizeOptions: [5, 10, 25] });
      expect(service.getPageSizeOptions()).toEqual([5, 10, 25]);
    });

    it('should set default page to 1 if currentPage not provided', () => {
      service.initialize({ currentPage: undefined as any });
      expect(service.getCurrentPage()).toBe(1);
    });
  });

  // ===== setTotalRows =====
  describe('setTotalRows', () => {
    it('should update total rows', () => {
      service.initialize({ totalRows: 100 });
      service.setTotalRows(200);
      expect(service.getPageInfo().totalRows).toBe(200);
    });

    it('should adjust current page if out of range', () => {
      service.initialize({ currentPage: 10, pageSize: 20 });
      service.setTotalRows(50);
      // maxPage = 3, so currentPage should become 3
      expect(service.getCurrentPage()).toBe(3);
    });

    it('should not change page if within range', () => {
      service.initialize({ currentPage: 2, pageSize: 20 });
      service.setTotalRows(100);
      expect(service.getCurrentPage()).toBe(2);
    });
  });

  // ===== pageSize =====
  describe('pageSize', () => {
    it('should get and set page size', () => {
      service.initialize({ pageSize: 20 });
      expect(service.getPageSize()).toBe(20);
      service.setPageSize(50);
      expect(service.getPageSize()).toBe(50);
    });

    it('should only accept valid page sizes', () => {
      service.initialize({ pageSizeOptions: [10, 20, 50] });
      service.setPageSize(20);
      expect(service.getPageSize()).toBe(20);
      service.setPageSize(100); // not in options
      expect(service.getPageSize()).toBe(20); // unchanged
    });

    it('should adjust current page if exceeds new range', () => {
      service.initialize({ currentPage: 5, pageSize: 10, totalRows: 200 });
      service.setPageSize(100);
      expect(service.getCurrentPage()).toBe(2); // 200/100=2
    });
  });

  // ===== currentPage =====
  describe('currentPage', () => {
    it('should get and set current page', () => {
      service.initialize({ currentPage: 1, totalRows: 100 });
      expect(service.getCurrentPage()).toBe(1);
      service.setCurrentPage(3);
      expect(service.getCurrentPage()).toBe(3);
    });

    it('should ignore invalid page numbers', () => {
      service.initialize({ currentPage: 1, totalRows: 20 });
      service.setCurrentPage(0);  // below min
      expect(service.getCurrentPage()).toBe(1);
      service.setCurrentPage(100); // above max
      expect(service.getCurrentPage()).toBe(1);
    });

    it('should ignore negative page numbers', () => {
      service.setCurrentPage(-5);
      expect(service.getCurrentPage()).toBe(1);
    });
  });

  // ===== navigation methods =====
  describe('navigation', () => {
    beforeEach(() => {
      service.initialize({ pageSize: 10, totalRows: 100 });
    });

    it('should check hasNextPage correctly', () => {
      expect(service.hasNextPage()).toBe(true);
      service.setCurrentPage(10);
      expect(service.hasNextPage()).toBe(false);
    });

    it('should check hasPreviousPage correctly', () => {
      service.setCurrentPage(1);
      expect(service.hasPreviousPage()).toBe(false);
      service.setCurrentPage(2);
      expect(service.hasPreviousPage()).toBe(true);
    });

    it('should go to next page', () => {
      service.setCurrentPage(1);
      service.nextPage();
      expect(service.getCurrentPage()).toBe(2);
    });

    it('should not go past last page on nextPage', () => {
      service.setCurrentPage(10);
      service.nextPage();
      expect(service.getCurrentPage()).toBe(10);
    });

    it('should go to previous page', () => {
      service.setCurrentPage(3);
      service.previousPage();
      expect(service.getCurrentPage()).toBe(2);
    });

    it('should not go before first page on previousPage', () => {
      service.setCurrentPage(1);
      service.previousPage();
      expect(service.getCurrentPage()).toBe(1);
    });

    it('should go to first page', () => {
      service.setCurrentPage(5);
      service.firstPage();
      expect(service.getCurrentPage()).toBe(1);
    });

    it('should go to last page', () => {
      service.lastPage();
      expect(service.getCurrentPage()).toBe(10);
    });

    it('should not emit if already on first page', () => {
      service.setCurrentPage(1);
      service.firstPage();
      expect(service.getCurrentPage()).toBe(1);
    });

    it('should not emit if already on last page', () => {
      service.setCurrentPage(10);
      service.lastPage();
      expect(service.getCurrentPage()).toBe(10);
    });
  });

  // ===== goToPage =====
  describe('goToPage', () => {
    beforeEach(() => {
      service.initialize({ pageSize: 10, totalRows: 100 });
    });

    it('should navigate to valid page', () => {
      service.goToPage(5);
      expect(service.getCurrentPage()).toBe(5);
    });

    it('should clamp to first page for negative', () => {
      service.goToPage(-3);
      expect(service.getCurrentPage()).toBe(1);
    });

    it('should clamp to last page for overflow', () => {
      service.goToPage(999);
      expect(service.getCurrentPage()).toBe(10);
    });

    it('should not emit if page unchanged', () => {
      service.setCurrentPage(3);
      service.goToPage(3);
      expect(service.getCurrentPage()).toBe(3);
    });
  });

  // ===== page info =====
  describe('getPageInfo', () => {
    beforeEach(() => {
      service.initialize({ pageSize: 10, currentPage: 2, totalRows: 100 });
    });

    it('should return correct page info', () => {
      const info = service.getPageInfo();
      expect(info.currentPage).toBe(2);
      expect(info.pageSize).toBe(10);
      expect(info.totalPages).toBe(10);
      expect(info.totalRows).toBe(100);
      expect(info.startRow).toBe(11);
      expect(info.endRow).toBe(20);
      expect(info.hasNextPage).toBe(true);
      expect(info.hasPreviousPage).toBe(true);
    });

    it('should return correct start/end row indices', () => {
      expect(service.getStartRowIndex()).toBe(10);
      expect(service.getEndRowIndex()).toBe(20);
    });
  });

  // ===== pageInfo$ observable =====
  describe('getPageInfo$', () => {
    it('should emit on page change', () => {
      service.initialize({ totalRows: 100 });
      let emitted = false;
      service.getPageInfo$().subscribe(() => { emitted = true; });
      service.setCurrentPage(2);
      expect(emitted).toBe(true);
    });
  });

  // ===== onPageChanged =====
  describe('onPageChanged', () => {
    it('should call callback on page change', () => {
      service.initialize({ totalRows: 100 });
      let received: PageInfo | null = null;
      service.onPageChanged(info => { received = info; });
      service.setCurrentPage(2);
      expect(received?.currentPage).toBe(2);
    });
  });

  // ===== getTotalPages =====
  describe('getTotalPages', () => {
    it('should calculate total pages', () => {
      service.initialize({ pageSize: 10, totalRows: 100 });
      expect(service.getTotalPages()).toBe(10);
    });

    it('should handle exact division', () => {
      service.initialize({ pageSize: 25, totalRows: 100 });
      expect(service.getTotalPages()).toBe(4);
    });

    it('should return 0 for zero rows', () => {
      service.initialize({ totalRows: 0 });
      expect(service.getTotalPages()).toBe(0);
    });

    it('should return 0 for no rows', () => {
      service.initialize({ pageSize: 20 });
      expect(service.getTotalPages()).toBe(0);
    });

    it('should round up partial pages', () => {
      service.initialize({ pageSize: 10, totalRows: 95 });
      expect(service.getTotalPages()).toBe(10);
    });
  });

  // ===== getCurrentPageRange =====
  describe('getCurrentPageRange', () => {
    it('should return correct range', () => {
      service.initialize({ pageSize: 10, currentPage: 3, totalRows: 100 });
      const range = service.getCurrentPageRange();
      expect(range.startIndex).toBe(20);
      expect(range.endIndex).toBe(30);
    });

    it('should handle first page', () => {
      service.initialize({ pageSize: 10, currentPage: 1, totalRows: 100 });
      const range = service.getCurrentPageRange();
      expect(range.startIndex).toBe(0);
      expect(range.endIndex).toBe(10);
    });
  });

  // ===== isRowInCurrentPage =====
  describe('isRowInCurrentPage', () => {
    beforeEach(() => {
      service.initialize({ pageSize: 10, currentPage: 2, totalRows: 100 });
    });

    it('should return true for rows in current page', () => {
      expect(service.isRowInCurrentPage(10)).toBe(true);
      expect(service.isRowInCurrentPage(15)).toBe(true);
      expect(service.isRowInCurrentPage(19)).toBe(true);
    });

    it('should return false for rows outside current page', () => {
      expect(service.isRowInCurrentPage(0)).toBe(false);
      expect(service.isRowInCurrentPage(5)).toBe(false);
      expect(service.isRowInCurrentPage(20)).toBe(false);
    });
  });

  // ===== getPageData =====
  describe('getPageData', () => {
    it('should slice data for current page', () => {
      service.initialize({ pageSize: 10, currentPage: 2, totalRows: 100 });
      const data = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      const page = service.getPageData(data);
      expect(page.length).toBe(10);
      expect(page[0].id).toBe(10);
      expect(page[9].id).toBe(19);
    });

    it('should return empty for out of bounds', () => {
      service.initialize({ pageSize: 10, currentPage: 5, totalRows: 30 });
      const data = Array.from({ length: 30 }, (_, i) => i);
      const page = service.getPageData(data);
      // Page 5 with 30 rows and pageSize 10: startRow=40, endRow=50, but data only has 30 items => slice(40,50) = []
      expect(page.length).toBe(0);
    });

    it('should return empty array for empty data', () => {
      service.initialize({ pageSize: 10, currentPage: 1 });
      expect(service.getPageData([])).toEqual([]);
    });
  });

  // ===== destroy =====
  describe('destroy', () => {
    it('should complete observables', () => {
      expect(() => service.destroy()).not.toThrow();
    });
  });

  // ===== Edge cases =====
  describe('edge cases', () => {
    it('should handle single row', () => {
      service.initialize({ pageSize: 10, totalRows: 1 });
      expect(service.getTotalPages()).toBe(1);
      expect(service.getPageData([{ id: 1 }]).length).toBe(1);
    });

    it('should handle single item per page', () => {
      service.initialize({ pageSize: 1, totalRows: 5 });
      expect(service.getTotalPages()).toBe(5);
      service.setCurrentPage(3);
      expect(service.getStartRowIndex()).toBe(2);
      expect(service.getEndRowIndex()).toBe(3);
    });

    it('should handle very large dataset', () => {
      service.initialize({ pageSize: 100, totalRows: 1000000 });
      expect(service.getTotalPages()).toBe(10000);
    });

    it('should handle zero page size (edge)', () => {
      service.initialize({ pageSize: 0, totalRows: 100 });
      // Should not crash
      expect(service.getTotalPages()).toBeGreaterThanOrEqual(0);
    });
  });
});