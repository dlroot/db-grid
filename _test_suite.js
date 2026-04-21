const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto('http://localhost:4200', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);

  console.log('=== 测试 1: 数据渲染 ===');
  const rows = await page.$$('.db-grid-row');
  const cells = await page.$$('.db-grid-cell');
  const headerCells = await page.$$('.db-grid-header-cell');
  console.log('header cells:', headerCells.length);
  console.log('rows:', rows.length);
  console.log('cells:', cells.length);

  console.log('\n=== 测试 2: 排序功能 ===');
  const header = await page.$('[data-col-id="name"]');
  if (header) {
    await header.click();
    await page.waitForTimeout(500);
    const hasAsc = await header.evaluate(el => el.classList.contains('db-grid-header-sorted-asc'));
    console.log('第一次点击 - 升序:', hasAsc);

    await header.click();
    await page.waitForTimeout(300);
    const hasDesc = await header.evaluate(el => el.classList.contains('db-grid-header-sorted-desc'));
    console.log('第二次点击 - 降序:', hasDesc);
  } else {
    console.log('ERROR: header not found');
  }

  console.log('\n=== 测试 3: 多列排序 ===');
  const headerAge = await page.$('[data-col-id="age"]');
  if (headerAge) {
    await headerAge.click({ modifiers: ['Shift'] });
    await page.waitForTimeout(300);
    const sortedCount = await page.$$eval('.db-grid-header-sorted-asc, .db-grid-header-sorted-desc', els => els.length);
    console.log('多列排序 - 排序列数:', sortedCount);
  }

  console.log('\n=== 测试 4: 编辑 Tab ===');
  await page.click('button:has-text("行内编辑")');
  await page.waitForTimeout(2000);
  const editCells = await page.$$('.db-grid-cell');
  console.log('编辑 Tab cells:', editCells.length);

  if (errors.length > 0) {
    console.log('\n=== 错误 ===');
    errors.slice(0, 3).forEach(e => console.log(' ', e.slice(0, 100)));
  }

  await browser.close();
})();
