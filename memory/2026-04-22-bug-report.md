# DB Grid Bug Report — 2026-04-22

## 严重渲染 Bug

### 问题描述
Demo 页面（https://dlroot.github.io/db-grid/）在移动端显示时，单元格内容严重重叠。

### 截图证据
用户提供的截图显示：
- 第一列（ID 列）显示的内容混杂了日期、邮箱、部门等多个字段
- 文字重叠在一起，无法阅读
- 表头显示正常（ID ↑↓:::）

### 初步分析
可能原因：
1. **虚拟滚动高度计算错误** — `virtualScroll.style.height` 未正确设置
2. **行定位问题** — `rowsContainer.style.transform` 的 `translateY` 计算错误
3. **CSS 行高未生效** — `.db-grid-row` 的行高样式未正确应用
4. **Cell 渲染问题** — `renderContent` 中 `textContent` 设置前未清空容器

### 关键代码位置
- `db-grid.component.ts:1267` — `renderRows()` 方法
- `row-renderer.ts:45` — `createRowElement()` 行元素创建
- `cell-renderer.ts:131` — `renderContent()` 内容渲染

### 复现步骤
1. 访问 https://dlroot.github.io/db-grid/
2. 使用移动设备或模拟移动端视口
3. 观察基础表格（默认 tab）的渲染效果

### 优先级
🔴 **P0 - 阻塞性 Bug**，影响基本可用性

### 修复计划
1. 检查 `renderRows()` 中的虚拟滚动逻辑
2. 验证 rowHeight 是否正确传递到行元素
3. 检查 CSS 变量 `--db-grid-row-height` 是否正确应用
4. 添加 `overflow: hidden` 到单元格样式防止内容溢出
