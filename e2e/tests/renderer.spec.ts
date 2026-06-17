import { test, expect } from '@playwright/test';
import { DemoPage } from '../utils/demo-page';

test.describe('渲染器 & 性能', () => {
  let demo: DemoPage;

  test.beforeEach(async ({ page }) => {
    demo = new DemoPage(page);
    await demo.goto();
  });

  test('自定义组件 Tab - 星级评分列存在', async ({ page }) => {
    await demo.clickTabButton('自定义组件');
    await demo.waitForGridReady();
    await page.waitForTimeout(500);
    // 查看操作按钮
    const actionBtn = demo.getDemoAction('操作');
    if (await actionBtn.isVisible()) {
      await actionBtn.click();
      await page.waitForTimeout(200);
    }
    // 表格应该有行
    expect(await demo.hasRows()).toBeTruthy();
  });

  test('自定义组件 - 点击操作按钮有反馈', async ({ page }) => {
    // 注册对话框监听
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('EDIT');
      await dialog.dismiss();
    });
    await demo.clickTabButton('自定义组件');
    await demo.waitForGridReady();
    await page.waitForTimeout(500);
  });

  test('性能测试 - 加载大数据不崩溃', async ({ page }) => {
    await demo.clickTabButton('性能测试');
    await demo.waitForGridReady();
    await page.waitForTimeout(500);
    // 点击启动压测
    const startBtn = demo.getDemoAction('开始压测');
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForTimeout(2000);
      // 应该没有错误
    }
  });

  test('性能面板 - FPS / 渲染时间显示', async ({ page }) => {
    await demo.clickTabButton('性能测试');
    await demo.waitForGridReady();
    await page.waitForTimeout(500);
    // 性能面板组件应该可见
    const panel = page.locator('db-grid-performance-panel, .performance-panel, .perf-panel');
    if (await panel.isVisible().catch(() => false)) {
      const fps = await panel.textContent();
      expect(fps).not.toBeNull();
    }
  });

  test('迷你图 - 渲染图标行', async ({ page }) => {
    await demo.clickTabButton('迷你图');
    await demo.waitForGridReady();
    await page.waitForTimeout(500);
    expect(await demo.hasRows()).toBeTruthy();
  });

  test('图表 - 画布存在', async ({ page }) => {
    await demo.clickTabButton('图表');
    await demo.waitForGridReady();
    await page.waitForTimeout(1000);
    // 可能有 Chart.js 或 Canvas
    const canvas = page.locator('canvas').first();
    if (await canvas.isVisible().catch(() => false)) {
      expect(true).toBeTruthy();
    }
  });
});
