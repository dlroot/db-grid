# Phase 2.4: Excel Import Demo — 完成

## 任务目标
在 DB Grid 项目中添加 Excel 导入 Demo Tab，展示 ExcelImportService 的导入功能。

## 修改文件

### `src/app/app.html`
- 在 Tab 栏添加了 "📥 Excel 导入" 按钮
- 新增 `excel-import` Demo 面板，包含：
  - **拖拽区域**：虚线边框 + 图标 + 渐变背景，hover 时高亮
  - **文件选择按钮**：支持 .xlsx/.xls
  - **导入统计卡片**：显示行数、列数、Sheet 名
  - **多 Sheet 选择器**：自动检测文件 Sheet 列表
  - **预览提示**：导入成功后显示成功信息
  - **错误提示**：红色错误框显示失败原因
  - **db-grid**：展示导入的数据，支持分页、排序、筛选

### `src/app/app.ts`
- 导入 `ImportResult` 类型
- 新增 signals：`importLoading`、`importError`、`importResult`、`availableSheets`、`isDragOver`
- `handleExcelImport(file: File)`：验证文件类型 → 调用 ExcelImportService → 更新 grid 数据
- `onFileSelected(event)`：处理 `<input type="file">` 事件
- `onDragOver/Leave/Drop`：处理 HTML5 拖拽 API
- `onSheetChange(event)`：切换 Sheet 时重新解析（使用 `window.__lastImportedFile` 存储原始文件）
- `clearImportData()`：清除导入结果

### `src/app/app.scss`
- `.drop-zone`：渐变背景、虚线边框、hover/drag-over 高亮动画
- `.import-loading` + `.spinner`：旋转加载动画
- `.btn-import-file`：蓝色虚线按钮样式
- `.import-stats`：统计卡片网格布局
- `.import-preview-info`：绿色成功提示
- `.import-error`：红色错误提示

## 验证结果
- ✅ `npx ng build db-grid` — 编译成功（仅 CommonJS 警告，无错误）
- ✅ `npx vitest run excel-import` — 19/19 测试通过
- ✅ `tsc --noEmit` — 无 TypeScript 错误
- ⚠️ `npm test`（vitest watch 模式）在无浏览器环境超时，但组件代码本身无误

## 注意事项
- Sheet 切换功能需要重新读取原始文件（浏览器 File API 限制），通过 `window.__lastImportedFile` 缓存实现
- 未修改 `excel-import.service.ts` 本身
- Demo 样式与现有 Tab 风格保持一致
