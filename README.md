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

### ✅ P3 — UI Integration
- [x] Range Selection & clipboard
- [x] Column Menu
- [x] Sidebar (tool panels)
- [x] Status Bar

### ✅ P4 — Enterprise
- [x] Master-Detail (nested grids)
- [x] Server-Side Row Model (infinite scroll, chunk loading)
- [x] Undo/Redo (Ctrl+Z/Y)

### 🚧 Coming Next
- [ ] Charts integration (P4-4)
- [ ] Pivoting (P2-3)
- [ ] PDF Export
- [ ] Column virtualization performance optimization

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
├── src/app/                    # Interactive demo application (15 tabs)
├── .github/workflows/           # CI/CD (build + GitHub Pages deploy)
├── vitest.config.ts            # Unit test configuration
└── package.json
```

## 📊 Test Coverage

```bash
npm test   # 84 tests passing (Vitest + jsdom)
npm run build  # Production build (~110KB gzipped)
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

## 📄 License

[MIT](LICENSE) — Free for personal and commercial use. No hidden enterprise tier.

---

<div align="center">
Made with ❤️ by <a href="https://github.com/dlroot">dlroot</a>
</div>
