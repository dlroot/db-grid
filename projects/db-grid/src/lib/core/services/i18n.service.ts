/**
 * 国际化服务
 * 支持 en (默认) / zh 两种语言
 */

import { Injectable, signal } from '@angular/core';

export type Locale = 'en' | 'zh';

const translations: Record<Locale, Record<string, string>> = {
  en: {
    // ========== Grid 基础 ==========
    'grid.loading': 'Loading...',
    'grid.noRows': 'No rows to show',
    'grid.rows': 'rows',
    'grid.selected': 'selected',

    // ========== 排序 ==========
    'sort.ascending': 'Sort Ascending',
    'sort.descending': 'Sort Descending',
    'sort.noSort': 'Click to Sort',

    // ========== 筛选 ==========
    'filter.click': 'Click to Filter',

    // ========== 列操作 ==========
    'col.drag': 'Drag to Move Column',
    'col.menu': 'Column Menu',
    'col.sortAZ': 'Sort A → Z',
    'col.sortZA': 'Sort Z → A',
    'col.clearSort': 'Clear Sort',
    'col.filter': 'Filter',
    'col.pin': 'Pin Column',
    'col.unpin': 'Unpin Column',
    'col.pinLeft': 'Pin Left',
    'col.pinRight': 'Pin Right',
    'col.autoSize': 'Auto-Size Column',
    'col.autoSizeAll': 'Auto-Size All Columns',
    'col.hide': 'Hide Column',
    'col.show': 'Show Column',
    'col.columns': 'Columns',
    'col.reset': 'Reset Columns',

    // ========== Grid Menu 排序 ==========
    'menu.sortAsc': 'Sort Ascending',
    'menu.sortDesc': 'Sort Descending',
    'menu.clearSort': 'Clear Sort',
    'menu.filter': 'Filter',
    'menu.pin': 'Pin Column',
    'menu.pinLeft': 'Pin Left',
    'menu.pinRight': 'Pin Right',
    'menu.unpin': 'Unpin',
    'menu.autoSize': 'Auto-Size This Column',
    'menu.autoSizeAll': 'Auto-Size All Columns',
    'menu.hide': 'Hide Column',
    'menu.columns': 'Column Visibility',
    'menu.reset': 'Reset Columns',

    // ========== 右键菜单 ==========
    'menu.copyCell': 'Copy Cell',
    'menu.copyRow': 'Copy Row',
    'menu.editCell': 'Edit Cell',
    'menu.selectRow': 'Select Row',
    'menu.clearSelection': 'Clear Selection',
    'menu.pinRow': 'Pin Row',
    'menu.unpinRow': 'Unpin Row',

    // ========== 树形 ==========
    'tree.expand': 'Expand',
    'tree.collapse': 'Collapse',
    'tree.toggle': 'Toggle',

    // ========== 分组 ==========
    'group.expand': 'Expand Group',
    'group.collapse': 'Collapse Group',
    'group.toggle': 'Toggle Group',
    'group.expandAll': 'Expand All Groups',
    'group.collapseAll': 'Collapse All Groups',

    // ========== 聚合 ==========
    'agg.sum': 'Sum',
    'agg.avg': 'Average',
    'agg.min': 'Min',
    'agg.max': 'Max',
    'agg.count': 'Count',

    // ========== 单元格合并 ==========
    'cellSpan.autoMerge': 'Auto Merge',
    'cellSpan.manual': 'Manual Span',
    'cellSpan.clear': 'Clear Span',

    // ========== 筛选器 ==========
    'filter.search': 'Search...',
    'filter.apply': 'Apply',
    'filter.clear': 'Clear',
    'filter.reset': 'Reset',
    'filter.contains': 'Contains',
    'filter.equals': 'Equals',
    'filter.startsWith': 'Starts With',
    'filter.endsWith': 'Ends With',
    'filter.lessThan': 'Less Than',
    'filter.greaterThan': 'Greater Than',
    'filter.inRange': 'In Range',
    'filter.selectAll': 'Select All',
    'filter.selectNone': 'Select None',

    // ========== 编辑器 ==========
    'editor.true': 'True',
    'editor.false': 'False',
    'editor.selectOptions': 'Select options...',
  },

  zh: {
    // ========== Grid 基础 ==========
    'grid.loading': '加载中...',
    'grid.noRows': '暂无数据',
    'grid.rows': '行',
    'grid.selected': '已选择',

    // ========== 排序 ==========
    'sort.ascending': '升序排列',
    'sort.descending': '降序排列',
    'sort.noSort': '点击排序',

    // ========== 筛选 ==========
    'filter.click': '点击筛选',

    // ========== 列操作 ==========
    'col.drag': '拖拽移动列',
    'col.menu': '列菜单',
    'col.sortAZ': '排序 A → Z',
    'col.sortZA': '排序 Z → A',
    'col.clearSort': '清除排序',
    'col.filter': '筛选',
    'col.pin': '固定列',
    'col.unpin': '取消固定',
    'col.pinLeft': '固定到左侧',
    'col.pinRight': '固定到右侧',
    'col.autoSize': '自适应此列',
    'col.autoSizeAll': '自适应所有列',
    'col.hide': '隐藏此列',
    'col.show': '显示此列',
    'col.columns': '列显隐',
    'col.reset': '重置列',

    // ========== Grid Menu 排序 ==========
    'menu.sortAsc': '升序排列',
    'menu.sortDesc': '降序排列',
    'menu.clearSort': '清除排序',
    'menu.filter': '筛选',
    'menu.pin': '固定列',
    'menu.pinLeft': '固定到左侧',
    'menu.pinRight': '固定到右侧',
    'menu.unpin': '取消固定',
    'menu.autoSize': '自适应此列',
    'menu.autoSizeAll': '自适应所有列',
    'menu.hide': '隐藏此列',
    'menu.columns': '列显隐',
    'menu.reset': '重置列',

    // ========== 右键菜单 ==========
    'menu.copyCell': '复制单元格',
    'menu.copyRow': '复制整行',
    'menu.editCell': '编辑单元格',
    'menu.selectRow': '选择此行',
    'menu.clearSelection': '清除选择',
    'menu.pinRow': '固定行',
    'menu.unpinRow': '取消固定行',

    // ========== 树形 ==========
    'tree.expand': '展开',
    'tree.collapse': '折叠',
    'tree.toggle': '切换',

    // ========== 分组 ==========
    'group.expand': '展开分组',
    'group.collapse': '折叠分组',
    'group.toggle': '切换分组',
    'group.expandAll': '展开所有分组',
    'group.collapseAll': '折叠所有分组',

    // ========== 聚合 ==========
    'agg.sum': '求和',
    'agg.avg': '平均值',
    'agg.min': '最小值',
    'agg.max': '最大值',
    'agg.count': '计数',

    // ========== 单元格合并 ==========
    'cellSpan.autoMerge': '自动合并',
    'cellSpan.manual': '手动设置',
    'cellSpan.clear': '清除合并',

    // ========== 筛选器 ==========
    'filter.search': '搜索...',
    'filter.apply': '应用',
    'filter.clear': '清除',
    'filter.reset': '重置',
    'filter.contains': '包含',
    'filter.equals': '等于',
    'filter.startsWith': '开头是',
    'filter.endsWith': '结尾是',
    'filter.lessThan': '小于',
    'filter.greaterThan': '大于',
    'filter.inRange': '范围内',
    'filter.selectAll': '全选',
    'filter.selectNone': '取消全选',

    // ========== 编辑器 ==========
    'editor.true': '是',
    'editor.false': '否',
    'editor.selectOptions': '请选择...',
  },
};

@Injectable()
export class I18nService {
  /** 当前语言 */
  locale = signal<Locale>('en');

  constructor() {
    // 自动检测浏览器语言
    const browserLang = navigator.language?.toLowerCase() || '';
    if (browserLang.startsWith('zh')) {
      this.locale.set('zh');
    }
  }

  /** 翻译一个 key */
  t(key: string): string {
    const lang = this.locale();
    return translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
  }

  /** 设置语言 */
  setLocale(locale: Locale): void {
    this.locale.set(locale);
  }

  /** 获取当前语言 */
  getLocale(): Locale {
    return this.locale();
  }

  /** 获取所有支持的语言 */
  getSupportedLocales(): Locale[] {
    return ['en', 'zh'];
  }

  /** 获取语言显示名 */
  getLocaleDisplayName(locale: Locale): string {
    const names: Record<Locale, string> = {
      en: 'English',
      zh: '中文',
    };
    return names[locale] ?? locale;
  }
}
