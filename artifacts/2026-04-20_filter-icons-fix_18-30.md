# DB Grid 筛选图标修复 — 2026-04-20

## 目标
修复 Demo 页面所有 Tab 的筛选图标缺失问题。

## 根因
`header-renderer.ts` 检查 `colDef.filter` 是否存在才渲染筛选图标。大部分 ColumnDefs 没有设置 `filter` 属性。

## 修复
给所有 Tab 的 ColumnDefs 补上 `filter` 属性：

| Tab | 列数 | 筛选类型 |
|-----|------|----------|
| basic | 9列 | text/number/set/date |
| tree | 5列 | text/set/number |
| group | 7列 | text/set/number |
| excel | 10列 | text/number/set/date |
| span | 7列 | text/number/set |
| edit | 7列 | text/number/set/date |
| pin | 9列 | text/number/set/date |

## 验证结果
- **Basic Tab:** 8 个筛选图标 ✅
- **P0 Tab:** 9 个筛选图标 ✅
- **构建:** 402KB，零错误 ✅

## 提交
- Commit: `374ee75`
- Remote: `git@github.com:dlroot/db-grid.git`
- Message: `fix: add filter property to all columnDefs across all demo tabs`
