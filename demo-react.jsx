/**
 * DbGrid Angular Elements - React 使用示例
 * 
 * 安装依赖:
 * npm install react react-dom
 * 
 * 使用方式:
 * 1. 在 public/index.html 中引入 <script src="db-grid-elements.js"></script>
 * 2. 使用 <DbGrid> 组件（如下）
 */

import React, { useEffect, useRef, useState } from 'react';

/**
 * DbGrid React 包装组件
 */
const DbGrid = ({ rowData, columnDefs, onGridReady, onCellClick, ...props }) => {
  const containerRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    // 等待自定义元素注册
    const initGrid = async () => {
      if (!customElements.get('db-grid-element')) {
        await customElements.whenDefined('db-grid-element');
      }

      if (containerRef.current && !gridRef.current) {
        // 创建 Web Component
        const grid = document.createElement('db-grid-element');
        grid.style.width = '100%';
        grid.style.height = '500px';
        grid.style.display = 'block';

        // 设置属性
        if (rowData) grid.rowData = rowData;
        if (columnDefs) grid.columnDefs = columnDefs;

        // 监听事件
        if (onGridReady) {
          grid.addEventListener('gridReady', (e) => onGridReady(e.detail));
        }
        if (onCellClick) {
          grid.addEventListener('cellClick', (e) => onCellClick(e.detail));
        }

        // 添加到 DOM
        containerRef.current.appendChild(grid);
        gridRef.current = grid;
      }
    };

    initGrid();

    // 清理
    return () => {
      if (gridRef.current && containerRef.current) {
        containerRef.current.removeChild(gridRef.current);
        gridRef.current = null;
      }
    };
  }, []);

  // 更新属性
  useEffect(() => {
    if (gridRef.current && rowData) {
      gridRef.current.rowData = rowData;
    }
  }, [rowData]);

  useEffect(() => {
    if (gridRef.current && columnDefs) {
      gridRef.current.columnDefs = columnDefs;
    }
  }, [columnDefs]);

  return <div ref={containerRef} style={{ width: '100%', height: '500px' }} />;
};

/**
 * 示例: App 组件
 */
const App = () => {
  const [gridApi, setGridApi] = useState(null);

  // 列定义
  const columnDefs = [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'name', headerName: '姓名', width: 150 },
    { field: 'age', headerName: '年龄', width: 100 },
    { field: 'email', headerName: '邮箱', width: 200 },
    { field: 'department', headerName: '部门', width: 150 }
  ];

  // 行数据
  const [rowData, setRowData] = useState([
    { id: 1, name: '张三', age: 28, email: 'zhangsan@example.com', department: '工程' },
    { id: 2, name: '李四', age: 32, email: 'lisi@example.com', department: '销售' },
    { id: 3, name: '王五', age: 25, email: 'wangwu@example.com', department: '市场' }
  ]);

  // Grid 就绪回调
  const onGridReady = (api) => {
    console.log('✅ Grid API 就绪:', api);
    setGridApi(api);
  };

  // 单元格点击
  const onCellClick = (event) => {
    console.log('🖱️ 单元格点击:', event);
  };

  // 添加行
  const addRow = () => {
    const newRow = {
      id: Date.now(),
      name: `新员工_${Math.floor(Math.random() * 100)}`,
      age: Math.floor(Math.random() * 30) + 20,
      email: `new${Date.now()}@example.com`,
      department: ['工程', '销售', '市场'][Math.floor(Math.random() * 3)]
    };
    setRowData([...rowData, newRow]);
  };

  // 导出 Excel
  const exportExcel = () => {
    if (gridApi) {
      gridApi.exportToExcel('react-export.xlsx');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>📊 DbGrid React 示例</h1>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={addRow} style={{ marginRight: '10px', padding: '8px 16px' }}>
          ➕ 添加行
        </button>
        <button onClick={exportExcel} style={{ padding: '8px 16px' }}>
          📊 导出 Excel
        </button>
      </div>

      <DbGrid
        rowData={rowData}
        columnDefs={columnDefs}
        onGridReady={onGridReady}
        onCellClick={onCellClick}
      />
    </div>
  );
};

export default App;
