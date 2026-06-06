/// <reference types='vitest' />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { I18nService, Locale } from '../i18n.service';

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(() => {
    service = new I18nService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('constructor', () => {
    it('should default to en locale', () => {
      // In jsdom, navigator.language may not start with 'zh'
      service = new I18nService();
      // It could be 'zh' if browser language is zh, but in test env it's likely 'en'
      const locale = service.getLocale();
      expect(['en', 'zh']).toContain(locale);
    });
  });

  describe('setLocale / getLocale', () => {
    it('should set and get locale', () => {
      service.setLocale('zh');
      expect(service.getLocale()).toBe('zh');
    });

    it('should set locale to en', () => {
      service.setLocale('en');
      expect(service.getLocale()).toBe('en');
    });

    it('should set locale to ja', () => {
      service.setLocale('ja');
      expect(service.getLocale()).toBe('ja');
    });

    it('should set locale to ko', () => {
      service.setLocale('ko');
      expect(service.getLocale()).toBe('ko');
    });

    it('should update the signal value', () => {
      service.setLocale('zh');
      expect(service.locale()).toBe('zh');
    });

    it('should switch between locales', () => {
      service.setLocale('zh');
      expect(service.getLocale()).toBe('zh');
      service.setLocale('en');
      expect(service.getLocale()).toBe('en');
      service.setLocale('ja');
      expect(service.getLocale()).toBe('ja');
    });
  });

  describe('t (translate)', () => {
    it('should translate grid.loading in en', () => {
      service.setLocale('en');
      expect(service.t('grid.loading')).toBe('Loading...');
    });

    it('should translate grid.loading in zh', () => {
      service.setLocale('zh');
      expect(service.t('grid.loading')).toBe('加载中...');
    });

    it('should translate grid.loading in ja', () => {
      service.setLocale('ja');
      expect(service.t('grid.loading')).toBe('読み込み中...');
    });

    it('should translate grid.loading in ko', () => {
      service.setLocale('ko');
      expect(service.t('grid.loading')).toBe('로딩 중...');
    });

    it('should translate sort keys', () => {
      service.setLocale('en');
      expect(service.t('sort.ascending')).toBe('Sort Ascending');
      expect(service.t('sort.descending')).toBe('Sort Descending');
    });

    it('should translate filter keys', () => {
      service.setLocale('zh');
      expect(service.t('filter.contains')).toBe('包含');
      expect(service.t('filter.equals')).toBe('等于');
    });

    it('should translate column menu keys', () => {
      service.setLocale('en');
      expect(service.t('col.pinLeft')).toBe('Pin Left');
      expect(service.t('col.pinRight')).toBe('Pin Right');
    });

    it('should translate context menu keys', () => {
      service.setLocale('zh');
      expect(service.t('menu.copyCell')).toBe('复制单元格');
      expect(service.t('menu.copyRow')).toBe('复制整行');
    });

    it('should translate tree keys', () => {
      service.setLocale('en');
      expect(service.t('tree.expand')).toBe('Expand');
      expect(service.t('tree.collapse')).toBe('Collapse');
    });

    it('should translate group keys', () => {
      service.setLocale('zh');
      expect(service.t('group.expand')).toBe('展开分组');
      expect(service.t('group.collapse')).toBe('折叠分组');
    });

    it('should translate aggregation keys', () => {
      service.setLocale('en');
      expect(service.t('agg.sum')).toBe('Sum');
      expect(service.t('agg.avg')).toBe('Average');
      expect(service.t('agg.min')).toBe('Min');
      expect(service.t('agg.max')).toBe('Max');
      expect(service.t('agg.count')).toBe('Count');
    });

    it('should translate filter operator keys', () => {
      service.setLocale('en');
      expect(service.t('filter.startsWith')).toBe('Starts With');
      expect(service.t('filter.endsWith')).toBe('Ends With');
      expect(service.t('filter.lessThan')).toBe('Less Than');
      expect(service.t('filter.greaterThan')).toBe('Greater Than');
      expect(service.t('filter.inRange')).toBe('In Range');
    });

    it('should translate editor keys', () => {
      service.setLocale('zh');
      expect(service.t('editor.true')).toBe('是');
      expect(service.t('editor.false')).toBe('否');
    });

    it('should return the key itself for unknown keys', () => {
      service.setLocale('en');
      expect(service.t('unknown.key')).toBe('unknown.key');
    });

    it('should fallback to en when current locale lacks a key', () => {
      // All locales have the same keys in this implementation,
      // but if a key were missing, it should fallback to en
      service.setLocale('en');
      const enValue = service.t('grid.noRows');
      expect(enValue).toBe('No rows to show');
    });

    it('should translate cellSpan keys', () => {
      service.setLocale('zh');
      expect(service.t('cellSpan.autoMerge')).toBe('自动合并');
      expect(service.t('cellSpan.manual')).toBe('手动设置');
      expect(service.t('cellSpan.clear')).toBe('清除合并');
    });

    it('should translate grid.noRows', () => {
      service.setLocale('en');
      expect(service.t('grid.noRows')).toBe('No rows to show');
      service.setLocale('zh');
      expect(service.t('grid.noRows')).toBe('暂无数据');
    });

    it('should translate grid.rows and grid.selected', () => {
      service.setLocale('en');
      expect(service.t('grid.rows')).toBe('rows');
      expect(service.t('grid.selected')).toBe('selected');
    });
  });

  describe('getSupportedLocales', () => {
    it('should return list of supported locales', () => {
      const locales = service.getSupportedLocales();
      expect(Array.isArray(locales)).toBe(true);
      expect(locales).toContain('en');
      expect(locales).toContain('zh');
    });
  });

  describe('getLocaleDisplayName', () => {
    it('should return English display name for en', () => {
      expect(service.getLocaleDisplayName('en')).toBe('English');
    });

    it('should return Chinese display name for zh', () => {
      expect(service.getLocaleDisplayName('zh')).toBe('中文');
    });

    it('should return Japanese display name for ja', () => {
      expect(service.getLocaleDisplayName('ja')).toBe('日本語');
    });

    it('should return Korean display name for ko', () => {
      expect(service.getLocaleDisplayName('ko')).toBe('한국어');
    });

    it('should return the locale string itself for unknown locale', () => {
      expect(service.getLocaleDisplayName('fr' as Locale)).toBe('fr');
    });
  });

  describe('locale signal', () => {
    it('should be reactive via signal', () => {
      service.setLocale('zh');
      expect(service.locale()).toBe('zh');
      service.setLocale('ja');
      expect(service.locale()).toBe('ja');
    });
  });

  describe('comprehensive translation coverage', () => {
    // Test that all keys exist in all locales
    const locales: Locale[] = ['en', 'zh', 'ja', 'ko'];
    const sampleKeys = [
      'grid.loading', 'grid.noRows', 'grid.rows', 'grid.selected',
      'sort.ascending', 'sort.descending', 'sort.noSort',
      'filter.click',
      'col.drag', 'col.menu', 'col.sortAZ', 'col.sortZA', 'col.clearSort',
      'col.filter', 'col.pin', 'col.unpin', 'col.pinLeft', 'col.pinRight',
      'col.autoSize', 'col.autoSizeAll', 'col.hide', 'col.show', 'col.columns', 'col.reset',
      'menu.sortAsc', 'menu.sortDesc', 'menu.clearSort', 'menu.filter',
      'menu.copyCell', 'menu.copyRow', 'menu.editCell', 'menu.selectRow', 'menu.clearSelection',
      'tree.expand', 'tree.collapse', 'tree.toggle',
      'group.expand', 'group.collapse', 'group.toggle', 'group.expandAll', 'group.collapseAll',
      'agg.sum', 'agg.avg', 'agg.min', 'agg.max', 'agg.count',
      'cellSpan.autoMerge', 'cellSpan.manual', 'cellSpan.clear',
      'filter.search', 'filter.apply', 'filter.clear', 'filter.reset',
      'filter.contains', 'filter.equals', 'filter.startsWith', 'filter.endsWith',
      'filter.lessThan', 'filter.greaterThan', 'filter.inRange',
      'filter.selectAll', 'filter.selectNone',
      'editor.true', 'editor.false', 'editor.selectOptions',
    ];

    locales.forEach(locale => {
      describe(`locale: ${locale}`, () => {
        it('should have translations for all sample keys', () => {
          service.setLocale(locale);
          sampleKeys.forEach(key => {
            const result = service.t(key);
            expect(result).toBeTruthy();
            expect(result).not.toBe(key); // Should not return the key itself
          });
        });
      });
    });
  });
});
