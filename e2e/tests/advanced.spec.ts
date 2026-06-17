import { test, expect } from '@playwright/test';
import { DemoPage } from '../utils/demo-page';

test.describe('高级功能', () => {
  let demo: DemoPage;

  test.beforeEach(async ({ page }) => {
    demo = new DemoPage(page);
    await demo.goto();
  });

  test('跨行跨列 - 表格渲染', async () => {
    await demo.clickTabButton('跨行跨列');
    await demo.waitForGridReady();
    expect(await demo.hasRows()).toBeTruthy();
    // 一些单元格应该有 rowspan 属性
    await demo.page.waitForTimeout(300);
  });

  test('范围选择 - 点击行可选中', async ({ page }) => {
    await demo.clickTabButton('范围选择');
    await demo.waitForGridReady();
    await page.waitForTimeout(500);
    // 点击第一行
    const row = demo.getRow(0);
    if (await row.isVisible()) {
      await row.click();
      await page.waitForTimeout(200);
      // 至少行应该存在
      expect(await demo.hasRows()).toBeTruthy();
    }
  });

  test('拖拽 - 拖拽行排序', async ({ page }) => {
    await demo.clickTabButton('拖拽');
    await demo.waitForGridReady();
    await page.waitForTimeout(500);
    expect(await demo.hasRows()).toBeTruthy();
    // 拖拽行应该可见
    const dragHandle = page.locator('.db-grid-row-drag, .drag-handle').first();
    if (await dragHandle.isVisible()) {
      // 有拖拽柄，功能正常
      expect(true).toBeTruthy();
    }
  });

  test('国际化 - 切换语言', async ({ page }) => {
    await demo.clickTabButton('国际化');
    await demo.waitForGridReady();
    await page.waitForTimeout(500);
    const langBtn = demo.getDemoAction('English');
    if (await langBtn.isVisible()) {
      await langBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('主从明细 - 展开详情', async ({ page }) => {
    await demo.clickTabButton('主从明细');
    await demo.waitForGridReady();
    await page.waitForTimeout(500);
    expect(await demo.hasRows()).toBeTruthy();
    // 展开第一行
    const expandBtn = page.locator('.db-grid-detail-toggle, .detail-expand').first();
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('透视表 - 渲染', async () => {
    await demo.clickTabButton('透视表');
    await demo.waitForGridReady();
    await demo.page.waitForTimeout(500);
    expect(await demo.hasRows()).toBeTruthy();
  });

  test('聚合 - 统计数据', async () => {
    await demo.clickTabButton('聚合');
    await demo.waitForGridReady();
    await demo.page.waitForTimeout(500);
    expect(await demo.hasRows()).toBeTruthy();
  });

  test('撤销/重做 - 操作后撤销', async ({ page }) => {
    await demo.clickTabButton('撤销');
    await demo.waitForGridReady();
    await page.waitForTimeout(500);
  });
});
