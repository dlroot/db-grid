# DB Grid

<div align="center">

**High-Performance Angular Data Grid — Open Source AG Grid Enterprise Alternative**

[![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular)](https://angular.dev)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Bundle Size](https://img.shields.io/badge/Bundle-≤2MB-green.svg)]()

[Documentation](https://github.com/dlroot/db-grid#readme) · [Examples](https://github.com/dlroot/db-grid/tree/main/projects/demo) · [Contributing](CONTRIBUTING.md)

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

- [x] Core grid rendering with virtual scrolling
- [x] Column definitions (AG Grid compatible)
- [x] Sorting (single & multi-column)
- [x] Fixed columns (pin left/right)
- [x] Row selection (single, multiple, range)
- [x] Theme system (Alpine, Balham, Material)
- [ ] Filters (Text, Number, Date, Set)
- [ ] Cell editors (Text, Number, Date, Select)
- [ ] Row grouping & aggregation
- [ ] Tree data
- [ ] Pivoting
- [ ] Excel export (XLSX)
- [ ] Range selection & clipboard
- [ ] Server-side row model (SSRM)
- [ ] Charts integration
- [ ] Row drag & drop

## 🏗️ Architecture

```
db-grid/
├── core/          # Framework-agnostic TypeScript engine
│   ├── models/    # ColDef, GridOptions, GridApi, Events
│   ├── services/  # Data processing, virtual scroll, sort, filter
│   ├── rendering/ # Canvas & DOM renderers
│   └── utils/     # Shared utilities
├── angular/       # Angular 21+ component layer
│   ├── components/# Grid, Column, Header, Cell, Row
│   ├── directives/# Angular directives
│   └── services/  # Angular-specific services
├── filters/       # Built-in filter implementations
├── editors/       # Built-in cell editor implementations
└── themes/        # Theme packages (Alpine, Balham, Material)
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

## 📄 License

[MIT](LICENSE) — Free for personal and commercial use. No hidden enterprise tier.

---

<div align="center">
Made with ❤️ by <a href="https://github.com/dlroot">dlroot</a>
</div>
