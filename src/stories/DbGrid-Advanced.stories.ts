import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { CommonModule } from '@angular/common';
import { DbGridModule } from '../../projects/db-grid/src/lib/angular/db-grid.module';

const meta: Meta = {
  title: 'DB Grid/Advanced',
  decorators: [
    moduleMetadata({
      imports: [CommonModule, DbGridModule],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

// ========== Master-Detail ==========
interface Order {
  id: number;
  customer: string;
  date: string;
  total: number;
  items?: { product: string; qty: number; price: number }[];
}

const masterDetailData: Order[] = [
  {
    id: 1001,
    customer: 'Alice Johnson',
    date: '2024-01-15',
    total: 150.00,
    items: [
      { product: 'Widget A', qty: 2, price: 25.00 },
      { product: 'Widget B', qty: 5, price: 20.00 },
    ],
  },
  {
    id: 1002,
    customer: 'Bob Smith',
    date: '2024-01-16',
    total: 275.50,
    items: [
      { product: 'Gadget X', qty: 1, price: 150.00 },
      { product: 'Accessory Y', qty: 3, price: 35.00 },
      { product: 'Part Z', qty: 2, price: 27.75 },
    ],
  },
  {
    id: 1003,
    customer: 'Carol White',
    date: '2024-01-17',
    total: 89.99,
    items: [
      { product: 'Service Plan', qty: 1, price: 89.99 },
    ],
  },
];

export const MasterDetail: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 20px;">
        <h3>Master-Detail Grid</h3>
        <p>Click row to expand and see order items</p>
        <db-grid
          [columnDefs]="masterColumns"
          [rowData]="rowData"
          [masterDetail]="true"
          [detailCellRendererParams]="detailParams"
          style="height: 500px; width: 100%;"
        ></db-grid>
      </div>
    `,
    props: {
      masterColumns: [
        { field: 'id', headerName: 'Order ID', width: 100 },
        { field: 'customer', headerName: 'Customer', width: 150 },
        { field: 'date', headerName: 'Date', width: 120 },
        { field: 'total', headerName: 'Total', width: 100, valueFormatter: (p: any) => '$' + p.value.toFixed(2) },
      ],
      rowData: masterDetailData,
      detailParams: {
        detailColDefs: [
          { field: 'product', headerName: 'Product', width: 200 },
          { field: 'qty', headerName: 'Qty', width: 80 },
          { field: 'price', headerName: 'Price', width: 100, valueFormatter: (p: any) => '$' + p.value.toFixed(2) },
        ],
        detailRowDataPath: 'items',
      },
    },
  }),
};

// ========== Pivot Table ==========
interface PivotData {
  region: string;
  product: string;
  quarter: string;
  sales: number;
}

const pivotData: PivotData[] = [
  { region: 'North', product: 'Widget', quarter: 'Q1', sales: 1000 },
  { region: 'North', product: 'Widget', quarter: 'Q2', sales: 1200 },
  { region: 'North', product: 'Gadget', quarter: 'Q1', sales: 800 },
  { region: 'North', product: 'Gadget', quarter: 'Q2', sales: 900 },
  { region: 'South', product: 'Widget', quarter: 'Q1', sales: 1500 },
  { region: 'South', product: 'Widget', quarter: 'Q2', sales: 1800 },
  { region: 'South', product: 'Gadget', quarter: 'Q1', sales: 1100 },
  { region: 'South', product: 'Gadget', quarter: 'Q2', sales: 1300 },
  { region: 'East', product: 'Widget', quarter: 'Q1', sales: 700 },
  { region: 'East', product: 'Widget', quarter: 'Q2', sales: 850 },
  { region: 'East', product: 'Gadget', quarter: 'Q1', sales: 600 },
  { region: 'East', product: 'Gadget', quarter: 'Q2', sales: 750 },
  { region: 'West', product: 'Widget', quarter: 'Q1', sales: 2000 },
  { region: 'West', product: 'Widget', quarter: 'Q2', sales: 2200 },
  { region: 'West', product: 'Gadget', quarter: 'Q1', sales: 1400 },
  { region: 'West', product: 'Gadget', quarter: 'Q2', sales: 1600 },
];

export const PivotTable: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 20px;">
        <h3>Pivot Table</h3>
        <p>Sales by Region → Product, pivoted by Quarter</p>
        <db-grid
          [columnDefs]="pivotColumns"
          [rowData]="rowData"
          [enablePivot]="true"
          [pivotMode]="true"
          style="height: 400px; width: 100%;"
        ></db-grid>
      </div>
    `,
    props: {
      pivotColumns: [
        { field: 'region', headerName: 'Region', width: 100, rowGroup: true },
        { field: 'product', headerName: 'Product', width: 100, rowGroup: true },
        { field: 'quarter', headerName: 'Quarter', pivot: true },
        { field: 'sales', headerName: 'Sales', width: 100, aggFunc: 'sum' },
      ],
      rowData: pivotData,
    },
  }),
};

// ========== Range Selection ==========
export const RangeSelection: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 20px;">
        <h3>Range Selection</h3>
        <p>Click and drag to select a range of cells. Use fill handle (bottom-right corner) to copy values.</p>
        <db-grid
          [columnDefs]="columns"
          [rowData]="rowData"
          [enableRangeSelection]="true"
          [enableFillHandle]="true"
          [rowSelection]="'multiple'"
          style="height: 400px; width: 100%;"
        ></db-grid>
      </div>
    `,
    props: {
      columns: [
        { field: 'id', headerName: 'ID', width: 80 },
        { field: 'name', headerName: 'Name', width: 150, editable: true },
        { field: 'department', headerName: 'Department', width: 130, editable: true },
        { field: 'salary', headerName: 'Salary', width: 110, editable: true },
        { field: 'bonus', headerName: 'Bonus %', width: 100, editable: true },
      ],
      rowData: [
        { id: 1, name: 'Alice', department: 'Engineering', salary: 95000, bonus: 10 },
        { id: 2, name: 'Bob', department: 'Sales', salary: 75000, bonus: 15 },
        { id: 3, name: 'Carol', department: 'Marketing', salary: 80000, bonus: 12 },
        { id: 4, name: 'David', department: 'Engineering', salary: 110000, bonus: 10 },
        { id: 5, name: 'Eve', department: 'HR', salary: 65000, bonus: 8 },
      ],
    },
  }),
};

// ========== Row Drag & Drop ==========
export const RowDragDrop: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 20px;">
        <h3>Row Drag & Drop</h3>
        <p>Drag the grip handle to reorder rows</p>
        <db-grid
          [columnDefs]="columns"
          [rowData]="rowData"
          [rowDragManaged]="true"
          [animateRows]="true"
          style="height: 400px; width: 100%;"
        ></db-grid>
      </div>
    `,
    props: {
      columns: [
        { field: 'id', headerName: '', width: 50, rowDrag: true },
        { field: 'id', headerName: 'ID', width: 80 },
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'department', headerName: 'Department', width: 130 },
      ],
      rowData: [
        { id: 1, name: 'Alice', department: 'Engineering' },
        { id: 2, name: 'Bob', department: 'Sales' },
        { id: 3, name: 'Carol', department: 'Marketing' },
        { id: 4, name: 'David', department: 'Engineering' },
        { id: 5, name: 'Eve', department: 'HR' },
      ],
    },
  }),
};

