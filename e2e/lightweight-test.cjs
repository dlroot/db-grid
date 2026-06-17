/**
 * DB Grid 轻量级冒烟测试
 * 通过 HTTP 获取页面并解析 HTML/DOM，不需要浏览器
 * 
 * 用法: node e2e/lightweight-test.mjs
 */

const http = require('http');
const BASE_URL = 'http://localhost:4200';

// Demo Tab 列表和对应的检查特征
const TABS = [
  { name: '基础表格', check: 'db-grid-container', buttons: [] },
  { name: '增量更新', check: 'db-grid-container', buttons: ['添加'] },
  { name: '自定义组件', check: 'db-grid-container', buttons: ['操作'] },
  { name: '性能测试', check: 'db-grid-container', buttons: ['开始压测'] },
  { name: 'Excel导出', check: 'db-grid-container', buttons: ['导出'] },
  { name: '行分组', check: 'db-grid-container', buttons: ['展开全部'] },
  { name: '列分组', check: 'db-grid-header', buttons: [] },
  { name: '服务端模式', check: 'db-grid-container', buttons: [] },
  { name: '无限滚动', check: 'db-grid-container', buttons: [] },
  { name: '跨行跨列', check: 'db-grid-container', buttons: [] },
  { name: '范围选择', check: 'db-grid-container', buttons: [] },
  { name: '拖拽', check: 'db-grid-container', buttons: [] },
  { name: '树形数据', check: 'db-grid-container', buttons: [] },
  { name: '主从明细', check: 'db-grid-container', buttons: [] },
  { name: '图表', check: 'db-grid-container', buttons: [] },
  { name: '迷你图', check: 'db-grid-container', buttons: [] },
  { name: '国际化', check: 'db-grid-container', buttons: ['English'] },
  { name: '列虚拟', check: 'db-grid-container', buttons: [] },
  { name: '行虚拟', check: 'db-grid-container', buttons: [] },
  { name: '列类型', check: 'db-grid-container', buttons: [] },
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

// 简单的 HTML 解析（不用依赖）
function hasClass(html, className) {
  return html.includes(className) || html.includes(`"${className}"`) || 
         html.includes(`'${className}'`) || html.includes(`.${className}`);
}

function countText(html, text) {
  let count = 0;
  let idx = 0;
  while ((idx = html.indexOf(text, idx)) !== -1) {
    count++;
    idx += text.length;
  }
  return count;
}

async function run() {
  console.log('🧪 DB Grid 轻量冒烟测试');
  console.log(`   检查 ${TABS.length} 个 Demo Tab\n`);

  // 1. 检查首页
  console.log('📋 [首页]');
  try {
    const home = await fetchUrl(BASE_URL);
    console.log(`   HTTP ${home.status} - ${home.body.length} bytes`);

    if (home.status !== 200) {
      console.log('   ❌ 首页加载失败\n');
      return;
    }

    // 检查关键 CSS/JS 是否加载
    const hasGridCSS = home.body.includes('db-grid') || home.body.includes('db-grid-container');
    const hasAngular = home.body.includes('angular') || home.body.includes('ng-version');
    console.log(`   db-grid: ${hasGridCSS ? '✅' : '⚠️'}`);
    console.log(`   Angular: ${hasAngular ? '✅' : '⚠️'}`);
    
    // 检查是否 shell page（有 <db-grid> 标签）
    const hasAppRoot = home.body.includes('<db-grid') || home.body.includes('db-grid-root');
    console.log(`   组件: ${hasAppRoot ? '✅' : '⚠️'}`);

    // 检查 JS 包是否加载（通过文件名模式）
    const jsBundles = countText(home.body, '.js');
    console.log(`   JS 引用: ${jsBundles} 个\n`);

  } catch (err) {
    console.log(`   ❌ HTTP 错误: ${err.message}\n`);
    return;
  }

  // 2. 逐个检查 Tab 按钮是否存在（只需首页一次请求就够了）
  console.log('📋 Demo Tab 按钮可用性 (从首页 HTML 提取):\n');
  const home = await fetchUrl(BASE_URL);
  const html = home.body;

  let passed = 0;
  let failed = 0;
  const errors = [];

  for (const tab of TABS) {
    const hasButton = html.includes(`>${tab.name}<`) || html.includes(`>${tab.name}</button`);
    const hasGrid = html.includes('db-grid');
    
    const status = hasButton ? '✅' : '❌';
    console.log(`  ${status} [${tab.name.padEnd(8)}] 按钮:${hasButton ? '✅' : '❌'}`);

    if (hasButton) {
      passed++;
    } else {
      failed++;
      errors.push({ tab: tab.name, error: 'Tab 按钮未在首页找到' });
    }
  }

  // 3. 报告
  console.log('\n═══════════════════════════════');
  console.log('📊 测试报告');
  console.log('═══════════════════════════════');
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📝 总计: ${passed + failed} 个 Demo Tab`);

  if (errors.length > 0) {
    console.log('\n⚠️ 缺失的 Tab 按钮:');
    for (const err of errors) {
      console.log(`  • [${err.tab}] ${err.error}`);
    }
  }

  console.log('\n' + (failed === 0 ? '🎉 全部 Tab 按钮都存在！' : '🛠️ 需要检查 Tab 按钮'));
  
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
