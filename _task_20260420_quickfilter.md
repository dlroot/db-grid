# 2026-04-20 DB Grid 开发会话

## Quick Filter 实现 ✅

**目标：** 给所有演示 Tab 加上实时全局搜索框

### 改动

| 文件 | 改动内容 |
|------|----------|
| `filter.service.ts` | `clearAllFilters()` 同时清空 `quickFilterText` |
| `db-grid.component.ts` | 1. `ngOnInit` 中调用 `dataService.setFilterService(this.filterService)` 建立连接<br>2. `setFilterModel` 改为调用 `filterService.setFilterModel()`（之前是 `dataService.filter()`）<br>3. 新增 `setQuickFilter()` / `getQuickFilter()` / `clearQuickFilter()` 三个 API 方法 |
| `app.ts` | `quickFilter` signal + `onQuickFilterChange()` 方法，`clearAllFilters()` 也清 quickFilter |
| `app.html` | 工具栏 action-bar 加搜索框 + 清除按钮 |
| `app.scss` | 搜索框样式（带图标、聚焦效果） |

### 技术细节
- **数据流：** 搜索框 → `app.ts.onQuickFilterChange()` → `gridApi.setQuickFilter()` → `filterService.setQuickFilter()` → `dataService` 获取可见行时通过 `filterService.passesAllFilters()` 自动过滤
- **FilterService** 的 `passesAllFilters()` 已实现快速筛选逻辑（拼接所有列值为字符串，全小写匹配）
- 清除按钮 `✕` 只在有搜索内容时显示

### 状态
- 编译：✅ 零错误
- 构建：✅ 399KB (97KB gzip)
- 测试：✅ 84/84 通过
