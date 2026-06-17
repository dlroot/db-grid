import { Page, Locator } from '@playwright/test';

/**
 * DB Grid Demo 页面的 Page Object
 * 封装所有交互操作，便于测试复用
 */
export class DemoPage {
  readonly page: Page;

  // 导航按钮映射
  private readonly DEMO_BUTTONS: Record<string, string> = {
    basic: '基础表格',
    colvirtual: '列虚拟滚动',
    rowvirtual: '行虚拟滚动',
    excel: 'Excel导出',
    'excel-import': 'Excel导入',
    group: '行分组',
    colgroup: '列分组',
    pivot: '透视表',
    agg: '聚合',
    tree: '树形数据',
    server: '服务端模式',
    infinite: '无限滚动',
    span: '跨行跨列',
    range: '范围选择',
    drag: '拖拽',
    filter: '筛选',
    sort: '排序',
    edit: '编辑',
    clipboard: '剪贴板',
    chart: '图表',
    master: '主从明细',
    sparkline: '迷你图',
    undo: '撤销',
    theme: '主题',
    keyboard: '键盘导航',
    accessibility: '无障碍',
    pdf: 'PDF导出',
    i18n: '国际化',
    coltypes: '列类型',
    fillhandle: '填充柄',
    cellspan: '单元格合并',
    columnmenu: '列菜单',
    contextmenu: '右键菜单',
    pinning: '冻结列',
    rowwdrag: '行拖拽',
    statusbar: '状态栏',
    tooltip: '提示框',
    overlay: '遮罩层',
    sidebarb: '侧边栏',
    transaction: '增量更新',
    'angular-renderer': '自定义组件',
    performance: '性能测试',
    rowpin: '行固定',
    centerpin: '居中冻结',
    serverinfinite: '服务端无限',
    clipboardexport: '剪贴板导出',
    columnreorder: '列重排',
    autocol: '自动列宽',
    cellrenderer: '单元格渲染',
    tree_data: '树形数据',
    rowhighlight: '行高亮',
    detailcell: '明细单元格',
    columnfilter: '列筛选',
    headerfilter: '表头筛选',
    quickfilter: '快速筛选',
    externalfilter: '外部筛选',
    pivotdesigner: '透视表设计器',
    pivotchart: '透视表图表',
    chartbuilder: '图表构建器',
    chartrange: '图表范围',
    sparklinecustom: '自定义迷你图',
    imageloading: '图片懒加载',
    loadingoverlay: '加载遮罩',
    noRowsOverlay: '空数据遮罩',
  };

  constructor(page: Page) {
    this.page = page;
  }

  /** 导航到 Demo 页面 */
  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  /** 切换到某个 Demo Tab */
  async switchDemo(demoName: string): Promise<void> {
    const button = this.page.locator(`button:has-text("${this.getButtonText(demoName)}")`);
    await button.click();
    await this.page.waitForTimeout(500); // 等待组件渲染
  }

  private getButtonText(demoName: string): string {
    const map: Record<string, string> = {
      basic: '基础表格',
      transaction: '增量更新',
      'angular-renderer': '自定义组件',
      performance: '性能测试',
      excel: 'Excel导出',
      group: '行分组',
      server: '服务端模式',
      infinite: '无限滚动',
      span: '跨行跨列',
      range: '范围选择',
      drag: '拖拽',
      tree: '树形数据',
      pivot: '透视表',
      agg: '聚合',
      master: '主从明细',
      chart: '图表',
      sparkline: '迷你图',
      undo: '撤销',
      i18n: '国际化',
      colvirtual: '列虚拟',
      rowvirtual: '行虚拟',
      colgroup: '列分组',
      fillhandle: '填充柄',
      clipboard: '剪贴板',
      pdf: 'PDF导出',
      filter: '筛选',
      sort: '排序',
      edit: '编辑',
      keyboard: '键盘',
      accessibility: '无障碍',
      coltypes: '列类型',
      edit: '编辑',
      rowpin: '行固定',
    };
    return map[demoName] || demoName;
  }

