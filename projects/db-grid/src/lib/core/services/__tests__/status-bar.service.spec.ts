/// <reference types='vitest' />
import { describe, it, expect, beforeEach } from 'vitest';
import { StatusBarService, StatusBarConfig, StatusBarState } from '../status-bar.service';

describe('StatusBarService', () => {
  let service: StatusBarService;

  beforeEach(() => {
    service = new StatusBarService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with config', () => {
      const config: StatusBarConfig = { enabled: true };
      service.initialize(config);
      expect(service.isEnabled()).toBe(true);
    });

    it('should default to disabled', () => {
      service.initialize({});
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('Enable/Disable', () => {
    it('should enable', () => {
      service.enable();
      expect(service.isEnabled()).toBe(true);
    });

    it('should disable', () => {
      service.enable();
      service.disable();
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('State Updates', () => {
    it('should get state', () => {
      const state = service.getState();
      expect(state.totalRows).toBe(0);
      expect(state.filteredRows).toBe(0);
      expect(state.selectedRows).toBe(0);
    });

    it('should set total rows', () => {
      service.setTotalRows(100);
      expect(service.getState().totalRows).toBe(100);
    });

    it('should set filtered rows', () => {
      service.setFilteredRows(50);
      expect(service.getState().filteredRows).toBe(50);
    });

    it('should set selected rows', () => {
      service.setSelectedRows(10);
      expect(service.getState().selectedRows).toBe(10);
    });

    it('should set page info', () => {
      service.setPageInfo(2, 5);
      const state = service.getState();
      expect(state.currentPage).toBe(2);
      expect(state.totalPages).toBe(5);
    });

    it('should set active filters', () => {
      service.setActiveFilters(3);
      expect(service.getState().activeFilters).toBe(3);
    });

    it('should set sort info', () => {
      service.setSortInfo('name', 'asc');
      const state = service.getState();
      expect(state.sortColumn).toBe('name');
      expect(state.sortDirection).toBe('asc');
    });

    it('should clear sort info', () => {
      service.setSortInfo('name', 'asc');
      service.setSortInfo(null, null);
      const state = service.getState();
      expect(state.sortColumn).toBeNull();
      expect(state.sortDirection).toBeNull();
    });

    it('should batch update state', () => {
      service.updateState({
        totalRows: 100,
        filteredRows: 80,
        selectedRows: 5
      });
      const state = service.getState();
      expect(state.totalRows).toBe(100);
      expect(state.filteredRows).toBe(80);
      expect(state.selectedRows).toBe(5);
    });
  });

  describe('Panels', () => {
    it('should get panels', () => {
      service.initialize();
      const panels = service.getPanels();
      expect(panels.length).toBeGreaterThan(0);
    });

    it('should return default panels on init', () => {
      service.initialize();
      const panels = service.getPanels();
      expect(panels.find(p => p.key === 'totalAndFilteredRows')).toBeDefined();
      expect(panels.find(p => p.key === 'selectedRows')).toBeDefined();
    });
  });

  describe('Formatted Status', () => {
    beforeEach(() => {
      service.initialize();
    });

    it('should format total and filtered rows', () => {
      service.setTotalRows(100);
      service.setFilteredRows(50);
      const formatted = service.getFormattedStatus();
      expect(formatted['totalAndFilteredRows']).toBe('行: 50 / 100');
    });

    it('should format total only when equal', () => {
      service.setTotalRows(100);
      service.setFilteredRows(100);
      const formatted = service.getFormattedStatus();
      expect(formatted['totalAndFilteredRows']).toBe('总行数: 100');
    });

    it('should format selected rows', () => {
      service.setSelectedRows(5);
      const formatted = service.getFormattedStatus();
      expect(formatted['selectedRows']).toBe('已选: 5');
    });

    it('should format filter status when active', () => {
      service.setActiveFilters(2);
      const formatted = service.getFormattedStatus();
      expect(formatted['filterStatus']).toBe('筛选: 2 个活跃');
    });

    it('should format filter status when inactive', () => {
      service.setActiveFilters(0);
      const formatted = service.getFormattedStatus();
      expect(formatted['filterStatus']).toBe('无筛选');
    });

    it('should format page status', () => {
      service.setPageInfo(1, 5);
      const formatted = service.getFormattedStatus();
      expect(formatted['pageStatus']).toBe('第 2 / 5 页');
    });

    it('should format page status when single page', () => {
      service.setPageInfo(0, 1);
      const formatted = service.getFormattedStatus();
      expect(formatted['pageStatus']).toBe('');
    });

    it('should format sort status', () => {
      service.initialize({
        panels: [{ key: 'sortStatus', align: 'left' }]
      });
      service.setSortInfo('name', 'asc');
      const formatted = service.getFormattedStatus();
      expect(formatted['sortStatus']).toBe('排序: name ↑');
    });

    it('should format sort status descending', () => {
      service.initialize({
        panels: [{ key: 'sortStatus', align: 'left' }]
      });
      service.setSortInfo('age', 'desc');
      const formatted = service.getFormattedStatus();
      expect(formatted['sortStatus']).toBe('排序: age ↓');
    });
  });

  describe('Destroy', () => {
    it('should cleanup callbacks', () => {
      service.initialize();
      service.destroy();
      // Should not throw
      expect(service).toBeDefined();
    });
  });
});