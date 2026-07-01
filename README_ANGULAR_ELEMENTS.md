# DbGrid Angular Elements

将 DbGrid 导出为 **Web Component** (`<db-grid-element>`)，可在 **任何框架** 中使用（React、Vue、Svelte、原生 JavaScript 等）。

## ✨ 特性

- ✅ **框架无关** - 可在 React、Vue、Svelte、Angular、原生 JS 等任何框架中使用
- ✅ **完整 API** - 支持所有 DbGrid 功能（排序、过滤、编辑、导出等）
- ✅ **TypeScript 支持** - 完整的类型定义文件
- ✅ **事件系统** - 支持所有 DbGrid 事件（gridReady、cellClick、selectionChanged 等）
- ✅ **懒加载** - 作为 Web Component，支持按需加载
- ✅ **Shadow DOM** - 样式隔离，不污染全局

## 📦 安装

### 方式 1: 从 npm 安装（推荐）

```bash
npm install db-grid-elements
```

在 HTML 中引入：

```html
<script src="node_modules/db-grid-elements/db-grid-elements.js"></script>
```

### 方式 2: 从源码构建

```bash
# 克隆仓库
git clone https://github.com/your-repo/db-grid.git
cd db-grid

# 安装依赖
npm install --legacy-peer-deps

# 运行构建脚本
./build-elements.sh
```

构建输出在 `dist/db-grid-elements/` 目录。

### 方式 3: 使用 CDN

```html
<script src="https://unpkg.com/db-grid-elements@1.0.0/db-grid-elements.js"></script>
```

## 🚀 快速开始

### 原生 JavaScript/HTML

```html
<!DOCTYPE html>
<html>
<head>
  <title>DbGrid 演示</title>
</head>
<body>
  <h1>我的网格</h1>

  <!-- 引入 DbGrid Elements -->
  <script src="db-grid-elements.js"></script>

  <!-- 使用 Web Component -->
  <db-grid-element id="myGrid"></db-grid-element>

  <script>
    // 等待组件注册
    customElements.whenDefined('db-grid-element').then(() => {
      const grid = document.getElementById('myGrid');

      // 设置列定义
      grid.columnDefs = [
        { field: 'id', headerName: 'ID', width: 80 },
        { field: 'name', headerName: '姓名', width: 150 },
        { field: 'age', headerName: '年龄', width: 100 }
      ];

      // 设置行数据
      grid.rowData = [
        { id: 1, name: '张三', age: 28 },
        { id: 2, name: '李四', age: 32 }
      ];

      // 监听事件
      grid.addEventListener('gridReady', (e) => {
        console.log('✅ Grid 就绪', e.detail.api);
      });

      grid.addEventListener('cellClick', (e) => {
        console.log('🖱️ 单元格点击', e.detail);
      });
    });
  </script>
</body>
</html>
```

### React

```jsx
import React, { useEffect, useRef, useState } from 'react';

// 引入 DbGrid Elements
import 'db-grid-elements';

const DbGrid = ({ rowData, columnDefs, onGridReady }) => {
  const containerRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    // 创建 Web Component
    const grid = document.createElement('db-grid-element');
    grid.style.width = '100%';
    grid.style.height = '500px';
    grid.style.display = 'block';

    // 设置属性
    grid.rowData = rowData;
    grid.columnDefs = columnDefs;

    // 监听事件
    grid.addEventListener('gridReady', (e) => onGridReady(e.detail));

    // 添加到 DOM
    containerRef.current.appendChild(grid);
    gridRef.current = grid;

    // 清理
    return () => {
      containerRef.current.removeChild(grid);
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '500px' }} />;
};

// 使用
const App = () => {
  const [gridApi, setGridApi] = useState(null);

  return (
    <div>
      <h1>DbGrid React 示例</h1>
      <DbGrid
        rowData={[{ id: 1, name: '张三' }]}
        columnDefs={[{ field: 'id' }, { field: 'name' }]}
        onGridReady={(api) => setGridApi(api)}
      />
    </div>
  );
};
```

### Vue 3

```vue
<template>
  <div>
    <h1>DbGrid Vue 3 示例</h1>
    <db-grid-element
      ref="gridRef"
      :row-data="rowData"
      :column-defs="columnDefs"
      @grid-ready="onGridReady"
      style="width: 100%; height: 500px; display: block;"
    ></db-grid-element>
  </div>
</template>

<script>
import 'db-grid-elements';

export default {
  data() {
    return {
      rowData: [{ id: 1, name: '张三' }],
      columnDefs: [{ field: 'id' }, { field: 'name' }]
    };
  },
  methods: {
    onGridReady(detail) {
      console.log('✅ Grid 就绪', detail.api);
    }
  }
};
</script>
```

## 📖 API 文档

### 属性 (Properties)

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `rowData` | `any[]` | `[]` | 行数据 |
| `columnDefs` | `any[]` | `[]` | 列定义 |
| `gridOptions` | `object` | `{}` | Grid 配置选项 |

