#!/bin/bash

# DbGrid Angular Elements 构建脚本
# 作者: QClaw
# 日期: 2026-06-24

set -e  # 遇到错误立即退出

echo "🚀 开始构建 DbGrid Angular Elements..."

# ========== 检查环境 ==========
echo ""
echo "📋 检查环境..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js (建议 v18+)"
    exit 1
fi
echo "✅ Node.js: $(node -v)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi
echo "✅ npm: $(npm -v)"

# 检查 Angular CLI
if ! command -v ng &> /dev/null; then
    echo "⚠️  Angular CLI 未全局安装，将使用 npx"
    NG_CMD="npx @angular/cli"
else
    echo "✅ Angular CLI: $(ng version | head -1)"
    NG_CMD="ng"
fi

# ========== 安装依赖 ==========
echo ""
echo "📦 安装依赖..."

if [ ! -d "node_modules" ]; then
    echo "   node_modules 不存在，执行 npm install..."
    npm install --legacy-peer-deps
else
    echo "   node_modules 已存在，跳过安装"
fi

# ========== 构建 Angular Elements ==========
echo ""
echo "🔨 构建 Angular Elements..."

# 输出目录
OUTPUT_DIR="dist/db-grid-elements"
rm -rf "$OUTPUT_DIR"

# 构建命令
echo "   执行: $NG_CMD build --browser src/main.elements.ts --output-path $OUTPUT_DIR --output-hashing none --no-index"

$NG_CMD build \
  --browser src/main.elements.ts \
  --output-path "$OUTPUT_DIR" \
  --output-hashing none \
  --no-index \
  --configuration production \
  --skip-app-shell true 2>&1 | tee build.log

# 检查构建结果
if [ $? -eq 0 ]; then
    echo "✅ 构建成功！"
else
    echo "❌ 构建失败，请查看 build.log"
    exit 1
fi

# ========== 合并 JS 文件 ==========
echo ""
echo "📦 合并 JS 文件..."

# 查找所有 JS 文件
JS_FILES=$(find "$OUTPUT_DIR" -name "*.js" -type f | sort)

if [ -z "$JS_FILES" ]; then
    echo "❌ 未找到 JS 文件"
    exit 1
fi

# 合并为一个文件
OUTPUT_FILE="$OUTPUT_DIR/db-grid-elements.js"
echo "   合并为: $OUTPUT_FILE"

> "$OUTPUT_FILE"  # 清空文件

for file in $JS_FILES; do
    echo "// ========== $file ==========" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

echo "✅ 合并完成: $(du -h "$OUTPUT_FILE" | cut -f1)"

# ========== 复制演示文件 ==========
echo ""
echo "📋 复制演示文件..."

cp demo-elements.html "$OUTPUT_DIR/"
cp demo-react.jsx "$OUTPUT_DIR/"
cp demo-vue.html "$OUTPUT_DIR/"
cp src/db-grid-element.d.ts "$OUTPUT_DIR/"

echo "✅ 演示文件已复制"

# ========== 创建 package.json ==========
echo ""
echo "📦 创建 package.json..."

cat > "$OUTPUT_DIR/package.json" <<EOF
{
  "name": "db-grid-elements",
  "version": "1.0.0",
  "description": "DbGrid Angular Elements - Web Component for any framework",
  "main": "db-grid-elements.js",
  "types": "db-grid-element.d.ts",
  "keywords": [
    "dbgrid",
    "datagrid",
    "angular",
    "elements",
    "web-components",
    "react",
    "vue",
    "svelte"
  ],
  "author": "QClaw",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-repo/db-grid"
  },
  "files": [
    "db-grid-elements.js",
    "db-grid-element.d.ts",
    "demo-elements.html",
    "demo-react.jsx",
    "demo-vue.html"
  ]
}
EOF

echo "✅ package.json 已创建"

# ========== 完成 ==========
echo ""
echo "🎉 构建完成！"
echo ""
echo "📂 输出目录: $OUTPUT_DIR"
echo "📄 主文件: $OUTPUT_DIR/db-grid-elements.js"
echo "📖 演示: $OUTPUT_DIR/demo-elements.html"
echo ""
echo "🚀 使用方式:"
echo "   1. 在 HTML 中引入: <script src=\"db-grid-elements.js\"></script>"
echo "   2. 使用组件: <db-grid-element row-data='[...]' column-defs='[...]'></db-grid-element>"
echo ""
echo "📦 发布到 npm:"
echo "   cd $OUTPUT_DIR"
echo "   npm publish"
echo ""

exit 0
