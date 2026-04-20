/**
 * Pagination Service
 * 分页服务
 */

import { Subject, BehaviorSubject } from 'rxjs';

export interface PaginationConfig {
  pageSize?: number;
  currentPage?: number;
  totalRows?: number;
  pageSizeOptions?: number[];
}

export interface PageInfo {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalRows: number;
  startRow: number;
  endRow: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export class PaginationService {
  private pageSize = 20;
  private currentPage = 1;
  private totalRows = 0;

  private pageSizeOptions = [10, 20, 50, 100, 200, 500];
  private pageInfo$ = new BehaviorSubject<PageInfo>(this.calculatePageInfo());

  private onPageChanged$ = new Subject<PageInfo>();

  initialize(config?: PaginationConfig): void {
    if (config) {
      this.pageSize = config.pageSize || 20;
      this.currentPage = config.currentPage || 1;
      this.totalRows = config.totalRows || 0;
      if (config.pageSizeOptions) {
        this.pageSizeOptions = config.pageSizeOptions;
      }
    }
    this.emitPageChanged();
  }

  setTotalRows(total: number): void {
    this.totalRows = total;
    // 如果当前页超出范围，调整到最后一页
    const maxPage = this.getTotalPages();
    if (this.currentPage > maxPage && maxPage > 0) {
      this.currentPage = maxPage;
    }
    this.pageInfo$.next(this.calculatePageInfo());
  }

  getPageSize(): number {
    return this.pageSize;
  }

  setPageSize(size: number): void {
    if (this.pageSizeOptions.includes(size)) {
      this.pageSize = size;
      // 保持当前页不变，但需要确保不超出范围
      const maxPage = this.getTotalPages();
      if (this.currentPage > maxPage) {
        this.currentPage = Math.max(1, maxPage);
      }
      this.emitPageChanged();
    }
  }

  getCurrentPage(): number {
    return this.currentPage;
  }

  setCurrentPage(page: number): void {
    const maxPage = this.getTotalPages();
    if (page >= 1 && page <= maxPage) {
      this.currentPage = page;
      this.emitPageChanged();
    }
  }

  getTotalPages(): number {
    return Math.ceil(this.totalRows / this.pageSize) || 0;
  }

  getStartRowIndex(): number {
    return (this.currentPage - 1) * this.pageSize;
  }

  getEndRowIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRows);
  }

  getPageSizeOptions(): number[] {
    return [...this.pageSizeOptions];
  }

  getPageInfo(): PageInfo {
    return this.calculatePageInfo();
  }

  getPageInfo$() {
    return this.pageInfo$.asObservable();
  }

  hasNextPage(): boolean {
    return this.currentPage < this.getTotalPages();
  }

  hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  nextPage(): void {
    if (this.hasNextPage()) {
      this.currentPage++;
      this.emitPageChanged();
    }
  }

  previousPage(): void {
    if (this.hasPreviousPage()) {
      this.currentPage--;
      this.emitPageChanged();
    }
  }

  firstPage(): void {
    if (this.currentPage !== 1) {
      this.currentPage = 1;
      this.emitPageChanged();
    }
  }

  lastPage(): void {
    const maxPage = this.getTotalPages();
    if (this.currentPage !== maxPage && maxPage > 0) {
      this.currentPage = maxPage;
      this.emitPageChanged();
    }
  }

  goToPage(page: number): void {
    const maxPage = this.getTotalPages();
    const targetPage = Math.max(1, Math.min(page, maxPage));
    if (targetPage !== this.currentPage) {
      this.currentPage = targetPage;
      this.emitPageChanged();
    }
  }

  onPageChanged(callback: (info: PageInfo) => void): void {
    this.onPageChanged$.subscribe(callback);
  }

  // 获取当前页的数据范围（用于数据服务）
  getCurrentPageRange(): { startIndex: number; endIndex: number } {
    return {
      startIndex: this.getStartRowIndex(),
      endIndex: this.getEndRowIndex(),
    };
  }

  // 检查给定行是否在当前页
  isRowInCurrentPage(rowIndex: number): boolean {
    const start = this.getStartRowIndex();
    const end = this.getEndRowIndex();
    return rowIndex >= start && rowIndex < end;
  }

  // 获取页面切换后的数据切片
  getPageData<T>(allData: T[]): T[] {
    const start = this.getStartRowIndex();
    const end = this.getEndRowIndex();
    return allData.slice(start, end);
  }

  private calculatePageInfo(): PageInfo {
    const totalPages = this.getTotalPages();
    const startRow = this.totalRows > 0 ? (this.currentPage - 1) * this.pageSize + 1 : 0;
    const endRow = Math.min(this.currentPage * this.pageSize, this.totalRows);

    return {
      currentPage: this.currentPage,
      pageSize: this.pageSize,
      totalPages,
      totalRows: this.totalRows,
      startRow,
      endRow,
      hasNextPage: this.hasNextPage(),
      hasPreviousPage: this.hasPreviousPage(),
    };
  }

  private emitPageChanged(): void {
    const info = this.calculatePageInfo();
    this.pageInfo$.next(info);
    this.onPageChanged$.next(info);
  }

  destroy(): void {
    this.pageInfo$.complete();
    this.onPageChanged$.complete();
  }
}