import type { Meta, StoryObj } from '@storybook/angular';
import { componentWrapperDecorator, moduleMetadata } from '@storybook/angular';
import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';

// Import db-grid
import { DbGridModule } from '../../projects/db-grid/src/lib/angular/db-grid.module';

/**
 * DB Grid is a high-performance Angular data grid component,
 * compatible with AG Grid API patterns.
 */
const meta: Meta = {
  title: 'DB Grid/Basic',
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

// ========== Basic Grid ==========
interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
  startDate: string;
  active: boolean;
}

const basicData: Employee[] = [
  { id: 1, name: 'Alice Johnson', department: 'Engineering', salary: 95000, startDate: '2020-01-15', active: true },
  { id: 2, name: 'Bob Smith', department: 'Sales', salary: 75000, startDate: '2019-06-01', active: true },
  { id: 3, name: 'Carol White', department: 'Marketing', salary: 80000, startDate: '2021-03-20', active: false },
  { id: 4, name: 'David Brown', department: 'Engineering', salary: 110000, startDate: '2018-11-10', active: true },
  { id: 5, name: 'Eve Davis', department: 'HR', salary: 65000, startDate: '2022-02-28', active: true },
  { id: 6, name: 'Frank Miller', department: 'Engineering', salary: 98000, startDate: '2020-07-14', active: true },
  { id: 7, name: 'Grace Lee', department: 'Sales', salary: 82000, startDate: '2019-09-05', active: false },
  { id: 8, name: 'Henry Wilson', department: 'Marketing', salary: 72000, startDate: '2021-05-12', active: true },
];

const basicColumns = [
  { field: 'id', headerName: 'ID', width: 80, sortable: true, filter: 'number' },
  { field: 'name', headerName: 'Name', width: 150, sortable: true, filter: 'text' },
  { field: 'department', headerName: 'Department', width: 130, sortable: true, filter: 'set' },
  { field: 'salary', headerName: 'Salary', width: 110, sortable: true, filter: 'number', valueFormatter: (p: any) => '$' + p.value?.toLocaleString() },
  { field: 'startDate', headerName: 'Start Date', width: 120, sortable: true, filter: 'date' },
  { field: 'active', headerName: 'Active', width: 90, filter: 'boolean', cellRenderer: 'checkbox' },
];

export const Basic: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 20px;">
        <h3>Basic Grid</h3>
        <db-grid
          [columnDefs]="columnDefs"
          [rowData]="rowData"
          [rowSelection]="'multiple'"
          [pagination]="true"
          [paginationPageSize]="10"
          style="height: 400px; width: 100%;"
        ></db-grid>
      </div>
    `,
    props: {
      columnDefs: basicColumns,
      rowData: basicData,
    },
  }),
};

// ========== Large Data Set ==========
const generateLargeData = (count: number): Employee[] => {
  const depts = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Legal', 'Support', 'Operations'];
  const names = ['Alice', 'Bob', 'Carol', 'David', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack', 'Kate', 'Leo', 'Mia', 'Noah', 'Olivia'];
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${names[i % names.length]} ${depts[i % depts.length]}`,
    department: depts[i % depts.length],
    salary: 50000 + Math.floor(Math.random() * 80000),
    startDate: `${2015 + Math.floor(i / 100)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
    active: i % 4 !== 0,
  }));
};

export const LargeData: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 20px;">
        <h3>Virtual Scroll - 10,000 Rows</h3>
        <db-grid
          [columnDefs]="columnDefs"
          [rowData]="rowData"
          [rowSelection]="'multiple'"
          style="height: 500px; width: 100%;"
        ></db-grid>
      </div>
    `,
    props: {
      columnDefs: basicColumns,
      rowData: generateLargeData(10000),
    },
  }),
};

// ========== Editable Grid ==========
export const Editable: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 20px;">
        <h3>Editable Grid</h3>
        <p>Double-click cells to edit. Supports undo/redo with Ctrl+Z / Ctrl+Y</p>
        <db-grid
          [columnDefs]="editableColumns"
          [rowData]="rowData"
          [undoRedoEnabled]="true"
          style="height: 400px; width: 100%;"
        ></db-grid>
      </div>
    `,
    props: {
      editableColumns: basicColumns.map(col => ({ ...col, editable: true })),
      rowData: [...basicData],
    },
  }),
};

// ========== Pinned Columns ==========
export const PinnedColumns: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 20px;">
        <h3>Pinned Columns</h3>
        <p>ID pinned left, Active pinned right</p>
        <db-grid
          [columnDefs]="pinnedColumns"
          [rowData]="rowData"
          style="height: 400px; width: 100%;"
        ></db-grid>
      </div>
    `,
    props: {
      pinnedColumns: [
        { field: 'id', headerName: 'ID', width: 80, pinned: 'left' },
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'department', headerName: 'Department', width: 130 },
        { field: 'salary', headerName: 'Salary', width: 110 },
        { field: 'startDate', headerName: 'Start Date', width: 120 },
        { field: 'active', headerName: 'Active', width: 90, pinned: 'right' },
      ],
      rowData: basicData,
    },
  }),
};

