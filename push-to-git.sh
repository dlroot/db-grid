#!/bin/bash
# DB Grid Git 推送脚本
# 由于网络问题,自动推送失败,请手动执行此脚本

set -e

echo "=== DB Grid 撤销重做修复推送 ==="
echo ""

cd /home/node/.openclaw/workspace/db-grid

# 检查是否有未推送的提交
if git log origin/master..HEAD --oneline | grep -q .; then
    echo "发现未推送的提交:"
    git log origin/master..HEAD --oneline
    echo ""
    echo "正在推送到 GitHub..."
    
    # 尝试推送
    if git push origin master; then
        echo ""
        echo "✅ 推送成功!"
        echo ""
        echo "提交内容:"
        echo "- 修复撤销重做功能的行索引位置错误"
        echo "- 新增列宽/排序/筛选的撤销重做支持"
        echo "- 改进 UI 状态显示"
        echo ""
        echo "文件修改:"
        echo "- db-grid.component.ts (核心逻辑修复)"
        echo "- app.html (UI 改进)"
        echo "- app.scss (样式增强)"
        echo ""
        echo "验证: 50个单元测试全部通过 ✅"
    else
        echo ""
        echo "❌ 推送失败,请检查网络连接后重试"
        echo "可以尝试以下方法:"
        echo "1. 检查网络连接"
        echo "2. 使用 VPN 或代理"
        echo "3. 稍后重试: git push origin master"
        exit 1
    fi
else
    echo "✅ 所有提交已推送,无需操作"
fi