  /** 获取 db-grid 组件 */
  getGrid(): Locator {
    return this.page.locator('db-grid').first();
  }

  /** 获取网格容器 */
  getGridContainer(): Locator {
    return this.page.locator('.db-grid-container').first();
  }

  /** 获取表头行 */
  getHeaderRow(): Locator {
    return this.page.locator('.db-grid-header-row').first();
  }

  /** 获取表头单元格 */
  getHeaderCells(): Locator {
    return this.page.locator('.db-grid-header-cell');
  }

  /** 获取第 N 个表头 */
  getHeaderCell(index: number): Locator {
    return this.page.locator('.db-grid-header-cell').nth(index);
  }

  /** 获取所有可见行 */
  getVisibleRows(): Locator {
    return this.page.locator('.db-grid-row');
  }

  /** 获取第 N 行 */
  getRow(index: number): Locator {
    return this.page.locator('.db-grid-row').nth(index);
  }

  /** 获取 Demo 面板描述 */
  getDemoDesc(): Locator {
    return this.page.locator('.demo-desc');
  }

  /** 检查表格是否有行数据 */
  async hasRows(): Promise<boolean> {
    const count = await this.getVisibleRows().count();
    return count > 0;
  }

  /** 获取 Demo 操作按钮 */
  getDemoAction(text: string): Locator {
    return this.page.locator('.demo-actions button, .demo-actions .btn').filter({ hasText: text });
  }

  /** 等待网格加载完成 */
  async waitForGridReady(): Promise<void> {
    await this.page.waitForSelector('.db-grid-container', { timeout: 15000 });
    await this.page.waitForTimeout(300);
  }

  /** 点击表格下方某按钮 */
  async clickTabButton(text: string): Promise<void> {
    await this.page.locator('.demo-tabs button, .nav-buttons button').filter({ hasText: text }).click();
    await this.page.waitForTimeout(300);
  }

  /** 滚动表格 */
  async scrollGrid(deltaX: number, deltaY: number): Promise<void> {
    await this.getGridContainer().evaluate((el, { dx, dy }) => {
      el.scrollBy(dx, dy);
    }, { dx: deltaX, dy: deltaY });
    await this.page.waitForTimeout(200);
  }

  /** 获取表格中某行的文本内容 */
  async getRowText(rowIndex: number): Promise<string> {
    return (await this.getRow(rowIndex).textContent()) || '';
  }

  /** 检查是否存在错误 */
  async hasErrors(): Promise<boolean> {
    // 检查控制台是否有未捕获错误
    const errors = await this.page.evaluate(() => {
      return (window as any).__e2eErrors || [];
    }).catch(() => []);
    return errors.length > 0;
  }

  /** 获取当前 Demo 标题 */
  async getDemoTitle(): Promise<string> {
    const title = this.page.locator('.demo-header h2');
    if (await title.isVisible()) {
      return (await title.textContent()) || '';
    }
    return '';
  }

  /** 检查图表是否存在 */
  async hasChart(): Promise<boolean> {
    const canvas = this.page.locator('canvas');
    return (await canvas.count()) > 0;
  }

  /** 获取指定行列的单元格文本 */
  async getCellText(rowIndex: number, colIndex: number): Promise<string> {
    const cell = this.page.locator(`.db-grid-row:nth-child(${rowIndex + 1}) .db-grid-cell`).nth(colIndex);
    if (await cell.isVisible()) {
      return (await cell.textContent()) || '';
    }
    return '';
  }

  /** 获取第 N 个单元格 */
  getCell(rowIndex: number, colIndex: number): Locator {
    return this.page.locator(`.db-grid-row:nth-child(${rowIndex + 1}) .db-grid-cell`).nth(colIndex);
  }
}