// ========== Row Selection ==========
export const RowSelection: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 20px;">
        <h3>Row Selection</h3>
        <p>Click checkboxes or rows to select. Ctrl+click for multi-select.</p>
        <db-grid
          [columnDefs]="columnDefs"
          [rowData]="rowData"
          [rowSelection]="'multiple'"
          [suppressRowClickSelection]="false"
          style="height: 400px; width: 100%;"
        ></db-grid>
      </div>
    `,
    props: {
      columnDefs: [
        { field: 'id', headerName: 'ID', width: 80, checkboxSelection: true },
        ...basicColumns.slice(1),
      ],
      rowData: basicData,
    },
  }),
};

// ========== Grouping ==========
interface EmployeeWithGroup extends Employee {
  country?: string;
  city?: string;
}

const groupedData: EmployeeWithGroup[] = basicData.map((e, i) => ({
  ...e,
  country: i < 3 ? 'USA' : i < 5 ? 'UK' : 'Germany',
  city: i < 3 ? 'New York' : i < 5 ? 'London' : 'Berlin',
}));

export const RowGrouping: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 20px;">
        <h3>Row Grouping</h3>
        <p>Group by Country → City</p>
        <db-grid
          [columnDefs]="groupColumns"
          [rowData]="rowData"
          [enableGrouping]="true"
          [groupDisplayType]="'groupRows'"
          style="height: 400px; width: 100%;"
        ></db-grid>
      </div>
    `,
    props: {
      groupColumns: [
        { field: 'country', headerName: 'Country', width: 120, rowGroup: true, hide: true },
        { field: 'city', headerName: 'City', width: 100, rowGroup: true, hide: true },
        { field: 'id', headerName: 'ID', width: 80 },
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'department', headerName: 'Department', width: 130 },
        { field: 'salary', headerName: 'Salary', width: 110, aggFunc: 'sum' },
      ],
      rowData: groupedData,
    },
  }),
};

// ========== Tree Data ==========
interface TreeNode {
  id: string;
  name: string;
  type: string;
  size?: number;
  children?: TreeNode[];
}

const treeData: TreeNode[] = [
  {
    id: '1', name: 'Root', type: 'folder',
    children: [
      { id: '1.1', name: 'Folder A', type: 'folder', children: [
        { id: '1.1.1', name: 'File 1', type: 'file', size: 1024 },
        { id: '1.1.2', name: 'File 2', type: 'file', size: 2048 },
      ]},
      { id: '1.2', name: 'Folder B', type: 'folder', children: [
        { id: '1.2.1', name: 'File 3', type: 'file', size: 512 },
      ]},
      { id: '1.3', name: 'File 4', type: 'file', size: 4096 },
    ]
  }
];

export const TreeData: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 20px;">
        <h3>Tree Data</h3>
        <p>Hierarchical data with expand/collapse</p>
        <db-grid
          [columnDefs]="treeColumns"
          [rowData]="rowData"
          [enableTreeData]="true"
          [getDataPath]="getDataPath"
          style="height: 400px; width: 100%;"
        ></db-grid>
      </div>
    `,
    props: {
      treeColumns: [
        { field: 'name', headerName: 'Name', width: 250 },
        { field: 'type', headerName: 'Type', width: 100 },
        { field: 'size', headerName: 'Size (KB)', width: 120, valueFormatter: (p: any) => p.value ? Math.round(p.value / 1024) + ' KB' : '-' },
      ],
      rowData: treeData,
      getDataPath: (data: any) => data.id.split('.'),
    },
  }),
};

// ========== Themes ==========
export const Themes: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 20px;">
        <h3>Theme: Alpine (Default)</h3>
        <db-grid
          [columnDefs]="columnDefs"
          [rowData]="rowData"
          theme="alpine"
          style="height: 200px; width: 100%;"
        ></db-grid>

        <h3 style="margin-top: 20px;">Theme: Balham</h3>
        <db-grid
          [columnDefs]="columnDefs"
          [rowData]="rowData"
          theme="balham"
          style="height: 200px; width: 100%;"
        ></db-grid>

        <h3 style="margin-top: 20px;">Theme: Material</h3>
        <db-grid
          [columnDefs]="columnDefs"
          [rowData]="rowData"
          theme="material"
          style="height: 200px; width: 100%;"
        ></db-grid>
      </div>
    `,
    props: {
      columnDefs: basicColumns,
      rowData: basicData.slice(0, 5),
    },
  }),
};

// ========== Sparklines ==========
interface SalesData {
  month: string;
  sales: number[];
  trend: number[];
}

const sparklineData: SalesData[] = [
  { month: 'Jan', sales: [10, 15, 12, 18, 22], trend: [1, 2, 3, 4, 5] },
  { month: 'Feb', sales: [20, 18, 25, 22, 28], trend: [2, 3, 4, 5, 6] },
  { month: 'Mar', sales: [15, 20, 18, 25, 30], trend: [3, 4, 5, 6, 7] },
  { month: 'Apr', sales: [25, 30, 28, 35, 40], trend: [4, 5, 6, 7, 8] },
];

export const Sparklines: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 20px;">
        <h3>In-Cell Sparklines</h3>
        <db-grid
          [columnDefs]="sparklineColumns"
          [rowData]="rowData"
          style="height: 300px; width: 100%;"
        ></db-grid>
      </div>
    `,
    props: {
      sparklineColumns: [
        { field: 'month', headerName: 'Month', width: 100 },
        {
          field: 'sales',
          headerName: 'Sales Trend',
          width: 150,
          enableCharts: true,
          chartConfig: { type: 'sparkline', height: 30 },
        },
        {
          field: 'trend',
          headerName: 'Growth',
          width: 150,
          enableCharts: true,
          chartConfig: { type: 'bar', height: 30 },
        },
      ],
      rowData: sparklineData,
    },
  }),
};