// ========== Row Pinning ==========
export const RowPinning: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 20px;">
        <h3>Row Pinning</h3>
        <p>First row pinned to top, last row pinned to bottom</p>
        <db-grid
          [columnDefs]="columns"
          [rowData]="rowData"
          [pinnedTopRowData]="pinnedTop"
          [pinnedBottomRowData]="pinnedBottom"
          style="height: 400px; width: 100%;"
        ></db-grid>
      </div>
    `,
    props: {
      columns: [
        { field: 'id', headerName: 'ID', width: 80 },
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'department', headerName: 'Department', width: 130 },
        { field: 'salary', headerName: 'Salary', width: 110 },
      ],
      rowData: [
        { id: 2, name: 'Bob', department: 'Sales', salary: 75000 },
        { id: 3, name: 'Carol', department: 'Marketing', salary: 80000 },
        { id: 4, name: 'David', department: 'Engineering', salary: 110000 },
        { id: 5, name: 'Eve', department: 'HR', salary: 65000 },
      ],
      pinnedTop: [{ id: 1, name: 'Alice (Summary)', department: 'Engineering', salary: 95000 }],
      pinnedBottom: [{ id: 'Total', name: 'Total', department: '-', salary: 425000 }],
    },
  }),
};

// ========== Cell Spanning ==========
export const CellSpanning: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 20px;">
        <h3>Cell Spanning</h3>
        <p>Cells can span multiple rows/columns</p>
        <db-grid
          [columnDefs]="columns"
          [rowData]="rowData"
          [enableCellSpan]="true"
          style="height: 400px; width: 100%;"
        ></db-grid>
      </div>
    `,
    props: {
      columns: [
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'monday', headerName: 'Monday', width: 100 },
        { field: 'tuesday', headerName: 'Tuesday', width: 100 },
        { field: 'wednesday', headerName: 'Wednesday', width: 100 },
      ],
      rowData: [
        { name: 'Alice', monday: 'Working', tuesday: 'Working', wednesday: 'Off' },
        { name: 'Bob', monday: 'Meeting', tuesday: 'Meeting', wednesday: 'Meeting' },
        { name: 'Carol', monday: 'Off', tuesday: 'Working', wednesday: 'Working' },
      ],
    },
  }),
};

