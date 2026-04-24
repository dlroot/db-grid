import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MasterDetailService, MasterDetailConfig, DetailGridConfig } from '../master-detail.service';

describe('MasterDetailService', () => {
  let service: MasterDetailService;

  beforeEach(() => {
    service = new MasterDetailService();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('initialize', () => {
    it('should initialize with defaults (disabled)', () => {
      service.initialize();
      expect(service.isEnabled()).toBe(false);
      expect(service.isMasterDetail()).toBe(false);
      expect(service.getDetailRowHeight()).toBe(300);
      expect(service.isAutoHeight()).toBe(false);
    });

    it('should initialize with custom config', () => {
      service.initialize({
        enabled: true,
        masterDetail: true,
        detailRowHeight: 400,
        detailRowAutoHeight: true,
      });
      expect(service.isEnabled()).toBe(true);
      expect(service.isMasterDetail()).toBe(true);
      expect(service.getDetailRowHeight()).toBe(400);
      expect(service.isAutoHeight()).toBe(true);
    });

    it('should register detail grid configs on init', () => {
      const configs: DetailGridConfig[] = [
        { id: 'orders', columnDefs: [] },
        { id: 'history', columnDefs: [] },
      ];
      service.initialize({ detailGridConfigs: configs });
      
      expect(service.getDetailGridConfig('orders')).toBeDefined();
      expect(service.getDetailGridConfig('history')).toBeDefined();
    });
  });

  describe('enable / disable', () => {
    it('should enable master-detail mode', () => {
      service.enable();
      expect(service.isEnabled()).toBe(true);
      expect(service.isMasterDetail()).toBe(true);
    });

    it('should disable and clear expanded nodes', () => {
      service.enable();
      service.expandDetail('row-1', { id: 1 });
      expect(service.isDetailExpanded('row-1')).toBe(true);
      
      service.disable();
      expect(service.isEnabled()).toBe(false);
      expect(service.isMasterDetail()).toBe(false);
      expect(service.isDetailExpanded('row-1')).toBe(false);
    });
  });

  describe('expandDetail / collapseDetail / toggleDetail', () => {
    beforeEach(() => {
      service.initialize({ enabled: true });
    });

    it('should expand detail for a row', () => {
      service.expandDetail('row-1', { id: 1 });
      expect(service.isDetailExpanded('row-1')).toBe(true);
      expect(service.getExpandedNodeIds()).toContain('row-1');
    });

    it('should expand with data', () => {
      const data = { id: 1, name: 'Alice' };
      let receivedData: any = null;
      service.onDetailExpandedEvent((e: any) => { receivedData = e.data; });
      service.expandDetail('row-1', data);
      expect(receivedData).toEqual(data);
    });

    it('should collapse detail for a row', () => {
      service.expandDetail('row-1');
      service.collapseDetail('row-1');
      expect(service.isDetailExpanded('row-1')).toBe(false);
    });

    it('should collapse without data', () => {
      let receivedData: any = 'not null';
      service.onDetailCollapsedEvent((e: any) => { receivedData = e.data; });
      service.collapseDetail('row-1');
      expect(receivedData).toBeNull();
    });

    it('should not expand when disabled', () => {
      service.disable();
      service.expandDetail('row-1');
      expect(service.isDetailExpanded('row-1')).toBe(false);
    });

    it('should toggle from expanded to collapsed', () => {
      service.expandDetail('row-1');
      service.toggleDetail('row-1');
      expect(service.isDetailExpanded('row-1')).toBe(false);
    });

    it('should toggle from collapsed to expanded', () => {
      service.toggleDetail('row-1');
      expect(service.isDetailExpanded('row-1')).toBe(true);
    });

    it('should fire expanded callback on expand', () => {
      let callCount = 0;
      service.onDetailExpandedEvent(() => { callCount++; });
      service.expandDetail('row-1');
      expect(callCount).toBe(1);
    });

    it('should fire collapsed callback on collapse', () => {
      service.expandDetail('row-1');
      let callCount = 0;
      service.onDetailCollapsedEvent(() => { callCount++; });
      service.collapseDetail('row-1');
      expect(callCount).toBe(1);
    });
  });

  describe('getExpandedNodeIds', () => {
    it('should return array of expanded node IDs', () => {
      service.initialize({ enabled: true });
      service.expandDetail('row-1');
      service.expandDetail('row-2');
      service.expandDetail('row-3');
      
      const ids = service.getExpandedNodeIds();
      expect(ids).toEqual(['row-1', 'row-2', 'row-3']);
    });

    it('should return empty array when nothing expanded', () => {
      service.initialize({ enabled: true });
      expect(service.getExpandedNodeIds()).toEqual([]);
    });
  });

  describe('expandAll / collapseAll', () => {
    it('should expand all specified nodes', () => {
      service.initialize({ enabled: true });
      service.expandAll(['row-1', 'row-2', 'row-3']);
      
      expect(service.isDetailExpanded('row-1')).toBe(true);
      expect(service.isDetailExpanded('row-2')).toBe(true);
      expect(service.isDetailExpanded('row-3')).toBe(true);
    });

    it('should collapse all nodes', () => {
      service.initialize({ enabled: true });
      service.expandAll(['row-1', 'row-2']);
      service.collapseAll();
      
      expect(service.getExpandedNodeIds()).toEqual([]);
    });
  });

  describe('registerDetailGridConfig / getDetailGridConfig', () => {
    it('should register a detail grid config', () => {
      const config: DetailGridConfig = {
        id: 'orders',
        columnDefs: [{ field: 'orderId' }, { field: 'amount' }],
      };
      service.registerDetailGridConfig(config);
      expect(service.getDetailGridConfig('orders')).toBeDefined();
      expect(service.getDetailGridConfig('orders')!.id).toBe('orders');
    });

    it('should return undefined for unknown config', () => {
      expect(service.getDetailGridConfig('unknown')).toBeUndefined();
    });
  });

  describe('getDetailNameForNode', () => {
    it('should return detailGridName from data', () => {
      const data = { id: 1, detailGridName: 'orders' };
      expect(service.getDetailNameForNode(data)).toBe('orders');
    });

    it('should return default when no detailGridName', () => {
      const data = { id: 1 };
      expect(service.getDetailNameForNode(data)).toBe('default');
    });

    it('should return default for null data', () => {
      // Source uses optional chaining: data?.detailGridName ?? 'default'
      // null?.detailGridName is undefined, so returns 'default'
      expect(service.getDetailNameForNode(null)).toBe('default');
    });
  });

  describe('destroy', () => {
    it('should clear all state', () => {
      service.initialize({ enabled: true });
      service.expandDetail('row-1');
      service.registerDetailGridConfig({ id: 'orders', columnDefs: [] });
      
      service.destroy();
      
      // destroy() clears expandedNodes and detailGridConfigs but does not reset enabled
      // This is consistent with the source code: destroy only clears collections
      expect(service.getExpandedNodeIds()).toEqual([]);
      expect(service.getDetailGridConfig('orders')).toBeUndefined();
    });
  });
});
