/// <reference types='vitest' />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GroupService, GroupConfig, GroupChangeEvent } from '../group.service';
import { AggregationService } from '../aggregation.service';
import { RowNode, ColDef, createEmptyRowNode } from '../../models';

describe('GroupService', () => {
  let service: GroupService;
  let aggregationService: AggregationService;

  const sampleData = [
    { id: '1', category: 'A', subcategory: 'X', price: 10 },
    { id: '2', category: 'A', subcategory: 'X', price: 20 },
    { id: '3', category: 'A', subcategory: 'Y', price: 30 },
    { id: '4', category: 'B', subcategory: 'X', price: 40 },
    { id: '5', category: 'B', subcategory: 'Y', price: 50 },
  ];

  const sampleColumnDefs: ColDef[] = [
    { field: 'category', aggregation: 'sum' },
    { field: 'price', aggregation: { type: 'sum', precision: 2 } },
  ];

  beforeEach(() => {
    aggregationService = new AggregationService();
    service = new GroupService(aggregationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialize', () => {
    it('should initialize with single-level grouping', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config, sampleColumnDefs);

      expect(service.isGroupingEnabled()).toBe(true);
      const result = service.getResult();
      expect(result.groupNodes.length).toBe(2); // A, B
    });

    it('should initialize with multi-level grouping', () => {
      const config: GroupConfig = { groupFields: ['category', 'subcategory'] };
      service.initialize(sampleData, config, sampleColumnDefs);

      const result = service.getResult();
      // Top level: A, B (2 groups)
      expect(result.groupNodes.length).toBeGreaterThan(0);
    });

    it('should handle empty data', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize([], config, sampleColumnDefs);

      const result = service.getResult();
      expect(result.groupNodes.length).toBe(0);
      expect(result.flatNodes.length).toBe(0);
    });

    it('should handle empty groupFields (no grouping)', () => {
      const config: GroupConfig = { groupFields: [] };
      service.initialize(sampleData, config, sampleColumnDefs);

      expect(service.isGroupingEnabled()).toBe(false);
      const result = service.getResult();
      expect(result.flatNodes.length).toBe(5); // All leaf nodes
      expect(result.groupNodes.length).toBe(0);
    });

    it('should create group column defs by default', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config, sampleColumnDefs);

      const colDefs = service.getGroupColumnDefs();
      expect(colDefs.length).toBe(1);
      expect(colDefs[0].colId).toBe('__GROUP__');
    });

    it('should not create group column when autoCreateGroupColumn is false', () => {
      const config: GroupConfig = { groupFields: ['category'], autoCreateGroupColumn: false };
      service.initialize(sampleData, config, sampleColumnDefs);

      const colDefs = service.getGroupColumnDefs();
      expect(colDefs.length).toBe(0);
    });

    it('should use custom groupColumnId and groupColumnHeader', () => {
      const config: GroupConfig = {
        groupFields: ['category'],
        groupColumnId: 'myGroup',
        groupColumnHeader: 'My Group',
      };
      service.initialize(sampleData, config, sampleColumnDefs);

      const colDefs = service.getGroupColumnDefs();
      expect(colDefs[0].colId).toBe('myGroup');
      expect(colDefs[0].headerName).toBe('My Group');
    });

    it('should expand all groups by default', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config, sampleColumnDefs);

      const result = service.getResult();
      result.groupNodes.forEach(node => {
        expect(node.expanded).toBe(true);
      });
    });

    it('should collapse all groups when expandAll is false', () => {
      const config: GroupConfig = { groupFields: ['category'], expandAll: false };
      service.initialize(sampleData, config, sampleColumnDefs);

      const result = service.getResult();
      result.groupNodes.forEach(node => {
        expect(node.expanded).toBe(false);
      });
    });
  });

  describe('getResult', () => {
    it('should return group result with groupNodes, flatNodes, and groupColumnDefs', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config, sampleColumnDefs);

      const result = service.getResult();
      expect(result.groupNodes).toBeDefined();
      expect(result.flatNodes).toBeDefined();
      expect(result.groupColumnDefs).toBeDefined();
      expect(Array.isArray(result.groupNodes)).toBe(true);
      expect(Array.isArray(result.flatNodes)).toBe(true);
      expect(Array.isArray(result.groupColumnDefs)).toBe(true);
    });
  });

  describe('getFlattenedNodes', () => {
    it('should return all nodes when groups are expanded', () => {
      const config: GroupConfig = { groupFields: ['category'], expandAll: true };
      service.initialize(sampleData, config, sampleColumnDefs);

      const flatNodes = service.getFlattenedNodes();
      // Should include both group nodes and leaf nodes
      expect(flatNodes.length).toBeGreaterThan(0);
      const groupCount = flatNodes.filter(n => n.group).length;
      const leafCount = flatNodes.filter(n => !n.group).length;
      expect(groupCount).toBe(2); // A, B
      expect(leafCount).toBe(5); // All data rows
    });

    it('should return only group nodes when all collapsed', () => {
      const config: GroupConfig = { groupFields: ['category'], expandAll: false };
      service.initialize(sampleData, config, sampleColumnDefs);

      const flatNodes = service.getFlattenedNodes();
      const leafCount = flatNodes.filter(n => !n.group).length;
      expect(leafCount).toBe(0); // No leaves visible when collapsed
    });

    it('should return leaf nodes when no grouping', () => {
      const config: GroupConfig = { groupFields: [] };
      service.initialize(sampleData, config, sampleColumnDefs);

      const flatNodes = service.getFlattenedNodes();
      expect(flatNodes.length).toBe(5);
    });
  });

  describe('setGroupExpanded', () => {
    it('should expand a collapsed group', () => {
      const config: GroupConfig = { groupFields: ['category'], expandAll: false };
      service.initialize(sampleData, config, sampleColumnDefs);

      const groupNodes = service.getResult().groupNodes;
      const nodeId = groupNodes[0].id;
      service.setGroupExpanded(nodeId, true);

      expect(groupNodes[0].expanded).toBe(true);
    });

    it('should collapse an expanded group', () => {
      const config: GroupConfig = { groupFields: ['category'], expandAll: true };
      service.initialize(sampleData, config, sampleColumnDefs);

      const groupNodes = service.getResult().groupNodes;
      const nodeId = groupNodes[0].id;
      service.setGroupExpanded(nodeId, false);

      expect(groupNodes[0].expanded).toBe(false);
    });

    it('should emit groupOpened event', () => {
      const config: GroupConfig = { groupFields: ['category'], expandAll: false };
      service.initialize(sampleData, config, sampleColumnDefs);

      const callback = vi.fn();
      service.setOnGroupChange(callback);

      const groupNodes = service.getResult().groupNodes;
      service.setGroupExpanded(groupNodes[0].id, true);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'groupOpened' }),
      );
    });

    it('should emit groupClosed event', () => {
      const config: GroupConfig = { groupFields: ['category'], expandAll: true };
      service.initialize(sampleData, config, sampleColumnDefs);

      const callback = vi.fn();
      service.setOnGroupChange(callback);

      const groupNodes = service.getResult().groupNodes;
      service.setGroupExpanded(groupNodes[0].id, false);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'groupClosed' }),
      );
    });

    it('should do nothing for non-group node', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config, sampleColumnDefs);

      expect(() => service.setGroupExpanded('nonexistent', true)).not.toThrow();
    });
  });

  describe('toggleGroup', () => {
    it('should toggle expanded to collapsed', () => {
      const config: GroupConfig = { groupFields: ['category'], expandAll: true };
      service.initialize(sampleData, config, sampleColumnDefs);

      const groupNodes = service.getResult().groupNodes;
      service.toggleGroup(groupNodes[0].id);
      expect(groupNodes[0].expanded).toBe(false);
    });

    it('should toggle collapsed to expanded', () => {
      const config: GroupConfig = { groupFields: ['category'], expandAll: false };
      service.initialize(sampleData, config, sampleColumnDefs);

      const groupNodes = service.getResult().groupNodes;
      service.toggleGroup(groupNodes[0].id);
      expect(groupNodes[0].expanded).toBe(true);
    });

    it('should do nothing for non-group node', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config, sampleColumnDefs);

      expect(() => service.toggleGroup('nonexistent')).not.toThrow();
    });
  });

  describe('expandAll / collapseAll', () => {
    it('should expand all groups', () => {
      const config: GroupConfig = { groupFields: ['category'], expandAll: false };
      service.initialize(sampleData, config, sampleColumnDefs);

      service.expandAll();
      service.getResult().groupNodes.forEach(node => {
        expect(node.expanded).toBe(true);
      });
    });

    it('should collapse all groups', () => {
      const config: GroupConfig = { groupFields: ['category'], expandAll: true };
      service.initialize(sampleData, config, sampleColumnDefs);

      service.collapseAll();
      service.getResult().groupNodes.forEach(node => {
        expect(node.expanded).toBe(false);
      });
    });

    it('expandAll should emit groupOpened event', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config, sampleColumnDefs);

      const callback = vi.fn();
      service.setOnGroupChange(callback);
      service.expandAll();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'groupOpened' }),
      );
    });

    it('collapseAll should emit groupClosed event', () => {
      const config: GroupConfig = { groupFields: ['category'] };
      service.initialize(sampleData, config, sampleColumnDefs);

      const callback = vi.fn();
      service.setOnGroupChange(callback);
      service.collapseAll();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'groupClosed' }),
      );
    });
  });

  describe('isGroupingEnabled', () => {
    it('should return true when grouping is configured', () => {
      service.initialize(sampleData, { groupFields: ['category'] }, sampleColumnDefs);
      expect(service.isGroupingEnabled()).toBe(true);
    });

    it('should return false when no groupFields', () => {
      service.initialize(sampleData, { groupFields: [] }, sampleColumnDefs);
      expect(service.isGroupingEnabled()).toBe(false);
    });

    it('should return false before initialization', () => {
      expect(service.isGroupingEnabled()).toBe(false);
    });
  });

  describe('getGroupFields', () => {
    it('should return configured group fields', () => {
      service.initialize(sampleData, { groupFields: ['category', 'subcategory'] }, sampleColumnDefs);
      expect(service.getGroupFields()).toEqual(['category', 'subcategory']);
    });

    it('should return empty array before initialization', () => {
      expect(service.getGroupFields()).toEqual([]);
    });
  });

  describe('getGroupLevel', () => {
    it('should return correct level for group nodes', () => {
      service.initialize(sampleData, { groupFields: ['category'] }, sampleColumnDefs);
      const groupNodes = service.getResult().groupNodes;
      expect(service.getGroupLevel(groupNodes[0].id)).toBe(0);
    });

    it('should return -1 for non-group nodes', () => {
      service.initialize(sampleData, { groupFields: ['category'] }, sampleColumnDefs);
      expect(service.getGroupLevel('nonexistent')).toBe(-1);
    });
  });

  describe('isGroupNode', () => {
    it('should return true for group nodes', () => {
      service.initialize(sampleData, { groupFields: ['category'] }, sampleColumnDefs);
      const groupNodes = service.getResult().groupNodes;
      expect(service.isGroupNode(groupNodes[0].id)).toBe(true);
    });

    it('should return false for non-group nodes', () => {
      service.initialize(sampleData, { groupFields: ['category'] }, sampleColumnDefs);
      expect(service.isGroupNode('nonexistent')).toBe(false);
    });
  });

  describe('getGroupState', () => {
    it('should return group state with correct structure', () => {
      service.initialize(sampleData, { groupFields: ['category'] }, sampleColumnDefs);

      const state = service.getGroupState();
      expect(state.groupFields).toEqual(['category']);
      expect(state.groups).toBeDefined();
      expect(Array.isArray(state.groups)).toBe(true);
      expect(state.groups.length).toBe(2); // A, B
    });

    it('should include node info in groups', () => {
      service.initialize(sampleData, { groupFields: ['category'] }, sampleColumnDefs);

      const state = service.getGroupState();
      const firstGroup = state.groups[0];
      expect(firstGroup.nodeId).toBeDefined();
      expect(firstGroup.key).toBeDefined();
      expect(firstGroup.level).toBeDefined();
      expect(firstGroup.expanded).toBeDefined();
      expect(firstGroup.childCount).toBeDefined();
    });
  });

  describe('setOnGroupChange', () => {
    it('should register a callback for group change events', () => {
      service.initialize(sampleData, { groupFields: ['category'], expandAll: true }, sampleColumnDefs);

      const callback = vi.fn();
      service.setOnGroupChange(callback);

      const groupNodes = service.getResult().groupNodes;
      service.toggleGroup(groupNodes[0].id);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('destroy', () => {
    it('should clear all internal state', () => {
      service.initialize(sampleData, { groupFields: ['category'] }, sampleColumnDefs);
      service.destroy();

      const result = service.getResult();
      expect(result.groupNodes.length).toBe(0);
      expect(result.flatNodes.length).toBe(0);
      expect(result.groupColumnDefs.length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle data with null field values', () => {
      const data = [
        { id: '1', category: null, price: 10 },
        { id: '2', category: 'A', price: 20 },
      ];
      service.initialize(data, { groupFields: ['category'] }, sampleColumnDefs);

      const result = service.getResult();
      // Should create groups including null group
      expect(result.groupNodes.length).toBeGreaterThan(0);
    });

    it('should handle data with undefined field values', () => {
      const data = [
        { id: '1', price: 10 }, // no category
        { id: '2', category: 'A', price: 20 },
      ];
      service.initialize(data, { groupFields: ['category'] }, sampleColumnDefs);

      const result = service.getResult();
      expect(result.groupNodes.length).toBeGreaterThan(0);
    });

    it('should handle single data row', () => {
      service.initialize(
        [{ id: '1', category: 'A', price: 10 }],
        { groupFields: ['category'] },
        sampleColumnDefs,
      );

      const result = service.getResult();
      expect(result.groupNodes.length).toBe(1);
      expect(result.flatNodes.length).toBe(2); // 1 group + 1 leaf
    });

    it('should handle re-initialization', () => {
      service.initialize(sampleData, { groupFields: ['category'] }, sampleColumnDefs);
      const firstResult = service.getResult();

      service.initialize([], { groupFields: ['category'] }, sampleColumnDefs);
      const secondResult = service.getResult();

      expect(secondResult.groupNodes.length).toBe(0);
      expect(secondResult.flatNodes.length).toBe(0);
    });
  });
});
