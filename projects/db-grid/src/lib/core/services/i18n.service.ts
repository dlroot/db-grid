/**
 * 国际化服务
 * 支持 en / zh / ja / ko 四种语言
 */

import { Injectable, signal } from '@angular/core';

export type Locale = 'en' | 'zh' | 'ja' | 'ko';

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

  ja: {
    // ========== Grid 基礎 ==========
    'grid.loading': '読み込み中...',
    'grid.noRows': 'データがありません',
    'grid.rows': '行',
    'grid.selected': '選択中',

    // ========== ソート ==========
    'sort.ascending': '昇順',
    'sort.descending': '降順',
    'sort.noSort': 'クリックでソート',

    // ========== フィルタ ==========
    'filter.click': 'クリックでフィルタ',

    // ========== 列操作 ==========
    'col.drag': 'ドラッグで列移動',
    'col.menu': '列メニュー',
    'col.sortAZ': 'A → Z でソート',
    'col.sortZA': 'Z → A でソート',
    'col.clearSort': 'ソート解除',
    'col.filter': 'フィルタ',
    'col.pin': '列を固定',
    'col.unpin': '固定解除',
    'col.pinLeft': '左に固定',
    'col.pinRight': '右に固定',
    'col.autoSize': 'この列に合わせる',
    'col.autoSizeAll': '全ての列に合わせる',
    'col.hide': 'この列を隠す',
    'col.show': 'この列を表示',
    'col.columns': '列',
    'col.reset': '列をリセット',

    // ========== Grid Menu ソート ==========
    'menu.sortAsc': '昇順',
    'menu.sortDesc': '降順',
    'menu.clearSort': 'ソート解除',
    'menu.filter': 'フィルタ',
    'menu.pin': '列を固定',
    'menu.pinLeft': '左に固定',
    'menu.pinRight': '右に固定',
    'menu.unpin': '固定解除',
    'menu.autoSize': 'この列に合わせる',
    'menu.autoSizeAll': '全ての列に合わせる',
    'menu.hide': 'この列を隠す',
    'menu.columns': '列の表示',
    'menu.reset': '列をリセット',

    // ========== 右クリックメニュー ==========
    'menu.copyCell': 'セルをコピー',
    'menu.copyRow': '行をコピー',
    'menu.editCell': 'セルを編集',
    'menu.selectRow': '行を選択',
    'menu.clearSelection': '選択を解除',
    'menu.pinRow': '行を固定',
    'menu.unpinRow': '行の固定解除',

    // ========== ツリー ==========
    'tree.expand': '展開',
    'tree.collapse': '折りたたむ',
    'tree.toggle': '切り替え',

    // ========== グループ ==========
    'group.expand': 'グループを展開',
    'group.collapse': 'グループを折りたたむ',
    'group.toggle': 'グループを切り替え',
    'group.expandAll': '全てのグループを展開',
    'group.collapseAll': '全てのグループを折りたたむ',

    // ========== 集計 ==========
    'agg.sum': '合計',
    'agg.avg': '平均',
    'agg.min': '最小',
    'agg.max': '最大',
    'agg.count': '件数',

    // ========== セル結合 ==========
    'cellSpan.autoMerge': '自動結合',
    'cellSpan.manual': '手動結合',
    'cellSpan.clear': '結合をクリア',

    // ========== フィルタ ==========
    'filter.search': '検索...',
    'filter.apply': '適用',
    'filter.clear': 'クリア',
    'filter.reset': 'リセット',
    'filter.contains': '含む',
    'filter.equals': '等しい',
    'filter.startsWith': '始まる',
    'filter.endsWith': '終わる',
    'filter.lessThan': 'より小さい',
    'filter.greaterThan': 'より大きい',
    'filter.inRange': '範囲内',
    'filter.selectAll': '全て選択',
    'filter.selectNone': '選択解除',

    // ========== エディタ ==========
    'editor.true': 'はい',
    'editor.false': 'いいえ',
    'editor.selectOptions': '選択してください...',
  },

  ko: {
    // ========== Grid 기초 ==========
    'grid.loading': '로딩 중...',
    'grid.noRows': '데이터 없음',
    'grid.rows': '행',
    'grid.selected': '선택됨',

    // ========== 정렬 ==========
    'sort.ascending': '오름차순',
    'sort.descending': '내림차순',
    'sort.noSort': '클릭하여 정렬',

    // ========== 필터 ==========
    'filter.click': '클릭하여 필터',

    // ========== 열 작업 ==========
    'col.drag': '드래그하여 열 이동',
    'col.menu': '열 메뉴',
    'col.sortAZ': 'A → Z 정렬',
    'col.sortZA': 'Z → A 정렬',
    'col.clearSort': '정렬 해제',
    'col.filter': '필터',
    'col.pin': '열 고정',
    'col.unpin': '고정 해제',
    'col.pinLeft': '왼쪽에 고정',
    'col.pinRight': '오른쪽에 고정',
    'col.autoSize': '이 열에 맞춤',
    'col.autoSizeAll': '모든 열에 맞춤',
    'col.hide': '이 열 숨기기',
    'col.show': '이 열 표시',
    'col.columns': '열',
    'col.reset': '열 초기화',

    // ========== Grid Menu 정렬 ==========
    'menu.sortAsc': '오름차순',
    'menu.sortDesc': '내림차순',
    'menu.clearSort': '정렬 해제',
    'menu.filter': '필터',
    'menu.pin': '열 고정',
    'menu.pinLeft': '왼쪽에 고정',
    'menu.pinRight': '오른쪽에 고정',
    'menu.unpin': '고정 해제',
    'menu.autoSize': '이 열에 맞춤',
    'menu.autoSizeAll': '모든 열에 맞춤',
    'menu.hide': '이 열 숨기기',
    'menu.columns': '열 표시',
    'menu.reset': '열 초기화',

    // ========== 우클릭 메뉴 ==========
    'menu.copyCell': '셀 복사',
    'menu.copyRow': '행 복사',
    'menu.editCell': '셀 편집',
    'menu.selectRow': '행 선택',
    'menu.clearSelection': '선택 해제',
    'menu.pinRow': '행 고정',
    'menu.unpinRow': '행 고정 해제',

    // ========== 트리 ==========
    'tree.expand': '펼치기',
    'tree.collapse': '접기',
    'tree.toggle': '토글',

    // ========== 그룹 ==========
    'group.expand': '그룹 펼치기',
    'group.collapse': '그룹 접기',
    'group.toggle': '그룹 토글',
    'group.expandAll': '모든 그룹 펼치기',
    'group.collapseAll': '모든 그룹 접기',

    // ========== 집계 ==========
    'agg.sum': '합계',
    'agg.avg': '평균',
    'agg.min': '최소',
    'agg.max': '최대',
    'agg.count': '개수',

    // ========== 셀 병합 ==========
    'cellSpan.autoMerge': '자동 병합',
    'cellSpan.manual': '수동 병합',
    'cellSpan.clear': '병합 해제',

    // ========== 필터 ==========
    'filter.search': '검색...',
    'filter.apply': '적용',
    'filter.clear': '지우기',
    'filter.reset': '초기화',
    'filter.contains': '포함',
    'filter.equals': '같음',
    'filter.startsWith': '시작',
    'filter.endsWith': '끝',
    'filter.lessThan': '작음',
    'filter.greaterThan': '큼',
    'filter.inRange': '범위',
    'filter.selectAll': '전체 선택',
    'filter.selectNone': '선택 해제',

    // ========== 편집기 ==========
    'editor.true': '예',
    'editor.false': '아니오',
    'editor.selectOptions': '옵션을 선택하세요...',
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

  /** 翻译一个 key（支持自定义翻译覆盖） */
  t(key: string): string {
    const lang = this.getLocale();
    const custom = this.customTranslations.get(lang);
    if (custom?.[key]) return custom[key];
    const translationsRecord = translations as Record<string, Record<string, string>>;
    return translationsRecord[lang]?.[key] ?? translationsRecord['en']?.[key] ?? key;
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
      ja: '日本語',
      ko: '한국어',
    };
    return names[locale] ?? locale;
  }

  // ========== 自定义语言包 ==========

  /** 自定义翻译覆盖（用户注册的额外翻译） */
  private customTranslations: Map<string, Record<string, string>> = new Map();

  /** 自定义 Locale 注册表 */
  private customLocales: Map<string, { name: string; rtl?: boolean }> = new Map();

  /**
   * 注册自定义语言包
   * @param locale - 语言标识（如 'fr', 'de', 'pt-BR'）
   * @param translations - 翻译键值对
   * @param displayName - 语言显示名（如 'Français'）
   * @param rtl - 是否为 RTL 语言
   */
  registerLocale(
    locale: string,
    translations: Record<string, string>,
    displayName?: string,
    rtl?: boolean
  ): void {
    this.customTranslations.set(locale, translations);
    this.customLocales.set(locale, { name: displayName || locale, rtl });
  }

  /**
   * 注册自定义翻译覆盖（覆盖内置翻译中的特定 key）
   * @param locale - 要覆盖的语言标识
   * @param translations - 要覆盖的翻译键值对
   */
  registerTranslations(locale: string, translations: Record<string, string>): void {
    if (this.customTranslations.has(locale)) {
      Object.assign(this.customTranslations.get(locale)!, translations);
    } else {
      this.customTranslations.set(locale, translations);
    }
  }

  /** 注销自定义语言包 */
  unregisterLocale(locale: string): void {
    this.customTranslations.delete(locale);
    this.customLocales.delete(locale);
  }

  /** 获取所有已注册的语言标识（内置 + 自定义） */
  getAllLocales(): string[] {
    const builtIn: string[] = ['en', 'zh', 'ja', 'ko'];
    const custom = Array.from(this.customLocales.keys());
    return [...builtIn, ...custom];
  }

  /** 获取语言显示名（支持自定义语言） */
  getLocaleName(locale: string): string {
    const builtIn: Record<string, string> = { en: 'English', zh: '中文', ja: '日本語', ko: '한국어' };
    if (builtIn[locale]) return builtIn[locale];
    return this.customLocales.get(locale)?.name ?? locale;
  }

  // ========== RTL 支持 ==========

  /** 检查指定语言是否为 RTL */
  isRtl(locale?: string): boolean {
    const lang = locale || this.getLocale();
    // 内置 RTL 语言
    const builtInRtl = ['ar', 'he', 'fa', 'ur'];
    if (builtInRtl.some(rtl => lang.startsWith(rtl))) return true;
    // 自定义 RTL 语言
    return this.customLocales.get(lang)?.rtl ?? false;
  }

  /** 获取当前语言方向 */
  getDirection(): 'ltr' | 'rtl' {
    return this.isRtl() ? 'rtl' : 'ltr';
  }

  /** 获取所有支持的语言（含自定义） */
  getSupportedLocalesAll(): string[] {
    return this.getAllLocales();
  }
}
