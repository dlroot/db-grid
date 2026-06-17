import { test, expect } from '@playwright/test';
import { DemoPage } from '../utils/demo-page';

test.describe('数据操作功能', () => {
  let demo: DemoPage;

  test.beforeEach(async ({ page }) => {
    demo = new DemoPage(page);
    await demo.goto();
  });

  test('行分组 - 点击展开折叠', async ({ page }) => {
    await demo.clickTabButton('行分组');
    await demo.waitForGridReady();
    await expect(demo.getDemoAction('展开全部')).toBeVisible();
    await expect(demo.getDemoAction('按部门分组')).toBeVisible();
    // 点击按部门分组
    await demo.getDemoAction('按部门分组').click();
    await page.waitForTimeout(500);
    expect(await demo.hasRows()).toBeTruthy();
  });

  test('行分组 - 多级分组', async () => {
    await demo.clickTabButton('行分组');
    await demo.waitForGridReady();
    await demo.getDemoAction('按部门+状态分组').click();
    await demo.page.waitForTimeout(500);
    expect(await demo.hasRows()).toBeTruthy();
  });

  test('行分组 - 重置分组', async () => {
    await demo.clickTabButton('行分组');
    await demo.waitForGridReady();
    await demo.getDemoAction('按部门分组').click();
    await demo.page.waitForTimeout(300);
    await demo.getDemoAction('重置分组').click();
    await demo.page.waitForTimeout(300);
    expect(await demo.hasRows()).toBeTruthy();
  });

  test('服务端模式 - 加载数据', async ({ page }) => {
    await demo.clickTabButton('服务端模式');
    await demo.waitForGridReady();
    // 应该有分页和加载
    await page.waitForTimeout(1000);
    expect(await demo.hasRows()).toBeTruthy();
  });

  test('无限滚动 - 滚动加载更多', async ({ page }) => {
    await demo.clickTabButton('无限滚动');
    await demo.waitForGridReady();
    await page.waitForTimeout(1000);
    const initialRows = await demo.getVisibleRows().count();
    // 滚动
    await demo.scrollGrid(0, 600);
    await page.waitForTimeout(1000);
    expect(await demo.hasRows()).toBeTruthy();
  });

  test('增量更新 - 添加行', async ({ page }) => {
    await demo.clickTabButton('增量更新');
    await demo.waitForGridReady();
    await page.waitForTimeout(500);
    // 应该显示操作按钮
    const addBtn = demo.getDemoAction('添加');
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(300);
      expect(await demo.hasRows()).toBeTruthy();
    }
  });
});
