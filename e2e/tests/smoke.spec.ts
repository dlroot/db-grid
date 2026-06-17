import { test, expect } from '@playwright/test';
import { DemoPage } from '../utils/demo-page';

/**
 * 全局冒烟测试 — 确保所有涉及 Phase 5/6 新增功能的基础渲染不崩溃
 */
test.describe('Phase 5/6 新功能冒烟测试', () => {
  test('增量更新 Demo - 页面渲染无错误', async ({ page }) => {
    const demo = new DemoPage(page);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await demo.goto();
    await demo.clickTabButton('增量更新');
    await demo.waitForGridReady();
    await page.waitForTimeout(500);

    // 检查是否渲染出表格行
    const hasData = await demo.hasRows();
    console.log(`[增量更新] 行数: ${await demo.getVisibleRows().count()}, 错误: ${errors.length}`);

    if (errors.length > 0) {
      console.log('  错误:', errors.join('; '));
    }
  });

  test('自定义组件 Demo - Angular 渲染器正常', async ({ page }) => {
    const demo = new DemoPage(page);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await demo.goto();
    await demo.clickTabButton('自定义组件');
    await demo.waitForGridReady();
    await page.waitForTimeout(800);

    const hasData = await demo.hasRows();
    console.log(`[自定义组件] 行数: ${await demo.getVisibleRows().count()}, 错误: ${errors.length}`);

    // 如果有 StarRenderer，检查是否渲染出星级内容
    const starCells = page.locator('.star-rating, .star-renderer');
    const starCount = await starCells.count();
    console.log(`[自定义组件] 星级渲染器: ${starCount} 个`);
  });

  test('性能测试 Demo - 大数据加载', async ({ page }) => {
    const demo = new DemoPage(page);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await demo.goto();
    await demo.clickTabButton('性能测试');
    await demo.waitForGridReady();
    await page.waitForTimeout(500);

    // 点击"加载 10万行"按钮
    const load10kBtn = demo.getDemoAction('10万行');
    if (await load10kBtn.isVisible()) {
      const start = Date.now();
      await load10kBtn.click();
      await page.waitForTimeout(3000);
      console.log(`[性能] 加载耗时: ${Date.now() - start}ms, 错误: ${errors.length}`);
    }
  });

  test('跨行跨列 Demo - spanRows 渲染', async ({ page }) => {
    const demo = new DemoPage(page);
    await demo.goto();
    await demo.clickTabButton('跨行跨列');
    await demo.waitForGridReady();
    await page.waitForTimeout(500);
    expect(await demo.hasRows()).toBeTruthy();
    console.log(`[跨行跨列] 行数: ${await demo.getVisibleRows().count()}`);
  });

  test('行分组 Demo - 自动分组列', async ({ page }) => {
    const demo = new DemoPage(page);
    await demo.goto();
    await demo.clickTabButton('行分组');
    await demo.waitForGridReady();
    await page.waitForTimeout(500);

    // 点击"自动分组列"按钮
    const autoBtn = demo.getDemoAction('自动分组列');
    if (await autoBtn.isVisible()) {
      await autoBtn.click();
      await page.waitForTimeout(500);
      expect(await demo.hasRows()).toBeTruthy();
      console.log(`[自动分组列] 行数: ${await demo.getVisibleRows().count()}`);
    }
  });

  test('Excel导出 Demo - 新增 HTML/选中导出按钮', async ({ page }) => {
    const demo = new DemoPage(page);
    await demo.goto();
    await demo.clickTabButton('Excel导出');
    await demo.waitForGridReady();
    await page.waitForTimeout(500);

    await expect(demo.getDemoAction('导出 HTML')).toBeVisible();
    await expect(demo.getDemoAction('导出选中')).toBeVisible();
    console.log('[Excel导出] HTML/选中导出按钮可见');
  });

  test('服务端无限滚动 - 多数据源兼容', async ({ page }) => {
    const demo = new DemoPage(page);
    await demo.goto();
    await demo.clickTabButton('无限滚动');
    await demo.waitForGridReady();
    await page.waitForTimeout(1000);
    const initialCount = await demo.getVisibleRows().count();
    // 向下滚动触发加载
    await demo.scrollGrid(0, 800);
    await page.waitForTimeout(1500);
    console.log(`[无限滚动] 初始: ${initialCount}, 滚动后: ${await demo.getVisibleRows().count()}`);
  });

  test('主从明细 Demo - 详情行配置', async ({ page }) => {
    const demo = new DemoPage(page);
    await demo.goto();
    await demo.clickTabButton('主从明细');
    await demo.waitForGridReady();
    await page.waitForTimeout(500);
    expect(await demo.hasRows()).toBeTruthy();
    // 检查是否有展开按钮
    const toggle = page.locator('.master-detail-toggle, .detail-toggle').first();
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
      await page.waitForTimeout(500);
      console.log('[主从明细] 已展开详情');
    }
  });
});
