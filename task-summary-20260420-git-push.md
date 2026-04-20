# 2026-04-20 DB Grid GitHub Push 推送会话

## 目标
将 db-grid 项目推送到 GitHub 并设置每日自动推送。

## 问题清单与解决

### 1. 推送时 commit message 为 null 的问题
- **原因**: cron job 的消息里包含了 PowerShell 命令 `$(Get-Date -Format yyyy-MM-dd)`，被外层 shell 解析失败
- **解决**: 改用独立 Node.js 脚本 `_daily_push.js`，cron 任务只负责调用脚本

### 2. `.git-credentials` 文件泄漏 Token
- **原因**: 之前尝试用 Git Credential Store 时，Windows 路径反斜杠导致文件被 git 追踪为 `Userswill.git-credentials`
- **解决**: 
  - `git rm --cached Userswill.git-credentials` 移除暂存
  - `git filter-branch` 重写历史，清除所有引用
  - force push 更新远程
  - 添加到 `.gitignore`（`_daily_push.js` 和 `_temp_*`）

### 3. GitHub 推送被 secret scanning 拦截
- **原因**: Token 泄露触发 GitHub 保护机制
- **解决**: 用户访问 https://github.com/dlroot/db-grid/security/secret-scanning/unblock-secret/3CbwOReLnAIZfOXUifVr9kx9Qkv 解封

### 4. GitHub Token 认证不工作
- **原因**: fine-grained PAT (`github_pat_`) 不支持 Git push 操作
- **解决**: 改用 SSH key 方式（用户已在 GitHub 添加公钥）

## 最终结果
- GitHub 仓库: `https://github.com/dlroot/db-grid`
- 协议: SSH (`git@github.com:dlroot/db-grid.git`)
- Commits:
  - `f5cb423` fix: remove leaked git-credentials, update tests
  - `d5bae72` Initial commit: DB Grid - Angular 21 Data Grid Library

## 文件清理
- ✅ 已移除: `Userswill.git-credentials` (git 历史)
- ✅ 已添加到 .gitignore: `_daily_push.js`, `_temp_*`, `*.tmp`

## 每日自动推送
- 脚本: `C:\Users\will\.qclaw\workspace\db-grid\_daily_push.js`
- 协议: SSH（无需 token，永久有效）
- Cron: 每天 21:00 自动运行

## 测试状态
- 84/84 测试通过
- 构建: 401KB
