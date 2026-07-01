/**
 * Grid State Model
 * 统一的状态持久化接口，聚合所有网格状态
 * 参考 ag-Grid 的 getState()/setState() API
 */

import { ColumnState } from '../services/column.service';
import { SortModelItem, FilterModel } from './index';

/**
 * 完整的网格状态
 */
export interface GridState {
  /** 列状态（顺序、宽度、可见性、固定位置） */
  columnStates: ColumnState[];
  
  /** 列顺序（colId 数组，定义显示顺序） */
  columnOrder: string[];
  
  /** 排序模型 */
  sortModel: SortModelItem[];
  
  /** 过滤模型 */
  filterModel: FilterModel;
  
  /** 高级过滤模型 */
  advancedFilterModel: any | null;
  
  /** 分组状态（分组字段列表） */
  groupState: string[];
  
  /** 选中行状态（行 ID 列表） */
  selectionState: string[];
  
  /** 侧边栏状态 */
  sidebarState?: {
    visible: boolean;
    activeTab?: string;
  };
  
  /** 透视表状态 */
  pivotState?: {
    pivotColumnIds: string[];
    valueColumnIds: string[];
    aggregationFunctions: string[];
  };
  
  /** 范围选择状态 */
  rangeSelectionState?: any[];
  
  /** 行展开状态（树形/主从表） */
  expandedRows?: string[];
  
  /** 状态版本（用于兼容性检查） */
  version?: string;
  
  /** 状态时间戳 */
  timestamp?: number;
}

/**
 * 状态持久化配置
 */
export interface StatePersistenceConfig {
  /** localStorage 键名 */
  storageKey: string;
  
  /** 是否自动保存到 localStorage */
  autoSave?: boolean;
  
  /** 是否自动从 localStorage 恢复 */
  autoLoad?: boolean;
  
  /** 保存的事件（默认：columnMoved, columnResized, sortChanged, filterChanged） */
  saveEvents?: string[];
  
  /** 状态版本 */
  version?: string;
}

/**
 * 默认状态持久化配置
 */
export const DEFAULT_STATE_CONFIG: StatePersistenceConfig = {
  storageKey: 'db-grid-state',
  autoSave: true,
  autoLoad: true,
  saveEvents: [
    'columnMoved',
    'columnResized',
    'columnVisible',
    'columnPinned',
    'sortChanged',
    'filterChanged',
    'advancedFilterChanged',
    'selectionChanged',
    'columnOrderChanged',
  ],
  version: '1.0.0',
};
