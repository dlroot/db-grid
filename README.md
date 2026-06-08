# DB Grid

<div align="center">

**High-Performance Angular Data Grid — Open Source AG Grid Enterprise Alternative**

[![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular)](https://angular.dev)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Bundle Size](https://img.shields.io/badge/Bundle-≤2MB-green.svg)]()

[Documentation](https://github.com/dlroot/db-grid#readme) · [Live Demo](https://dlroot.github.io/db-grid/) · [Contributing](CONTRIBUTING.md)

</div>

---

## ✨ Features

- 🚀 **Performance First** — Hybrid rendering (DOM + Canvas) with virtual scrolling for 100K+ rows
- 🔌 **AG Grid Compatible API** — Drop-in replacement with zero-config migration
- 📦 **Angular 21+** — Built for the latest Angular with standalone components
- 🎨 **Theme System** — Alpine, Balham, Material themes out of the box
- 📊 **Enterprise Features** — Row grouping, pivoting, tree data, Excel export (all MIT licensed)
- 🧩 **Extensible** — Custom cell renderers, editors, filters, and components
- 🪶 **Lightweight Core** — Core engine is framework-agnostic TypeScript

## 📦 Installation

```bash
npm install db-grid
```

## 🚀 Quick Start

```typescript
import { DbGridModule } from 'db-grid';

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [provideAnimationsAsync()]
};

// app.component.ts
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DbGridModule],
  template: `
    <db-grid
      [columnDefs]="columnDefs"
      [rowData]="rowData"
      [gridOptions]="gridOptions"
      (gridReady)="onGridReady($event)"
    ></db-grid>
  `
})
export class AppComponent {
  columnDefs: ColDef[] = [
    { field: 'make', sortable: true, filter: true },
    { field: 'model', sortable: true, filter: true },
    { field: 'price', sortable: true, filter: true, valueFormatter: params => params.value.toLocaleString() }
  ];

  rowData = [
    { make: 'Toyota', model: 'Celica', price: 35000 },
    { make: 'Ford', model: 'Mondeo', price: 32000 },
    { make: 'Porsche', model: 'Boxster', price: 72000 }
  ];

  gridOptions: GridOptions = {
    rowSelection: 'multiple',
    animateRows: true,
    pagination: true,
    paginationPageSize: 20
  };

  onGridReady(params: GridReadyEvent) {
    params.api.sizeColumnsToFit();
  }
}
```

## 🔄 Migration from AG Grid

DB Grid is designed to be a **drop-in replacement** for AG Grid. In most cases, you only need to change the import:

```diff
- import { AgGridModule } from 'ag-grid-angular';
- import { ColDef, GridOptions } from 'ag-grid-community';
+ import { DbGridModule } from 'db-grid';
+ import { ColDef, GridOptions } from 'db-grid';
```

All `ColDef`, `GridOptions`, and `GridApi` interfaces are **100% compatible** with AG Grid.

## 🗺️ Roadmap

### ✅ P0 — Core Features
- [x] Core grid rendering with virtual scrolling
- [x] Column definitions (AG Grid compatible)
- [x] Sorting (single & multi-column)
- [x] Row selection (single, multiple)
- [x] Fixed columns (pin left/right)
- [x] Cell spanning (row/column span)
- [x] Row drag & drop

### ✅ P1 — Enhanced Features
- [x] Filters (Text, Number, Date, Set, Boolean) — 5 filter types
- [x] Cell editors (Text, Number, Date, Select, Checkbox, LargeText, RichSelect) — 7 editor types
- [x] Column Group Headers (multi-row headers)
- [x] Keyboard Navigation (Arrow, Tab, Enter, F2, Escape, Page/Home/End)
- [x] Accessibility (ARIA, screen reader support)
- [x] Cell Data Types (auto-inference: string, number, date, boolean, object)

### ✅ P2 — Advanced Data
- [x] Row Grouping & Aggregation (sum, avg, min, max, count, countunique)
- [x] Tree Data (hierarchical data with expand/collapse)
- [x] Pivoting (pivot table with row/column rotation, multi-aggregation)

### ✅ P3 — UI Integration
- [x] Range Selection & clipboard
- [x] Column Menu
- [x] Sidebar (tool panels)
- [x] Status Bar
- [x] Column Virtualization (100+ columns, render only visible columns)
- [x] Grid Menu (header menu button + right-click context menu)

### ✅ P4 — Enterprise
- [x] Master-Detail (nested grids)
- [x] Server-Side Row Model (infinite scroll, chunk loading)
- [x] Undo/Redo (Ctrl+Z/Y)

### 🚧 Coming Next
- [ ] Charts integration

## 📖 API Reference

### GridApi Methods

#### Data Operations
| Method | Description |
|--------|-------------|
| `setRowData(data)` | Set all row data |
| `getDisplayedRowCount()` | Get visible row count |
| `getDisplayedRows()` | Get all visible row data |
| `forEachNode(callback)` | Iterate over all row nodes |
| `getRowNode(id)` | Get row node by ID |
| `getSelectedRows()` | Get selected row data |
| `getSelectedNodes()` | Get selected row nodes |

#### Sorting & Filtering
| Method | Description |
|--------|-------------|
| `setSortModel(model)` | Set sort configuration |
| `getSortModel()` | Get current sort model |
| `sortByColumn(col, dir)` | Sort by specific column |
| `clearSort()` | Clear all sorts |
| `setFilterModel(model)` | Set filter configuration |
| `getFilterModel()` | Get current filter model |
| `onFilterChanged()` | Trigger filter change |

#### Row Operations
| Method | Description |
|--------|-------------|
| `selectAll()` | Select all rows |
| `deselectAll()` | Clear selection |
| `selectNode(node)` | Select a row node |
| `deselectNode(node)` | Deselect a row node |
| `pinRow(index, data, 'top'|'bottom')` | Pin row to top/bottom |
| `getPinnedTopRowData()` | Get pinned top rows |
| `getPinnedBottomRowData()` | Get pinned bottom rows |
| `expandAll()` | Expand all groups |
| `collapseAll()` | Collapse all groups |

#### Cross-Grid Drag
| Method | Description |
|--------|-------------|
| `registerCrossGridDrag(gridId)` | Register grid for drag-drop |
| `unregisterCrossGridDrag(gridId)` | Unregister grid |
| `startCrossGridDrag(nodes, event)` | Begin cross-grid drag |
| `endCrossGridDrag()` | End drag operation |
| `isCrossGridDragging()` | Check if dragging |

#### Export & Clipboard
| Method | Description |
|--------|-------------|
| `exportDataAsCsv(params?)` | Export to CSV file |
| `getDataAsCsv(params?)` | Get CSV string |
| `copyToClipboard(data?)` | Copy data to clipboard |
| `copySelectedRange()` | Copy selected cells |
| `pasteToGrid(text?)` | Paste from clipboard |

### ColDef Properties

#### Essential Properties
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `field` | `string` | - | Data field path (e.g., `'user.name'`) |
| `headerName` | `string` | `field` | Column header title |
| `width` | `number` | `150` | Column width in pixels |
| `flex` | `number` | - | Flex grow factor |
| `sortable` | `boolean` | `false` | Enable sorting |
| `filter` | `string` | `false` | Filter type: `'text'`, `'number'`, `'date'`, `'boolean'`, `'set'` |
| `editable` | `boolean` | `false` | Enable cell editing |

#### Cell Rendering
| Property | Type | Description |
|----------|------|-------------|
| `cellRenderer` | `Component\<any\> \| string` | Custom cell component |
| `cellRendererParams` | `object` | Params passed to renderer |
| `cellEditor` | `Component\<any\>` | Custom cell editor |
| `cellEditorParams` | `object` | Params passed to editor |
| `valueGetter` | `(params) => any` | Custom value computation |
| `valueFormatter` | `(params) => string` | Display formatting |
| `valueParser` | `(params) => any` | Parse edited value |

#### Advanced Properties
| Property | Type | Description |
|----------|------|-------------|
| `pinned` | `'left' \| 'right'` | Pin column |
| `rowGroup` | `boolean` | Enable row grouping |
| `aggFunc` | `string` | Aggregation: `'sum'`, `'avg'`, `'min'`, `'max'`, `'count'` |
| `enableCharts` | `boolean` | Show sparkline in column |
| `chartConfig` | `ChartCellRendererConfig` | Chart configuration |

### GridOptions Properties

#### Data & Selection
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `rowData` | `any[]` | `[]` | Row data array |
| `rowSelection` | `'single' \| 'multiple'` | `null` | Selection mode |
| `suppressRowClickSelection` | `boolean` | `false` | Disable click-to-select |
| `getRowId` | `(params) => string` | auto | Custom row ID getter |

#### Virtualization & Performance
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `rowHeight` | `number` | `32` | Row height in pixels |
| `suppressVirtualScroll` | `boolean` | `false` | Disable virtualization |
| `cacheBlockSize` | `number` | `100` | Server-side cache block size |

#### Styling & Theming
| Property | Type | Description |
|----------|------|-------------|
| `theme` | `'alpine' \| 'balham' \| 'material'` | Grid theme |
| `getRowStyle` | `(params) => object` | Dynamic row styles |
| `getRowClass` | `(params) => string[]` | Dynamic row CSS classes |
| `headerHeight` | `number` | Header row height |

#### Events
| Property | Type | Description |
|----------|------|-------------|
| `onGridReady` | `EventEmitter\<GridReadyEvent\>` | Grid initialized |
| `onRowClicked` | `EventEmitter\<RowClickedEvent\>` | Row clicked |
| `onCellClicked` | `EventEmitter\<CellClickedEvent\>` | Cell clicked |
| `onSelectionChanged` | `EventEmitter\<SelectionChangedEvent\>` | Selection changed |
| `onCellValueChanged` | `EventEmitter\<CellValueChangedEvent\>` | Cell edited |

### TypeScript Generics

For type safety, use generic versions:

```typescript
import { ColDefGeneric as ColDef, GridApiGeneric as GridApi } from 'db-grid';

interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
}

// Type-safe column definitions
const cols: ColDef<Employee>[] = [
  { field: 'name', headerName: '姓名' },
  { field: 'salary', filter: 'number' }
];

// Type-safe API
onGridReady(event: GridReadyEventGeneric<Employee>) {
  this.api = event.api; // GridApiGeneric<Employee>
  const rows = this.api.getSelectedRows(); // Employee[]
}
```

## 🏗️ Architecture

```
db-grid/                        # Angular demo app (src/app/)
├── projects/db-grid/           # Library package
│   └── src/lib/
│       ├── core/               # Framework-agnostic TypeScript engine
│       │   ├── models/         # ColDef, GridOptions, GridApi, Events
│       │   └── services/       # 31 services (Data, Filter, Sort, Drag, etc.)
│       ├── angular/            # Angular 21+ component layer
│       │   └── components/     # Grid, Header, Cell, Row, Editors, Filters
│       └── index.ts            # Public API exports
├── src/app/                    # Interactive demo application (20 tabs)
├── .github/workflows/           # CI/CD (build + GitHub Pages deploy)
├── vitest.config.ts            # Unit test configuration
└── package.json
```

## 📊 Test Coverage

```bash
npm test   # 1020 tests passing (Vitest + jsdom, 30 test files)
npm run build  # Production build (~120KB gzipped)
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

## 📄 License

[MIT](LICENSE) — Free for personal and commercial use. No hidden enterprise tier.

---

<div align="center">
Made with ❤️ by <a href="https://github.com/dlroot">dlroot</a>
</div>
# trigger rebuild
// test 1780305494
test 1780306202
