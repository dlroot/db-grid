/// <reference types="jasmine" />

import { GridStateService } from './grid-state.service';
import { GridState, DEFAULT_STATE_CONFIG } from '../../models';

/**
 * GridStateService 单元测试
 * 测试状态持久化功能
 */
describe('GridStateService', () => {
  let service: GridStateService;
  
  // 模拟服务
  let mockColumnService: any;
  let mockDataService: any;
  let mockFilterService: any;
  let mockGroupService: any;
  let mockSelectionService: any;
  let mockSidebarService: any;
  let mockPivotService: any;
  let mockAdvancedFilterService: any;

  // 模拟 localStorage
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    // 创建 localStorage mock
    localStorageMock = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => localStorageMock[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      localStorageMock[key] = value;
    });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete localStorageMock[key];
    });
    spyOn(localStorage, 'clear').and.callFake(() => {
      localStorageMock = {};
    });

    // 创建模拟服务
    mockColumnService = {
      columnStates: new Map([
        ['name', { colId: 'name', width: 150, visible: true, pinned: null }],
        ['age', { colId: 'age', width: 100, visible: true, pinned: null }],
        ['email', { colId: 'email', width: 200, visible: false, pinned: null }],
      ]),
      getVisibleColumns: () => [
        { colId: 'name', getColId: () => 'name' },
        { colId: 'age', getColId: () => 'age' },
      ],
      getColId: (col: any) => col.colId,
      setColumnStates: jasmine.createSpy('setColumnStates'),
      getColumnStates: function() { return Array.from(this.columnStates.values()); },
    };

    mockDataService = {
      getSortModel: jasmine.createSpy('getSortModel').and.returnValue([
        { colId: 'name', sort: 'asc' },
        { colId: 'age', sort: 'desc' },
      ]),
      setSortModel: jasmine.createSpy('setSortModel'),
    };

    mockFilterService = {
      getFilterModel: jasmine.createSpy('getFilterModel').and.returnValue({
        name: { filterType: 'text', type: 'contains', filter: 'John' },
        age: { filterType: 'number', type: 'greaterThan', filter: 25 },
      }),
      setFilterModel: jasmine.createSpy('setFilterModel'),
    };

    mockGroupService = {
      getGroupState: jasmine.createSpy('getGroupState').and.returnValue(['department']),
      setGroupState: jasmine.createSpy('setGroupState'),
    };

    mockSelectionService = {
      getSelectionState: jasmine.createSpy('getSelectionState').and.returnValue(['row-1', 'row-3']),
      setSelectionState: jasmine.createSpy('setSelectionState'),
    };

    mockSidebarService = {
      getSidebarState: jasmine.createSpy('getSidebarState').and.returnValue({ visible: true, activeTab: 'columns' }),
      setSidebarState: jasmine.createSpy('setSidebarState'),
    };

    mockPivotService = {
      getPivotState: jasmine.createSpy('getPivotState').and.returnValue({
        pivotColumnIds: ['category'],
        valueColumnIds: ['amount'],
        aggregationFunctions: ['sum'],
      }),
      setPivotState: jasmine.createSpy('setPivotState'),
    };

    mockAdvancedFilterService = {
      getAdvancedFilterModel: jasmine.createSpy('getAdvancedFilterModel').and.returnValue({
        operator: 'AND',
        conditions: [{ field: 'age', type: 'greaterThan', value: 25 }],
      }),
      setAdvancedFilterModel: jasmine.createSpy('setAdvancedFilterModel'),
    };

    // 创建服务实例
    service = new GridStateService();
    
    // 注入模拟服务
    service.setServices({
      columnService: mockColumnService,
      dataService: mockDataService,
      filterService: mockFilterService,
      groupService: mockGroupService,
      selectionService: mockSelectionService,
      sidebarService: mockSidebarService,
      pivotService: mockPivotService,
      advancedFilterService: mockAdvancedFilterService,
    });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ============ 测试 getState() ============

  describe('getState()', () => {
    it('should return complete grid state', () => {
      const state = service.getState();
      
      expect(state).toBeTruthy();
      expect(state.columnStates.length).toBe(3);
      expect(state.columnOrder.length).toBe(2);
      expect(state.sortModel.length).toBe(2);
      expect(state.filterModel).toBeTruthy();
      expect(state.advancedFilterModel).toBeTruthy();
      expect(state.groupState.length).toBe(1);
      expect(state.selectionState.length).toBe(2);
      expect(state.sidebarState).toBeTruthy();
      expect(state.pivotState).toBeTruthy();
      expect(state.version).toBe(DEFAULT_STATE_CONFIG.version);
      expect(state.timestamp).toBeTruthy();
    });

    it('should return correct column states', () => {
      const state = service.getState();
      
      expect(state.columnStates[0].colId).toBe('name');
      expect(state.columnStates[0].width).toBe(150);
      expect(state.columnStates[0].visible).toBe(true);
      expect(state.columnStates[2].colId).toBe('email');
      expect(state.columnStates[2].visible).toBe(false);
    });

    it('should return correct column order', () => {
      const state = service.getState();
      
      expect(state.columnOrder).toEqual(['name', 'age']);
    });

    it('should return correct sort model', () => {
      const state = service.getState();
      
      expect(state.sortModel[0].colId).toBe('name');
      expect(state.sortModel[0].sort).toBe('asc');
      expect(state.sortModel[1].colId).toBe('age');
      expect(state.sortModel[1].sort).toBe('desc');
    });

    it('should return correct filter model', () => {
      const state = service.getState();
      
      expect(state.filterModel['name'].filter).toBe('John');
      expect(state.filterModel['age'].filter).toBe(25);
    });

    it('should return correct group state', () => {
      const state = service.getState();
      
      expect(state.groupState).toEqual(['department']);
    });

    it('should return correct selection state', () => {
      const state = service.getState();
      
      expect(state.selectionState).toEqual(['row-1', 'row-3']);
    });

    it('should return correct sidebar state', () => {
      const state = service.getState();
      
      expect(state.sidebarState?.visible).toBe(true);
      expect(state.sidebarState?.activeTab).toBe('columns');
    });

    it('should return correct pivot state', () => {
      const state = service.getState();
      
      expect(state.pivotState?.pivotColumnIds).toEqual(['category']);
      expect(state.pivotState?.valueColumnIds).toEqual(['amount']);
      expect(state.pivotState?.aggregationFunctions).toEqual(['sum']);
    });

    it('should return correct advanced filter model', () => {
      const state = service.getState();
      
      expect(state.advancedFilterModel?.operator).toBe('AND');
      expect(state.advancedFilterModel?.conditions.length).toBe(1);
    });
  });

  // ============ 测试 setState() ============

  describe('setState()', () => {
    it('should restore complete grid state', () => {
      const state: GridState = {
        columnStates: [
          { colId: 'name', width: 200, visible: true, pinned: 'left' },
          { colId: 'age', width: 120, visible: true, pinned: null },
        ],
        columnOrder: ['name', 'age'],
        sortModel: [{ colId: 'name', sort: 'desc' }],
        filterModel: {
          name: { filterType: 'text', type: 'equals', filter: 'Jane' },
        },
        advancedFilterModel: null,
        groupState: ['status'],
        selectionState: ['row-2'],
        expandedRows: ['row-1'],
        version: '1.0.0',
        timestamp: Date.now(),
      };

      service.setState(state);

      expect(mockColumnService.setColumnStates).toHaveBeenCalledWith(state.columnStates);
      expect(mockDataService.setSortModel).toHaveBeenCalledWith(state.sortModel);
      expect(mockFilterService.setFilterModel).toHaveBeenCalledWith(state.filterModel);
      expect(mockGroupService.setGroupState).toHaveBeenCalledWith(state.groupState);
      expect(mockSelectionService.setSelectionState).toHaveBeenCalledWith(state.selectionState);
    });

    it('should handle partial state (only restore provided fields)', () => {
      const state: Partial<GridState> = {
        sortModel: [{ colId: 'age', sort: 'asc' }],
        filterModel: {},
      };

      service.setState(state as GridState);

      expect(mockDataService.setSortModel).toHaveBeenCalledWith(state.sortModel);
      expect(mockFilterService.setFilterModel).toHaveBeenCalledWith(state.filterModel);
      expect(mockColumnService.setColumnStates).not.toHaveBeenCalled();
      expect(mockGroupService.setGroupState).not.toHaveBeenCalled();
    });

    it('should handle null/undefined state', () => {
      expect(() => service.setState(null as any)).not.toThrow();
      expect(() => service.setState(undefined as any)).not.toThrow();
    });
  });

  // ============ 测试 saveStateToLocalStorage() ============

  describe('saveStateToLocalStorage()', () => {
    it('should save state to localStorage with default key', () => {
      service.saveStateToLocalStorage();
      
      expect(localStorage.setItem).toHaveBeenCalled();
      const savedState = localStorageMock[DEFAULT_STATE_CONFIG.storageKey];
      expect(savedState).toBeTruthy();
      
      const parsed = JSON.parse(savedState);
      expect(parsed.columnStates).toBeTruthy();
      expect(parsed.version).toBe(DEFAULT_STATE_CONFIG.version);
    });

    it('should save state to localStorage with custom key', () => {
      const customKey = 'my-custom-key';
      service.saveStateToLocalStorage(customKey);
      
      expect(localStorage.setItem).toHaveBeenCalledWith(customKey, jasmine.any(String));
      const savedState = localStorageMock[customKey];
      expect(savedState).toBeTruthy();
    });

    it('should handle localStorage errors gracefully', () => {
      (localStorage.setItem as jasmine.Spy).and.callFake(() => {
        throw new Error('Storage full');
      });
      
      expect(() => service.saveStateToLocalStorage()).not.toThrow();
    });
  });

  // ============ 测试 loadStateFromLocalStorage() ============

  describe('loadStateFromLocalStorage()', () => {
    it('should return true and restore state when state exists in localStorage', () => {
      // 先保存状态
      service.saveStateToLocalStorage();
      
      // 清除模拟服务的调用记录
      mockDataService.setSortModel.calls.reset();
      
      // 从 localStorage 恢复
      const result = service.loadStateFromLocalStorage();
      
      expect(result).toBe(true);
      expect(mockDataService.setSortModel).toHaveBeenCalled();
      expect(mockFilterService.setFilterModel).toHaveBeenCalled();
    });

    it('should return false when state does not exist in localStorage', () => {
      const result = service.loadStateFromLocalStorage();
      
      expect(result).toBe(false);
    });

    it('should restore state from custom key', () => {
      const customKey = 'my-custom-key';
      service.saveStateToLocalStorage(customKey);
      
      const result = service.loadStateFromLocalStorage(customKey);
      
      expect(result).toBe(true);
    });

    it('should handle localStorage errors gracefully', () => {
      service.saveStateToLocalStorage();
      (localStorage.getItem as jasmine.Spy).and.callFake(() => {
        throw new Error('Storage error');
      });
      
      const result = service.loadStateFromLocalStorage();
      
      expect(result).toBe(false);
    });

    it('should handle version mismatch warning', () => {
      const state = service.getState();
      state.version = '0.9.0'; // 不同版本
      
      localStorageMock[DEFAULT_STATE_CONFIG.storageKey] = JSON.stringify(state);
      
      spyOn(console, 'warn');
      const result = service.loadStateFromLocalStorage();
      
      expect(result).toBe(true);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  // ============ 测试 clearStateFromLocalStorage() ============

  describe('clearStateFromLocalStorage()', () => {
    it('should clear state from localStorage with default key', () => {
      service.saveStateToLocalStorage();
      
      service.clearStateFromLocalStorage();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith(DEFAULT_STATE_CONFIG.storageKey);
      const savedState = localStorageMock[DEFAULT_STATE_CONFIG.storageKey];
      expect(savedState).toBeUndefined();
    });

    it('should clear state from localStorage with custom key', () => {
      const customKey = 'my-custom-key';
      service.saveStateToLocalStorage(customKey);
      
      service.clearStateFromLocalStorage(customKey);
      
      expect(localStorage.removeItem).toHaveBeenCalledWith(customKey);
      const savedState = localStorageMock[customKey];
      expect(savedState).toBeUndefined();
    });
  });

  // ============ 测试预设管理 ============

  describe('Preset Management', () => {
    beforeEach(() => {
      // 保存初始状态
      service.saveStateToLocalStorage();
    });

    describe('saveAsPreset()', () => {
      it('should save current state as a preset', () => {
        const presetName = 'my-preset';
        service.saveAsPreset(presetName);
        
        const presetsKey = `${DEFAULT_STATE_CONFIG.storageKey}-presets`;
        const presetsJson = localStorageMock[presetsKey];
        expect(presetsJson).toBeTruthy();
        
        const presets = JSON.parse(presetsJson);
        expect(presets[presetName]).toBeTruthy();
        expect(presets[presetName].version).toBe(DEFAULT_STATE_CONFIG.version);
      });

      it('should overwrite existing preset with same name', () => {
        const presetName = 'my-preset';
        
        // 保存第一个预设
        service.saveAsPreset(presetName);
        
        // 修改状态
        mockDataService.getSortModel = () => [{ colId: 'age', sort: 'asc' }];
        
        // 保存同名预设
        service.saveAsPreset(presetName);
        
        const presetsKey = `${DEFAULT_STATE_CONFIG.storageKey}-presets`;
        const presets = JSON.parse(localStorageMock[presetsKey]);
        
        expect(presets[presetName]).toBeTruthy();
      });
    });

    describe('loadPreset()', () => {
      it('should return true and restore state when preset exists', () => {
        const presetName = 'my-preset';
        service.saveAsPreset(presetName);
        
        // 清除模拟服务的调用记录
        mockDataService.setSortModel.calls.reset();
        
        const result = service.loadPreset(presetName);
        
        expect(result).toBe(true);
        expect(mockDataService.setSortModel).toHaveBeenCalled();
      });

      it('should return false when preset does not exist', () => {
        const result = service.loadPreset('non-existent-preset');
        
        expect(result).toBe(false);
      });
    });

    describe('getPresetNames()', () => {
      it('should return all preset names', () => {
        service.saveAsPreset('preset-1');
        service.saveAsPreset('preset-2');
        service.saveAsPreset('preset-3');
        
        const presetNames = service.getPresetNames();
        
        expect(presetNames.length).toBe(3);
        expect(presetNames).toContain('preset-1');
        expect(presetNames).toContain('preset-2');
        expect(presetNames).toContain('preset-3');
      });

      it('should return empty array when no presets exist', () => {
        const presetNames = service.getPresetNames();
        
        expect(presetNames.length).toBe(0);
      });
    });

    describe('deletePreset()', () => {
      it('should delete existing preset', () => {
        const presetName = 'my-preset';
        service.saveAsPreset(presetName);
        
        let presetNames = service.getPresetNames();
        expect(presetNames.length).toBe(1);
        
        service.deletePreset(presetName);
        
        presetNames = service.getPresetNames();
        expect(presetNames.length).toBe(0);
      });

      it('should not throw when deleting non-existent preset', () => {
        expect(() => service.deletePreset('non-existent')).not.toThrow();
      });
    });
  });

  // ============ 测试 configure() ============

  describe('configure()', () => {
    it('should update configuration', () => {
      const customConfig = {
        storageKey: 'custom-storage-key',
        version: '2.0.0',
        autoSave: false,
        autoLoad: false,
      };
      
      service.configure(customConfig);
      
      // 保存状态，应该使用新的 storage key
      service.saveStateToLocalStorage();
      
      expect(localStorage.setItem).toHaveBeenCalledWith('custom-storage-key', jasmine.any(String));
    });

    it('should partially update configuration', () => {
      const partialConfig = {
        version: '2.0.0',
      };
      
      service.configure(partialConfig);
      
      // 保存状态，应该使用新的 version
      service.saveStateToLocalStorage();
      
      const savedState = JSON.parse(localStorageMock[DEFAULT_STATE_CONFIG.storageKey]);
      expect(savedState.version).toBe('2.0.0');
    });
  });

  // ============ 测试序列化/反序列化 ============

  describe('Serialization / Deserialization', () => {
    it('should correctly serialize and deserialize state', () => {
      // 获取状态
      const originalState = service.getState();
      
      // 保存到 localStorage
      service.saveStateToLocalStorage();
      
      // 从 localStorage 读取
      const savedStateJson = localStorageMock[DEFAULT_STATE_CONFIG.storageKey];
      const savedState = JSON.parse(savedStateJson);
      
      // 验证所有字段都正确序列化
      expect(savedState.columnStates).toBeTruthy();
      expect(savedState.columnOrder).toBeTruthy();
      expect(savedState.sortModel).toBeTruthy();
      expect(savedState.filterModel).toBeTruthy();
      expect(savedState.advancedFilterModel).toBeTruthy();
      expect(savedState.groupState).toBeTruthy();
      expect(savedState.selectionState).toBeTruthy();
      expect(savedState.sidebarState).toBeTruthy();
      expect(savedState.pivotState).toBeTruthy();
      expect(savedState.version).toBeTruthy();
      expect(savedState.timestamp).toBeTruthy();
      
      // 验证可以正确反序列化 (通过 loadStateFromLocalStorage)
      mockDataService.setSortModel.calls.reset();
      const result = service.loadStateFromLocalStorage();
      
      expect(result).toBe(true);
      expect(mockDataService.setSortModel).toHaveBeenCalled();
    });

    it('should handle complex filter models', () => {
      const complexFilterModel = {
        name: { filterType: 'text', type: 'contains', filter: 'John' },
        age: { filterType: 'number', type: 'inRange', filter: 25, filterTo: 50 },
        joinDate: { filterType: 'date', type: 'greaterThan', dateFrom: '2020-01-01' },
      };
      
      mockFilterService.getFilterModel = () => complexFilterModel;
      
      service.saveStateToLocalStorage();
      
      const savedStateJson = localStorageMock[DEFAULT_STATE_CONFIG.storageKey];
      const savedState = JSON.parse(savedStateJson);
      
      expect(savedState.filterModel.name.filter).toBe('John');
      expect(savedState.filterModel.age.filter).toBe(25);
      expect(savedState.filterModel.age.filterTo).toBe(50);
    });
  });

  // ============ 测试边界情况 ============

  describe('Edge Cases', () => {
    it('should handle empty column states', () => {
      mockColumnService.columnStates = new Map();
      mockColumnService.getVisibleColumns = () => [];
      
      const state = service.getState();
      
      expect(state.columnStates.length).toBe(0);
      expect(state.columnOrder.length).toBe(0);
    });

    it('should handle missing optional services', () => {
      // 只注入必需的服务
      service.setServices({
        columnService: mockColumnService,
        dataService: mockDataService,
        filterService: mockFilterService,
      });
      
      const state = service.getState();
      
      expect(state).toBeTruthy();
      expect(state.sidebarState).toBeUndefined();
      expect(state.pivotState).toBeUndefined();
    });

    it('should handle localStorage quota exceeded', () => {
      (localStorage.setItem as jasmine.Spy).and.callFake(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });
      
      spyOn(console, 'error');
      expect(() => service.saveStateToLocalStorage()).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle corrupted state in localStorage', () => {
      // 存入损坏的 JSON
      localStorageMock[DEFAULT_STATE_CONFIG.storageKey] = '{"columnStates": [}';
      
      const result = service.loadStateFromLocalStorage();
      
      expect(result).toBe(false);
    });
  });

  // ============ 测试 destroy() ============

  describe('ngOnDestroy()', () => {
    it('should complete destroy$ subject', () => {
      const destroySpy = spyOn(service['destroy$'], 'next');
      const completeSpy = spyOn(service['destroy$'], 'complete');
      
      service.ngOnDestroy();
      
      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
