# DB Grid 撤销重做功能问题诊断报告

## 问题现象
用户反馈"撤销重做功能不好用"

## 代码分析

### 1. 撤销重做服务实现 ✅
**文件**: `projects/db-grid/src/lib/core/services/undo-redo.service.ts`
- 服务实现完整,支持多种操作类型:
  - edit (单元格编辑)
  - rowAdd (添加行)
  - rowDelete (删除行)
  - columnResize (列宽调整)
  - columnMove (列移动)
  - sortChange (排序变更)
  - filterChange (筛选变更)
- 单元测试覆盖完整,所有测试通过 ✅

### 2. 键盘快捷键支持 ✅
**文件**: `db-grid.component.ts` (行 3880-3900)
- Ctrl+Z: 撤销 ✅
- Ctrl+Y: 重做 ✅
- Ctrl+Shift+Z: 重做 ✅

### 3. 编辑操作记录撤销 ✅
**文件**: `db-grid.component.ts` (行 5249-5253, 5298-5307)
- 单元格编辑提交时正确记录 ✅
- 粘贴数据时正确记录 ✅

### 4. 撤销/重做应用逻辑 ⚠️ **发现问题**

**文件**: `db-grid.component.ts` (行 3648-3710)

#### 问题1: `applyUndoAction` 实现不完整

```typescript
private applyUndoAction(action: any): void {
  switch (action.type) {
    case 'edit':
      const rowNode = this.dataService.getRowNode(String(action.rowIndex));
      if (rowNode && action.colId) {
        rowNode.data[action.colId] = action.oldValue;
        this.refreshView();
      }
      break;
    case 'rowAdd':
      // 撤销添加 = 删除最后一行
      const currentData = this.getRowData();
      if (currentData.length > 0) {
        currentData.pop();  // ❌ 问题：应该删除特定位置的行，而不是最后一行
        this.setRowData(currentData);
      }
      break;
    case 'rowDelete':
      // 撤销删除 = 恢复行
      const allData = this.getRowData();
      const insertIdx = Math.min(action.rowIndex, allData.length);
      allData.splice(insertIdx, 0, action.rowData);
      this.setRowData(allData);
      break;
  }
}
```

**问题分析**:
- `rowAdd` 撤销逻辑错误：总是删除最后一行，而不是撤销时添加的那一行
- 如果添加行不是在最后一行（demo 中是插入到开头），撤销会删除错误的行
- 缺少 `columnResize`, `columnMove`, `sortChange`, `filterChange` 的撤销实现

#### 问题2: `applyRedoAction` 实现不完整

```typescript
private applyRedoAction(action: any): void {
  switch (action.type) {
    case 'edit':
      const rowNode = this.dataService.getRowNode(action.rowIndex);
      if (rowNode && action.colId) {
        rowNode.data[action.colId] = action.newValue;
        this.refreshView();
      }
      break;
    case 'rowAdd':
      const rdData = this.getRowData();
      rdData.push(action.rowData);  // ❌ 问题：应该插入到原位置，而不是追加到末尾
      this.setRowData(rdData);
      break;
    case 'rowDelete':
      const ddData = this.getRowData();
      const delIdx = Math.min(action.rowIndex, ddData.length - 1);
      ddData.splice(delIdx, 1);
      this.setRowData(ddData);
      break;
  }
}
```

**问题分析**:
- `rowAdd` 重做逻辑错误：总是追加到末尾，而不是原位置
- demo 中添加行是插入到开头 (`[newRow, ...this.undoRedoRowData]`)
- 但重做时却追加到末尾，导致行位置不一致
- 缺少其他操作类型的重做实现

### 5. 行索引问题 ⚠️

**文件**: `app.ts` (行 1326-1343)

```typescript
addRow(): void {
  // ...
  this.undoRedoRowData = [newRow, ...this.undoRedoRowData];  // 插入到开头
  // ...
  this.gridApi?.getUndoRedoService()?.recordRowAdd({
    rowIndex: 0,  // 记录位置为 0
    rowData: newRow,
  });
}
```

撤销时:
```typescript
case 'rowAdd':
  const currentData = this.getRowData();
  currentData.pop();  // ❌ 删除最后一行，而不是索引 0 的行
  this.setRowData(currentData);
  break;
```

**结果**: 撤销添加行时，会删除错误的行（最后一行而不是新添加的第一行）

## 修复建议

### 修复1: `applyUndoAction` 中的 `rowAdd` 逻辑

```typescript
case 'rowAdd':
  // 撤销添加 = 删除指定位置的行
  const currentData = this.getRowData();
  if (action.rowIndex !== undefined && action.rowIndex < currentData.length) {
    currentData.splice(action.rowIndex, 1);  // ✅ 删除指定位置
    this.setRowData(currentData);
  }
  break;
```

### 修复2: `applyRedoAction` 中的 `rowAdd` 逻辑

```typescript
case 'rowAdd':
  const rdData = this.getRowData();
  const insertIdx = action.rowIndex ?? rdData.length;  // ✅ 插入到原位置
  rdData.splice(insertIdx, 0, action.rowData);
  this.setRowData(rdData);
  break;
```

### 修复3: 添加缺失的操作类型处理

需要为以下操作类型实现撤销/重做:
- `columnResize`
- `columnMove`
- `sortChange`
- `filterChange`

### 修复4: Demo 按钮状态更新

**文件**: `app.html` (撤销重做演示部分)

当前按钮没有禁用状态，用户点击无效按钮时没有反馈:

```html
<button class="btn" (click)="undo()" [disabled]="!canUndo()">↩️ 撤销</button>
<button class="btn" (click)="redo()" [disabled]="!canRedo()">↪️ 重做</button>
```

建议添加状态指示:
```html
<button class="btn" (click)="undo()" [disabled]="!canUndo()" [class.btn-disabled]="!canUndo()">
  ↩️ 撤销 ({{ undoStackSize() }})
</button>
<button class="btn" (click)="redo()" [disabled]="!canRedo()" [class.btn-disabled]="!canRedo()">
  ↪️ 重做 ({{ redoStackSize() }})
</button>
```

## 测试用例

### 测试1: 添加行撤销
1. 点击"添加行"按钮，新行插入到第一行
2. 点击"撤销"按钮
3. **预期**: 新添加的第一行被删除，而不是最后一行
4. **当前**: 会删除最后一行 ❌

### 测试2: 添加行重做
1. 添加行 → 撤销 → 重做
2. **预期**: 行回到原位置（第一行）
3. **当前**: 行会被追加到末尾 ❌

### 测试3: 编辑单元格
1. 编辑单元格 → 撤销
2. **预期**: 值恢复为旧值 ✅
3. 重做
4. **预期**: 值恢复为新值 ✅

### 测试4: 键盘快捷键
1. Ctrl+Z 撤销 ✅
2. Ctrl+Y / Ctrl+Shift+Z 重做 ✅

## 优先级

1. **高优先级**: 修复 `rowAdd` 的撤销/重做逻辑（导致功能不可用）
2. **中优先级**: 添加按钮禁用状态和视觉反馈
3. **低优先级**: 实现其他操作类型的撤销/重做

## 总结

撤销重做功能的核心服务和编辑记录逻辑是正确的，但在**应用撤销/重做操作时存在实现错误**：

1. ❌ `rowAdd` 撤销时删除错误的行（最后一行而不是添加的行）
2. ❌ `rowAdd` 重做时插入到错误的位置（末尾而不是原位置）
3. ⚠️ 缺少其他操作类型的处理实现

这导致用户使用撤销重做功能时出现"不好用"的问题。
