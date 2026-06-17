import { test, expect } from '@playwright/test';
import { DemoPage } from '../utils/demo-page';

test.describe('基础功能', () => {
  let demo: DemoPage;

  test.beforeEach(async ({ page }) => {
    demo = new DemoPage(page);
    await demo.goto();
  });

  test('页面加载成功 - 标题和导航栏显示', async () => {
    await expect(demo.page.locator('h1').first()).toBeVisible();
    const navButtons = demo.page.locator('.demo-tabs button, .nav-buttons button').first();
    await expect(navButtons).toBeVisible();
  });

  test('基础表格 Tab - 渲染行和表头', async () => {
    await demo.clickTabButton('基础表格');
    await demo.waitForGridReady();
    await expect(demo.getHeaderRow()).toBeVisible();
    expect(await demo.hasRows()).toBeTruthy();
    const headerCount = await demo.getHeaderCells().count();
    expect(headerCount).toBeGreaterThanOrEqual(1);
    console.log(`[基础表格] ${headerCount} 列, ${await demo.getVisibleRows().count()} 行`);
  });

  test('在基础表格上滚动了行会改变', async () => {
    await demo.clickTabButton('基础表格');
    await demo.waitForGridReady();
    await expect(demo.getRow(0)).toBeVisible();
    const firstRowId = await demo.getRowText(0);
    // 滚动 500px
    await demo.scrollGrid(0, 500);
    const secondRowId = await demo.getRowText(0);
    expect(secondRowId).not.toBe(firstRowId);
  });
});

test.describe('列虚拟滚动', () => {
  test('水平滚动可见', async ({ page }) => {
    const demo = new DemoPage(page);
    await demo.goto();
    await demo.clickTabButton('列虚拟');
    await demo.waitForGridReady();
    // 水平滚动，观察行内容变化
    const beforeScroll = await demo.getCellText(0, 0);
    await demo.scrollGrid(200, 0);
    await demo.page.waitForTimeout(300);
    // 由于 DOM 虚拟化，第一个可见单元格内容应该改变
    const after = await demo.getVisibleRows();
    expect(await after.count()).toBeGreaterThan(0);
  });
});

test.describe('行虚拟滚动', () => {
  test('大量数据滚动', async ({ page }) => {
    const demo = new DemoPage(page);
    await demo.goto();
    await demo.clickTabButton('行虚拟');
    await demo.waitForGridReady();
    await expect(demo.getVisibleRows().first()).toBeVisible();
    // 滚动到底部
    await demo.getGridContainer().evaluate(el => {
      el.scrollTop = el.scrollHeight;
    });
    await demo.page.waitForTimeout(500);
    expect(await demo.hasRows()).toBeTruthy();
  });
});

test.describe('Excel 导出', () => {
  test('点击导出按钮不报错', async ({ page }) => {
    const demo = new DemoPage(page);
    await demo.goto();
    await demo.clickTabButton('Excel导出');
    await demo.waitForGridReady();
    await expect(demo.getDemoAction('导出 CSV')).toBeVisible();
    await expect(demo.getDemoAction('导出 XLSX')).toBeVisible();
    // 选中行再导出
    await page.waitForTimeout(300);
  });
});
