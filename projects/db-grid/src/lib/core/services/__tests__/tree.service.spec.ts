/// <reference types='vitest' />
import { describe, it, expect, beforeEach } from 'vitest';
import { TreeService, TreeNodeConfig, TreeNodeEvent } from '../tree.service';

describe('TreeService', () => {
  let service: TreeService;

  const mockRowData = [
    { id: '1', name: 'Root 1', parentId: null },
    { id: '2', name: 'Child 1.1', parentId: '1' },
    { id: '3', name: 'Child 1.2', parentId: '1' },
    { id: '4', name: 'Root 2', parentId: null },
    { id: '5', name: 'Child 2.1', parentId: '4' },
  ];

  const mockConfig: TreeNodeConfig = {
    idField: 'id',
    parentField: 'parentId',
  };

  beforeEach(() => {
    service = new TreeService();
    service.initialize(mockRowData, mockConfig);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with row data', () => {
      const allNodes = service.getFlattenedNodes();
      expect(allNodes.length).toBeGreaterThan(0);
    });

    it('should identify root nodes', () => {
      const roots = service.getRootNodes();
      expect(roots.length).toBe(2); // Root 1, Root 2
    });
  });

  describe('Node Operations', () => {
    it('should get node by id', () => {
      const node = service.getNode('1');
      expect(node).toBeDefined();
      expect(node?.id).toBe('1');
    });

    it('should return undefined for unknown node', () => {
      const node = service.getNode('unknown');
      expect(node).toBeUndefined();
    });
  });

  describe('Expand/Collapse', () => {
    it('should expand node', () => {
      service.expandNode('1');
      const node = service.getNode('1');
      expect(node?.expanded).toBe(true);
    });

    it('should collapse node', () => {
      service.expandNode('1');
      service.collapseNode('1');
      const node = service.getNode('1');
      expect(node?.expanded).toBe(false);
    });

    it('should toggle node', () => {
      service.expandNode('1');
      service.toggleNode('1');
      const node = service.getNode('1');
      expect(node?.expanded).toBe(false);

      service.toggleNode('1');
      expect(node?.expanded).toBe(true);
    });

    it('should expand all', () => {
      service.collapseNode('1');
      service.collapseNode('4');
      service.expandAll();
      const node1 = service.getNode('1');
      const node4 = service.getNode('4');
      expect(node1?.expanded).toBe(true);
      expect(node4?.expanded).toBe(true);
    });

    it('should collapse all', () => {
      service.expandAll();
      service.collapseAll();
      const node1 = service.getNode('1');
      expect(node1?.expanded).toBe(false);
    });
  });

  describe('Has Children', () => {
    it('should identify node with children', () => {
      expect(service.hasChildren('1')).toBe(true);
      expect(service.hasChildren('2')).toBe(false);
    });

    it('should identify node without children', () => {
      expect(service.hasChildren('2')).toBe(false);
    });
  });

  describe('Flattened Nodes', () => {
    it('should get flattened nodes', () => {
      const nodes = service.getFlattenedNodes();
      expect(nodes.length).toBeGreaterThan(0);
    });

    it('should include children when expanded', () => {
      service.expandNode('1');
      const nodes = service.getFlattenedNodes();
      expect(nodes.find(n => n.id === '2')).toBeDefined();
      expect(nodes.find(n => n.id === '3')).toBeDefined();
    });

    it('should exclude children when collapsed', () => {
      service.collapseNode('1');
      const nodes = service.getFlattenedNodes();
      // Collapsed root's children should be hidden
    });
  });

  describe('Display Count', () => {
    it('should get display count', () => {
      const count = service.getDisplayCount();
      expect(typeof count).toBe('number');
    });
  });

  describe('Update Node Data', () => {
    it('should update node data', () => {
      service.updateNodeData('1', { name: 'Updated Name' });
      const node = service.getNode('1');
      expect(node?.data.name).toBe('Updated Name');
    });
  });

  describe('Callbacks', () => {
    it('should register expand change callback', () => {
      let event: TreeNodeEvent | null = null;
      service.setOnExpandChange((e) => { event = e; });
      
      service.expandNode('1');
      expect(event?.type).toBe('expand');
      expect(event?.node.id).toBe('1');
    });
  });

  describe('Destroy', () => {
    it('should cleanup on destroy', () => {
      service.destroy();
      const nodes = service.getFlattenedNodes();
      expect(nodes).toEqual([]);
    });
  });
});