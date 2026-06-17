# E2E 测试

## 快速开始

```bash
# 1. 确保依赖安装
npm install

# 2. 安装 Playwright 浏览器
npx playwright install chromium

# 3. 运行所有 E2E 测试
npm run e2e

# 4. 只运行某个测试文件
npm run e2e -- tests/basic.spec.ts

# 5. 使用 Playwright UI 模式调试
npm run e2e:open
```

## 测试文件结构

```
e2e/
  playwright.config.ts   # Playwright 配置
  tests/
    basic.spec.ts         # 基础功能（渲染、滚动）
    data-operations.spec.ts # 数据操作（分组、服务端、无限滚动、增量更新）
    advanced.spec.ts      # 高级功能（跨行跨列、范围选择、拖拽、透视表）
    renderer.spec.ts      # 渲染器 & 性能
    columns.spec.ts       # 列功能 & 全 Tab 导航
    smoke.spec.ts         # Phase 5/6 新增功能冒烟测试
  utils/
    demo-page.ts          # Page Object 模型
```

## 测试覆盖的 Demo Tab (27个)

- ✅ 基础表格 / 列虚拟 / 行虚拟
- ✅ Excel导出 / 行分组 / 列分组
- ✅ 服务端模式 / 无限滚动 / 跨行跨列
- ✅ 范围选择 / 拖拽 / 树形数据
- ✅ 增量更新 / 自定义组件 / 性能测试
- ✅ 主从明细 / 图表 / 迷你图
- ✅ 撤销 / 国际化 / 填充柄
- ✅ 聚合 / 透视表 / 列类型

## 测试策略

### 1. 冒烟测试 (smoke.spec.ts) — 优先
- Phase 5/6 新增 Demo 的基础渲染
- 确保新功能不崩溃

### 2. 功能性测试 (basic / data-operations / advanced)
- 每个 Demo Tab 的核心操作
- 点击按钮、检查渲染结果

### 3. 全 Tab 导航 (columns.spec.ts)
- 遍历所有 Demo Tab，切换不报错
- 记录错误但不阻塞

## 查看报告

测试完成后运行：
```bash
# Playwright 报告会自动打开
npx playwright show-report playwright-report
```
