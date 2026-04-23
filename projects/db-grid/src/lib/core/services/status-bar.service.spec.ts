import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatusBarService, StatusBarConfig, StatusBarState } from './status-bar.service';

describe('StatusBarService', () => {
  let service: StatusBarService;

  beforeEach(() => {
    service = new StatusBarService();
  });

  describe('initialize', () => {
    it('should initialize with default config', () => {
      service.initialize();
      expect(service.isEnabled()).toBe(false);
      expect(service.getPanels().length).toBe(4);
    });

    it('should initialize with enabled: true', () => {
      service.initialize({ enabled: true });
      expect(service.isEnabled()).toBe(true);
    });

    it('should initialize with custom panels', () => {
      const config: StatusBarConfig = {
        enabled: true,
        panels: [
          { key: 'totalAndFilteredRows', align: 'left' },
        ],
      };
      service.initialize(config);
      expect(service.getPanels().length).toBe(1);
    });
  });

  describe('enable / disable', () => {
    it('should enable status bar', () => {
      service.initialize();
      service.enable();
      expect(service.isEnabled()).toBe(true);
    });

    it('should disable status bar', () => {
      service.initialize({ enabled: true });
      service.disable();
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('getState', () => {
    it('should return initial state', () => {
      service.initialize();
      const state = service.getState();
      expect(state.totalRows).toBe(0);
      expect(state.filteredRows).toBe(0);
      expect(state.selectedRows).toBe(0);
      expect(state.currentPage).toBe(0);
      expect(state.totalPages).toBe(0);
      expect(state.activeFilters).toBe(0);
      expect(state.sortColumn).toBeNull();
      expect(state.sortDirection).toBeNull();
    });

    it('should return copy of state', () => {
      service.initialize();
      const state1 = service.getState();
      const state2 = service.getState();
      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('setTotalRows', () => {
    it('should update totalRows', () => {
      service.initialize();
      service.setTotalRows(100);
      expect(service.getState().totalRows).toBe(100);
    });

    it('should emit state change', () => {
      const callback = vi.fn();
      service.initialize();
      service.onStateChangedEvent(callback);
      service.setTotalRows(100);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ totalRows: 100 }));
    });
  });

  describe('setFilteredRows', () => {
    it('should update filteredRows', () => {
      service.initialize();
      service.setFilteredRows(50);
      expect(service.getState().filteredRows).toBe(50);
    });

    it('should emit state change', () => {
      const callback = vi.fn();
      service.initialize();
      service.onStateChangedEvent(callback);
      service.setFilteredRows(50);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ filteredRows: 50 }));
    });
  });

  describe('setSelectedRows', () => {
    it('should update selectedRows', () => {
      service.initialize();
      service.setSelectedRows(5);
      expect(service.getState().selectedRows).toBe(5);
    });

    it('should emit state change', () => {
      const callback = vi.fn();
      service.initialize();
      service.onStateChangedEvent(callback);
      service.setSelectedRows(5);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ selectedRows: 5 }));
    });
  });

  describe('setPageInfo', () => {
    it('should update currentPage and totalPages', () => {
      service.initialize();
      service.setPageInfo(2, 10);
      expect(service.getState().currentPage).toBe(2);
      expect(service.getState().totalPages).toBe(10);
    });

    it('should emit state change', () => {
      const callback = vi.fn();
      service.initialize();
      service.onStateChangedEvent(callback);
      service.setPageInfo(2, 10);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ currentPage: 2, totalPages: 10 }));
    });
  });

  describe('setActiveFilters', () => {
    it('should update activeFilters', () => {
      service.initialize();
      service.setActiveFilters(3);
      expect(service.getState().activeFilters).toBe(3);
    });

    it('should emit state change', () => {
      const callback = vi.fn();
      service.initialize();
      service.onStateChangedEvent(callback);
      service.setActiveFilters(3);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ activeFilters: 3 }));
    });
  });

  describe('setSortInfo', () => {
    it('should update sort info', () => {
      service.initialize();
      service.setSortInfo('name', 'asc');
      expect(service.getState().sortColumn).toBe('name');
      expect(service.getState().sortDirection).toBe('asc');
    });

    it('should clear sort info', () => {
      service.initialize();
      service.setSortInfo('name', 'asc');
      service.setSortInfo(null, null);
      expect(service.getState().sortColumn).toBeNull();
      expect(service.getState().sortDirection).toBeNull();
    });

    it('should emit state change', () => {
      const callback = vi.fn();
      service.initialize();
      service.onStateChangedEvent(callback);
      service.setSortInfo('name', 'desc');
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ sortColumn: 'name', sortDirection: 'desc' }));
    });
  });

  describe('updateState', () => {
    it('should update multiple state properties', () => {
      service.initialize();
      service.updateState({
        totalRows: 100,
        filteredRows: 80,
        selectedRows: 3,
      });
      const state = service.getState();
      expect(state.totalRows).toBe(100);
      expect(state.filteredRows).toBe(80);
      expect(state.selectedRows).toBe(3);
    });

    it('should emit state change once', () => {
      const callback = vi.fn();
      service.initialize();
      service.onStateChangedEvent(callback);
      service.updateState({ totalRows: 100, filteredRows: 80 });
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPanels', () => {
    it('should return copy of panels array', () => {
      service.initialize();
      const panels1 = service.getPanels();
      const panels2 = service.getPanels();
      expect(panels1).not.toBe(panels2);
      expect(panels1).toEqual(panels2);
    });
  });

  describe('getFormattedStatus', () => {
    beforeEach(() => {
      service.initialize();
    });

    it('should format totalAndFilteredRows without filter', () => {
      service.setTotalRows(100);
      service.setFilteredRows(100);
      const status = service.getFormattedStatus();
      expect(status['totalAndFilteredRows']).toBe('总行数: 100');
    });

    it('should format totalAndFilteredRows with filter', () => {
      service.setTotalRows(100);
      service.setFilteredRows(50);
      const status = service.getFormattedStatus();
      expect(status['totalAndFilteredRows']).toBe('行: 50 / 100');
    });

    it('should format selectedRows', () => {
      service.setSelectedRows(5);
      const status = service.getFormattedStatus();
      expect(status['selectedRows']).toBe('已选: 5');
    });

    it('should format filterStatus with active filters', () => {
      service.setActiveFilters(3);
      const status = service.getFormattedStatus();
      expect(status['filterStatus']).toBe('筛选: 3 个活跃');
    });

    it('should format filterStatus without filters', () => {
      service.setActiveFilters(0);
      const status = service.getFormattedStatus();
      expect(status['filterStatus']).toBe('无筛选');
    });

    it('should format pageStatus with multiple pages', () => {
      service.setPageInfo(1, 10);
      const status = service.getFormattedStatus();
      expect(status['pageStatus']).toBe('第 2 / 10 页');
    });

    it('should format pageStatus with single page', () => {
      service.setPageInfo(0, 1);
      const status = service.getFormattedStatus();
      expect(status['pageStatus']).toBe('');
    });

    it('should format sortStatus with ascending', () => {
      service.initialize({
        panels: [{ key: 'sortStatus', align: 'left' }],
      });
      service.setSortInfo('name', 'asc');
      const status = service.getFormattedStatus();
      expect(status['sortStatus']).toBe('排序: name ↑');
    });

    it('should format sortStatus with descending', () => {
      service.initialize({
        panels: [{ key: 'sortStatus', align: 'left' }],
      });
      service.setSortInfo('age', 'desc');
      const status = service.getFormattedStatus();
      expect(status['sortStatus']).toBe('排序: age ↓');
    });

    it('should format sortStatus without sort', () => {
      service.initialize({
        panels: [{ key: 'sortStatus', align: 'left' }],
      });
      service.setSortInfo(null, null);
      const status = service.getFormattedStatus();
      expect(status['sortStatus']).toBe('');
    });

    it('should return empty string for unknown panel key', () => {
      service.initialize({
        panels: [{ key: 'unknown', align: 'left' }],
      });
      const status = service.getFormattedStatus();
      expect(status['unknown']).toBe('');
    });
  });

  describe('onStateChangedEvent', () => {
    it('should register callback', () => {
      const callback = vi.fn();
      service.initialize();
      service.onStateChangedEvent(callback);
      service.setTotalRows(100);
      expect(callback).toHaveBeenCalled();
    });

    it('should pass state copy to callback', () => {
      let receivedState: StatusBarState | null = null;
      service.initialize();
      service.onStateChangedEvent((state) => {
        receivedState = state;
      });
      service.setTotalRows(100);
      expect(receivedState).not.toBe(service.getState());
      expect(receivedState?.totalRows).toBe(100);
    });
  });

  describe('destroy', () => {
    it('should clear callback', () => {
      const callback = vi.fn();
      service.initialize();
      service.onStateChangedEvent(callback);
      service.destroy();
      service.setTotalRows(100);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle zero values', () => {
      service.initialize();
      service.setTotalRows(0);
      service.setFilteredRows(0);
      service.setSelectedRows(0);
      const state = service.getState();
      expect(state.totalRows).toBe(0);
      expect(state.filteredRows).toBe(0);
      expect(state.selectedRows).toBe(0);
    });

    it('should handle large numbers', () => {
      service.initialize();
      service.setTotalRows(1000000);
      service.setFilteredRows(1000000); // Set filtered = total to get "总行数" format
      const status = service.getFormattedStatus();
      expect(status['totalAndFilteredRows']).toBe('总行数: 1000000');
    });

    it('should handle multiple rapid updates', () => {
      const callback = vi.fn();
      service.initialize();
      service.onStateChangedEvent(callback);
      for (let i = 0; i < 10; i++) {
        service.setTotalRows(i);
      }
      expect(callback).toHaveBeenCalledTimes(10);
    });
  });
});
