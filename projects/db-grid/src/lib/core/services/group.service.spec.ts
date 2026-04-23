/**
 * GroupService 单元测试
 * 测试行分组功能：多级分组、展开折叠、聚合集成
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GroupService, GroupConfig, GroupChangeEvent } from './group.service';
import { AggregationService } from './aggregation.service';
import { RowNode } from '../models';

describe('GroupService', () => {
  let service: GroupService;
  let aggregationService: AggregationService;

  const sampleData = [
    { id: 1, category: 'A', subcategory: 'X', value: 100 },
    { id: 2, category: 'A', subcategory: 'X', value: 200 },
    { id: 3, category: 'A', subcategory: 'Y', value: 150 },
    { id: 4, category: 'B', subcategory: 'X', value: 300 },
    { id: 5, category: 'B', subcategory: 'Y', value: 250 },
  ];

  beforeEach(() => {
    aggregationService = new AggregationService();
    service = new GroupService(aggregationService);
  });

  describe('initialize', () => {
    it('should initialize with single field grouping', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config);

      expect(service.isGroupingEnabled()).toBe(true);
      expect(service.getGroupFields()).toEqual(['category']);
    });

    it('should initialize with multi-field grouping', () => {
      const config: GroupConfig = { groupFields: ['category', 'subcategory'] };
      service.initialize(sampleData, config);

      expect(service.getGroupFields()).toHaveLength(2);
    });

    it('should create group nodes', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config);

      const result = service.getResult();
      expect(result.groupNodes.length).toBe(2); // A and B groups
    });

    it('should create flat nodes including both groups and leaves', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config);

      const result = service.getResult();
      // 2 group nodes + 5 leaf nodes
      expect(result.flatNodes.length).toBe(7);
    });

    it('should handle empty data', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize([], config);

      const result = service.getResult();
      expect(result.groupNodes.length).toBe(0);
      expect(result.flatNodes.length).toBe(0);
    });

    it('should handle empty group fields (no grouping)', () => {
      const config: GroupConfig = { groupFields: [] };
      service.initialize(sampleData, config);

      const result = service.getResult();
      expect(result.groupNodes.length).toBe(0);
      expect(result.flatNodes.length).toBe(5); // only leaf nodes
    });

    it('should create group column defs by default', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config);

      const colDefs = service.getGroupColumnDefs();
      expect(colDefs.length).toBe(1);
      expect(colDefs[0].colId).toBe('__GROUP__');
    });

    it('should not create group column defs when autoCreateGroupColumn is false', () => {
      const config: GroupConfig = {
        groupFields: ['category'],
        autoCreateGroupColumn: false,
      };
      service.initialize(sampleData, config);

      const colDefs = service.getGroupColumnDefs();
      expect(colDefs.length).toBe(0);
    });

    it('should use custom group column config', () => {
      const config: GroupConfig = {
        groupFields: ['category'],
        groupColumnId: 'myGroup',
        groupColumnHeader: 'My Groups',
      };
      service.initialize(sampleData, config);

      const colDefs = service.getGroupColumnDefs();
      expect(colDefs[0].colId).toBe('myGroup');
      expect(colDefs[0].headerName).toBe('My Groups');
    });
  });

  describe('grouping structure', () => {
    it('should set correct group level', () => {
      const config: GroupConfig = { groupFields: ['category', 'subcategory'] };
      service.initialize(sampleData, config);

      const result = service.getResult();
      const level0Groups = result.groupNodes.filter(n => n.level === 0);
      expect(level0Groups.length).toBe(2); // category A and B
    });

    it('should set correct group key', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config);

      const result = service.getResult();
      const keys = result.groupNodes.map(n => n.key).sort();
      expect(keys).toEqual(['A', 'B']);
    });

    it('should set expanded state based on config', () => {
      const configExpanded: GroupConfig = { groupFields: ['category'], expandAll: true };
      service.initialize(sampleData, configExpanded);
      let result = service.getResult();
      expect(Array.from(result.groupNodes.values()).every(n => n.expanded)).toBe(true);

      const configCollapsed: GroupConfig = { groupFields: ['category'], expandAll: false };
      service.initialize(sampleData, configCollapsed);
      result = service.getResult();
      expect(Array.from(result.groupNodes.values()).every(n => !n.expanded)).toBe(true);
    });

    it('should set allChildrenCount correctly', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config);

      const result = service.getResult();
      const groupA = result.groupNodes.find(n => n.key === 'A');
      const groupB = result.groupNodes.find(n => n.key === 'B');

      expect(groupA?.allChildrenCount).toBe(3);
      expect(groupB?.allChildrenCount).toBe(2);
    });

    it('should set group flag on group nodes', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config);

      const result = service.getResult();
      result.groupNodes.forEach(node => {
        expect(node.group).toBe(true);
      });
    });

    it('should set parent reference on leaf nodes', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config);

      const result = service.getResult();
      const leafNodes = result.flatNodes.filter(n => !n.group);
      leafNodes.forEach(node => {
        expect(node.parent).toBeDefined();
      });
    });
  });

  describe('expand/collapse', () => {
    beforeEach(() => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config);
    });

    it('should expand a group', () => {
      const result = service.getResult();
      const groupA = result.groupNodes.find(n => n.key === 'A')!;
      groupA.expanded = false;

      service.setGroupExpanded(groupA.id, true);
      expect(groupA.expanded).toBe(true);
    });

    it('should collapse a group', () => {
      const result = service.getResult();
      const groupA = result.groupNodes.find(n => n.key === 'A')!;

      service.setGroupExpanded(groupA.id, false);
      expect(groupA.expanded).toBe(false);
    });

    it('should toggle a group', () => {
      const result = service.getResult();
      const groupA = result.groupNodes.find(n => n.key === 'A')!;
      const initialState = groupA.expanded;

      service.toggleGroup(groupA.id);
      expect(groupA.expanded).toBe(!initialState);

      service.toggleGroup(groupA.id);
      expect(groupA.expanded).toBe(initialState);
    });

    it('should expand all groups', () => {
      const config: GroupConfig = { groupFields: ['category'], expandAll: false };
      service.initialize(sampleData, config);
      service.expandAll();

      const result = service.getResult();
      result.groupNodes.forEach(node => {
        expect(node.expanded).toBe(true);
      });
    });

    it('should collapse all groups', () => {
      service.collapseAll();

      const result = service.getResult();
      result.groupNodes.forEach(node => {
        expect(node.expanded).toBe(false);
      });
    });

    it('should do nothing when toggling non-existent node', () => {
      expect(() => service.toggleGroup('non-existent')).not.toThrow();
    });

    it('should do nothing when expanding non-group node', () => {
      service.setGroupExpanded('leaf-0', true);
      // Should not throw
    });
  });

  describe('callbacks', () => {
    beforeEach(() => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config);
    });

    it('should emit groupOpened event when expanding', () => {
      const config: GroupConfig = { groupFields: ['category'], expandAll: false };
      service.initialize(sampleData, config);

      const callback = vi.fn();
      service.setOnGroupChange(callback);

      const result = service.getResult();
      const groupA = result.groupNodes.find(n => n.key === 'A')!;
      service.setGroupExpanded(groupA.id, true);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'groupOpened',
          groupNode: groupA,
        })
      );
    });

    it('should emit groupClosed event when collapsing', () => {
      const callback = vi.fn();
      service.setOnGroupChange(callback);

      const result = service.getResult();
      const groupA = result.groupNodes.find(n => n.key === 'A')!;
      service.setGroupExpanded(groupA.id, false);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'groupClosed',
          groupNode: groupA,
        })
      );
    });
  });

  describe('getFlattenedNodes', () => {
    it('should return all nodes when all groups expanded', () => {
      const config: GroupConfig = { groupFields: ['category'], expandAll: true };
      service.initialize(sampleData, config);

      const flatNodes = service.getFlattenedNodes();
      expect(flatNodes.length).toBe(7); // 2 groups + 5 leaves
    });

    it('should return only expanded nodes', () => {
      const config: GroupConfig = { groupFields: ['category'], expandAll: true };
      service.initialize(sampleData, config);

      const result = service.getResult();
      const groupA = result.groupNodes.find(n => n.key === 'A')!;
      service.setGroupExpanded(groupA.id, false);

      const flatNodes = service.getFlattenedNodes();
      // 2 groups + 2 leaves (B group)
      expect(flatNodes.length).toBe(4);
    });
  });

  describe('aggregation integration', () => {
    it('should calculate aggregations for groups', () => {
      const config: GroupConfig = {
        groupFields: ['category'],
        enableAggregation: true,
      };
      const columnDefs = [{ field: 'value', aggregation: 'sum' }];
      service.initialize(sampleData, config, columnDefs);

      const result = service.getResult();
      const groupA = result.groupNodes.find(n => n.key === 'A')!;

      expect(groupA.data.__aggregations).toBeDefined();
      expect(groupA.data.__aggregations.value.sum.value).toBe(450); // 100 + 200 + 150
    });

    it('should not calculate aggregations when disabled', () => {
      const config: GroupConfig = {
        groupFields: ['category'],
        enableAggregation: false,
      };
      service.initialize(sampleData, config);

      const result = service.getResult();
      const groupA = result.groupNodes.find(n => n.key === 'A')!;

      expect(groupA.data.__aggregations).toBeUndefined();
    });
  });

  describe('getResult', () => {
    it('should return complete result object', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config);

      const result = service.getResult();

      expect(result.groupNodes).toBeDefined();
      expect(result.flatNodes).toBeDefined();
      expect(result.groupColumnDefs).toBeDefined();
    });
  });

  describe('isGroupingEnabled', () => {
    it('should return true when grouping is configured', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config);
      expect(service.isGroupingEnabled()).toBe(true);
    });

    it('should return false when no group fields', () => {
      const config: GroupConfig = { groupFields: [] };
      service.initialize(sampleData, config);
      expect(service.isGroupingEnabled()).toBe(false);
    });
  });

  describe('destroy', () => {
    it('should clear all data on destroy', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config);
      service.destroy();

      expect(service.getResult().groupNodes.length).toBe(0);
      expect(service.getResult().flatNodes.length).toBe(0);
      expect(service.getGroupColumnDefs().length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle null values in group field', () => {
      const dataWithNull = [
        { id: 1, category: null, value: 100 },
        { id: 2, category: 'A', value: 200 },
      ];
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(dataWithNull, config);

      const result = service.getResult();
      const nullGroup = result.groupNodes.find(n => n.key === 'null');
      expect(nullGroup).toBeDefined();
    });

    it('should handle undefined values in group field', () => {
      const dataWithUndefined = [
        { id: 1, category: undefined, value: 100 },
        { id: 2, category: 'A', value: 200 },
      ];
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(dataWithUndefined, config);

      const result = service.getResult();
      const nullGroup = result.groupNodes.find(n => n.key === 'null');
      expect(nullGroup).toBeDefined();
    });

    it('should handle single row data', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize([sampleData[0]], config);

      const result = service.getResult();
      expect(result.groupNodes.length).toBe(1);
      expect(result.flatNodes.length).toBe(2); // 1 group + 1 leaf
    });

    it('should handle data without id field', () => {
      const dataWithoutId = [
        { category: 'A', value: 100 },
        { category: 'B', value: 200 },
      ];
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(dataWithoutId, config);

      const result = service.getResult();
      expect(result.groupNodes.length).toBe(2);
    });
  });
});
