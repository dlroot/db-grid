// db-grid React 包装器 - 导出文件

export { default as DbGridReact } from './DbGridReact';
export type { DbGridReactProps, DbGridReactRef } from './DbGridReact';

/**
 * 使用示例:
 * 
 * import { DbGridReact } from 'db-grid/wrappers/react';
 * import type { DbGridReactProps } from 'db-grid/wrappers/react';
 * 
 * function App() {
 *   const [rowData, setRowData] = useState([...]);
 *   const [columnDefs, setColumnDefs] = useState([...]);
 *   
 *   const handleGridReady = (event: any) => {
 *     console.log('Grid ready:', event.api);
 *   };
 *   
 *   return (
 *     <DbGridReact
 *       rowData={rowData}
 *       columnDefs={columnDefs}
 *       onGridReady={handleGridReady}
 *       style={{ height: '500px' }}
 *     />
 *   );
 * }
 */
