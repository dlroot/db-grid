// @ts-nocheck
/// <reference types='vitest' />
import { describe, it, expect, beforeEach } from 'vitest';
import { SelectionService, SelectionConfig, SelectionChange } from '../selection.service';
import { RowNode } from '../models';

describe('SelectionService', () => {
  let service: SelectionService;

  const createMockNode = (id: string, rowIndex: number): RowNode => ({
    id,
    rowIndex,
    data: { id },
    selected: false,
    checkable: true,
  } as any);

  beforeEach(() => {
    service = new SelectionService();
    service.initialize({ mode: 'multiple' });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with mode single', () => {
      service.initialize({ mode: 'single' });
      expect(service).toBeTruthy();
    });

    it('should initialize with mode multiple', () => {
      service.initialize({ mode: 'multiple' });
      expect(service).toBeTruthy();
    });

    it('should initialize with mode none', () => {
      service.initialize({ mode: 'none' });
      expect(service).toBeTruthy();
    });
  });

  describe('Select Node', () => {
    it('should select single node', () => {
      const node = createMockNode('row1', 0);
      service.selectNode(node);
      expect(service.isSelected(node)).toBe(true);
    });

    it('should deselect when clicking selected node with ctrl', () => {
      const node = createMockNode('row1', 0);
      service.selectNode(node);
      service.selectNode(node, { ctrlKey: true } as MouseEvent);
      expect(service.isSelected(node)).toBe(false);
    });

    it('should not toggle when mode is none', () => {
      service.initialize({ mode: 'none' });
      const node = createMockNode('row1', 0);
      service.selectNode(node);
      expect(service.isSelected(node)).toBe(false);
    });

    it('should handle shift key for range selection', () => {
      const node1 = createMockNode('row1', 0);
      const node2 = createMockNode('row2', 1);
      const node3 = createMockNode('row3', 2);
      const nodes = [node1, node2, node3];

      // 设置回调以支持范围选择
      service.setGetAllRowIdsCallback(
        (index) => nodes[index]?.id ?? null,
        () => nodes.length,
        (index) => nodes[index] ?? null
      );

      service.selectNode(node1);
      service.selectNode(node3, { shiftKey: true } as MouseEvent);
      
      // Range selection selects all between
      expect(service.isSelected(node1)).toBe(true);
      expect(service.isSelected(node2)).toBe(true);
      expect(service.isSelected(node3)).toBe(true);
    });
  });

  describe('Select All', () => {
    it('should select all nodes', () => {
      const nodes = [
        createMockNode('row1', 0),
        createMockNode('row2', 1),
        createMockNode('row3', 2),
      ];
      service.selectAll(nodes);
      expect(service.getSelectionCount()).toBe(3);
    });

    it('should not select in none mode', () => {
      service.initialize({ mode: 'none' });
      const nodes = [createMockNode('row1', 0)];
      service.selectAll(nodes);
      expect(service.getSelectionCount()).toBe(0);
    });
  });

  describe('Deselection', () => {
    it('should deselect node', () => {
      const node = createMockNode('row1', 0);
      service.selectNode(node);
      service.deselectNode(node);
      expect(service.isSelected(node)).toBe(false);
    });

    it('should clear all selections', () => {
      const nodes = [
        createMockNode('row1', 0),
        createMockNode('row2', 1),
      ];
      service.selectAll(nodes);
      service.clearSelection();
      expect(service.getSelectionCount()).toBe(0);
    });
  });

  describe('Get Selected', () => {
    it('should get selected nodes', () => {
      const node1 = createMockNode('row1', 0);
      const node2 = createMockNode('row2', 1);
      service.selectNode(node1);
      service.selectNode(node2, { ctrlKey: true } as MouseEvent);
      const selected = service.getSelectedNodes();
      expect(selected.length).toBe(2);
    });

    it('should get selected data', () => {
      const node1 = createMockNode('row1', 0);
      service.selectNode(node1);
      const data = service.getSelectedData();
      expect(data).toHaveLength(1);
    });

    it('should get selected ids', () => {
      const node1 = createMockNode('row1', 0);
      service.selectNode(node1);
      const ids = service.getSelectedIds();
      expect(ids).toContain('row1');
    });
  });

  describe('Selection Count', () => {
    it('should get selection count', () => {
      const nodes = [
        createMockNode('row1', 0),
        createMockNode('row2', 1),
      ];
      service.selectAll(nodes);
      expect(service.getSelectionCount()).toBe(2);
    });

    it('should check has selection', () => {
      expect(service.hasSelection()).toBe(false);
      const node = createMockNode('row1', 0);
      service.selectNode(node);
      expect(service.hasSelection()).toBe(true);
    });

    it('should check is nothing selected', () => {
      expect(service.isNothingSelected()).toBe(true);
      const node = createMockNode('row1', 0);
      service.selectNode(node);
      expect(service.isNothingSelected()).toBe(false);
    });
  });

  describe('Toggle Select All', () => {
    it('should toggle select all - select when nothing selected', () => {
      const nodes = [
        createMockNode('row1', 0),
        createMockNode('row2', 1),
      ];
      service.toggleSelectAll(nodes);
      expect(service.getSelectionCount()).toBe(2);
    });

    it('should toggle select all - deselect when all selected', () => {
      const nodes = [
        createMockNode('row1', 0),
        createMockNode('row2', 1),
      ];
      service.toggleSelectAll(nodes); // select all
      service.toggleSelectAll(nodes); // should deselect all
      expect(service.isNothingSelected()).toBe(true);
    });
  });

  describe('Update/Delete Node', () => {
    it('should update node id', () => {
      const oldNode = createMockNode('row1', 0);
      const newNode = createMockNode('row1-new', 0);
      service.selectNode(oldNode);
      service.updateNode('row1', newNode);
      const ids = service.getSelectedIds();
      expect(ids).toContain('row1-new');
    });

    it('should delete node', () => {
      const node = createMockNode('row1', 0);
      service.selectNode(node);
      service.deleteNode('row1');
      expect(service.isSelected(node)).toBe(false);
    });
  });

  describe('Server-Side Selection', () => {
    it('should select all by ids', () => {
      const getNodeById = (id: string) => createMockNode(id, 0);
      service.selectAllByIds(['row1', 'row2', 'row3'], getNodeById);
      expect(service.getSelectionCount()).toBe(3);
    });

    it('should set all selected flag for server mode', () => {
      const nodes = [createMockNode('row1', 0)];
      service.selectAll(nodes);
      expect(service.isAllSelectedForRender()).toBe(true);
    });

    it('should reset all selected flag', () => {
      const nodes = [createMockNode('row1', 0)];
      service.selectAll(nodes);
      service.resetAllSelected();
      expect(service.isAllSelectedForRender()).toBe(false);
    });
  });

  describe('Destroy', () => {
    it('should clear selection on destroy', () => {
      const nodes = [createMockNode('row1', 0)];
      service.selectAll(nodes);
      service.destroy();
      expect(service.getSelectionCount()).toBe(0);
    });
  });
});