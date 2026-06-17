# Range Selection Right-Click Fix - 2025-01-20

## 问题
区域选中多个单元格后，鼠标右键点击单元格，右键菜单弹出但区域选中状态丢失。

## 根因
`onRangeMouseDown` 监听所有鼠标按键。当右键按下时：
1. 浏览器先触发 `mousedown` 事件（`e.button === 2`）
2. `onRangeMouseDown` 调用 `rangeSelectionService.startRangeSelection()`
3. `startRangeSelection` 在无 Shift/Ctrl 时执行 `this.ranges = []` **清空所有已有范围**
4. `contextmenu` 事件触发显示右键菜单时，范围已经被清空了

## 修复
```typescript
private onRangeMouseDown = (e: MouseEvent): void => {
  // 右键不触发区域拖选，避免清空已有选中状态
  if (e.button !== 0) return;
  // ...
};
```

同时在 `showCellContextMenu` 添加 `event.stopPropagation()` 阻止事件冒泡。

## 扩展修复：左键点击区域内不丢失
2025-01-20（同一次会话）

左键点击选中区域内的单元格也会清空范围。修复：
```typescript
private onRangeMouseDown = (e: MouseEvent): void => {
  if (e.button !== 0) return;
  const hasRanges = this.rangeSelectionService.getRanges().length > 0;
  const inExistingRange = hasRanges && this.rangeSelectionService.isCellInRange(rowIndex, colId);
  if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
    if (hasRanges && !inExistingRange) {
      // 点击在范围外 → 清空旧范围，开始新范围
      this.rangeSelectionService.startRangeSelection(rowIndex, colId, e);
    } else {
      // 点击在范围内 → 只更新焦点，不清空范围
      this.rangeSelectionService.setFocusedCell(rowIndex, colId);
    }
  } else {
    this.rangeSelectionService.startRangeSelection(rowIndex, colId, e);
  }
};
```

## Git
- master: `b107d41`
- gh-pages: `76a8b61`