// ========== Undo/Redo ==========
export const UndoRedo: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 20px;">
        <h3>Undo/Redo</h3>
        <p>Edit cells and use Ctrl+Z to undo, Ctrl+Y or Ctrl+Shift+Z to redo</p>
        <db-grid
          [columnDefs]="columns"
          [rowData]="rowData"
          [undoRedoEnabled]="true"
          [undoRedoCellEditingLimit]="50"
          style="height: 400px; width: 100%;"
        ></db-grid>
      </div>
    `,
    props: {
      columns: [
        { field: 'id', headerName: 'ID', width: 80 },
        { field: 'name', headerName: 'Name', width: 150, editable: true },
        { field: 'department', headerName: 'Department', width: 130, editable: true },
        { field: 'salary', headerName: 'Salary', width: 110, editable: true },
      ],
      rowData: [
        { id: 1, name: 'Alice', department: 'Engineering', salary: 95000 },
        { id: 2, name: 'Bob', department: 'Sales', salary: 75000 },
        { id: 3, name: 'Carol', department: 'Marketing', salary: 80000 },
      ],
    },
  }),
};

// ========== Clipboard ==========
export const Clipboard: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 20px;">
        <h3>Clipboard Operations</h3>
        <p>
          - Ctrl+C: Copy selected cells<br>
          - Ctrl+X: Cut selected cells<br>
          - Ctrl+V: Paste from clipboard<br>
          - Ctrl+A: Select all
        </p>
        <db-grid
          [columnDefs]="columns"
          [rowData]="rowData"
          [enableRangeSelection]="true"
          [enableClipboard]="true"
          style="height: 400px; width: 100%;"
        ></db-grid>
      </div>
    `,
    props: {
      columns: [
        { field: 'id', headerName: 'ID', width: 80 },
        { field: 'name', headerName: 'Name', width: 150, editable: true },
        { field: 'department', headerName: 'Department', width: 130, editable: true },
        { field: 'salary', headerName: 'Salary', width: 110, editable: true },
      ],
      rowData: [
        { id: 1, name: 'Alice', department: 'Engineering', salary: 95000 },
        { id: 2, name: 'Bob', department: 'Sales', salary: 75000 },
        { id: 3, name: 'Carol', department: 'Marketing', salary: 80000 },
        { id: 4, name: 'David', department: 'Engineering', salary: 110000 },
        { id: 5, name: 'Eve', department: 'HR', salary: 65000 },
      ],
    },
  }),
};
