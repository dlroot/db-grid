#!/bin/bash
# E2E 测试运行脚本
# 1. 启动 Angular dev server
# 2. 等待服务就绪
# 3. 运行 Playwright 测试
# 4. 清理

set -e

echo "🔧 正在启动 Angular 开发服务器..."
cd "$(dirname "$0")/.."

# 清理旧报告
rm -rf playwright-report test-results

# 启动 Angular 服务（后台运行）
npx ng serve --host 0.0.0.0 --port 4200 > /tmp/ng-serve.log 2>&1 &
NG_PID=$!

# 等待服务就绪（最多 60 秒）
echo "⏳ 等待 Angular 服务就绪..."
for i in $(seq 1 60); do
  if curl -s http://localhost:4200 > /dev/null 2>&1; then
    echo "✅ Angular 服务已就绪 (端口 4200)"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "❌ Angular 服务启动超时"
    kill $NG_PID 2>/dev/null || true
    exit 1
  fi
  sleep 2
done

# 运行 Playwright 测试
echo "🧪 运行 E2E 测试..."
cd e2e
npx playwright test --config=playwright.config.ts "$@"
EXIT_CODE=$?
cd ..

# 清理
echo "🧹 清理 Angular 服务..."
kill $NG_PID 2>/dev/null || true

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ 所有测试通过！"
else
  echo "❌ 部分测试失败 (exit code: $EXIT_CODE)"
  echo "📄 报告: playwright-report/index.html"
fi

exit $EXIT_CODE