### 方法 (Methods)

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `getGridApi()` | - | `any \| null` | 获取 Grid API（同步） |
| `getGridApiAsync()` | - | `Promise<any>` | 获取 Grid API（异步，推荐） |
| `setRowData(data)` | `data: any[]` | `void` | 设置行数据 |
| `setColumnDefs(cols)` | `cols: any[]` | `void` | 设置列定义 |
| `exportToExcel(fileName?)` | `fileName?: string` | `void` | 导出为 Excel |
| `refreshData()` | - | `void` | 刷新数据 |
| `resetState()` | - | `void` | 重置状态 |
| `undo()` | - | `void` | 撤销 |
| `redo()` | - | `void` | 重做 |

### 事件 (Events)

| 事件名 | 事件详情 (event.detail) | 说明 |
|--------|-------------------------|------|
| `gridReady` | `{ api, columnApi }` | Grid API 就绪 |
| `cellClick` | `{ rowIndex, colKey, value, data }` | 单元格点击 |
| `cellDoubleClick` | `{ rowIndex, colKey, value, data }` | 单元格双击 |
| `selectionChanged` | `{ selectedRows, selectedNodes }` | 选择变化 |
| `sortChanged` | `{ sortModel }` | 排序变化 |
| `filterChanged` | `{ filterModel }` | 过滤变化 |
| `rowClicked` | `{ rowIndex, data, event }` | 行点击 |
| `rowDoubleClicked` | `{ rowIndex, data, event }` | 行双击 |

## 🎯 完整示例

查看以下文件获取完整示例：

- **原生 JavaScript**: `demo-elements.html`
- **React**: `demo-react.jsx`
- **Vue 3**: `demo-vue.html`

运行演示：

```bash
# 构建 Elements
./build-elements.sh

# 启动演示服务器
cd dist/db-grid-elements
npx http-server -p 8080 -c-1

# 在浏览器打开
# http://localhost:8080/demo-elements.html
```

## 📦 发布到 npm

1. 构建项目：

```bash
./build-elements.sh
```

2. 进入输出目录：

```bash
cd dist/db-grid-elements
```

3. 发布到 npm：

```bash
npm login
npm publish
```

## 🛠️ 构建配置

### Angular Elements 入口文件

- **文件**: `src/main.elements.ts`
- **说明**: Angular Elements 的入口点，注册 `<db-grid-element>` 自定义元素

### 包装组件

- **文件**: `src/app/db-grid-element.component.ts`
- **说明**: 将 `DbGridComponent` 包装为 Angular Element

### 构建脚本

- **文件**: `build-elements.sh`
- **说明**: 自动化构建脚本，合并所有 JS 文件为单个 bundle

### package.json 脚本

```json
{
  "scripts": {
    "build:elements": "ng build --browser src/main.elements.ts ...",
    "pack:elements": "cd dist/db-grid-elements && npm pack",
    "demo:elements": "npx http-server dist/db-grid-elements -p 8080"
  }
}
```

## 📝 TypeScript 支持

项目包含完整的 TypeScript 类型定义文件：

- **文件**: `src/db-grid-element.d.ts`

使用示例：

```typescript
import { DbGridElement, RowData, ColumnDef } from './db-grid-element';

const grid = document.querySelector<DbGridElement>('db-grid-element');
grid.rowData = [{ id: 1, name: '张三' }] as RowData[];
grid.columnDefs = [{ field: 'id' }] as ColumnDef[];

const api = await grid.getGridApiAsync();
api.exportToExcel('export.xlsx');
```

## 🔧 故障排除

### 问题: `db-grid-element` 未注册

**解决方案**: 确保在执行任何代码之前引入 `db-grid-elements.js`：

```html
<script src="db-grid-elements.js"></script>
<script>
  // 等待组件注册
  customElements.whenDefined('db-grid-element').then(() => {
    // 你的代码
  });
</script>
```

### 问题: 样式丢失

**解决方案**: DbGrid Element 使用 Shadow DOM 隔离样式。如果需要自定义样式，使用 CSS 变量或 `::part()` 伪元素。

### 问题: 事件不触发

**解决方案**: 确保使用 `addEventListener` 监听事件，而不是直接在元素上设置 `on*` 属性：

```javascript
// ✅ 正确
grid.addEventListener('gridReady', (e) => {...});

// ❌ 错误
grid.onGridReady = (e) => {...};
```

## 📄 许可证

MIT License

## 👤 作者

QClaw - 2026-06-24

## 🔗 相关链接

- **DbGrid 主项目**: [链接]
- **Angular Elements 文档**: https://angular.dev/guide/elements
- **Web Components MDN**: https://developer.mozilla.org/en-US/docs/Web/API/Web_components

---

**🎉 享受使用 DbGrid Angular Elements！**
