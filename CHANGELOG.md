# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-08

### Added

#### Core Features (Phase 1-2)
- **Virtual Scrolling** - Smooth scrolling for 100K+ rows with configurable buffer
- **Column Management** - Resize, reorder, pin (left/right), hide/show columns
- **Sorting & Filtering** - Multi-column sort, 5 filter types (text, number, date, boolean, set)
- **Row Selection** - Single/multi select, checkbox selection, range selection
- **Cell Editing** - Full CRUD with inline editors (text, number, select, date, checkbox)
- **Row Drag & Drop** - Reorder rows within grid
- **Pagination** - Client-side pagination with customizable page sizes
- **Theming** - Alpine, Balham, Material themes + custom CSS variables

#### Advanced Data (Phase 3)
- **Row Grouping** - Tree data, parent-child relationships, expand/collapse
- **Master-Detail** - Expandable detail rows with lazy loading
- **Pivot Tables** - Dynamic pivoting with aggregation functions
- **Range Selection** - Multi-cell selection with fill handle (Excel-like)
- **Clipboard** - Copy/cut/paste with Excel compatibility
- **Export** - CSV, Excel, PDF export with styling options
- **Sparklines** - In-cell charts (bar, line, pie, doughnut)
- **Undo/Redo** - Full edit history with Ctrl+Z/Y

#### UI & Accessibility (Phase 3)
- **Keyboard Navigation** - Full keyboard support (arrows, Tab, Enter, Escape)
- **Accessibility** - ARIA labels, screen reader support
- **Tooltips** - Cell and header tooltips
- **Column Menu** - Sort, filter, pin, hide via dropdown menu
- **Context Menu** - Right-click actions
- **Row Pinning** - Pin rows to top/bottom (3.1)

#### Enterprise Features (Phase 3)
- **Advanced Filter** - Complex filter conditions (AND/OR/NOT)
- **Value Mapping** - Display value mapping (enum support)
- **Column Types** - Reusable column definition templates
- **Server-Side Model** - Infinite scroll, lazy loading, chunk loading
- **External Filter** - Programmatic filter control

#### Ecosystem (Phase 4)
- **TypeScript Generics** - Type-safe APIs: `ColDefGeneric<TData>`, `GridApiGeneric<TData>`, `GridOptionsGeneric<TData, TContext>`
- **Cross-Grid Row Drag** - Drag rows between multiple grids
- **i18n Enhancement** - Custom locale registration, RTL support
- **SSR Compatible** - Angular Universal support
- **Performance Services** - Render batching (rAF), FPS monitoring, benchmarking

### Services (31 total)
- DataService, FilterService, SortService, SelectionService
- DragDropService, RowDragService, CrossGridDragService
- EditorService, ClipboardService, UndoRedoService
- ExportService, PdfExportService, ExcelImportService
- GroupService, PivotService, TreeDataService
- MasterDetailService, RowPinningService, SparklineService
- KeyboardNavigationService, AccessibilityService, TooltipService
- ColumnMenuService, ContextMenuService, OverlayService
- I18nService, ThemeService, PaginationService
- ServerSideService, RenderBatchService, PerformanceMonitorService

### API Highlights
- **GridApi**: 80+ methods for data, selection, sorting, filtering, export, drag-drop
- **ColDef**: 40+ properties for column configuration
- **GridOptions**: 50+ properties for grid behavior
- **Events**: 20+ event types (onGridReady, onRowClicked, onCellValueChanged, etc.)

### Technical Details
- **Framework**: Angular 21+ (standalone components)
- **Bundle Size**: ≤2MB
- **Test Coverage**: 1238 tests across 46 test files
- **Browser Support**: Chrome, Firefox, Safari, Edge (modern)

### Breaking Changes
- None (backward compatible with AG Grid API patterns)

### Migration from AG Grid
Drop-in replacement for most use cases:
```typescript
// AG Grid
import { AgGridModule } from 'ag-grid-angular';

// DB Grid
import { DbGridModule } from 'db-grid';
```

See [README.md](README.md#-migration-from-ag-grid) for detailed migration guide.

---

## [0.0.0] - Initial Development

Project initialization, architecture design, core prototype.
