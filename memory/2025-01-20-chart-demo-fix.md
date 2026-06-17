# Chart Panel Fix - 2025-01-20

## 问题
集成图表 demo 不显示。

## 根因
1. **Chart panel 组件**：`[innerHTML]` 渲染 SVG 图标存在 Angular DOM  sanitizer 对 SVG 的兼容性问题，可能导致图表面板渲染失败
2. **app.html**：`📈✖💡📊` 等 emoji 图标需要替换为 SVG
3. **app.ts**：独立图表按钮使用 emoji action icons
4. **action-renderer.component.ts**：`{{ action.icon }}` 直接渲染 emoji 文本

## 修复
1. **chart-panel.component.ts**：
   - 删除 `@for (btn of chartTypeButtons)` + `[innerHTML]="getChartIcon(btn.type)"` 循环
   - 改为 5 个独立的硬编码按钮，每个内嵌 SVG（避免 innerHTML 渲染 SVG 的 sanitizer 问题）
   - 更新 CSS 选择器从 `.db-chart-type-btns button` → `.db-chart-type-btn`
   - 删除未使用的 `chartTypeButtons` 数组和 `getChartIcon()` 方法

2. **app.html**：
   - `📈 集成图表` → SVG bar chart icon
   - `📈 显示/隐藏图表面板` → SVG show/hide icons
   - `💡 先选择数据范围...` → SVG info icon
   - `📊 独立图表` → SVG bar chart icon
   - 独立图表类型按钮用 `[innerHTML]` 渲染 SVG

3. **app.ts**：
   - `getChartTypeButtons()` 返回 SVG 字符串
   - Action icons (`👁️✏️🗑️`) → SVG (eye, pencil, trash-2)

4. **action-renderer.component.ts**：
   - `{{ action.icon }}` → `[innerHTML]="action.icon"`
   - CSS: `display:inline-flex;align-items:center;width:16px;height:16px`

## 修复 2：显示图表面板按钮不生效
2025-01-20（同一次会话）

**问题**：`showChartPanel()` 在没有选中范围时执行 `alert('请先选择数据范围')` 后直接 `return`，导致面板根本不显示。

**修复**：
1. `showChartPanel`: 删除无范围时的 `alert` + `return`，改为先 `set(true)` 显示面板，再用 `createChartInRange(null, ...)` 显示占位提示
2. `createChartInRange`: 改为调用 `chartPanel.updateChart(rangeData, cols)`（chart panel 内部已处理 null 数据 → 显示占位文字）

## Git
- master: `8583bdd`
- gh-pages: `d8bd4f2`
