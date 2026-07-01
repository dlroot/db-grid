import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

/**
 * db-grid React 包装器
 * 
 * 使用方式:
 * <DbGridReact rowData={rowData} columnDefs={columnDefs} onGridReady={onGridReady} />
 */

export interface DbGridReactProps {
  // 数据属性
  rowData?: any[];
  columnDefs?: any[];
  gridOptions?: any;
  
  // 事件回调
  onGridReady?: (event: any) => void;
  onCellClick?: (event: any) => void;
  onCellDoubleClick?: (event: any) => void;
  onSelectionChanged?: (event: any) => void;
  onSortChanged?: (event: any) => void;
  onFilterChanged?: (event: any) => void;
  onRowClicked?: (event: any) => void;
  onRowDoubleClicked?: (event: any) => void;
  
  // 样式
  style?: React.CSSProperties;
  className?: string;
}

export interface DbGridReactRef {
  getGridApi: () => any;
  setRowData: (data: any[]) => void;
  setColumnDefs: (cols: any[]) => void;
  exportToExcel: (fileName?: string) => void;
}

/**
 * DbGridReact 组件
 */
const DbGridReact = forwardRef<DbGridReactRef, DbGridReactProps>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<any>(null);
  const scriptLoaded = useRef(false);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    getGridApi: () => gridRef.current?.getGridApi(),
    setRowData: (data: any[]) => {
      if (gridRef.current) {
        gridRef.current.setRowData(data);
      }
    },
    setColumnDefs: (cols: any[]) => {
      if (gridRef.current) {
        gridRef.current.setColumnDefs(cols);
      }
    },
    exportToExcel: (fileName?: string) => {
      if (gridRef.current) {
        gridRef.current.exportToExcel(fileName);
      }
    }
  }));

  useEffect(() => {
    // 加载 db-grid 脚本 (Angular Elements)
    if (!scriptLoaded.current) {
      const script = document.createElement('script');
      script.src = `${process.env.PUBLIC_URL || ''}/db-grid-elements.js`;
      script.onload = () => {
        scriptLoaded.current = true;
        initGrid();
      };
      script.onerror = () => {
        console.error('❌ Failed to load db-grid-elements.js');
      };
      document.head.appendChild(script);
    } else {
      initGrid();
    }
  }, []);

  const initGrid = () => {
    if (!containerRef.current) return;
    
    // 创建 <db-grid-element> 元素
    const gridElement = document.createElement('db-grid-element');
    gridElement.style.width = '100%';
    gridElement.style.height = '100%';
    gridElement.style.display = 'block';
    
    // 设置属性
    if (props.rowData) {
      gridElement.rowData = props.rowData;
    }
    if (props.columnDefs) {
      gridElement.columnDefs = props.columnDefs;
    }
    if (props.gridOptions) {
      gridElement.gridOptions = props.gridOptions;
    }
    
    // 监听事件
    if (props.onGridReady) {
      gridElement.addEventListener('gridReady', (event: any) => {
        props.onGridReady!({ ...event.detail, target: gridElement });
      });
    }
    if (props.onCellClick) {
      gridElement.addEventListener('cellClick', (event: any) => {
        props.onCellClick!(event.detail);
      });
    }
    if (props.onCellDoubleClick) {
      gridElement.addEventListener('cellDoubleClick', (event: any) => {
        props.onCellDoubleClick!(event.detail);
      });
    }
    if (props.onSelectionChanged) {
      gridElement.addEventListener('selectionChanged', (event: any) => {
        props.onSelectionChanged!(event.detail);
      });
    }
    if (props.onSortChanged) {
      gridElement.addEventListener('sortChanged', (event: any) => {
        props.onSortChanged!(event.detail);
      });
    }
    if (props.onFilterChanged) {
      gridElement.addEventListener('filterChanged', (event: any) => {
        props.onFilterChanged!(event.detail);
      });
    }
    if (props.onRowClicked) {
      gridElement.addEventListener('rowClicked', (event: any) => {
        props.onRowClicked!(event.detail);
      });
    }
    if (props.onRowDoubleClicked) {
      gridElement.addEventListener('rowDoubleClicked', (event: any) => {
        props.onRowDoubleClicked!(event.detail);
      });
    }
    
    // 等待 gridReady 事件后保存引用
    gridElement.addEventListener('gridReady', (event: any) => {
      gridRef.current = {
        getGridApi: () => event.detail.api,
        setRowData: (data: any[]) => { gridElement.rowData = data; },
        setColumnDefs: (cols: any[]) => { gridElement.columnDefs = cols; },
        exportToExcel: (fileName?: string) => {
          event.detail.api.exportToExcel(fileName || 'export.xlsx');
        }
      };
    });
    
    // 清空容器并添加 grid
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(gridElement);
    }
  };

  // 更新属性
  useEffect(() => {
    if (gridRef.current && props.rowData) {
      gridRef.current.setRowData(props.rowData);
    }
  }, [props.rowData]);

  useEffect(() => {
    if (gridRef.current && props.columnDefs) {
      gridRef.current.setColumnDefs(props.columnDefs);
    }
  }, [props.columnDefs]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '500px',
        ...props.style
      }}
      className={props.className}
    />
  );
});

DbGridReact.displayName = 'DbGridReact';

export default DbGridReact;
