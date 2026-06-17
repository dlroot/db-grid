/**
 * DB Grid E2E 测试运行器（独立版，无需 @playwright/test）
 * 
 * 用法：
 *   node e2e/runner.mjs
 *   node e2e/runner.mjs --tab 基础表格
 *   node e2e/runner.mjs --smoke
 */

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

// 所有 Demo Tab
const ALL_TABS = [
  '基础表格', '列虚拟', '行虚拟', 'Excel导出',
  '行分组', '列分组', '服务端模式', '无限滚动',
  '跨行跨列', '范围选择', '拖拽', '树形数据',
  '增量更新', '自定义组件', '性能测试',
  '主从明细', '图表', '迷你图', '撤销',
  '国际化', '填充柄', '聚合', '透视表', '列类型',
];

// Phase 5/6 新功能冒烟优先
const SMOKE_TABS = [
  '增量更新', '自定义组件', '性能测试',
  '行分组', 'Excel导出', '无限滚动',
  '跨行跨列', '主从明细',
];

class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.errors = [];
  }

  async runAll(smokeOnly = false, specificTab = null) {
    const tabs = specificTab ? [specificTab] : (smokeOnly ? SMOKE_TABS : ALL_TABS);

    console.log(`🧪 DB Grid E2E 测试 (${smokeOnly ? '冒烟' : '完整'}模式)`);
    console.log(`   测试 ${tabs.length} 个 Tab\n`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

    for (const tabName of tabs) {
      await this.testTab(context, tabName);
    }

    await browser.close();
    this.printReport();
  }

  async testTab(context, tabName) {
    const page = await context.newPage();
    const pageErrors = [];

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    console.log(`  📋 [${tabName}] `, '');

    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 20000 });
    } catch (err) {
      console.log(`❌ 页面加载失败: ${err.message}`);
      this.failed++;
      this.errors.push({ tab: tabName, error: err.message });
      await page.close();
      return;
    }

    // 点击 Tab
    const tabBtn = page.locator('button').filter({ hasText: tabName });
    const tabVisible = await tabBtn.isVisible().catch(() => false);
    if (!tabVisible) {
      console.log(`⚠️  Tab 按钮不可见`);
      await page.close();
      return;
    }

    await tabBtn.click();
    await page.waitForTimeout(800);

    // 检查表格是否渲染
    const gridContainer = page.locator('.db-grid-container');
    const gridVisible = await gridContainer.isVisible().catch(() => false);

    const hasRows = await page.locator('.db-grid-row').count();
    const hasHeaders = await page.locator('.db-grid-header-cell').count();

    // 收集结果
    const result = {
      gridRender: gridVisible ? '✅' : '❌',
      rows: hasRows,
      headers: hasHeaders,
      errors: pageErrors.length,
    };

    const status = gridVisible && hasRows > 0 ? '✅' : '⚠️';
    console.log(`  ${status} 网格:${result.gridRender} 行:${result.rows} 表头:${result.headers} 错误:${result.errors}`);

    if (pageErrors.length > 0) {
      this.errors.push({ tab: tabName, errors: pageErrors });
      this.failed++;
    } else if (gridVisible && hasRows > 0) {
      this.passed++;
    } else {
      this.failed++;
    }

    await page.close();
  }

  printReport() {
    console.log('\n═══════════════════════════════');
    console.log('📊 测试报告');
    console.log('═══════════════════════════════');
    console.log(`✅ 通过: ${this.passed}`);
    console.log(`❌ 失败: ${this.failed}`);
    console.log(`📝 总计: ${this.passed + this.failed}`);

    if (this.errors.length > 0) {
      console.log('\n⚠️ 错误详情:');
      for (const err of this.errors) {
        console.log(`  [${err.tab}] ${err.error || (err.errors || []).join('; ')}`);
      }
    }

    console.log('\n' + (this.failed === 0 ? '🎉 全部通过!' : `🛠️  ${this.failed} 个需要修复`));
  }
}

// CLI 入口
const args = process.argv.slice(2);
const smokeOnly = args.includes('--smoke');
const tabIndex = args.indexOf('--tab');
const specificTab = tabIndex >= 0 ? args[tabIndex + 1] : null;

const runner = new TestRunner();
runner.runAll(smokeOnly, specificTab).catch(console.error);
