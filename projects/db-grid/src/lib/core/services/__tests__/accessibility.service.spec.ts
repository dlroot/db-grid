import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AccessibilityService, AriaCellAttrs } from '../accessibility.service';

describe('AccessibilityService', () => {
  let service: AccessibilityService;
  let mockGridElement: HTMLElement;

  beforeEach(() => {
    service = new AccessibilityService();
    mockGridElement = document.createElement('div');
    document.body.appendChild(mockGridElement);
  });

  afterEach(() => {
    service.destroy();
    mockGridElement.remove();
  });

  describe('setGridElement', () => {
    it('should set grid role and aria attributes', () => {
      service.setGridElement(mockGridElement);
      expect(mockGridElement.getAttribute('role')).toBe('grid');
      expect(mockGridElement.getAttribute('aria-label')).toBe('数据表格');
      expect(mockGridElement.getAttribute('aria-multiselectable')).toBe('true');
    });

    it('should create announcer element', () => {
      service.setGridElement(mockGridElement);
      const announcer = mockGridElement.querySelector('.db-grid-announcer');
      expect(announcer).not.toBeNull();
      expect(announcer?.getAttribute('role')).toBe('status');
      expect(announcer?.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('setConfig', () => {
    it('should update config', () => {
      service.setConfig({ announceEnabled: false, announceDelay: 100 });
      service.setGridElement(mockGridElement);
      // announce should be disabled
      service.announce('test');
      expect(service.onAnnounce).toBeDefined();
    });
  });

  describe('getGridAria', () => {
    it('should return grid aria attributes', () => {
      const attrs = service.getGridAria(10, 5);
      expect(attrs['role']).toBe('grid');
      expect(attrs['aria-rowcount']).toBe('10');
      expect(attrs['aria-colcount']).toBe('5');
    });
  });

  describe('getHeaderAria', () => {
    it('should return header aria attributes', () => {
      const attrs = service.getHeaderAria();
      expect(attrs['role']).toBe('rowgroup');
      expect(attrs['aria-label']).toBe('表头');
    });
  });

  describe('getBodyAria', () => {
    it('should return body aria attributes', () => {
      const attrs = service.getBodyAria();
      expect(attrs['role']).toBe('rowgroup');
      expect(attrs['aria-label']).toBe('数据行');
    });
  });

  describe('getRowAria', () => {
    it('should return row aria attributes', () => {
      const attrs = service.getRowAria(0, false);
      expect(attrs['role']).toBe('row');
      expect(attrs['aria-rowindex']).toBe('1'); // 1-indexed
      expect(attrs['aria-selected']).toBe('false');
    });

    it('should add group label when isGroup is true', () => {
      const attrs = service.getRowAria(2, true, true);
      expect(attrs['aria-label']).toBe('分组行第3行');
    });
  });

  describe('getCellAria', () => {
    it('should return cell aria attributes', () => {
      const attrs = service.getCellAria(0, 0, {});
      expect(attrs['role']).toBe('gridcell');
      expect(attrs['aria-rowindex']).toBe(1);
      expect(attrs['aria-colindex']).toBe(1);
    });

    it('should return columnheader role when isHeader is true', () => {
      const attrs = service.getCellAria(0, 0, { isHeader: true });
      expect(attrs['role']).toBe('columnheader');
    });

    it('should include aria-selected when provided', () => {
      const attrs = service.getCellAria(0, 0, { isSelected: true });
      expect(attrs['aria-selected']).toBe(true);
    });

    it('should include aria-readonly when editable is false', () => {
      const attrs = service.getCellAria(0, 0, { isEditable: false });
      expect(attrs['aria-readonly']).toBe(true);
    });

    it('should include aria-label from label option', () => {
      const attrs = service.getCellAria(0, 0, { label: 'Test Label' });
      expect(attrs['aria-label']).toBe('Test Label');
    });

    it('should use value as aria-label when no label provided', () => {
      const attrs = service.getCellAria(0, 0, { value: 'Test Value' });
      expect(attrs['aria-label']).toBe('Test Value');
    });

    it('should set tabindex 0 when focused', () => {
      const attrs = service.getCellAria(0, 0, { isFocused: true });
      expect(attrs.tabindex).toBe(0);
    });

    it('should set tabindex -1 when not focused', () => {
      const attrs = service.getCellAria(0, 0, { isFocused: false });
      expect(attrs.tabindex).toBe(-1);
    });
  });

  describe('getGroupHeaderAria', () => {
    it('should return group header aria attributes', () => {
      const attrs = service.getGroupHeaderAria('Group A', 2);
      expect(attrs['role']).toBe('columnheader');
      expect(attrs['aria-colspan']).toBe('2');
      expect(attrs['aria-label']).toBe('Group A');
    });

    it('should include aria-expanded when provided', () => {
      const attrs = service.getGroupHeaderAria('Group', 1, true);
      expect(attrs['aria-expanded']).toBe('true');
    });
  });

  describe('announce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should update announcer text after delay', () => {
      service.setGridElement(mockGridElement);
      service.announce('Test announcement');
      
      const announcer = mockGridElement.querySelector('.db-grid-announcer') as HTMLElement;
      expect(announcer.textContent).toBe('');
      
      vi.advanceTimersByTime(50);
      expect(announcer.textContent).toBe('Test announcement');
    });

    it('should emit onAnnounce event', () => {
      service.setGridElement(mockGridElement);
      const spy = vi.fn();
      service.onAnnounce.subscribe(spy);
      
      service.announce('Test');
      vi.advanceTimersByTime(50);
      
      expect(spy).toHaveBeenCalledWith('Test');
    });

    it('should not announce when disabled', () => {
      service.setConfig({ announceEnabled: false });
      service.setGridElement(mockGridElement);
      
      service.announce('Test');
      vi.advanceTimersByTime(50);
      
      const announcer = mockGridElement.querySelector('.db-grid-announcer') as HTMLElement;
      expect(announcer.textContent).toBe('');
    });

    it('should set aria-live to assertive when priority is assertive', () => {
      service.setGridElement(mockGridElement);
      service.announce('Urgent', 'assertive');
      
      const announcer = mockGridElement.querySelector('.db-grid-announcer') as HTMLElement;
      expect(announcer.getAttribute('aria-live')).toBe('assertive');
    });
  });

  describe('announceFocus', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should announce focus with value', () => {
      service.setGridElement(mockGridElement);
      service.setConfig({ announceOnFocus: true });
      const spy = vi.fn();
      service.onAnnounce.subscribe(spy);
      
      service.announceFocus(2, 'name', 'John');
      vi.advanceTimersByTime(50);
      
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0]).toContain('第3行');
    });
  });

  describe('announceSelection', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should announce "已取消所有选择" when count is 0', () => {
      service.setGridElement(mockGridElement);
      service.setConfig({ announceOnSelection: true });
      const spy = vi.fn();
      service.onAnnounce.subscribe(spy);
      
      service.announceSelection(0, 10);
      vi.advanceTimersByTime(50);
      
      expect(spy).toHaveBeenCalledWith('已取消所有选择');
    });

    it('should announce "已全选" when count equals total', () => {
      service.setGridElement(mockGridElement);
      service.setConfig({ announceOnSelection: true });
      const spy = vi.fn();
      service.onAnnounce.subscribe(spy);
      
      service.announceSelection(10, 10);
      vi.advanceTimersByTime(50);
      
      expect(spy).toHaveBeenCalledWith('已全选，共10项');
    });

    it('should announce selection count', () => {
      service.setGridElement(mockGridElement);
      service.setConfig({ announceOnSelection: true });
      const spy = vi.fn();
      service.onAnnounce.subscribe(spy);
      
      service.announceSelection(5, 10);
      vi.advanceTimersByTime(50);
      
      expect(spy).toHaveBeenCalledWith('已选择5项，共10项');
    });
  });

  describe('announceSort', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should announce ascending sort', () => {
      service.setGridElement(mockGridElement);
      const spy = vi.fn();
      service.onAnnounce.subscribe(spy);
      
      service.announceSort('name', 'asc');
      vi.advanceTimersByTime(50);
      
      expect(spy.mock.calls[0][0]).toContain('升序');
    });

    it('should announce descending sort', () => {
      service.setGridElement(mockGridElement);
      const spy = vi.fn();
      service.onAnnounce.subscribe(spy);
      
      service.announceSort('name', 'desc');
      vi.advanceTimersByTime(50);
      
      expect(spy.mock.calls[0][0]).toContain('降序');
    });

    it('should announce no sort', () => {
      service.setGridElement(mockGridElement);
      const spy = vi.fn();
      service.onAnnounce.subscribe(spy);
      
      service.announceSort('name', null);
      vi.advanceTimersByTime(50);
      
      expect(spy.mock.calls[0][0]).toContain('无排序');
    });
  });

  describe('announceFilter', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should announce filter active', () => {
      service.setGridElement(mockGridElement);
      const spy = vi.fn();
      service.onAnnounce.subscribe(spy);
      
      service.announceFilter('name', true);
      vi.advanceTimersByTime(50);
      
      expect(spy.mock.calls[0][0]).toContain('已筛选');
    });

    it('should announce filter cleared', () => {
      service.setGridElement(mockGridElement);
      const spy = vi.fn();
      service.onAnnounce.subscribe(spy);
      
      service.announceFilter('name', false);
      vi.advanceTimersByTime(50);
      
      expect(spy.mock.calls[0][0]).toContain('已清除筛选');
    });
  });

  describe('announceEditing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should announce enter editing mode', () => {
      service.setGridElement(mockGridElement);
      const spy = vi.fn();
      service.onAnnounce.subscribe(spy);
      
      service.announceEditing(0, 'name', true);
      vi.advanceTimersByTime(50);
      
      expect(spy.mock.calls[0][0]).toContain('进入编辑');
    });

    it('should announce exit editing mode', () => {
      service.setGridElement(mockGridElement);
      const spy = vi.fn();
      service.onAnnounce.subscribe(spy);
      
      service.announceEditing(0, 'name', false);
      vi.advanceTimersByTime(50);
      
      expect(spy.mock.calls[0][0]).toContain('退出编辑');
    });
  });

  describe('applyAria', () => {
    it('should apply attributes to element', () => {
      const element = document.createElement('div');
      service.applyAria(element, { 'aria-label': 'Test', 'aria-hidden': 'true' });
      
      expect(element.getAttribute('aria-label')).toBe('Test');
      expect(element.getAttribute('aria-hidden')).toBe('true');
    });

    it('should remove attribute when value is undefined', () => {
      const element = document.createElement('div');
      element.setAttribute('aria-hidden', 'true');
      
      service.applyAria(element, { 'aria-hidden': undefined });
      
      expect(element.hasAttribute('aria-hidden')).toBe(false);
    });
  });

  describe('setActiveDescendantId', () => {
    it('should set aria-activedescendant', () => {
      const element = document.createElement('div');
      service.setActiveDescendantId(element, 'cell-123');
      
      expect(element.getAttribute('aria-activedescendant')).toBe('cell-123');
    });
  });

  describe('destroy', () => {
    it('should remove announcer element', () => {
      service.setGridElement(mockGridElement);
      expect(mockGridElement.querySelector('.db-grid-announcer')).not.toBeNull();
      
      service.destroy();
      
      expect(mockGridElement.querySelector('.db-grid-announcer')).toBeNull();
    });

    it('should complete onAnnounce subject', () => {
      service.setGridElement(mockGridElement);
      const spy = vi.fn();
      service.onAnnounce.subscribe({ complete: spy });
      
      service.destroy();
      
      expect(spy).toHaveBeenCalled();
    });
  });
});
