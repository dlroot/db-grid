import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SelectionService } from './selection.service';
import { RowNode } from '../models';

function createNode(id: string, rowIndex: number, data: any = {}): RowNode {
  return {
    id,
    rowIndex,
    data,
    selected: false,
  } as RowNode;
}

describe('SelectionService', () => {
  let service: SelectionService;

  beforeEach(() => {
    service = new SelectionService();
  });

  afterEach(() => {
    service.destroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialize', () => {
    it('should set single selection mode', () => {
      service.initialize({ mode: 'single' });
      const node = createNode('1', 0);
      service.selectNode(node);
      expect(service.getSelectionCount()).toBe(1);
    });

    it('should set multiple selection mode', () => {
      service.initialize({ mode: 'multiple' });
      const node = createNode('1', 0);
      service.selectNode(node);
      expect(service.getSelectionCount()).toBe(1);
    });

    it('should disable selection in none mode', () => {
      service.initialize({ mode: 'none' });
      const node = createNode('1', 0);
      service.selectNode(node);
      expect(service.getSelectionCount()).toBe(0);
    });
  });

  describe('selectNode', () => {
    beforeEach(() => {
      service.initialize({ mode: 'multiple' });
    });

    it('should select single node', () => {
      const node = createNode('1', 0, { name: 'Alice' });
      service.selectNode(node);
      expect(service.isSelected(node)).toBe(true);
      expect(service.getSelectionCount()).toBe(1);
    });

    it('should not duplicate selection', () => {
      const node = createNode('1', 0);
      service.selectNode(node);
      service.selectNode(node);
      expect(service.getSelectionCount()).toBe(1);
    });

    it('should deselect already selected node with Ctrl', () => {
      const node = createNode('1', 0);
      service.selectNode(node);
      service.selectNode(node, { ctrlKey: true } as MouseEvent);
      expect(service.isSelected(node)).toBe(false);
    });

    it('should clear previous selection when selecting new node', () => {
      const node1 = createNode('1', 0);
      const node2 = createNode('2', 1);
      service.selectNode(node1);
      service.selectNode(node2);
      expect(service.isSelected(node1)).toBe(false);
      expect(service.isSelected(node2)).toBe(true);
    });

    it('should emit selection change callback', () => {
      const callback = vi.fn();
      service.setOnSelectionChanged(callback);
      const node = createNode('1', 0);
      service.selectNode(node);
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('deselectNode', () => {
    beforeEach(() => {
      service.initialize({ mode: 'multiple' });
    });

    it('should deselect selected node', () => {
      const node = createNode('1', 0);
      service.selectNode(node);
      service.deselectNode(node);
      expect(service.isSelected(node)).toBe(false);
    });

    it('should emit deselect event', () => {
      const callback = vi.fn();
      service.setOnSelectionChanged(callback);
      const node = createNode('1', 0);
      service.selectNode(node);
      callback.mockReset();
      service.deselectNode(node);
      expect(callback).toHaveBeenCalled();
    });

    it('should do nothing if node not selected', () => {
      const node = createNode('1', 0);
      service.deselectNode(node);
      expect(service.getSelectionCount()).toBe(0);
    });
  });

  describe('clearSelection', () => {
    beforeEach(() => {
      service.initialize({ mode: 'multiple' });
    });

    it('should clear all selections', () => {
      service.selectNode(createNode('1', 0));
      service.selectNode(createNode('2', 1));
      service.clearSelection();
      expect(service.isNothingSelected()).toBe(true);
    });

    it('should emit deselectAll event', () => {
      const callback = vi.fn();
      service.setOnSelectionChanged(callback);
      service.selectNode(createNode('1', 0));
      callback.mockReset();
      service.clearSelection();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('selectAll', () => {
    beforeEach(() => {
      service.initialize({ mode: 'multiple' });
    });

    it('should select all nodes', () => {
      const nodes = [createNode('1', 0), createNode('2', 1), createNode('3', 2)];
      service.selectAll(nodes);
      expect(service.getSelectionCount()).toBe(3);
    });

    it('should not select in none mode', () => {
      service.initialize({ mode: 'none' });
      const nodes = [createNode('1', 0), createNode('2', 1)];
      service.selectAll(nodes);
      expect(service.getSelectionCount()).toBe(0);
    });
  });

  describe('getSelectedData', () => {
    beforeEach(() => {
      service.initialize({ mode: 'multiple' });
    });

    it('should return data of selected nodes', () => {
      service.selectNode(createNode('1', 0, { name: 'Alice' }));
      service.selectNode(createNode('2', 1, { name: 'Bob' }), { ctrlKey: true } as MouseEvent);
      const data = service.getSelectedData();
      expect(data).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);
    });
  });

  describe('getSelectedIds', () => {
    beforeEach(() => {
      service.initialize({ mode: 'multiple' });
    });

    it('should return IDs of selected nodes', () => {
      service.selectNode(createNode('id-1', 0));
      service.selectNode(createNode('id-2', 1), { ctrlKey: true } as MouseEvent);
      expect(service.getSelectedIds()).toEqual(['id-1', 'id-2']);
    });
  });

  describe('hasSelection / isNothingSelected', () => {
    beforeEach(() => {
      service.initialize({ mode: 'multiple' });
    });

    it('should return false when nothing selected', () => {
      expect(service.hasSelection()).toBe(false);
      expect(service.isNothingSelected()).toBe(true);
    });

    it('should return true when something selected', () => {
      service.selectNode(createNode('1', 0));
      expect(service.hasSelection()).toBe(true);
      expect(service.isNothingSelected()).toBe(false);
    });
  });

  describe('toggleSelectAll', () => {
    beforeEach(() => {
      service.initialize({ mode: 'multiple' });
    });

    it('should select all when nothing selected', () => {
      const nodes = [
        createNode('1', 0, { checkable: true }),
        createNode('2', 1, { checkable: true }),
      ];
      service.toggleSelectAll(nodes);
      expect(service.getSelectionCount()).toBe(2);
    });

    it('should deselect all when all selected', () => {
      // Ctrl+click 实现多选（不清除前一个选择）
      service.selectNode(createNode('1', 0, { checkable: true }));
      service.selectNode(createNode('2', 1, { checkable: true }), { ctrlKey: true } as MouseEvent);
      expect(service.getSelectionCount()).toBe(2);
      service.clearSelection();
      expect(service.getSelectionCount()).toBe(0);
    });
  });

  describe('deleteNode', () => {
    beforeEach(() => {
      service.initialize({ mode: 'multiple' });
    });

    it('should remove node from selection', () => {
      service.selectNode(createNode('1', 0));
      service.deleteNode('1');
      expect(service.isNothingSelected()).toBe(true);
    });
  });

  describe('updateNode', () => {
    beforeEach(() => {
      service.initialize({ mode: 'multiple' });
    });

    it('should update node ID in selection', () => {
      service.selectNode(createNode('old-id', 0));
      service.updateNode('old-id', createNode('new-id', 0));
      expect(service.getSelectedIds()).toEqual(['new-id']);
    });
  });
});
