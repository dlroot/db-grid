# SVG Icon Replacement - 2025-01-20

## 完成
将 db-grid 项目中所有剩余的 Unicode/Emoji 图标替换为 Lucide SVG 图标。

## 改动文件
- `db-grid.component.ts`: 无数据图标、菜单箭头、勾选、拖放导入、图表面板菜单、单元格右键菜单；新增 `getMenuIconSvg()` 方法支持 25+ 图标
- `column-menu.service.ts`: 排序↑↓↕、固定列◀▶◇、列宽↔⇔、隐藏列✕ → SVG 图标名
- `context-menu.service.ts`: 15+ 个 emoji 图标 → Lucide 图标名（file-spreadsheet, refresh-cw, rotate-ccw, clipboard, trash-2, check-square, chevrons-right, filter, pin, pin-off 等）
- `group.service.ts`: 分组展开/折叠 ▼▶ → SVG chevron 图标
- `cell-renderer.ts`: 树形展开/折叠、动作按钮 → SVG；新增 `resolveIconSvg()` 方法
- `chart-panel.component.ts`: 面板标题、关闭按钮、导出按钮、图表类型按钮 → SVG；新增 `getChartIcon()` 方法
- `performance-panel.component.ts`: ⚡标题、▲▼折叠箭头、⚠️警告、✅健康 → SVG
- `star-renderer.component.ts`: ★ → SVG star

## 技术方案
- 图标渲染使用 `[innerHTML]` 绑定 SVG 字符串，通过 `currentColor` 继承主题色
- 菜单图标系统：icon 属性改为图标名（如 `'clipboard'`、`'check-square'`），组件提供统一的 SVG 映射表
- 树形/分组图标使用 `innerHTML` 替换 `textContent`

## Git
- master: `268d39d`
- gh-pages: `2b76e62`
- https://dlroot.github.io/db-grid/ 已部署
