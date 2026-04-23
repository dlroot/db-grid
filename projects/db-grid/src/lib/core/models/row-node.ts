/**
 * 行节点模型
 * 表示表格中的一行数据
 */

export interface RowNode {
  // 基础属性
  id: string;
  data: any;
  rowIndex: number | null;
  uiLevel: number;

  // 父子关系
  parent: RowNode | null;
  children: RowNode[];
  hasChildren?: boolean;  // 是否有子节点（用于树形渲染）
  childIndex: number;
  allChildrenCount: number;
  level: number;

  // 选择状态
  selected: boolean;
  checkable: boolean;
  isSelected?: () => boolean;
  setSelected?: (value: boolean, clearSelection?: boolean) => void;

  // 展开状态
  expanded: boolean;

  // 浮动行
  floating: 'top' | 'bottom' | null;
  isFloating?: () => boolean;
  isFloatingRow?: () => boolean;
  floatLeft?: () => void;
  floatRight?: () => void;

  // 行属性
  rowHeight: number;
  firstChild: boolean;
  lastChild: boolean;

  // 编辑状态
  isEditing: boolean;
  isCellEditing: boolean;
  canFreelyFunc: boolean;

  // 状态标志
  isRowPinned: boolean;
  isColumnsLoading: boolean;

  // 树形数据
  group: boolean;
  groupData: Record<string, any>;
  key: string;
  rowGroupIndex: number | null;
  siblingGroups: RowNode[];
  allGroups: RowNode[];

  // 加载状态
  childrenAfterFilter: RowNode[];
  childrenAfterGroup: RowNode[];
  childrenAfterSort: RowNode[];

  // 函数属性
  addEventListener: (eventType: string, listener: (event: any) => void) => void;
  removeEventListener: (eventType: string, listener: (event: any) => void) => void;
  dispatchEvent: (event: any) => void;
  resetQuickFilterAggregate: () => void;
  updateData: (data: any) => void;
  setData: (data: any) => void;
  setDataUpdated: () => void;
  incrementCounter: (name: string) => number;
  addChild: () => void;
  depthFirstSearch: (callback: (node: RowNode) => void) => void;
  calculateHeight: () => number;
  setRowHeight: (height: number) => void;
  getViewportTop: () => number;
  getViewportBottom: () => number;
  getRowBottom: () => number;
  getRowTop: () => number;
  getMiddleY: () => number;
}

/** 创建空行节点 */
export function createEmptyRowNode(): RowNode {
  return {
    id: '',
    data: null,
    rowIndex: null,
    uiLevel: 0,
    parent: null,
    children: [],
    childIndex: 0,
    allChildrenCount: 0,
    level: 0,
    selected: false,
    checkable: true,
    isSelected: () => false,
    setSelected: () => {},
    expanded: false,
    floating: null,
    isFloating: () => false,
    isFloatingRow: () => false,
    floatLeft: () => {},
    floatRight: () => {},
    rowHeight: 40,
    firstChild: false,
    lastChild: false,
    isEditing: false,
    isCellEditing: false,
    canFreelyFunc: false,
    isRowPinned: false,
    isColumnsLoading: false,
    group: false,
    groupData: {},
    key: '',
    rowGroupIndex: null,
    siblingGroups: [],
    allGroups: [],
    childrenAfterFilter: [],
    childrenAfterGroup: [],
    childrenAfterSort: [],
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
    resetQuickFilterAggregate: () => {},
    updateData: () => {},
    setData: () => {},
    setDataUpdated: () => {},
    incrementCounter: () => 0,
    addChild: () => {},
    depthFirstSearch: () => {},
    calculateHeight: () => 0,
    setRowHeight: () => {},
    getViewportTop: () => 0,
    getViewportBottom: () => 0,
    getRowBottom: () => 0,
    getRowTop: () => 0,
    getMiddleY: () => 0,
  };
}
