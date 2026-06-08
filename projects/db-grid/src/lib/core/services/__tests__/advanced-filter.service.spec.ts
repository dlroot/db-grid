// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AdvancedFilterService,
  AdvancedFilterModel,
  AdvancedFilterGroup,
  AdvancedFilterCondition,
  FilterPreset,
} from '../advanced-filter.service';

describe('AdvancedFilterService', () => {
  let service: AdvancedFilterService;
  let mockColDefs: any[];

  beforeEach(() => {
    service = new AdvancedFilterService();
    mockColDefs = [
      { field: 'name', colId: 'name', headerName: '姓名' },
      { field: 'age', colId: 'age', headerName: '年龄' },
      { field: 'department', colId: 'department', headerName: '部门' },
      { field: 'salary', colId: 'salary', headerName: '薪资' },
      { field: 'active', colId: 'active', headerName: '在职' },
    ];

    // Mock localStorage
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => { store[key] = val; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => Object.keys(store).forEach(k => delete store[k]),
    });
  });

  afterEach(() => {
    service.destroy();
    vi.restoreAllMocks();
  });

  // ── 模型创建 ────────────────────────────────────────────────────────────

  describe('createEmptyModel', () => {
    it('should create empty model with AND root', () => {
      const model = service.createEmptyModel();
      expect(model.root.operator).toBe('AND');
      expect(model.root.conditions).toEqual([]);
      expect(model.root.groups).toEqual([]);
    });

    it('should have unique IDs', () => {
      const m1 = service.createEmptyModel();
      const m2 = service.createEmptyModel();
      expect(m1.root.id).not.toBe(m2.root.id);
    });
  });

  // ── 条件管理 ────────────────────────────────────────────────────────────

  describe('addCondition', () => {
    it('should add condition to group', () => {
      const model = service.createEmptyModel();
      const condition = service.addCondition(model.root, {
        colId: 'name',
        filterType: 'text',
        conditionType: 'contains',
        value: '张',
      });
      expect(model.root.conditions).toHaveLength(1);
      expect(condition.colId).toBe('name');
      expect(condition.conditionType).toBe('contains');
      expect(condition.value).toBe('张');
      expect(condition.id).toBeTruthy();
    });

    it('should add multiple conditions', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'contains', value: '张' });
      service.addCondition(model.root, { colId: 'age', filterType: 'number', conditionType: 'greaterThan', value: 25 });
      expect(model.root.conditions).toHaveLength(2);
    });
  });

  describe('removeCondition', () => {
    it('should remove condition by id', () => {
      const model = service.createEmptyModel();
      const c = service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'contains', value: '张' });
      const removed = service.removeCondition(model.root, c.id);
      expect(removed).toBe(true);
      expect(model.root.conditions).toHaveLength(0);
    });

    it('should return false for non-existent condition', () => {
      const model = service.createEmptyModel();
      const removed = service.removeCondition(model.root, 'nonexistent');
      expect(removed).toBe(false);
    });

    it('should find and remove condition in nested groups', () => {
      const model = service.createEmptyModel();
      const subGroup = service.addGroup(model.root, 'OR');
      const c = service.addCondition(subGroup, { colId: 'name', filterType: 'text', conditionType: 'startsWith', value: '李' });
      const removed = service.removeCondition(model.root, c.id);
      expect(removed).toBe(true);
      expect(subGroup.conditions).toHaveLength(0);
    });
  });

  // ── 组管理 ──────────────────────────────────────────────────────────────

  describe('addGroup', () => {
    it('should add sub-group to parent', () => {
      const model = service.createEmptyModel();
      const subGroup = service.addGroup(model.root, 'OR');
      expect(model.root.groups).toHaveLength(1);
      expect(subGroup.operator).toBe('OR');
      expect(subGroup.id).toBeTruthy();
    });

    it('should create groups array if missing', () => {
      const model = service.createEmptyModel();
      delete model.root.groups;
      const subGroup = service.addGroup(model.root, 'AND');
      expect(model.root.groups).toHaveLength(1);
    });
  });

  describe('removeGroup', () => {
    it('should remove sub-group by id', () => {
      const model = service.createEmptyModel();
      const subGroup = service.addGroup(model.root, 'OR');
      const removed = service.removeGroup(model.root, subGroup.id);
      expect(removed).toBe(true);
      expect(model.root.groups).toHaveLength(0);
    });

    it('should return false for non-existent group', () => {
      const model = service.createEmptyModel();
      const removed = service.removeGroup(model.root, 'nonexistent');
      expect(removed).toBe(false);
    });

    it('should find and remove nested group', () => {
      const model = service.createEmptyModel();
      const sub1 = service.addGroup(model.root, 'OR');
      const sub2 = service.addGroup(sub1, 'AND');
      const removed = service.removeGroup(model.root, sub2.id);
      expect(removed).toBe(true);
      expect(sub1.groups).toHaveLength(0);
    });
  });

  describe('setGroupOperator', () => {
    it('should change operator', () => {
      const model = service.createEmptyModel();
      service.setGroupOperator(model.root, 'OR');
      expect(model.root.operator).toBe('OR');
    });
  });

  // ── 筛选执行 ────────────────────────────────────────────────────────────

  describe('passesAdvancedFilter', () => {
    const testData = [
      { name: '张三', age: 30, department: '技术部', salary: 15000, active: true },
      { name: '李四', age: 25, department: '市场部', salary: 12000, active: true },
      { name: '王五', age: 35, department: '技术部', salary: 20000, active: false },
      { name: '赵六', age: 28, department: '人事部', salary: 10000, active: true },
    ];

    it('should pass all when no filter active', () => {
      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(true);
    });

    it('should filter by single text condition', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'contains', value: '张' });
      service.setAdvancedFilterModel(model);

      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(true);  // 张三
      expect(service.passesAdvancedFilter(testData[1], mockColDefs)).toBe(false); // 李四
    });

    it('should filter by single number condition', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'age', filterType: 'number', conditionType: 'greaterThan', value: 28 });
      service.setAdvancedFilterModel(model);

      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(true);  // age=30
      expect(service.passesAdvancedFilter(testData[1], mockColDefs)).toBe(false); // age=25
    });

    it('should filter by number inRange condition', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'age', filterType: 'number', conditionType: 'inRange', value: 25, valueTo: 30 });
      service.setAdvancedFilterModel(model);

      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(true);  // age=30
      expect(service.passesAdvancedFilter(testData[1], mockColDefs)).toBe(true);  // age=25
      expect(service.passesAdvancedFilter(testData[2], mockColDefs)).toBe(false); // age=35
    });

    it('should filter by number blank/notBlank', () => {
      const model1 = service.createEmptyModel();
      service.addCondition(model1.root, { colId: 'age', filterType: 'number', conditionType: 'blank' });
      service.setAdvancedFilterModel(model1);
      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(false);

      const model2 = service.createEmptyModel();
      service.addCondition(model2.root, { colId: 'age', filterType: 'number', conditionType: 'notBlank' });
      service.setAdvancedFilterModel(model2);
      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(true);
    });

    it('should filter by text blank/notBlank', () => {
      const model1 = service.createEmptyModel();
      service.addCondition(model1.root, { colId: 'name', filterType: 'text', conditionType: 'blank' });
      service.setAdvancedFilterModel(model1);
      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(false);

      const model2 = service.createEmptyModel();
      service.addCondition(model2.root, { colId: 'name', filterType: 'text', conditionType: 'notBlank' });
      service.setAdvancedFilterModel(model2);
      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(true);
    });

    it('should filter by AND combination', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'department', filterType: 'text', conditionType: 'equals', value: '技术部' });
      service.addCondition(model.root, { colId: 'age', filterType: 'number', conditionType: 'greaterThan', value: 28 });
      service.setAdvancedFilterModel(model);

      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(true);  // 技术部, age=30
      expect(service.passesAdvancedFilter(testData[2], mockColDefs)).toBe(true);  // 技术部, age=35
      expect(service.passesAdvancedFilter(testData[1], mockColDefs)).toBe(false); // 市场部
      expect(service.passesAdvancedFilter(testData[3], mockColDefs)).toBe(false); // 人事部
    });

    it('should filter by OR combination', () => {
      const model = service.createEmptyModel();
      service.setGroupOperator(model.root, 'OR');
      service.addCondition(model.root, { colId: 'department', filterType: 'text', conditionType: 'equals', value: '技术部' });
      service.addCondition(model.root, { colId: 'department', filterType: 'text', conditionType: 'equals', value: '市场部' });
      service.setAdvancedFilterModel(model);

      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(true);  // 技术部
      expect(service.passesAdvancedFilter(testData[1], mockColDefs)).toBe(true);  // 市场部
      expect(service.passesAdvancedFilter(testData[3], mockColDefs)).toBe(false); // 人事部
    });

    it('should filter with nested groups (AND containing OR)', () => {
      // 部门=技术部 AND (姓名包含张 OR 薪资>18000)
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'department', filterType: 'text', conditionType: 'equals', value: '技术部' });

      const orGroup = service.addGroup(model.root, 'OR');
      service.addCondition(orGroup, { colId: 'name', filterType: 'text', conditionType: 'contains', value: '张' });
      service.addCondition(orGroup, { colId: 'salary', filterType: 'number', conditionType: 'greaterThan', value: 18000 });
      service.setAdvancedFilterModel(model);

      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(true);  // 技术部, name=张三 ✓
      expect(service.passesAdvancedFilter(testData[2], mockColDefs)).toBe(true);  // 技术部, salary=20000 ✓
      expect(service.passesAdvancedFilter(testData[1], mockColDefs)).toBe(false); // 市场部 ✗
    });

    it('should filter with deeply nested groups', () => {
      // age>20 AND (department=技术部 OR (name startsWith 李 AND salary<13000))
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'age', filterType: 'number', conditionType: 'greaterThan', value: 20 });

      const orGroup = service.addGroup(model.root, 'OR');
      service.addCondition(orGroup, { colId: 'department', filterType: 'text', conditionType: 'equals', value: '技术部' });

      const nestedAndGroup = service.addGroup(orGroup, 'AND');
      service.addCondition(nestedAndGroup, { colId: 'name', filterType: 'text', conditionType: 'startsWith', value: '李' });
      service.addCondition(nestedAndGroup, { colId: 'salary', filterType: 'number', conditionType: 'lessThan', value: 13000 });
      service.setAdvancedFilterModel(model);

      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(true);  // 技术部 ✓
      expect(service.passesAdvancedFilter(testData[1], mockColDefs)).toBe(true);  // 李四, salary=12000 ✓
      expect(service.passesAdvancedFilter(testData[2], mockColDefs)).toBe(true);  // 技术部 ✓
      expect(service.passesAdvancedFilter(testData[3], mockColDefs)).toBe(false); // 人事部, not 李, salary=10000 < 13000 but not 李
    });

    it('should filter by text startsWith/endsWith', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'startsWith', value: '张' });
      service.setAdvancedFilterModel(model);
      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(true);  // 张三
      expect(service.passesAdvancedFilter(testData[1], mockColDefs)).toBe(false); // 李四

      const model2 = service.createEmptyModel();
      service.addCondition(model2.root, { colId: 'name', filterType: 'text', conditionType: 'endsWith', value: '三' });
      service.setAdvancedFilterModel(model2);
      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(true);  // 张三
      expect(service.passesAdvancedFilter(testData[1], mockColDefs)).toBe(false); // 李四
    });

    it('should filter by text notContains/notEqual', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'notContains', value: '张' });
      service.setAdvancedFilterModel(model);
      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(false);
      expect(service.passesAdvancedFilter(testData[1], mockColDefs)).toBe(true);

      const model2 = service.createEmptyModel();
      service.addCondition(model2.root, { colId: 'department', filterType: 'text', conditionType: 'notEqual', value: '技术部' });
      service.setAdvancedFilterModel(model2);
      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(false);
      expect(service.passesAdvancedFilter(testData[1], mockColDefs)).toBe(true);
    });

    it('should filter by set condition (in)', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'department', filterType: 'set', conditionType: 'in', value: ['技术部', '市场部'] });
      service.setAdvancedFilterModel(model);
      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(true);  // 技术部
      expect(service.passesAdvancedFilter(testData[1], mockColDefs)).toBe(true);  // 市场部
      expect(service.passesAdvancedFilter(testData[3], mockColDefs)).toBe(false); // 人事部
    });

    it('should filter by set condition (notIn)', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'department', filterType: 'set', conditionType: 'notIn', value: ['技术部'] });
      service.setAdvancedFilterModel(model);
      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(false); // 技术部
      expect(service.passesAdvancedFilter(testData[1], mockColDefs)).toBe(true);  // 市场部
    });

    it('should filter by boolean condition', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'active', filterType: 'boolean', conditionType: 'equals', value: true });
      service.setAdvancedFilterModel(model);
      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(true);  // active=true
      expect(service.passesAdvancedFilter(testData[2], mockColDefs)).toBe(false); // active=false
    });

    it('should pass all when set condition has empty values', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'department', filterType: 'set', conditionType: 'in', value: [] });
      service.setAdvancedFilterModel(model);
      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(true);
    });

    it('should pass when boolean value is null', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'active', filterType: 'boolean', conditionType: 'equals', value: null });
      service.setAdvancedFilterModel(model);
      expect(service.passesAdvancedFilter(testData[0], mockColDefs)).toBe(true);
    });
  });

  // ── 清除筛选 ────────────────────────────────────────────────────────────

  describe('clearAdvancedFilter', () => {
    it('should clear model', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'contains', value: '张' });
      service.setAdvancedFilterModel(model);
      expect(service.isAdvancedFilterActive()).toBe(true);

      service.clearAdvancedFilter();
      expect(service.isAdvancedFilterActive()).toBe(false);
      expect(service.getAdvancedFilterModel()).toBeNull();
    });
  });

  // ── 转换为标准模型 ──────────────────────────────────────────────────────

  describe('toStandardFilterModel', () => {
    it('should convert single condition', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'contains', value: '张' });
      const standard = service.toStandardFilterModel(model);
      expect(standard.name).toBeDefined();
      expect(standard.name.filterType).toBe('text');
      expect(standard.name.type).toBe('contains');
    });

    it('should convert two conditions with operator', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'contains', value: '张' });
      service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'endsWith', value: '三' });
      const standard = service.toStandardFilterModel(model);
      expect(standard.name.operator).toBe('AND');
      expect(standard.name.condition1).toBeDefined();
      expect(standard.name.condition2).toBeDefined();
    });

    it('should convert number condition with filterTo', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'age', filterType: 'number', conditionType: 'inRange', value: 20, valueTo: 30 });
      const standard = service.toStandardFilterModel(model);
      expect(standard.age.filterType).toBe('number');
      expect(standard.age.type).toBe('inRange');
    });
  });

  // ── 预设管理 ────────────────────────────────────────────────────────────

  describe('savePreset', () => {
    it('should save preset', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'contains', value: '张' });
      service.setAdvancedFilterModel(model);

      const preset = service.savePreset('测试预设');
      expect(preset.name).toBe('测试预设');
      expect(preset.id).toBeTruthy();
      expect(preset.model).toBeDefined();
      expect(service.getPresets()).toHaveLength(1);
    });

    it('should throw when no model active', () => {
      expect(() => service.savePreset('test')).toThrow('当前无高级筛选模型');
    });
  });

  describe('loadPreset', () => {
    it('should load preset and set as active model', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'contains', value: '张' });
      service.setAdvancedFilterModel(model);

      const preset = service.savePreset('测试预设');
      service.clearAdvancedFilter();

      const loaded = service.loadPreset(preset.id);
      expect(loaded).not.toBeNull();
      expect(loaded.root.conditions).toHaveLength(1);
      expect(service.isAdvancedFilterActive()).toBe(true);
    });

    it('should return null for non-existent preset', () => {
      expect(service.loadPreset('nonexistent')).toBeNull();
    });
  });

  describe('deletePreset', () => {
    it('should delete preset', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'contains', value: '张' });
      service.setAdvancedFilterModel(model);

      const preset = service.savePreset('删除测试');
      expect(service.deletePreset(preset.id)).toBe(true);
      expect(service.getPresets()).toHaveLength(0);
    });

    it('should return false for non-existent preset', () => {
      expect(service.deletePreset('nonexistent')).toBe(false);
    });
  });

  describe('renamePreset', () => {
    it('should rename preset', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'contains', value: '张' });
      service.setAdvancedFilterModel(model);

      const preset = service.savePreset('旧名称');
      expect(service.renamePreset(preset.id, '新名称')).toBe(true);
      expect(service.getPresets()[0].name).toBe('新名称');
    });
  });

  // ── 事件 ────────────────────────────────────────────────────────────────

  describe('events', () => {
    it('should emit onFilterChanged when setting model', () => {
      const spy = vi.fn();
      service.onFilterChanged.subscribe(spy);
      const model = service.createEmptyModel();
      service.setAdvancedFilterModel(model);
      expect(spy).toHaveBeenCalledWith(model);
    });

    it('should emit onFilterChanged when clearing', () => {
      const spy = vi.fn();
      service.onFilterChanged.subscribe(spy);
      service.clearAdvancedFilter();
      expect(spy).toHaveBeenCalledWith(null);
    });

    it('should emit onPresetsChanged when saving preset', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'contains', value: '张' });
      service.setAdvancedFilterModel(model);

      const spy = vi.fn();
      service.onPresetsChanged.subscribe(spy);
      service.savePreset('test');
      expect(spy).toHaveBeenCalled();
    });
  });

  // ── 统计 ────────────────────────────────────────────────────────────────

  describe('countConditions', () => {
    it('should count conditions in flat model', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'contains', value: '张' });
      service.addCondition(model.root, { colId: 'age', filterType: 'number', conditionType: 'greaterThan', value: 25 });
      expect(service.countConditions(model.root)).toBe(2);
    });

    it('should count conditions in nested model', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'contains', value: '张' });
      const subGroup = service.addGroup(model.root, 'OR');
      service.addCondition(subGroup, { colId: 'age', filterType: 'number', conditionType: 'greaterThan', value: 25 });
      service.addCondition(subGroup, { colId: 'salary', filterType: 'number', conditionType: 'lessThan', value: 20000 });
      expect(service.countConditions(model.root)).toBe(3);
    });
  });

  describe('countGroups', () => {
    it('should count groups', () => {
      const model = service.createEmptyModel();
      service.addGroup(model.root, 'OR');
      service.addGroup(model.root, 'AND');
      expect(service.countGroups(model.root)).toBe(3); // root + 2 sub-groups
    });
  });

  // ── 摘要 ────────────────────────────────────────────────────────────────

  describe('getFilterSummary', () => {
    it('should return 无筛选 when no model', () => {
      expect(service.getFilterSummary()).toBe('无筛选');
    });

    it('should return summary with conditions and groups', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'contains', value: '张' });
      service.addCondition(model.root, { colId: 'age', filterType: 'number', conditionType: 'greaterThan', value: 25 });
      service.addGroup(model.root, 'OR');
      service.setAdvancedFilterModel(model);
      expect(service.getFilterSummary()).toContain('2 个条件');
      expect(service.getFilterSummary()).toContain('2 个组');
      expect(service.getFilterSummary()).toContain('且');
    });

    it('should show 或 for OR operator', () => {
      const model = service.createEmptyModel();
      service.setGroupOperator(model.root, 'OR');
      service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'contains', value: '张' });
      service.setAdvancedFilterModel(model);
      expect(service.getFilterSummary()).toContain('或');
    });
  });

  // ── 筛选器联动 ──────────────────────────────────────────────────────────

  describe('computeLinkage', () => {
    const allData = [
      { name: '张三', age: 30, department: '技术部' },
      { name: '李四', age: 25, department: '市场部' },
      { name: '王五', age: 35, department: '技术部' },
    ];

    it('should return all unique values when no filter active', () => {
      const result = service.computeLinkage('department', allData, mockColDefs.slice(0, 3));
      expect(result.department).toContain('技术部');
      expect(result.department).toContain('市场部');
    });

    it('should return filtered values when other columns filtered', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'contains', value: '张' });
      service.setAdvancedFilterModel(model);

      const result = service.computeLinkage('department', allData, mockColDefs.slice(0, 3));
      // 只有张三匹配，所以 department 应只包含技术部
      expect(result.department).toContain('技术部');
      expect(result.department).not.toContain('市场部');
    });

    it('should emit onFilterLinkage event', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'contains', value: '张' });
      service.setAdvancedFilterModel(model);

      const spy = vi.fn();
      service.onFilterLinkage.subscribe(spy);
      service.computeLinkage('department', allData, mockColDefs.slice(0, 3));
      expect(spy).toHaveBeenCalled();
    });
  });

  // ── 销毁 ────────────────────────────────────────────────────────────────

  describe('destroy', () => {
    it('should clear model and complete subjects', () => {
      const model = service.createEmptyModel();
      service.addCondition(model.root, { colId: 'name', filterType: 'text', conditionType: 'contains', value: '张' });
      service.setAdvancedFilterModel(model);

      service.destroy();
      expect(service.getAdvancedFilterModel()).toBeNull();
    });
  });
});
